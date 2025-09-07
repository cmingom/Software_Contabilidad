-- Script para actualizar la tabla precios_envases para permitir múltiples precios por envase

-- Eliminar la restricción de unicidad en el campo envase
ALTER TABLE precios_envases DROP CONSTRAINT IF EXISTS idx_precios_envases_envase;

-- Agregar nuevas columnas
ALTER TABLE precios_envases ADD COLUMN IF NOT EXISTS cuartel VARCHAR(255);
ALTER TABLE precios_envases ADD COLUMN IF NOT EXISTS especie VARCHAR(255);
ALTER TABLE precios_envases ADD COLUMN IF NOT EXISTS variedad VARCHAR(255);
ALTER TABLE precios_envases ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_precios_envases_envase_activo ON precios_envases(envase, activo);
CREATE INDEX IF NOT EXISTS idx_precios_envases_contexto ON precios_envases(envase, cuartel, especie, variedad, activo);

-- Actualizar registros existentes para que estén activos
UPDATE precios_envases SET activo = true WHERE activo IS NULL;
