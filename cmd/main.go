package main

import (
	"log"
	"os"

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
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No se encontró archivo .env")
	}

	// Configurar base de datos
	cfg := config.Load()
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Error conectando a la base de datos:", err)
	}

	// Migrar esquemas
	if err := database.Migrate(db); err != nil {
		log.Fatal("Error migrando esquemas:", err)
	}

	// Inicializar repositorios
	entregaRepo := repository.NewEntregaRepository(db)
	precioEnvaseRepo := repository.NewPrecioEnvaseRepository(db)
	liquidacionRepo := repository.NewLiquidacionRepository(db)

	// Inicializar servicios
	entregaService := services.NewEntregaService(entregaRepo)
	precioEnvaseService := services.NewPrecioEnvaseService(precioEnvaseRepo)
	liquidacionService := services.NewLiquidacionService(liquidacionRepo, entregaRepo, precioEnvaseRepo)

	// Inicializar handlers
	entregaHandler := handlers.NewEntregaHandler(entregaService)
	precioEnvaseHandler := handlers.NewPrecioEnvaseHandler(precioEnvaseService)
	liquidacionHandler := handlers.NewLiquidacionHandler(liquidacionService)

	// Configurar router
	router := gin.Default()
	
	// Configurar límites de tamaño de archivo (100MB)
	router.MaxMultipartMemory = 100 << 20 // 100 MB
	
	// Middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())

	// Rutas API
	api := router.Group("/api/v1")
	{
		// Rutas de entregas
		api.POST("/entregas/upload", entregaHandler.UploadExcel)
		api.GET("/entregas/envases", entregaHandler.GetEnvases)
		
		// Rutas de precios de envases
		api.GET("/precios-envases", precioEnvaseHandler.GetAll)
		api.POST("/precios-envases", precioEnvaseHandler.Create)
		api.PUT("/precios-envases/:id", precioEnvaseHandler.Update)
		
		// Rutas de liquidaciones
		api.POST("/liquidaciones/generar", liquidacionHandler.GenerarLiquidacion)
		api.GET("/liquidaciones/:trabajador", liquidacionHandler.GetLiquidacionTrabajador)
	}

	// Servir archivos estáticos del frontend
	// router.Static("/static", "./web/dist")
	// router.LoadHTMLGlob("web/dist/*.html")
	// router.GET("/", func(c *gin.Context) {
	// 	c.HTML(200, "index.html", nil)
	// })

	// Iniciar servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Servidor iniciado en puerto %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error iniciando servidor:", err)
	}
}
