package database

import (
	"log"
	"software-contabilidad/internal/config"
	"software-contabilidad/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetDatabaseURL()
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("Conexión a base de datos establecida")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Entrega{},
		&models.PrecioEnvase{},
		&models.LiquidacionTrabajador{},
	)
}
