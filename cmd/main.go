package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"software-contabilidad/internal/config"
	"software-contabilidad/internal/database"
	"software-contabilidad/internal/handlers"
	"software-contabilidad/internal/middleware"
	"software-contabilidad/internal/repository"
	"software-contabilidad/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar .env (no fatal si no existe)
	_ = godotenv.Load()

	// Config DB (GORM)
	cfg := config.Load()
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Error conectando a la base de datos:", err)
	}

	// Migraciones
	if err := database.Migrate(db); err != nil {
		log.Fatal("Error migrando esquemas:", err)
	}

	// Repos
	entregaRepo := repository.NewEntregaRepository(db)
	precioEnvaseRepo := repository.NewPrecioEnvaseRepository(db)
	liquidacionRepo := repository.NewLiquidacionRepository(db)

	// Conexión pgx opcional (para paths /api/v2)
	pgxConn, err := database.NewPGXConn()
	if err != nil {
		log.Printf("Advertencia: no se creó conexión pgx: %v", err)
	}
	if pgxConn != nil {
		defer pgxConn.Close(context.Background())
		if err := database.SetupOptimizedSchema(pgxConn); err != nil {
			log.Printf("Advertencia: no se configuró esquema optimizado: %v", err)
		}
	}

	// Servicios
	entregaService := services.NewEntregaService(entregaRepo)
	precioEnvaseService := services.NewPrecioEnvaseService(precioEnvaseRepo)

	var liquidacionService services.LiquidacionService
	if pgxConn != nil {
		liquidacionService = services.NewLiquidacionServiceWithPGX(liquidacionRepo, entregaRepo, precioEnvaseRepo, pgxConn)
	} else {
		liquidacionService = services.NewLiquidacionService(liquidacionRepo, entregaRepo, precioEnvaseRepo)
	}

	// Handlers
	entregaHandler := handlers.NewEntregaHandler(entregaService)
	precioEnvaseHandler := handlers.NewPrecioEnvaseHandler(precioEnvaseService)
	liquidacionHandler := handlers.NewLiquidacionHandler(liquidacionService)

	// Router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.MaxMultipartMemory = 200 << 20 // 200MB

	// Health básico para PowerShell (no toca DB)
	router.GET("/healthz", func(c *gin.Context) {
		resp := gin.H{
			"status":  "ok",
			"version": "2.0-integrated",
		}
		if pgxConn != nil {
			resp["database"] = "postgresql+gorm+pgx"
			resp["performance"] = "150k+ filas en <10s"
		} else {
			resp["database"] = "postgresql+gorm"
		}
		c.JSON(http.StatusOK, resp)
	})

	// Readiness (toca DB con timeout corto)
	router.GET("/readyz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db err"})
			return
		}
		if err := sqlDB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Alias /health para compatibilidad
	router.GET("/health", func(c *gin.Context) { c.Redirect(http.StatusFound, "/healthz") })

	// API v1
	api := router.Group("/api/v1")
	{
		api.POST("/entregas/upload", entregaHandler.UploadExcel)
		api.GET("/entregas/envases", entregaHandler.GetEnvases)

		api.GET("/precios-envases", precioEnvaseHandler.GetAll)
		api.POST("/precios-envases", precioEnvaseHandler.Create)
		api.PUT("/precios-envases/:id", precioEnvaseHandler.Update)

		api.POST("/liquidaciones/generar", liquidacionHandler.GenerarLiquidacion)
		api.GET("/liquidaciones/:trabajador", liquidacionHandler.GetLiquidacionTrabajador)
	}

	// API v2 optimizada si hay pgx
	if pgxConn != nil {
		apiV2 := router.Group("/api/v2")
		{
			apiV2.POST("/entregas/upload-optimized", liquidacionHandler.UploadExcelOptimized)
			apiV2.GET("/entregas/envases", liquidacionHandler.GetEnvasesOptimizados)
			apiV2.GET("/liquidaciones/optimizadas", liquidacionHandler.GetLiquidacionesOptimizadas)
			apiV2.GET("/liquidaciones/resumen", liquidacionHandler.GetResumenTrabajador)
		}
	}

	// Puerto
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Servidor en :%s", port)
	log.Printf("Health:  http://127.0.0.1:%s/healthz", port)
	log.Printf("Ready:   http://127.0.0.1:%s/readyz", port)
	log.Printf("API v1:  http://127.0.0.1:%s/api/v1", port)
	if pgxConn != nil {
		log.Printf("API v2:  http://127.0.0.1:%s/api/v2", port)
		log.Printf("Arquitectura: PostgreSQL + GORM + pgx + COPY")
	} else {
		log.Printf("Arquitectura: PostgreSQL + GORM")
	}

	// Escuchar (0.0.0.0 para contenedores, funciona con 127.0.0.1 en local)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error iniciando servidor:", err)
	}
}
