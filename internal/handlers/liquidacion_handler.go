package handlers

import (
	"net/http"

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
