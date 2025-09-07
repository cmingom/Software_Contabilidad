# Makefile para Software de Contabilidad

.PHONY: help build run test clean setup-db migrate frontend backend

# Variables
GO_VERSION := 1.21
NODE_VERSION := 18
DB_NAME := software_contabilidad
DB_USER := postgres
DB_PASSWORD := password
DB_HOST := localhost
DB_PORT := 5432

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup-db: ## Configurar base de datos PostgreSQL
	@echo "Configurando base de datos..."
	@createdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME) || echo "Base de datos ya existe"
	@echo "Configurando extensiones..."
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -f scripts/setup-db.sql

migrate: ## Ejecutar migraciones de base de datos
	@echo "Ejecutando migraciones..."
	@go run cmd/main.go

build-backend: ## Compilar backend
	@echo "Compilando backend..."
	@go build -o bin/software-contabilidad cmd/main.go

build-frontend: ## Compilar frontend
	@echo "Compilando frontend..."
	@cd web && npm run build

build: build-backend build-frontend ## Compilar todo el proyecto

run-backend: ## Ejecutar backend
	@echo "Ejecutando backend..."
	@go run cmd/main.go

run-frontend: ## Ejecutar frontend en modo desarrollo
	@echo "Ejecutando frontend..."
	@cd web && npm start

install-deps: ## Instalar dependencias
	@echo "Instalando dependencias de Go..."
	@go mod download
	@go mod tidy
	@echo "Instalando dependencias de Node.js..."
	@cd web && npm install

test: ## Ejecutar tests
	@echo "Ejecutando tests..."
	@go test ./...

clean: ## Limpiar archivos generados
	@echo "Limpiando archivos..."
	@rm -rf bin/
	@cd web && rm -rf build/ node_modules/

dev: ## Ejecutar en modo desarrollo (backend y frontend)
	@echo "Iniciando modo desarrollo..."
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"
	@echo "Presiona Ctrl+C para detener"
	@trap 'kill %1; kill %2' INT; \
		make run-backend & \
		make run-frontend & \
		wait

docker-build: ## Construir imagen Docker
	@echo "Construyendo imagen Docker..."
	@docker build -t software-contabilidad .

docker-run: ## Ejecutar con Docker
	@echo "Ejecutando con Docker..."
	@docker run -p 8080:8080 software-contabilidad

setup: install-deps setup-db ## Configuración inicial completa
	@echo "Configuración completada!"
	@echo "Ejecuta 'make dev' para iniciar en modo desarrollo"
