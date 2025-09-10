package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
)

// NewPGXConn crea una conexión pgx optimizada
func NewPGXConn() (*pgx.Conn, error) {
	// Obtener URL de conexión desde variables de entorno
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		// Construir URL desde variables individuales
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		password := getEnv("DB_PASSWORD", "password")
		dbname := getEnv("DB_NAME", "software_contabilidad")
		
		databaseURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			user, password, host, port, dbname)
	}

	// Configurar conexión optimizada para alto rendimiento
	config, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("error parseando configuración: %v", err)
	}

	// Configuraciones optimizadas para COPY y alto rendimiento
	config.RuntimeParams["work_mem"] = "256MB"
	config.RuntimeParams["maintenance_work_mem"] = "512MB"
	config.RuntimeParams["checkpoint_segments"] = "32"
	config.RuntimeParams["wal_buffers"] = "16MB"

	// Crear conexión
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("error creando conexión: %v", err)
	}

	// Verificar conexión
	if err := conn.Ping(ctx); err != nil {
		return nil, fmt.Errorf("error conectando a la base de datos: %v", err)
	}

	return conn, nil
}

// SetupOptimizedSchema ejecuta el esquema optimizado
func SetupOptimizedSchema(conn *pgx.Conn) error {
	ctx := context.Background()

	// Leer y ejecutar esquema optimizado
	schemaSQL, err := os.ReadFile("scripts/schema-optimized.sql")
	if err != nil {
		return fmt.Errorf("error leyendo esquema: %v", err)
	}

	_, err = conn.Exec(ctx, string(schemaSQL))
	if err != nil {
		return fmt.Errorf("error ejecutando esquema: %v", err)
	}

	return nil
}

// getEnv obtiene variable de entorno con valor por defecto
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
