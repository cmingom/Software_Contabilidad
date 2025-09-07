package repository

import (
	"software-contabilidad/internal/models"

	"gorm.io/gorm"
)

type LiquidacionRepository interface {
	Create(liquidacion *models.LiquidacionTrabajador) error
	GetByID(id string) (*models.LiquidacionTrabajador, error)
	GetByTrabajador(nombreTrabajador string) ([]models.LiquidacionTrabajador, error)
	GetAll() ([]models.LiquidacionTrabajador, error)
	DeleteAll() error
}

type liquidacionRepository struct {
	db *gorm.DB
}

func NewLiquidacionRepository(db *gorm.DB) LiquidacionRepository {
	return &liquidacionRepository{db: db}
}

func (r *liquidacionRepository) Create(liquidacion *models.LiquidacionTrabajador) error {
	return r.db.Create(liquidacion).Error
}

func (r *liquidacionRepository) GetByID(id string) (*models.LiquidacionTrabajador, error) {
	var liquidacion models.LiquidacionTrabajador
	err := r.db.Where("id = ?", id).First(&liquidacion).Error
	if err != nil {
		return nil, err
	}
	return &liquidacion, nil
}

func (r *liquidacionRepository) GetByTrabajador(nombreTrabajador string) ([]models.LiquidacionTrabajador, error) {
	var liquidaciones []models.LiquidacionTrabajador
	err := r.db.Where("nombre_trabajador = ?", nombreTrabajador).Find(&liquidaciones).Error
	return liquidaciones, err
}

func (r *liquidacionRepository) GetAll() ([]models.LiquidacionTrabajador, error) {
	var liquidaciones []models.LiquidacionTrabajador
	err := r.db.Find(&liquidaciones).Error
	return liquidaciones, err
}

func (r *liquidacionRepository) DeleteAll() error {
	return r.db.Where("1 = 1").Delete(&models.LiquidacionTrabajador{}).Error
}
