package handlers

import (
	"net/http"
	"time"

	"software-contabilidad/internal/models"
	"software-contabilidad/internal/services"

	"github.com/gin-gonic/gin"
)

type LiquidacionHandler struct {
	liquidacionService services.LiquidacionService
}

func NewLiquidacionHandler(liquidacionService services.LiquidacionService) *LiquidacionHandler {
	return &LiquidacionHandler{
		liquidacionService: liquidacionService,
	}
}

func (h *LiquidacionHandler) GenerarLiquidacion(c *gin.Context) {
	var request models.LiquidacionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	archivoExcel, nombreArchivo, err := h.liquidacionService.GenerarLiquidacion(request.PreciosEnvases)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Configurar headers para descarga
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename="+nombreArchivo)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Length", string(rune(len(archivoExcel))))

	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", archivoExcel)
}

func (h *LiquidacionHandler) GetLiquidacionTrabajador(c *gin.Context) {
	nombreTrabajador := c.Param("trabajador")

	liquidaciones, err := h.liquidacionService.GetLiquidacionTrabajador(nombreTrabajador)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"liquidaciones": liquidaciones})
}

// UploadExcelOptimized maneja la subida de Excel con procesamiento optimizado
func (h *LiquidacionHandler) UploadExcelOptimized(c *gin.Context) {
	// Obtener archivo del formulario
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se pudo obtener el archivo: " + err.Error()})
		return
	}
	defer file.Close()

	// Verificar tamaño del archivo (200MB)
	if header.Size > 200*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo es demasiado grande. Máximo 200MB"})
		return
	}

	// Verificar que sea un archivo Excel
	contentType := header.Header.Get("Content-Type")
	if contentType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
		contentType != "application/octet-stream" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo debe ser un Excel (.xlsx). Tipo recibido: " + contentType})
		return
	}

	// Obtener precios de envases del formulario
	preciosEnvases := make(map[string]float64)
	if preciosStr := c.PostForm("precios_envases"); preciosStr != "" {
		// Parsear precios si se envían como JSON
		// Por ahora usar precios por defecto
		preciosEnvases = map[string]float64{
			"Capacho": 2.0,
			"Canasto": 1.5,
			"Caja":    3.0,
		}
	}

	// Procesar archivo con COPY
	startTime := time.Now()
	if err := h.liquidacionService.ProcessExcelFileWithCopy(file, header.Filename, preciosEnvases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error procesando archivo: " + err.Error()})
		return
	}
	processingTime := time.Since(startTime)

	// Obtener envases únicos después del procesamiento
	envases, err := h.liquidacionService.GetEnvasesOptimizados()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo envases: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":              "Archivo procesado correctamente con optimizaciones",
		"tiempo_procesamiento": processingTime.String(),
		"archivo":              header.Filename,
		"optimizado":           true,
		"envases":              envases,
		"total_envases":        len(envases),
	})
}

// GetLiquidacionesOptimizadas obtiene liquidaciones usando agregación SQL
func (h *LiquidacionHandler) GetLiquidacionesOptimizadas(c *gin.Context) {
	// Obtener parámetros de fecha
	fechaInicioStr := c.Query("fecha_inicio")
	fechaFinStr := c.Query("fecha_fin")

	if fechaInicioStr == "" || fechaFinStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requieren fecha_inicio y fecha_fin"})
		return
	}

	fechaInicio, err := time.Parse("2006-01-02", fechaInicioStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de fecha_inicio inválido. Use YYYY-MM-DD"})
		return
	}

	fechaFin, err := time.Parse("2006-01-02", fechaFinStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de fecha_fin inválido. Use YYYY-MM-DD"})
		return
	}

	// Obtener liquidaciones
	liquidaciones, err := h.liquidacionService.GetLiquidacionesOptimizadas(fechaInicio, fechaFin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo liquidaciones: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"liquidaciones": liquidaciones,
		"total":         len(liquidaciones),
		"fecha_inicio":  fechaInicio,
		"fecha_fin":     fechaFin,
		"optimizado":    true,
	})
}

// GetResumenTrabajador obtiene resumen por trabajador
func (h *LiquidacionHandler) GetResumenTrabajador(c *gin.Context) {
	// Obtener parámetros de fecha
	fechaInicioStr := c.Query("fecha_inicio")
	fechaFinStr := c.Query("fecha_fin")

	if fechaInicioStr == "" || fechaFinStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requieren fecha_inicio y fecha_fin"})
		return
	}

	fechaInicio, err := time.Parse("2006-01-02", fechaInicioStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de fecha_inicio inválido. Use YYYY-MM-DD"})
		return
	}

	fechaFin, err := time.Parse("2006-01-02", fechaFinStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de fecha_fin inválido. Use YYYY-MM-DD"})
		return
	}

	// Obtener resumen
	resumenes, err := h.liquidacionService.GetResumenTrabajador(fechaInicio, fechaFin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo resumen: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"resumenes":    resumenes,
		"total":        len(resumenes),
		"fecha_inicio": fechaInicio,
		"fecha_fin":    fechaFin,
		"optimizado":   true,
	})
}

// GetEnvasesOptimizados obtiene envases únicos desde la tabla optimizada
func (h *LiquidacionHandler) GetEnvasesOptimizados(c *gin.Context) {
	envases, err := h.liquidacionService.GetEnvasesOptimizados()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo envases: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"envases":    envases,
		"total":      len(envases),
		"optimizado": true,
	})
}
