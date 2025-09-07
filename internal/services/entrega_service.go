package services

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"software-contabilidad/internal/models"
	"software-contabilidad/internal/repository"

	"github.com/xuri/excelize/v2"
)

type EntregaService interface {
	ProcessExcelFile(file io.Reader, filename string) error
	GetEnvases() ([]models.EnvaseInfo, error)
	GetTrabajadores() ([]string, error)
}

type entregaService struct {
	entregaRepo repository.EntregaRepository
}

func NewEntregaService(entregaRepo repository.EntregaRepository) EntregaService {
	return &entregaService{
		entregaRepo: entregaRepo,
	}
}

func (s *entregaService) ProcessExcelFile(file io.Reader, filename string) error {
	// Limpiar datos existentes
	if err := s.entregaRepo.DeleteAll(); err != nil {
		return fmt.Errorf("error limpiando datos existentes: %v", err)
	}

	// Leer archivo Excel
	xlFile, err := excelize.OpenReader(file)
	if err != nil {
		return fmt.Errorf("error abriendo archivo Excel: %v", err)
	}
	defer xlFile.Close()

	// Obtener la primera hoja
	sheetName := xlFile.GetSheetName(0)
	if sheetName == "" {
		return fmt.Errorf("no se encontraron hojas en el archivo")
	}

	// Leer todas las filas
	rows, err := xlFile.GetRows(sheetName)
	if err != nil {
		return fmt.Errorf("error leyendo filas: %v", err)
	}

	if len(rows) < 2 {
		return fmt.Errorf("el archivo debe tener al menos una fila de encabezados y una fila de datos")
	}

	// Procesar cada fila (saltando el encabezado)
	procesadas := 0
	errores := 0
	
	for i, row := range rows[1:] {
		// Saltar filas vacías
		if len(row) == 0 || (len(row) == 1 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		entrega, err := s.parseRowToEntrega(row, i+2) // +2 porque empezamos desde la fila 2
		if err != nil {
			fmt.Printf("Error procesando fila %d: %v\n", i+2, err)
			errores++
			continue
		}

		if err := s.entregaRepo.Create(entrega); err != nil {
			fmt.Printf("Error guardando entrega en fila %d: %v\n", i+2, err)
			errores++
			continue
		}
		
		procesadas++
	}
	
	fmt.Printf("Procesamiento completado: %d filas procesadas, %d errores\n", procesadas, errores)

	return nil
}

func (s *entregaService) parseRowToEntrega(row []string, rowNum int) (*models.Entrega, error) {
	// Verificar que la fila tenga suficientes columnas (25 para el formato CSV con punto y coma)
	if len(row) < 25 {
		return nil, fmt.Errorf("fila %d tiene solo %d columnas, se necesitan al menos 25", rowNum, len(row))
	}

	// Parsear fecha con múltiples formatos
	var fechaRegistro time.Time
	var err error
	
	fechaStr := s.getRowValue(row, 10)
	fmt.Printf("Intentando parsear fecha: '%s' (fila %d)\n", fechaStr, rowNum)
	
	// Primero intentar parsear como número de Excel (días desde 1900-01-01)
	if fechaNum, parseErr := strconv.ParseFloat(fechaStr, 64); parseErr == nil {
		// Convertir número de Excel a fecha
		// Excel cuenta días desde 1900-01-01, pero tiene un bug: considera 1900 como año bisiesto
		// Por eso restamos 2 días
		excelEpoch := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
		fechaRegistro = excelEpoch.AddDate(0, 0, int(fechaNum)-2)
		fmt.Printf("Fecha parseada desde número de Excel: %s\n", fechaRegistro.Format("2006-01-02"))
	} else {
		// Intentar diferentes formatos de fecha como string
		formatos := []string{
			"2006-01-02",     // 2025-08-25
			"01-02-06",       // 08-24-25 (MM-DD-YY)
			"02/01/2006",     // 25/08/2025
			"01/02/06",       // 08/24/25 (MM/DD/YY)
			"2006-01-02 15:04:05",
			"02/01/2006 15:04:05",
			"2006-01-02T15:04:05Z",
			"2006-01-02T15:04:05.000Z",
		}
		
		for _, formato := range formatos {
			fechaRegistro, err = time.Parse(formato, fechaStr)
			if err == nil {
				fmt.Printf("Fecha parseada exitosamente: %s con formato %s\n", fechaRegistro.Format("2006-01-02"), formato)
				break
			}
		}
		
		if err != nil {
			// Si no se puede parsear, mostrar error y usar fecha actual
			fmt.Printf("Error parseando fecha '%s' en fila %d: %v\n", fechaStr, rowNum, err)
			fechaRegistro = time.Now()
		}
	}

	// Parsear números de forma más robusta
	nroEnvases := s.parseToInt(s.getRowValue(row, 18))
	pesoReal := s.parseToFloat(s.getRowValue(row, 19))
	pesoTeorico := s.parseToFloat(s.getRowValue(row, 20))

	// Crear entrega (mapeo para 25 columnas)
	entrega := &models.Entrega{
		IDEntrega:            s.getRowValue(row, 0),
		NombreCosecha:        s.getRowValue(row, 1),
		NombreCampo:          s.getRowValue(row, 2),
		CecoCampo:            s.getRowValue(row, 3),
		EtiquetasCampo:       s.stringPtr(s.getRowValue(row, 4)),
		Cuartel:              s.getRowValue(row, 5),
		CecoCuartel:          s.stringPtr(s.getRowValue(row, 6)),
		EtiquetasCuartel:     s.stringPtr(s.getRowValue(row, 7)),
		Especie:              s.getRowValue(row, 8),
		Variedad:             s.getRowValue(row, 9),
		FechaRegistro:        fechaRegistro,
		HoraRegistro:         s.getRowValue(row, 11),
		NombreTrabajador:     s.getRowValue(row, 12),
		IDTrabajador:         s.getRowValue(row, 13),
		Contratista:          s.stringPtr(s.getRowValue(row, 14)),
		IDContratista:        s.stringPtr(s.getRowValue(row, 15)),
		EtiquetasContratista: s.stringPtr(s.getRowValue(row, 16)),
		Envase:               s.getRowValue(row, 17),
		NroEnvases:           nroEnvases,
		PesoReal:             pesoReal,
		PesoTeorico:          pesoTeorico,
		Usuario:              s.getRowValue(row, 21),
		IDUsuario:            s.getRowValue(row, 22),
		Cuadrilla:            s.stringPtr(s.getRowValue(row, 23)),
		CodigoCredencial:     s.stringPtr(s.getRowValue(row, 24)),
		CodigoEnvase:         nil, // No hay columna 25, usar nil
	}

	return entrega, nil
}

func (s *entregaService) stringPtr(str string) *string {
	if str == "" {
		return nil
	}
	return &str
}

func (s *entregaService) parseToInt(str string) int {
	if str == "" {
		return 0
	}
	
	// Limpiar espacios y caracteres no numéricos
	str = strings.TrimSpace(str)
	str = strings.ReplaceAll(str, ",", "")
	str = strings.ReplaceAll(str, ".", "")
	
	val, err := strconv.Atoi(str)
	if err != nil {
		return 0
	}
	return val
}

func (s *entregaService) parseToFloat(str string) float64 {
	if str == "" {
		return 0
	}
	
	// Limpiar espacios
	str = strings.TrimSpace(str)
	
	val, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return 0
	}
	return val
}

func (s *entregaService) getRowValue(row []string, index int) string {
	if index >= len(row) {
		return ""
	}
	return row[index]
}

func (s *entregaService) GetEnvases() ([]models.EnvaseInfo, error) {
	return s.entregaRepo.GetEnvases()
}

func (s *entregaService) GetTrabajadores() ([]string, error) {
	entregas, err := s.entregaRepo.GetAll()
	if err != nil {
		return nil, err
	}

	// Obtener trabajadores únicos
	trabajadoresMap := make(map[string]bool)
	for _, entrega := range entregas {
		trabajadoresMap[entrega.NombreTrabajador] = true
	}

	var trabajadores []string
	for trabajador := range trabajadoresMap {
		trabajadores = append(trabajadores, trabajador)
	}

	return trabajadores, nil
}
