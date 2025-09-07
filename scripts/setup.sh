#!/bin/bash

# Script de configuración inicial para Software de Contabilidad

set -e

echo "🚀 Configurando Software de Contabilidad..."

# Verificar dependencias
echo "📋 Verificando dependencias..."

# Verificar Go
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado. Por favor instala Go 1.21+"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo "✅ Go $GO_VERSION encontrado"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
echo "✅ Node.js $NODE_VERSION encontrado"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Por favor instala PostgreSQL 13+"
    exit 1
fi

echo "✅ PostgreSQL encontrado"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Por favor revisa la configuración."
else
    echo "✅ Archivo .env ya existe"
fi

# Instalar dependencias de Go
echo "📦 Instalando dependencias de Go..."
go mod download
go mod tidy

# Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
cd web
npm install
cd ..

# Crear base de datos
echo "🗄️ Configurando base de datos..."
DB_NAME="software_contabilidad"
DB_USER="postgres"

# Intentar crear la base de datos
if createdb -h localhost -U $DB_USER $DB_NAME 2>/dev/null; then
    echo "✅ Base de datos '$DB_NAME' creada"
else
    echo "ℹ️ Base de datos '$DB_NAME' ya existe o no se pudo crear"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "Para iniciar el proyecto:"
echo "  make dev          # Modo desarrollo (backend + frontend)"
echo "  make run-backend  # Solo backend"
echo "  make run-frontend # Solo frontend"
echo ""
echo "Para compilar para producción:"
echo "  make build"
echo ""
echo "Para usar Docker:"
echo "  docker-compose up -d"
echo ""
echo "¡Disfruta desarrollando! 🚀"
