-- Script para configurar la base de datos PostgreSQL
-- Ejecutar como superusuario de PostgreSQL

-- Crear base de datos si no existe
CREATE DATABASE software_contabilidad;

-- Conectar a la base de datos
\c software_contabilidad;

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar que la extensión esté habilitada
SELECT uuid_generate_v4();
