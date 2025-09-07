package services

import (
	"software-contabilidad/internal/models"
	"software-contabilidad/internal/repository"
)

type PrecioEnvaseService interface {
	Create(precio *models.PrecioEnvase) error
	GetByID(id string) (*models.PrecioEnvase, error)
	GetByEnvase(envase string) (*models.PrecioEnvase, error)
	GetAll() ([]models.PrecioEnvase, error)
	Update(precio *models.PrecioEnvase) error
	Delete(id string) error
}

type precioEnvaseService struct {
	precioRepo repository.PrecioEnvaseRepository
}

func NewPrecioEnvaseService(precioRepo repository.PrecioEnvaseRepository) PrecioEnvaseService {
	return &precioEnvaseService{
		precioRepo: precioRepo,
	}
}

func (s *precioEnvaseService) Create(precio *models.PrecioEnvase) error {
	return s.precioRepo.Create(precio)
}

func (s *precioEnvaseService) GetByID(id string) (*models.PrecioEnvase, error) {
	return s.precioRepo.GetByID(id)
}

func (s *precioEnvaseService) GetByEnvase(envase string) (*models.PrecioEnvase, error) {
	return s.precioRepo.GetByEnvase(envase)
}

func (s *precioEnvaseService) GetAll() ([]models.PrecioEnvase, error) {
	return s.precioRepo.GetAll()
}

func (s *precioEnvaseService) Update(precio *models.PrecioEnvase) error {
	return s.precioRepo.Update(precio)
}

func (s *precioEnvaseService) Delete(id string) error {
	return s.precioRepo.Delete(id)
}
