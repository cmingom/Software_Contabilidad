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
	// Abrir Excel (no borres datos todavía)
	xlFile, err := excelize.OpenReader(file)
	if err != nil {
		return fmt.Errorf("abriendo Excel: %w", err)
	}
	defer xlFile.Close()

	sheetName := xlFile.GetSheetName(0)
	if sheetName == "" {
		return fmt.Errorf("no hay hojas en el archivo")
	}

	// Detectar sistema de fechas (1900/1904)
	date1904 := false
	// Por defecto usar sistema 1900, que es el más común

	const batchSize = 5000
	batch := make([]*models.Entrega, 0, batchSize)
	procesadas := 0
	errores := 0
	rowNum := 0
	deleted := false // borrar solo cuando vayamos a insertar el primer batch válido

	rows, err := xlFile.Rows(sheetName)
	if err != nil {
		return fmt.Errorf("iterando filas: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		rowNum++
		// Saltar cabecera
		if rowNum == 1 {
			continue
		}

		cols, err := rows.Columns()
		if err != nil {
			errores++
			continue
		}
		if allEmpty(cols) {
			continue
		}

		entrega, perr := s.parseRowToEntrega(cols, rowNum, date1904)
		if perr != nil {
			errores++
			// Log limitado
			if errores <= 5 {
				fmt.Printf("Fila %d: %v\n", rowNum, perr)
			}
			continue
		}

		batch = append(batch, entrega)

		if len(batch) >= batchSize {
			// Primer insert: borra datos antiguos justo antes de escribir
			if !deleted {
				if err := s.entregaRepo.DeleteAll(); err != nil {
					return fmt.Errorf("borrando datos previos: %w", err)
				}
				deleted = true
			}
			if err := s.entregaRepo.CreateBatch(batch); err != nil {
				errores += len(batch)
			} else {
				procesadas += len(batch)
			}
			batch = batch[:0]

			if procesadas%10000 == 0 {
				fmt.Printf("Procesadas %d filas...\n", procesadas)
			}
		}
	}

	// Último batch
	if len(batch) > 0 {
		if !deleted {
			if err := s.entregaRepo.DeleteAll(); err != nil {
				return fmt.Errorf("borrando datos previos: %w", err)
			}
			deleted = true
		}
		if err := s.entregaRepo.CreateBatch(batch); err != nil {
			errores += len(batch)
		} else {
			procesadas += len(batch)
		}
	}

	fmt.Printf("OK: %d filas insertadas, %d errores\n", procesadas, errores)
	if procesadas == 0 {
		return fmt.Errorf("no se insertó ninguna fila válida")
	}
	return nil
}

func (s *entregaService) parseRowToEntrega(row []string, rowNum int, date1904 bool) (*models.Entrega, error) {
	// Índices seguros (devuelven "" fuera de rango)
	get := func(i int) string {
		if i >= 0 && i < len(row) {
			return row[i]
		}
		return ""
	}

	// Fecha (col 10) en número Excel o string
	var fechaRegistro time.Time
	fechaStr := strings.TrimSpace(get(10))
	if fechaStr != "" {
		if n, err := strconv.ParseFloat(fechaStr, 64); err == nil {
			if t, e := excelize.ExcelDateToTime(n, date1904); e == nil {
				fechaRegistro = t
			}
		}
	}

	if fechaRegistro.IsZero() && fechaStr != "" {
		for _, f := range []string{
			"2006-01-02 15:04:05",
			"2006-01-02",
			"02/01/2006 15:04:05",
			"02/01/2006",
			time.RFC3339,
			"2006-01-02T15:04:05.000Z",
		} {
			if t, e := time.Parse(f, fechaStr); e == nil {
				fechaRegistro = t
				break
			}
		}
	}

	if fechaRegistro.IsZero() {
		return nil, fmt.Errorf("fecha inválida en fila %d: %q", rowNum, fechaStr)
	}

	nroEnvases := parseToInt(get(18))
	pesoReal := parseToFloat(get(19))
	pesoTeorico := parseToFloat(get(20))

	entrega := &models.Entrega{
		IDEntrega:            get(0),
		NombreCosecha:        get(1),
		NombreCampo:          get(2),
		CecoCampo:            get(3),
		EtiquetasCampo:       stringPtr(get(4)),
		Cuartel:              get(5),
		CecoCuartel:          stringPtr(get(6)),
		EtiquetasCuartel:     stringPtr(get(7)),
		Especie:              get(8),
		Variedad:             get(9),
		FechaRegistro:        fechaRegistro,
		HoraRegistro:         get(11),
		NombreTrabajador:     get(12),
		IDTrabajador:         get(13),
		Contratista:          stringPtr(get(14)),
		IDContratista:        stringPtr(get(15)),
		EtiquetasContratista: stringPtr(get(16)),
		Envase:               get(17),
		NroEnvases:           nroEnvases,
		PesoReal:             pesoReal,
		PesoTeorico:          pesoTeorico,
		Usuario:              get(21),
		IDUsuario:            get(22),
		Cuadrilla:            stringPtr(get(23)),
		CodigoCredencial:     stringPtr(get(24)),
		CodigoEnvase:         stringPtr(get(25)), // si no existe, queda nil
	}

	return entrega, nil
}

func stringPtr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}

func parseToInt(s string) int {
	if s = strings.TrimSpace(s); s == "" {
		return 0
	}
	// Normaliza separadores de miles y signo
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, ".", "")
	s = strings.ReplaceAll(s, ",", "")
	// Mantén posible signo
	sign := 1
	if strings.HasPrefix(s, "+") {
		s = s[1:]
	}
	if strings.HasPrefix(s, "-") {
		sign = -1
		s = s[1:]
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return sign * v
}

func parseToFloat(s string) float64 {
	if s = strings.TrimSpace(s); s == "" {
		return 0
	}
	s = strings.ReplaceAll(s, " ", "")
	// Si hay una sola coma y ningún punto, toma coma como decimal
	if strings.Count(s, ",") == 1 && strings.Count(s, ".") == 0 {
		s = strings.ReplaceAll(s, ",", ".")
	} else {
		// Asume comas como miles
		s = strings.ReplaceAll(s, ",", "")
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return v
}

func allEmpty(cols []string) bool {
	for _, c := range cols {
		if strings.TrimSpace(c) != "" {
			return false
		}
	}
	return true
}

func (s *entregaService) GetEnvases() ([]models.EnvaseInfo, error) {
	return s.entregaRepo.GetEnvases()
}

func (s *entregaService) GetTrabajadores() ([]string, error) {
	entregas, err := s.entregaRepo.GetAll()
	if err != nil {
		return nil, err
	}
	uniq := make(map[string]struct{}, len(entregas))
	for _, e := range entregas {
		if e.NombreTrabajador != "" {
			uniq[e.NombreTrabajador] = struct{}{}
		}
	}
	out := make([]string, 0, len(uniq))
	for k := range uniq {
		out = append(out, k)
	}
	return out, nil
}
