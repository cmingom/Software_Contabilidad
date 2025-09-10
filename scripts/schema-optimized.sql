-- Esquema optimizado para alto rendimiento con pgx + COPY
-- Diseñado para procesar 150k+ filas en <10 segundos

-- Tabla principal de eventos (entregas)
CREATE TABLE IF NOT EXISTS evento (
    id           bigserial PRIMARY KEY,
    ts           timestamptz NOT NULL,
    dia          date GENERATED ALWAYS AS (ts::date) STORED,
    cosechero_id int NOT NULL,
    cosechero_nombre text NOT NULL,
    tarea        smallint NOT NULL,         -- enum: 1=capacho, 2=otro envase
    envase       text NOT NULL,            -- tipo de envase
    cantidad     int NOT NULL DEFAULT 0,    -- número de envases
    precio       decimal(10,2) NOT NULL DEFAULT 0, -- precio por unidad
    costo_total  decimal(10,2) GENERATED ALWAYS AS (cantidad * precio) STORED,
    campo        text,
    cuartel      text,
    especie      text,
    variedad     text,
    peso_real    decimal(10,2),
    peso_teorico decimal(10,2),
    usuario      text,
    cuadrilla    text,
    created_at   timestamptz DEFAULT now()
);

-- Tabla de staging para carga rápida (UNLOGGED para máximo rendimiento)
CREATE UNLOGGED TABLE IF NOT EXISTS evento_staging (
    ts text,
    cosechero_id int,
    cosechero_nombre text,
    tarea smallint,
    envase text,
    cantidad int,
    precio decimal(10,2),
    campo text,
    cuartel text,
    especie text,
    variedad text,
    peso_real decimal(10,2),
    peso_teorico decimal(10,2),
    usuario text,
    cuadrilla text
);

-- Tabla de precios optimizada
CREATE TABLE IF NOT EXISTS precio_envase (
    id        bigserial PRIMARY KEY,
    envase    text NOT NULL,
    precio    decimal(10,2) NOT NULL,
    cuartel   text,
    especie   text,
    variedad  text,
    activo    boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(envase, cuartel, especie, variedad)
);

-- Índices optimizados para consultas de agregación
CREATE INDEX IF NOT EXISTS ix_evento_dia_cosechero ON evento (dia, cosechero_id);
CREATE INDEX IF NOT EXISTS ix_evento_ts ON evento (ts);
CREATE INDEX IF NOT EXISTS ix_evento_cosechero_ts ON evento (cosechero_id, ts);
CREATE INDEX IF NOT EXISTS ix_evento_envase ON evento (envase);
CREATE INDEX IF NOT EXISTS ix_precio_envase_lookup ON precio_envase (envase, cuartel, especie, variedad) WHERE activo = true;

-- Función para limpiar staging table
CREATE OR REPLACE FUNCTION limpiar_staging() RETURNS void AS $$
BEGIN
    TRUNCATE evento_staging;
END;
$$ LANGUAGE plpgsql;

-- Función para mover datos de staging a tabla principal
CREATE OR REPLACE FUNCTION procesar_staging() RETURNS int AS $$
DECLARE
    rows_processed int;
BEGIN
    -- Insertar datos de staging a tabla principal con conversión de tipos
    INSERT INTO evento (
        ts, cosechero_id, cosechero_nombre, tarea, envase, cantidad, precio,
        campo, cuartel, especie, variedad, peso_real, peso_teorico, usuario, cuadrilla
    )
    SELECT 
        to_timestamp(ts, 'YYYY-MM-DD HH24:MI:SS') AT TIME ZONE 'America/Santiago',
        cosechero_id, cosechero_nombre, tarea, envase, cantidad, precio,
        campo, cuartel, especie, variedad, peso_real, peso_teorico, usuario, cuadrilla
    FROM evento_staging;
    
    GET DIAGNOSTICS rows_processed = ROW_COUNT;
    
    -- Limpiar staging
    TRUNCATE evento_staging;
    
    RETURN rows_processed;
END;
$$ LANGUAGE plpgsql;

-- Vista optimizada para liquidaciones
CREATE OR REPLACE VIEW liquidaciones_view AS
SELECT 
    dia,
    cosechero_id,
    cosechero_nombre,
    envase,
    COUNT(*) as n_registros,
    SUM(cantidad) as total_cantidad,
    AVG(precio) as precio_promedio,
    SUM(costo_total) as costo_total,
    MIN(ts::time) as primera_hora,
    MAX(ts::time) as ultima_hora,
    STRING_AGG(DISTINCT campo, ', ') as campos,
    STRING_AGG(DISTINCT cuartel, ', ') as cuarteles
FROM evento
GROUP BY dia, cosechero_id, cosechero_nombre, envase;

-- Vista para resumen por trabajador
CREATE OR REPLACE VIEW resumen_trabajador AS
SELECT 
    dia,
    cosechero_id,
    cosechero_nombre,
    COUNT(DISTINCT envase) as tipos_envase,
    SUM(cantidad) as total_piezas,
    SUM(costo_total) as costo_total,
    MIN(ts::time) as primera_hora,
    MAX(ts::time) as ultima_hora
FROM evento
GROUP BY dia, cosechero_id, cosechero_nombre;

