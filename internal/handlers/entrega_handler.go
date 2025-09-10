package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"software-contabilidad/internal/services"

	"github.com/gin-gonic/gin"
)

type EntregaHandler struct {
	entregaService services.EntregaService
}

func NewEntregaHandler(entregaService services.EntregaService) *EntregaHandler {
	return &EntregaHandler{
		entregaService: entregaService,
	}
}

func (h *EntregaHandler) UploadExcel(c *gin.Context) {
	// Obtener archivo del formulario
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se pudo obtener el archivo: " + err.Error()})
		return
	}
	defer file.Close()

	// Verificar tamaño del archivo (100MB)
	if header.Size > 100*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo es demasiado grande. Máximo 100MB"})
		return
	}

	// Verificar que sea un archivo Excel
	contentType := header.Header.Get("Content-Type")
	if contentType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
		contentType != "application/octet-stream" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo debe ser un Excel (.xlsx). Tipo recibido: " + contentType})
		return
	}

	// Verificar extensión del archivo
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".xlsx") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo debe tener extensión .xlsx"})
		return
	}

	// Procesar archivo
	fmt.Printf("Iniciando procesamiento del archivo: %s\n", header.Filename)
	if err := h.entregaService.ProcessExcelFile(file, header.Filename); err != nil {
		fmt.Printf("Error procesando archivo: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error procesando archivo: " + err.Error()})
		return
	}
	fmt.Printf("Archivo procesado correctamente\n")

	// Obtener envases únicos después del procesamiento
	envases, err := h.entregaService.GetEnvases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo envases: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Archivo procesado correctamente",
		"envases":       envases,
		"total_envases": len(envases),
	})
}

func (h *EntregaHandler) GetEnvases(c *gin.Context) {
	envases, err := h.entregaService.GetEnvases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"envases": envases})
}
