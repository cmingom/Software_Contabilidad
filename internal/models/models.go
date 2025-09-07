package models

import (
	"time"
)

type Entrega struct {
	ID                   string    `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	IDEntrega            string    `json:"id_entrega" gorm:"uniqueIndex"`
	NombreCosecha        string    `json:"nombre_cosecha"`
	NombreCampo          string    `json:"nombre_campo"`
	CecoCampo            string    `json:"ceco_campo"`
	EtiquetasCampo       *string   `json:"etiquetas_campo"`
	Cuartel              string    `json:"cuartel"`
	CecoCuartel          *string   `json:"ceco_cuartel"`
	EtiquetasCuartel     *string   `json:"etiquetas_cuartel"`
	Especie              string    `json:"especie"`
	Variedad             string    `json:"variedad"`
	FechaRegistro        time.Time `json:"fecha_registro"`
	HoraRegistro         string    `json:"hora_registro"`
	NombreTrabajador     string    `json:"nombre_trabajador"`
	IDTrabajador         string    `json:"id_trabajador"`
	Contratista          *string   `json:"contratista"`
	IDContratista        *string   `json:"id_contratista"`
	EtiquetasContratista *string   `json:"etiquetas_contratista"`
	Envase               string    `json:"envase"`
	NroEnvases           int       `json:"nro_envases"`
	PesoReal             float64   `json:"peso_real"`
	PesoTeorico          float64   `json:"peso_teorico"`
	Usuario              string    `json:"usuario"`
	IDUsuario            string    `json:"id_usuario"`
	Cuadrilla            *string   `json:"cuadrilla"`
	CodigoCredencial     *string   `json:"codigo_credencial"`
	CodigoEnvase         *string   `json:"codigo_envase"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

func (Entrega) TableName() string {
	return "entregas"
}

type PrecioEnvase struct {
	ID        string    `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	Envase    string    `json:"envase"`
	Precio    float64   `json:"precio"`
	Cuartel   *string   `json:"cuartel"`   // Opcional: para precios específicos por cuartel
	Especie   *string   `json:"especie"`   // Opcional: para precios específicos por especie
	Variedad  *string   `json:"variedad"`  // Opcional: para precios específicos por variedad
	Activo    bool      `json:"activo" gorm:"default:true"` // Para activar/desactivar precios
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (PrecioEnvase) TableName() string {
	return "precios_envases"
}

type LiquidacionTrabajador struct {
	ID               string    `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	NombreTrabajador string    `json:"nombre_trabajador"`
	Fecha            time.Time `json:"fecha"`
	Envase           string    `json:"envase"`
	PrecioPieza      float64   `json:"precio_pieza"`
	CantidadPieza    int       `json:"cantidad_pieza"`
	CostoPiezas      float64   `json:"costo_piezas"`
	PrecioHora       *float64  `json:"precio_hora"`
	CantidadHoras    *float64  `json:"cantidad_horas"`
	CostoHora        *float64  `json:"costo_hora"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (LiquidacionTrabajador) TableName() string {
	return "liquidaciones_trabajadores"
}

// DTOs para requests y responses
type UploadExcelRequest struct {
	PreciosEnvases map[string]float64 `json:"precios_envases"`
}

type EnvaseInfo struct {
	Envase string `json:"envase"`
	Count  int    `json:"count"`
}

type LiquidacionRequest struct {
	PreciosEnvases map[string]float64 `json:"precios_envases"`
}

type LiquidacionResponse struct {
	ArchivoExcel []byte `json:"archivo_excel"`
	NombreArchivo string `json:"nombre_archivo"`
}
