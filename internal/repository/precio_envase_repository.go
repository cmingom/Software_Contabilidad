package repository

import (
	"software-contabilidad/internal/models"

	"gorm.io/gorm"
)

type PrecioEnvaseRepository interface {
	Create(precio *models.PrecioEnvase) error
	GetByID(id string) (*models.PrecioEnvase, error)
	GetByEnvase(envase string) (*models.PrecioEnvase, error)
	GetByEnvaseAndContext(envase, cuartel, especie, variedad string) (*models.PrecioEnvase, error)
	GetAllByEnvase(envase string) ([]models.PrecioEnvase, error)
	GetAll() ([]models.PrecioEnvase, error)
	Update(precio *models.PrecioEnvase) error
	Delete(id string) error
}

type precioEnvaseRepository struct {
	db *gorm.DB
}

func NewPrecioEnvaseRepository(db *gorm.DB) PrecioEnvaseRepository {
	return &precioEnvaseRepository{db: db}
}

func (r *precioEnvaseRepository) Create(precio *models.PrecioEnvase) error {
	return r.db.Create(precio).Error
}

func (r *precioEnvaseRepository) GetByID(id string) (*models.PrecioEnvase, error) {
	var precio models.PrecioEnvase
	err := r.db.Where("id = ?", id).First(&precio).Error
	if err != nil {
		return nil, err
	}
	return &precio, nil
}

func (r *precioEnvaseRepository) GetByEnvase(envase string) (*models.PrecioEnvase, error) {
	var precio models.PrecioEnvase
	err := r.db.Where("envase = ? AND activo = ?", envase, true).Order("created_at DESC").First(&precio).Error
	if err != nil {
		return nil, err
	}
	return &precio, nil
}

func (r *precioEnvaseRepository) GetByEnvaseAndContext(envase, cuartel, especie, variedad string) (*models.PrecioEnvase, error) {
	var precio models.PrecioEnvase
	
	// Buscar precio específico por contexto (cuartel, especie, variedad)
	query := r.db.Where("envase = ? AND activo = ?", envase, true)
	
	if cuartel != "" {
		query = query.Where("cuartel = ?", cuartel)
	}
	if especie != "" {
		query = query.Where("especie = ?", especie)
	}
	if variedad != "" {
		query = query.Where("variedad = ?", variedad)
	}
	
	err := query.Order("created_at DESC").First(&precio).Error
	if err == nil {
		return &precio, nil
	}
	
	// Si no se encuentra precio específico, buscar precio general (sin contexto)
	err = r.db.Where("envase = ? AND activo = ? AND cuartel IS NULL AND especie IS NULL AND variedad IS NULL", envase, true).Order("created_at DESC").First(&precio).Error
	if err != nil {
		return nil, err
	}
	return &precio, nil
}

func (r *precioEnvaseRepository) GetAllByEnvase(envase string) ([]models.PrecioEnvase, error) {
	var precios []models.PrecioEnvase
	err := r.db.Where("envase = ? AND activo = ?", envase, true).Find(&precios).Error
	return precios, err
}

func (r *precioEnvaseRepository) GetAll() ([]models.PrecioEnvase, error) {
	var precios []models.PrecioEnvase
	err := r.db.Where("activo = ?", true).Find(&precios).Error
	return precios, err
}

func (r *precioEnvaseRepository) Update(precio *models.PrecioEnvase) error {
	return r.db.Save(precio).Error
}

func (r *precioEnvaseRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.PrecioEnvase{}).Error
}
