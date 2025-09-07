package handlers

import (
	"net/http"

	"software-contabilidad/internal/models"
	"software-contabilidad/internal/services"

	"github.com/gin-gonic/gin"
)

type PrecioEnvaseHandler struct {
	precioService services.PrecioEnvaseService
}

func NewPrecioEnvaseHandler(precioService services.PrecioEnvaseService) *PrecioEnvaseHandler {
	return &PrecioEnvaseHandler{
		precioService: precioService,
	}
}

func (h *PrecioEnvaseHandler) GetAll(c *gin.Context) {
	precios, err := h.precioService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"precios": precios})
}

func (h *PrecioEnvaseHandler) Create(c *gin.Context) {
	var precio models.PrecioEnvase
	if err := c.ShouldBindJSON(&precio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.precioService.Create(&precio); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"precio": precio})
}

func (h *PrecioEnvaseHandler) Update(c *gin.Context) {
	id := c.Param("id")
	
	precio, err := h.precioService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Precio no encontrado"})
		return
	}

	if err := c.ShouldBindJSON(precio); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.precioService.Update(precio); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"precio": precio})
}
