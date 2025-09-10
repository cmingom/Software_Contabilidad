package models

import (
	"time"
)

// LiquidacionOptimizada representa una liquidación optimizada con agregación SQL
type LiquidacionOptimizada struct {
	Dia              time.Time `json:"dia"`
	CosecheroID      int       `json:"cosechero_id"`
	CosecheroNombre  string    `json:"cosechero_nombre"`
	Envase           string    `json:"envase"`
	NRegistros       int64     `json:"n_registros"`
	TotalCantidad    int64     `json:"total_cantidad"`
	PrecioPromedio   float64   `json:"precio_promedio"`
	CostoTotal       float64   `json:"costo_total"`
	PrimeraHora      string    `json:"primera_hora,omitempty"`
	UltimaHora       string    `json:"ultima_hora,omitempty"`
	Campos           string    `json:"campos,omitempty"`
	Cuarteles        string    `json:"cuarteles,omitempty"`
}

// ResumenTrabajador representa un resumen por trabajador
type ResumenTrabajador struct {
	Dia              time.Time `json:"dia"`
	CosecheroID      int       `json:"cosechero_id"`
	CosecheroNombre  string    `json:"cosechero_nombre"`
	TiposEnvase      int       `json:"tipos_envase"`
	TotalPiezas      int64     `json:"total_piezas"`
	CostoTotal       float64   `json:"costo_total"`
	PrimeraHora      string    `json:"primera_hora,omitempty"`
	UltimaHora       string    `json:"ultima_hora,omitempty"`
}

// EventoStaging representa datos de staging para COPY
type EventoStaging struct {
	TS              string  `json:"ts"`
	CosecheroID     int     `json:"cosechero_id"`
	CosecheroNombre string  `json:"cosechero_nombre"`
	Tarea           int16   `json:"tarea"`
	Envase          string  `json:"envase"`
	Cantidad        int     `json:"cantidad"`
	Precio          float64 `json:"precio"`
	Campo           string  `json:"campo"`
	Cuartel         string  `json:"cuartel"`
	Especie         string  `json:"especie"`
	Variedad        string  `json:"variedad"`
	PesoReal        float64 `json:"peso_real"`
	PesoTeorico     float64 `json:"peso_teorico"`
	Usuario         string  `json:"usuario"`
	Cuadrilla       string  `json:"cuadrilla"`
}

// LiquidacionExcelRequest representa la petición para generar Excel optimizado
type LiquidacionExcelRequest struct {
	FechaInicio time.Time `json:"fecha_inicio"`
	FechaFin    time.Time `json:"fecha_fin"`
	Formato     string    `json:"formato"` // "detallado" o "resumen"
}

// LiquidacionExcelResponse representa la respuesta con archivo Excel
type LiquidacionExcelResponse struct {
	ArchivoExcel  []byte `json:"archivo_excel"`
	NombreArchivo string `json:"nombre_archivo"`
	TotalFilas    int    `json:"total_filas"`
	TiempoProceso string `json:"tiempo_proceso"`
}

