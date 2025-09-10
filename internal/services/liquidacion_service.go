package services

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"time"

	"software-contabilidad/internal/models"
	"software-contabilidad/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/xuri/excelize/v2"
)

type LiquidacionService interface {
	GenerarLiquidacion(preciosEnvases map[string]float64) ([]byte, string, error)
	GetLiquidacionTrabajador(nombreTrabajador string) ([]models.LiquidacionTrabajador, error)
	// Métodos optimizados
	ProcessExcelFileWithCopy(file interface{}, filename string, preciosEnvases map[string]float64) error
	GetLiquidacionesOptimizadas(fechaInicio, fechaFin time.Time) ([]models.LiquidacionOptimizada, error)
	GetResumenTrabajador(fechaInicio, fechaFin time.Time) ([]models.ResumenTrabajador, error)
	GetEnvasesOptimizados() ([]models.EnvaseInfo, error)
}

type liquidacionService struct {
	liquidacionRepo repository.LiquidacionRepository
	entregaRepo     repository.EntregaRepository
	precioRepo      repository.PrecioEnvaseRepository
	pgxConn         *pgx.Conn // Conexión pgx para optimizaciones
}

func NewLiquidacionService(liquidacionRepo repository.LiquidacionRepository, entregaRepo repository.EntregaRepository, precioRepo repository.PrecioEnvaseRepository) LiquidacionService {
	return &liquidacionService{
		liquidacionRepo: liquidacionRepo,
		entregaRepo:     entregaRepo,
		precioRepo:      precioRepo,
		pgxConn:         nil, // Se configurará después si está disponible
	}
}

// NewLiquidacionServiceWithPGX crea un servicio de liquidación con conexión pgx
func NewLiquidacionServiceWithPGX(liquidacionRepo repository.LiquidacionRepository, entregaRepo repository.EntregaRepository, precioRepo repository.PrecioEnvaseRepository, pgxConn *pgx.Conn) LiquidacionService {
	return &liquidacionService{
		liquidacionRepo: liquidacionRepo,
		entregaRepo:     entregaRepo,
		precioRepo:      precioRepo,
		pgxConn:         pgxConn,
	}
}

// SetPGXConn configura la conexión pgx para optimizaciones
func (s *liquidacionService) SetPGXConn(conn *pgx.Conn) {
	s.pgxConn = conn
}

func (s *liquidacionService) GenerarLiquidacion(preciosEnvases map[string]float64) ([]byte, string, error) {
	// Limpiar liquidaciones existentes
	if err := s.liquidacionRepo.DeleteAll(); err != nil {
		return nil, "", fmt.Errorf("error limpiando liquidaciones existentes: %v", err)
	}

	// Generar liquidaciones directamente desde BD usando SQL optimizado
	archivoExcel, err := s.generarLiquidacionesOptimizadas(preciosEnvases)
	if err != nil {
		return nil, "", fmt.Errorf("error generando liquidaciones: %v", err)
	}

	nombreArchivo := fmt.Sprintf("liquidaciones_tablas_dinamicas_%s.xlsx", time.Now().Format("2006-01-02_15-04-05"))
	return archivoExcel, nombreArchivo, nil
}

func (s *liquidacionService) generarLiquidacionesOptimizadas(preciosEnvases map[string]float64) ([]byte, error) {
	// Crear tabla temporal de precios para JOIN eficiente
	if err := s.crearTablaTemporalPrecios(preciosEnvases); err != nil {
		return nil, fmt.Errorf("error creando tabla temporal de precios: %v", err)
	}

	// Generar Excel directamente desde consulta SQL optimizada
	file := excelize.NewFile()
	defer file.Close()

	// Usar la hoja por defecto
	sheetName := "Liquidaciones"

	// Agregar encabezados
	headers := []string{"Trabajador", "Fecha", "Envase", "Precio Pieza", "Cantidad Pieza", "Costo Piezas", "Precio Hora", "Cantidad Horas", "Costo Hora"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		file.SetCellValue(sheetName, cell, header)
	}

	// Consulta SQL optimizada que genera liquidaciones directamente
	query := `
		SELECT 
			e.nombre_trabajador,
			e.fecha_registro,
			e.envase,
			COALESCE(tp.precio, 0) as precio_pieza,
			e.nro_envases as cantidad_pieza,
			COALESCE(tp.precio, 0) * e.nro_envases as costo_piezas,
			NULL as precio_hora,
			NULL as cantidad_horas,
			NULL as costo_hora
		FROM entregas e
		LEFT JOIN temp_precios tp ON e.envase = tp.envase
		WHERE tp.precio IS NOT NULL
		ORDER BY e.nombre_trabajador, e.fecha_registro, e.envase
	`

	// Ejecutar consulta y escribir directamente al Excel
	rows, err := s.entregaRepo.GetDB().Raw(query).Rows()
	if err != nil {
		return nil, fmt.Errorf("error ejecutando consulta: %v", err)
	}
	defer rows.Close()

	rowNum := 2
	for rows.Next() {
		var trabajador, fecha, envase string
		var precioPieza, cantidadPieza, costoPiezas float64
		var precioHora, cantidadHoras, costoHora *float64

		if err := rows.Scan(&trabajador, &fecha, &envase, &precioPieza, &cantidadPieza, &costoPiezas, &precioHora, &cantidadHoras, &costoHora); err != nil {
			continue
		}

		// Escribir fila directamente al Excel
		file.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), trabajador)
		file.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), fecha)
		file.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), envase)
		file.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), precioPieza)
		file.SetCellValue(sheetName, fmt.Sprintf("E%d", rowNum), cantidadPieza)
		file.SetCellValue(sheetName, fmt.Sprintf("F%d", rowNum), costoPiezas)

		if precioHora != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("G%d", rowNum), *precioHora)
		}
		if cantidadHoras != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("H%d", rowNum), *cantidadHoras)
		}
		if costoHora != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("I%d", rowNum), *costoHora)
		}

		rowNum++

		// Log de progreso cada 10,000 filas
		if (rowNum-2)%10000 == 0 {
			fmt.Printf("Generadas %d liquidaciones...\n", rowNum-2)
		}
	}

	// Crear tabla dinámica optimizada
	if err := s.crearTablaDinamicaOptimizada(file, sheetName, rowNum-1); err != nil {
		return nil, fmt.Errorf("error creando tabla dinámica: %v", err)
	}

	// Ajustar ancho de columnas
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		file.SetColWidth(sheetName, col, col, 15)
	}

	// Agregar formato a los encabezados
	style, err := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E6F3FF"},
			Pattern: 1,
		},
	})
	if err == nil {
		file.SetCellStyle(sheetName, "A1", fmt.Sprintf("%c1", 'A'+len(headers)-1), style)
	}

	// Limpiar tabla temporal
	s.entregaRepo.GetDB().Exec("DROP TABLE IF EXISTS temp_precios")

	// Guardar archivo en buffer
	buffer, err := file.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("error escribiendo archivo a buffer: %v", err)
	}

	return buffer.Bytes(), nil
}

func (s *liquidacionService) crearTablaTemporalPrecios(preciosEnvases map[string]float64) error {
	// Crear tabla temporal de precios
	createTableSQL := `
		CREATE TEMP TABLE temp_precios (
			envase VARCHAR(255) PRIMARY KEY,
			precio DECIMAL(10,2)
		)
	`

	if err := s.entregaRepo.GetDB().Exec(createTableSQL).Error; err != nil {
		return err
	}

	// Insertar precios en lotes
	batchSize := 1000
	var values []string
	var args []interface{}

	for envase, precio := range preciosEnvases {
		values = append(values, "(?, ?)")
		args = append(args, envase, precio)

		if len(values) >= batchSize {
			insertSQL := fmt.Sprintf("INSERT INTO temp_precios (envase, precio) VALUES %s", strings.Join(values, ","))
			if err := s.entregaRepo.GetDB().Exec(insertSQL, args...).Error; err != nil {
				return err
			}
			values = []string{}
			args = []interface{}{}
		}
	}

	// Insertar lote restante
	if len(values) > 0 {
		insertSQL := fmt.Sprintf("INSERT INTO temp_precios (envase, precio) VALUES %s", strings.Join(values, ","))
		if err := s.entregaRepo.GetDB().Exec(insertSQL, args...).Error; err != nil {
			return err
		}
	}

	return nil
}

func (s *liquidacionService) crearTablaDinamicaOptimizada(file *excelize.File, sheetName string, totalRows int) error {
	// Crear una tabla dinámica en una nueva hoja
	pivotSheetName := "Tabla Dinámica"
	_, err := file.NewSheet(pivotSheetName)
	if err != nil {
		return fmt.Errorf("error creando hoja de tabla dinámica: %v", err)
	}

	// Agregar encabezados para la tabla dinámica
	pivotHeaders := []string{"Trabajador", "Fecha", "Envase", "Total Piezas", "Total Costo"}
	for i, header := range pivotHeaders {
		cell := fmt.Sprintf("%c1", 'A'+i)
		file.SetCellValue(pivotSheetName, cell, header)
	}

	// Usar consulta SQL optimizada para generar resumen
	query := `
		SELECT 
			e.nombre_trabajador,
			DATE(e.fecha_registro) as fecha,
			STRING_AGG(DISTINCT e.envase, ', ') as envases,
			SUM(e.nro_envases) as total_piezas,
			SUM(COALESCE(tp.precio, 0) * e.nro_envases) as total_costo
		FROM entregas e
		LEFT JOIN temp_precios tp ON e.envase = tp.envase
		WHERE tp.precio IS NOT NULL
		GROUP BY e.nombre_trabajador, DATE(e.fecha_registro)
		ORDER BY e.nombre_trabajador, DATE(e.fecha_registro)
	`

	rows, err := s.entregaRepo.GetDB().Raw(query).Rows()
	if err != nil {
		return fmt.Errorf("error ejecutando consulta de resumen: %v", err)
	}
	defer rows.Close()

	rowNum := 2
	hasData := false
	for rows.Next() {
		var trabajador, fecha, envases string
		var totalPiezas, totalCosto float64

		if err := rows.Scan(&trabajador, &fecha, &envases, &totalPiezas, &totalCosto); err != nil {
			continue
		}

		file.SetCellValue(pivotSheetName, fmt.Sprintf("A%d", rowNum), trabajador)
		file.SetCellValue(pivotSheetName, fmt.Sprintf("B%d", rowNum), fecha)
		file.SetCellValue(pivotSheetName, fmt.Sprintf("C%d", rowNum), envases)
		file.SetCellValue(pivotSheetName, fmt.Sprintf("D%d", rowNum), totalPiezas)
		file.SetCellValue(pivotSheetName, fmt.Sprintf("E%d", rowNum), totalCosto)

		rowNum++
		hasData = true
	}

	// Si no hay datos, agregar un mensaje informativo
	if !hasData {
		file.SetCellValue(pivotSheetName, "A2", "No hay datos para mostrar")
		file.SetCellValue(pivotSheetName, "B2", "Verifique que se hayan cargado entregas y configurado precios")
	}

	// Ajustar ancho de columnas en la tabla dinámica
	for i := 0; i < len(pivotHeaders); i++ {
		col := string(rune('A' + i))
		file.SetColWidth(pivotSheetName, col, col, 20)
	}

	// Agregar formato a los encabezados de la tabla dinámica
	style, err := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#D4E6F1"},
			Pattern: 1,
		},
	})
	if err == nil {
		file.SetCellStyle(pivotSheetName, "A1", fmt.Sprintf("%c1", 'A'+len(pivotHeaders)-1), style)
	}

	return nil
}

func (s *liquidacionService) generarArchivoExcelConTablasDinamicas(liquidaciones []*models.LiquidacionTrabajador) ([]byte, error) {
	file := excelize.NewFile()
	defer file.Close()

	// Usar la hoja por defecto
	sheetName := "Liquidaciones"

	// Agregar encabezados
	headers := []string{"Trabajador", "Fecha", "Envase", "Precio Pieza", "Cantidad Pieza", "Costo Piezas", "Precio Hora", "Cantidad Horas", "Costo Hora"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		file.SetCellValue(sheetName, cell, header)
	}

	// Ordenar liquidaciones por trabajador y fecha
	sort.Slice(liquidaciones, func(i, j int) bool {
		if liquidaciones[i].NombreTrabajador != liquidaciones[j].NombreTrabajador {
			return liquidaciones[i].NombreTrabajador < liquidaciones[j].NombreTrabajador
		}
		return liquidaciones[i].Fecha.Before(liquidaciones[j].Fecha)
	})

	// Agregar datos
	for row, liquidacion := range liquidaciones {
		rowNum := row + 2 // Empezar desde la fila 2

		file.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), liquidacion.NombreTrabajador)
		file.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), liquidacion.Fecha.Format("2006-01-02"))
		file.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), liquidacion.Envase)
		file.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), liquidacion.PrecioPieza)
		file.SetCellValue(sheetName, fmt.Sprintf("E%d", rowNum), liquidacion.CantidadPieza)
		file.SetCellValue(sheetName, fmt.Sprintf("F%d", rowNum), liquidacion.CostoPiezas)

		if liquidacion.PrecioHora != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("G%d", rowNum), *liquidacion.PrecioHora)
		}
		if liquidacion.CantidadHoras != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("H%d", rowNum), *liquidacion.CantidadHoras)
		}
		if liquidacion.CostoHora != nil {
			file.SetCellValue(sheetName, fmt.Sprintf("I%d", rowNum), *liquidacion.CostoHora)
		}
	}

	// Crear tabla dinámica
	totalRows := len(liquidaciones) + 1 // +1 para el encabezado
	err := s.crearTablaDinamica(file, sheetName, totalRows)
	if err != nil {
		return nil, fmt.Errorf("error creando tabla dinámica: %v", err)
	}

	// Ajustar ancho de columnas
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		file.SetColWidth(sheetName, col, col, 15)
	}

	// Agregar formato a los encabezados
	style, err := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E6F3FF"},
			Pattern: 1,
		},
	})
	if err == nil {
		file.SetCellStyle(sheetName, "A1", fmt.Sprintf("%c1", 'A'+len(headers)-1), style)
	}

	// Guardar archivo en buffer
	buffer, err := file.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("error escribiendo archivo a buffer: %v", err)
	}

	return buffer.Bytes(), nil
}

func (s *liquidacionService) crearTablaDinamica(file *excelize.File, sheetName string, totalRows int) error {
	// Crear una tabla dinámica en una nueva hoja
	pivotSheetName := "Tabla Dinámica"
	_, err := file.NewSheet(pivotSheetName)
	if err != nil {
		return fmt.Errorf("error creando hoja de tabla dinámica: %v", err)
	}

	// Agregar encabezados para la tabla dinámica
	pivotHeaders := []string{"Trabajador", "Fecha", "Envase", "Total Piezas", "Total Costo"}
	for i, header := range pivotHeaders {
		cell := fmt.Sprintf("%c1", 'A'+i)
		file.SetCellValue(pivotSheetName, cell, header)
	}

	// Crear resumen por trabajador y fecha usando los datos en memoria
	resumen := make(map[string]map[string]map[string]float64) // trabajador -> fecha -> envase -> {cantidad, costo}

	// Leer datos de la hoja principal para crear resumen
	for row := 2; row <= totalRows; row++ {
		trabajador, _ := file.GetCellValue(sheetName, fmt.Sprintf("A%d", row))
		fecha, _ := file.GetCellValue(sheetName, fmt.Sprintf("B%d", row))
		envase, _ := file.GetCellValue(sheetName, fmt.Sprintf("C%d", row))
		cantidad, _ := file.GetCellValue(sheetName, fmt.Sprintf("E%d", row))
		costo, _ := file.GetCellValue(sheetName, fmt.Sprintf("F%d", row))

		if trabajador == "" {
			continue
		}

		if resumen[trabajador] == nil {
			resumen[trabajador] = make(map[string]map[string]float64)
		}
		if resumen[trabajador][fecha] == nil {
			resumen[trabajador][fecha] = make(map[string]float64)
		}

		// Sumar cantidades y costos por envase
		if cantidadFloat, err := strconv.ParseFloat(cantidad, 64); err == nil {
			resumen[trabajador][fecha]["cantidad_"+envase] += cantidadFloat
		}
		if costoFloat, err := strconv.ParseFloat(costo, 64); err == nil {
			resumen[trabajador][fecha]["costo_"+envase] += costoFloat
		}
	}

	// Escribir resumen en la tabla dinámica solo si hay datos
	row := 2
	hasData := false
	for trabajador, fechas := range resumen {
		for fecha, envases := range fechas {
			// Calcular totales
			var totalPiezas, totalCosto float64
			var envasesList []string

			for key, value := range envases {
				if strings.HasPrefix(key, "cantidad_") {
					envase := strings.TrimPrefix(key, "cantidad_")
					envasesList = append(envasesList, envase)
					totalPiezas += value
					totalCosto += envases["costo_"+envase]
				}
			}

			if totalPiezas > 0 || totalCosto > 0 {
				file.SetCellValue(pivotSheetName, fmt.Sprintf("A%d", row), trabajador)
				file.SetCellValue(pivotSheetName, fmt.Sprintf("B%d", row), fecha)
				file.SetCellValue(pivotSheetName, fmt.Sprintf("C%d", row), strings.Join(envasesList, ", "))
				file.SetCellValue(pivotSheetName, fmt.Sprintf("D%d", row), totalPiezas)
				file.SetCellValue(pivotSheetName, fmt.Sprintf("E%d", row), totalCosto)
				row++
				hasData = true
			}
		}
	}

	// Si no hay datos, agregar un mensaje informativo
	if !hasData {
		file.SetCellValue(pivotSheetName, "A2", "No hay datos para mostrar")
		file.SetCellValue(pivotSheetName, "B2", "Verifique que se hayan cargado entregas y configurado precios")
	}

	// Ajustar ancho de columnas en la tabla dinámica
	for i := 0; i < len(pivotHeaders); i++ {
		col := string(rune('A' + i))
		file.SetColWidth(pivotSheetName, col, col, 20)
	}

	// Agregar formato a los encabezados de la tabla dinámica
	style, err := file.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#D4E6F1"},
			Pattern: 1,
		},
	})
	if err == nil {
		file.SetCellStyle(pivotSheetName, "A1", fmt.Sprintf("%c1", 'A'+len(pivotHeaders)-1), style)
	}

	return nil
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

// ProcessExcelFileWithCopy procesa Excel usando COPY para máximo rendimiento
func (s *liquidacionService) ProcessExcelFileWithCopy(file interface{}, filename string, preciosEnvases map[string]float64) error {
	if s.pgxConn == nil {
		return fmt.Errorf("conexión pgx no disponible para procesamiento optimizado")
	}

	ctx := context.Background()

	// Limpiar staging table
	if _, err := s.pgxConn.Exec(ctx, "SELECT limpiar_staging()"); err != nil {
		return fmt.Errorf("error limpiando staging: %v", err)
	}

	// Leer archivo Excel
	xlFile, err := excelize.OpenReader(file.(io.Reader))
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

	// Preparar datos para COPY
	copyData := make([][]interface{}, 0, len(rows)-1)
	procesadas := 0
	errores := 0

	for i, row := range rows[1:] {
		// Saltar filas vacías
		if len(row) == 0 || (len(row) == 1 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		eventoData, err := s.parseRowToEventoData(row, i+2, preciosEnvases)
		if err != nil {
			errores++
			continue
		}

		copyData = append(copyData, eventoData)
		procesadas++

		// Log de progreso cada 10,000 filas
		if procesadas%10000 == 0 {
			fmt.Printf("Procesadas %d filas...\n", procesadas)
		}
	}

	if len(copyData) == 0 {
		return fmt.Errorf("no se encontraron datos válidos para procesar")
	}

	// Usar COPY para inserción masiva
	if err := s.insertWithCopy(ctx, copyData); err != nil {
		return fmt.Errorf("error insertando con COPY: %v", err)
	}

	// Procesar staging a tabla principal
	var rowsProcessed int
	if err := s.pgxConn.QueryRow(ctx, "SELECT procesar_staging()").Scan(&rowsProcessed); err != nil {
		return fmt.Errorf("error procesando staging: %v", err)
	}

	fmt.Printf("Procesamiento completado: %d filas procesadas, %d errores\n", rowsProcessed, errores)
	return nil
}

// GetLiquidacionesOptimizadas obtiene liquidaciones usando agregación SQL
func (s *liquidacionService) GetLiquidacionesOptimizadas(fechaInicio, fechaFin time.Time) ([]models.LiquidacionOptimizada, error) {
	if s.pgxConn == nil {
		return nil, fmt.Errorf("conexión pgx no disponible para consultas optimizadas")
	}

	ctx := context.Background()

	query := `
		SELECT 
			dia,
			cosechero_id,
			cosechero_nombre,
			envase,
			n_registros,
			total_cantidad,
			precio_promedio,
			costo_total,
			primera_hora,
			ultima_hora,
			campos,
			cuarteles
		FROM liquidaciones_view
		WHERE dia BETWEEN $1 AND $2
		ORDER BY dia, cosechero_nombre, envase
	`

	rows, err := s.pgxConn.Query(ctx, query, fechaInicio, fechaFin)
	if err != nil {
		return nil, fmt.Errorf("error ejecutando consulta: %v", err)
	}
	defer rows.Close()

	var liquidaciones []models.LiquidacionOptimizada
	for rows.Next() {
		var l models.LiquidacionOptimizada
		var primeraHora, ultimaHora sql.NullString
		var campos, cuarteles sql.NullString

		err := rows.Scan(
			&l.Dia, &l.CosecheroID, &l.CosecheroNombre, &l.Envase,
			&l.NRegistros, &l.TotalCantidad, &l.PrecioPromedio, &l.CostoTotal,
			&primeraHora, &ultimaHora, &campos, &cuarteles,
		)
		if err != nil {
			return nil, fmt.Errorf("error escaneando fila: %v", err)
		}

		if primeraHora.Valid {
			l.PrimeraHora = primeraHora.String
		}
		if ultimaHora.Valid {
			l.UltimaHora = ultimaHora.String
		}
		if campos.Valid {
			l.Campos = campos.String
		}
		if cuarteles.Valid {
			l.Cuarteles = cuarteles.String
		}

		liquidaciones = append(liquidaciones, l)
	}

	return liquidaciones, nil
}

// GetResumenTrabajador obtiene resumen por trabajador
func (s *liquidacionService) GetResumenTrabajador(fechaInicio, fechaFin time.Time) ([]models.ResumenTrabajador, error) {
	if s.pgxConn == nil {
		return nil, fmt.Errorf("conexión pgx no disponible para consultas optimizadas")
	}

	ctx := context.Background()

	query := `
		SELECT 
			dia,
			cosechero_id,
			cosechero_nombre,
			tipos_envase,
			total_piezas,
			costo_total,
			primera_hora,
			ultima_hora
		FROM resumen_trabajador
		WHERE dia BETWEEN $1 AND $2
		ORDER BY dia, cosechero_nombre
	`

	rows, err := s.pgxConn.Query(ctx, query, fechaInicio, fechaFin)
	if err != nil {
		return nil, fmt.Errorf("error ejecutando consulta: %v", err)
	}
	defer rows.Close()

	var resumenes []models.ResumenTrabajador
	for rows.Next() {
		var r models.ResumenTrabajador
		var primeraHora, ultimaHora sql.NullString

		err := rows.Scan(
			&r.Dia, &r.CosecheroID, &r.CosecheroNombre, &r.TiposEnvase,
			&r.TotalPiezas, &r.CostoTotal, &primeraHora, &ultimaHora,
		)
		if err != nil {
			return nil, fmt.Errorf("error escaneando fila: %v", err)
		}

		if primeraHora.Valid {
			r.PrimeraHora = primeraHora.String
		}
		if ultimaHora.Valid {
			r.UltimaHora = ultimaHora.String
		}

		resumenes = append(resumenes, r)
	}

	return resumenes, nil
}

// Métodos auxiliares para procesamiento optimizado
func (s *liquidacionService) parseRowToEventoData(row []string, rowNum int, preciosEnvases map[string]float64) ([]interface{}, error) {
	if len(row) < 25 {
		return nil, fmt.Errorf("fila %d tiene solo %d columnas, se necesitan al menos 25", rowNum, len(row))
	}

	// Parsear fecha
	fechaStr := s.getRowValue(row, 10)
	ts, err := s.parseFecha(fechaStr)
	if err != nil {
		return nil, fmt.Errorf("error parseando fecha en fila %d: %v", rowNum, err)
	}

	// Obtener datos básicos
	cosecheroID := s.parseInt(s.getRowValue(row, 13))
	cosecheroNombre := s.getRowValue(row, 12)
	envase := s.getRowValue(row, 17)
	cantidad := s.parseInt(s.getRowValue(row, 18))

	// Obtener precio
	precio, exists := preciosEnvases[envase]
	if !exists {
		return nil, fmt.Errorf("no hay precio definido para envase '%s' en fila %d", envase, rowNum)
	}

	// Determinar tipo de tarea (1=capacho, 2=otro)
	tarea := int16(2) // Por defecto otro
	if strings.Contains(strings.ToLower(envase), "capacho") {
		tarea = 1
	}

	// Preparar datos para COPY
	return []interface{}{
		ts.Format("2006-01-02 15:04:05"),     // ts
		cosecheroID,                          // cosechero_id
		cosecheroNombre,                      // cosechero_nombre
		tarea,                                // tarea
		envase,                               // envase
		cantidad,                             // cantidad
		precio,                               // precio
		s.getRowValue(row, 2),                // campo
		s.getRowValue(row, 5),                // cuartel
		s.getRowValue(row, 8),                // especie
		s.getRowValue(row, 9),                // variedad
		s.parseFloat(s.getRowValue(row, 19)), // peso_real
		s.parseFloat(s.getRowValue(row, 20)), // peso_teorico
		s.getRowValue(row, 21),               // usuario
		s.getRowValue(row, 23),               // cuadrilla
	}, nil
}

func (s *liquidacionService) insertWithCopy(ctx context.Context, data [][]interface{}) error {
	// Crear CopyFromSource
	copySource := pgx.CopyFromRows(data)

	// Ejecutar COPY
	_, err := s.pgxConn.CopyFrom(
		ctx,
		pgx.Identifier{"evento_staging"},
		[]string{
			"ts", "cosechero_id", "cosechero_nombre", "tarea", "envase", "cantidad", "precio",
			"campo", "cuartel", "especie", "variedad", "peso_real", "peso_teorico", "usuario", "cuadrilla",
		},
		copySource,
	)

	return err
}

func (s *liquidacionService) getRowValue(row []string, index int) string {
	if index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func (s *liquidacionService) parseInt(str string) int {
	if str == "" {
		return 0
	}
	str = strings.ReplaceAll(str, ",", "")
	str = strings.ReplaceAll(str, ".", "")
	val, _ := strconv.Atoi(str)
	return val
}

func (s *liquidacionService) parseFloat(str string) float64 {
	if str == "" {
		return 0
	}
	str = strings.TrimSpace(str)
	val, _ := strconv.ParseFloat(str, 64)
	return val
}

func (s *liquidacionService) parseFecha(fechaStr string) (time.Time, error) {
	// Intentar diferentes formatos de fecha
	formatos := []string{
		"2006-01-02 15:04:05",
		"2006-01-02",
		"02/01/2006 15:04:05",
		"02/01/2006",
		"01/02/2006 15:04:05",
		"01/02/2006",
	}

	for _, formato := range formatos {
		if ts, err := time.Parse(formato, fechaStr); err == nil {
			return ts, nil
		}
	}

	// Si no se puede parsear, usar fecha actual
	return time.Now(), fmt.Errorf("no se pudo parsear fecha: %s", fechaStr)
}

// GetEnvasesOptimizados obtiene envases únicos desde la tabla optimizada
func (s *liquidacionService) GetEnvasesOptimizados() ([]models.EnvaseInfo, error) {
	if s.pgxConn == nil {
		// Fallback a método tradicional si pgx no está disponible
		return s.entregaRepo.GetEnvases()
	}

	ctx := context.Background()

	query := `
		SELECT DISTINCT envase, COUNT(*) as cantidad
		FROM evento
		GROUP BY envase
		ORDER BY envase
	`

	rows, err := s.pgxConn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error ejecutando consulta: %v", err)
	}
	defer rows.Close()

	var envases []models.EnvaseInfo
	for rows.Next() {
		var envase models.EnvaseInfo
		err := rows.Scan(&envase.Envase, &envase.Count)
		if err != nil {
			return nil, fmt.Errorf("error escaneando fila: %v", err)
		}
		envases = append(envases, envase)
	}

	return envases, nil
}
