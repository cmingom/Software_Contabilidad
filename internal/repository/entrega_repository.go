package repository

import (
	"software-contabilidad/internal/models"

	"gorm.io/gorm"
)

type EntregaRepository interface {
	Create(entrega *models.Entrega) error
	GetByID(id string) (*models.Entrega, error)
	GetAll() ([]models.Entrega, error)
	GetEnvases() ([]models.EnvaseInfo, error)
	GetByTrabajador(nombreTrabajador string) ([]models.Entrega, error)
	DeleteAll() error
}

type entregaRepository struct {
	db *gorm.DB
}

func NewEntregaRepository(db *gorm.DB) EntregaRepository {
	return &entregaRepository{db: db}
}

func (r *entregaRepository) Create(entrega *models.Entrega) error {
	return r.db.Create(entrega).Error
}

func (r *entregaRepository) GetByID(id string) (*models.Entrega, error) {
	var entrega models.Entrega
	err := r.db.Where("id = ?", id).First(&entrega).Error
	if err != nil {
		return nil, err
	}
	return &entrega, nil
}

func (r *entregaRepository) GetAll() ([]models.Entrega, error) {
	var entregas []models.Entrega
	err := r.db.Find(&entregas).Error
	return entregas, err
}

func (r *entregaRepository) GetEnvases() ([]models.EnvaseInfo, error) {
	var envases []models.EnvaseInfo
	err := r.db.Model(&models.Entrega{}).
		Select("envase, COUNT(*) as count").
		Group("envase").
		Find(&envases).Error
	return envases, err
}

func (r *entregaRepository) GetByTrabajador(nombreTrabajador string) ([]models.Entrega, error) {
	var entregas []models.Entrega
	err := r.db.Where("nombre_trabajador = ?", nombreTrabajador).Find(&entregas).Error
	return entregas, err
}

func (r *entregaRepository) DeleteAll() error {
	return r.db.Where("1 = 1").Delete(&models.Entrega{}).Error
}
