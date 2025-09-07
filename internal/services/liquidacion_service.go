package services

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"software-contabilidad/internal/models"
	"software-contabilidad/internal/repository"

	"github.com/xuri/excelize/v2"
)

type LiquidacionService interface {
	GenerarLiquidacion(preciosEnvases map[string]float64) ([]byte, string, error)
	GetLiquidacionTrabajador(nombreTrabajador string) ([]models.LiquidacionTrabajador, error)
}

type liquidacionService struct {
	liquidacionRepo repository.LiquidacionRepository
	entregaRepo     repository.EntregaRepository
	precioRepo      repository.PrecioEnvaseRepository
}

func NewLiquidacionService(liquidacionRepo repository.LiquidacionRepository, entregaRepo repository.EntregaRepository, precioRepo repository.PrecioEnvaseRepository) LiquidacionService {
	return &liquidacionService{
		liquidacionRepo: liquidacionRepo,
		entregaRepo:     entregaRepo,
		precioRepo:      precioRepo,
	}
}

func (s *liquidacionService) GenerarLiquidacion(preciosEnvases map[string]float64) ([]byte, string, error) {
	// Limpiar liquidaciones existentes
	if err := s.liquidacionRepo.DeleteAll(); err != nil {
		return nil, "", fmt.Errorf("error limpiando liquidaciones existentes: %v", err)
	}

	// Obtener todas las entregas
	entregas, err := s.entregaRepo.GetAll()
	if err != nil {
		return nil, "", fmt.Errorf("error obteniendo entregas: %v", err)
	}

	// Agrupar por trabajador y fecha (una fila por día)
	liquidaciones := make(map[string]map[string]*models.LiquidacionTrabajador)

	for _, entrega := range entregas {
		// Buscar precio específico por contexto (cuartel, especie, variedad)
		precioModel, err := s.precioRepo.GetByEnvaseAndContext(entrega.Envase, entrega.Cuartel, entrega.Especie, entrega.Variedad)
		if err != nil {
			// Si no se encuentra precio específico, usar precio general del mapa
			precio, exists := preciosEnvases[entrega.Envase]
			if !exists {
				continue // Saltar si no hay precio definido para este envase
			}
			// Crear precio general si no existe en la base de datos
			precioModel = &models.PrecioEnvase{
				Envase: entrega.Envase,
				Precio: precio,
				Activo: true,
			}
			s.precioRepo.Create(precioModel)
		}
		
		precio := precioModel.Precio

		// Key solo por trabajador y fecha (sin envase)
		fechaStr := entrega.FechaRegistro.Format("2006-01-02")
		key := fmt.Sprintf("%s_%s", entrega.NombreTrabajador, fechaStr)
		
		if liquidaciones[entrega.NombreTrabajador] == nil {
			liquidaciones[entrega.NombreTrabajador] = make(map[string]*models.LiquidacionTrabajador)
		}

		if liquidacion, exists := liquidaciones[entrega.NombreTrabajador][key]; exists {
			// Agregar a la liquidación existente del día
			liquidacion.CantidadPieza += entrega.NroEnvases
			liquidacion.CostoPiezas += float64(entrega.NroEnvases) * precio
		} else {
			// Crear nueva liquidación para el día
			liquidacion = &models.LiquidacionTrabajador{
				NombreTrabajador: entrega.NombreTrabajador,
				Fecha:            entrega.FechaRegistro,
				Envase:           "Total", // Usar "Total" para indicar que es la suma del día
				PrecioPieza:      precio, // Precio promedio (se puede ajustar si es necesario)
				CantidadPieza:    entrega.NroEnvases,
				CostoPiezas:      float64(entrega.NroEnvases) * precio,
			}
			liquidaciones[entrega.NombreTrabajador][key] = liquidacion
		}
	}

	// Guardar liquidaciones en la base de datos
	for _, trabajadorLiquidaciones := range liquidaciones {
		for _, liquidacion := range trabajadorLiquidaciones {
			if err := s.liquidacionRepo.Create(liquidacion); err != nil {
				return nil, "", fmt.Errorf("error guardando liquidación: %v", err)
			}
		}
	}

	// Generar archivo Excel
	archivoExcel, err := s.generarArchivoExcel(liquidaciones)
	if err != nil {
		return nil, "", fmt.Errorf("error generando archivo Excel: %v", err)
	}

	nombreArchivo := fmt.Sprintf("liquidaciones_%s.xlsx", time.Now().Format("2006-01-02_15-04-05"))
	return archivoExcel, nombreArchivo, nil
}

func (s *liquidacionService) generarArchivoExcel(liquidaciones map[string]map[string]*models.LiquidacionTrabajador) ([]byte, error) {
	file := excelize.NewFile()
	defer file.Close()

	// Eliminar la hoja por defecto
	file.DeleteSheet("Sheet1")

	// Crear una hoja por cada trabajador
	for nombreTrabajador, trabajadorLiquidaciones := range liquidaciones {
		// Crear hoja para el trabajador
		sheetName := s.limpiarNombreHoja(nombreTrabajador)
		_, err := file.NewSheet(sheetName)
		if err != nil {
			return nil, fmt.Errorf("error creando hoja para %s: %v", nombreTrabajador, err)
		}

		// Agregar encabezados
		headers := []string{"Fecha", "Envase", "Precio Pieza", "Cantidad Pieza", "Costo Piezas", "Precio Hora", "Cantidad Horas", "Costo Hora"}
		for i, header := range headers {
			cell := fmt.Sprintf("%c1", 'A'+i)
			file.SetCellValue(sheetName, cell, header)
		}

		// Convertir map a slice y ordenar por fecha
		var liquidacionesSlice []*models.LiquidacionTrabajador
		for _, liquidacion := range trabajadorLiquidaciones {
			liquidacionesSlice = append(liquidacionesSlice, liquidacion)
		}

		sort.Slice(liquidacionesSlice, func(i, j int) bool {
			return liquidacionesSlice[i].Fecha.Before(liquidacionesSlice[j].Fecha)
		})

		// Agregar datos
		for row, liquidacion := range liquidacionesSlice {
			rowNum := row + 2 // Empezar desde la fila 2
			
			file.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), liquidacion.Fecha.Format("2006-01-02"))
			file.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), liquidacion.Envase)
			file.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), liquidacion.PrecioPieza)
			file.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), liquidacion.CantidadPieza)
			file.SetCellValue(sheetName, fmt.Sprintf("E%d", rowNum), liquidacion.CostoPiezas)
			
			if liquidacion.PrecioHora != nil {
				file.SetCellValue(sheetName, fmt.Sprintf("F%d", rowNum), *liquidacion.PrecioHora)
			}
			if liquidacion.CantidadHoras != nil {
				file.SetCellValue(sheetName, fmt.Sprintf("G%d", rowNum), *liquidacion.CantidadHoras)
			}
			if liquidacion.CostoHora != nil {
				file.SetCellValue(sheetName, fmt.Sprintf("H%d", rowNum), *liquidacion.CostoHora)
			}
		}

		// Ajustar ancho de columnas
		for i := 0; i < len(headers); i++ {
			col := string(rune('A' + i))
			file.SetColWidth(sheetName, col, col, 15)
		}
	}

	// Guardar archivo en buffer
	buffer, err := file.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("error escribiendo archivo a buffer: %v", err)
	}

	return buffer.Bytes(), nil
}

func (s *liquidacionService) limpiarNombreHoja(nombre string) string {
	// Limpiar caracteres no válidos para nombres de hojas de Excel
	nombre = strings.ReplaceAll(nombre, "/", "_")
	nombre = strings.ReplaceAll(nombre, "\\", "_")
	nombre = strings.ReplaceAll(nombre, ":", "_")
	nombre = strings.ReplaceAll(nombre, "*", "_")
	nombre = strings.ReplaceAll(nombre, "?", "_")
	nombre = strings.ReplaceAll(nombre, "[", "_")
	nombre = strings.ReplaceAll(nombre, "]", "_")
	
	// Limitar longitud a 31 caracteres (límite de Excel)
	if len(nombre) > 31 {
		nombre = nombre[:31]
	}
	
	return nombre
}

func (s *liquidacionService) GetLiquidacionTrabajador(nombreTrabajador string) ([]models.LiquidacionTrabajador, error) {
	return s.liquidacionRepo.GetByTrabajador(nombreTrabajador)
}
