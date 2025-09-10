import * as XLSX from 'xlsx';
import { prisma } from '../prisma';

// Columnas requeridas exactas según especificación
const REQUIRED_COLUMNS = [
  'ID entrega',
  'Nombre cosecha',
  'Nombre campo',
  'Ceco campo',
  'Etiquetas campo',
  'Cuartel',
  'Ceco cuartel',
  'Etiquetas cuartel',
  'Especie',
  'Variedad',
  'Fecha registro',
  'Hora registro',
  'Nombre trabajador',
  'ID trabajador',
  'Contratista',
  'ID contratista',
  'Etiquetas contratista',
  'Envase',
  'Nro envases',
  'Peso real',
  'Peso teorico',
  'Usuario',
  'ID usuario',
  'Cuadrilla',
  'Código de credencial utilizada en la entrega',
  'Código de envase'
];

export interface ExcelValidationResult {
  success: boolean;
  uploadId?: string;
  rows?: number;
  envases?: string[];
  errors?: string[];
  warnings?: string[];
}

export interface FactData {
  idEntrega?: string | null;
  nombreCosecha?: string | null;
  nombreCampo?: string | null;
  cecoCampo?: string | null;
  etiquetasCampo?: string | null;
  cuartel?: string | null;
  cecoCuartel?: string | null;
  etiquetasCuartel?: string | null;
  especie?: string | null;
  variedad?: string | null;
  fecha?: Date | null;
  hora?: string | null;
  nombreTrab?: string | null;
  idTrab?: number | null;
  contratista?: string | null;
  idContratista?: number | null;
  etiquetasContratista?: string | null;
  envase?: string | null;
  nroEnvases: number;
  pesoReal: number;
  pesoTeorico: number;
  usuario?: string | null;
  idUsuario?: number | null;
  cuadrilla?: string | null;
  credencialEntrega?: string | null;
  codigoEnvase?: string | null;
}

/**
 * Parsea una fecha desde string con múltiples formatos
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  try {
    // Intentar parseo directo primero
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Intentar formato DD/MM/YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
      const day = Number(ddmmyyyy[1]);
      const month = Number(ddmmyyyy[2]);
      const year = Number(ddmmyyyy[3]);
      if (day > 0 && month > 0 && year > 0) {
        return new Date(year, month - 1, day);
      }
    }

    // Intentar formato YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd && yyyymmdd[1] && yyyymmdd[2] && yyyymmdd[3]) {
      const year = Number(yyyymmdd[1]);
      const month = Number(yyyymmdd[2]);
      const day = Number(yyyymmdd[3]);
      if (year > 0 && month > 0 && day > 0) {
        return new Date(year, month - 1, day);
      }
    }
  } catch (error) {
    // Si hay cualquier error, retornar null
  }

  return null;
}

/**
 * Convierte string a número con validación
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

/**
 * Convierte string a entero con validación
 */
function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'number' ? value : Number(String(value));
  return isNaN(num) ? null : Math.floor(num);
}

/**
 * Normaliza string (trim y preserva original para display)
 */
function normalizeString(value: any): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Valida que todas las columnas requeridas estén presentes
 */
function validateColumns(worksheet: XLSX.WorkSheet): string[] {
  const errors: string[] = [];
  const headers = Object.keys(worksheet).filter(key => key.match(/^[A-Z]+1$/));
  
  for (const requiredCol of REQUIRED_COLUMNS) {
    const found = headers.some(header => {
      const cellRef = header;
      const cellValue = worksheet[cellRef]?.v;
      return cellValue === requiredCol;
    });
    
    if (!found) {
      errors.push(`Columna requerida no encontrada: "${requiredCol}"`);
    }
  }
  
  return errors;
}

/**
 * Encuentra el índice de una columna por nombre
 */
function findColumnIndex(worksheet: XLSX.WorkSheet, columnName: string): number | null {
  const headers = Object.keys(worksheet).filter(key => key.match(/^[A-Z]+1$/));
  
  for (const header of headers) {
    const cellValue = worksheet[header]?.v;
    if (cellValue === columnName) {
      const colLetter = header.replace('1', '');
      return XLSX.utils.decode_col(colLetter);
    }
  }
  
  return null;
}

/**
 * Obtiene el valor de una celda por fila y columna
 */
function getCellValue(worksheet: XLSX.WorkSheet, row: number, colIndex: number): any {
  const colLetter = XLSX.utils.encode_col(colIndex);
  const cellRef = `${colLetter}${row}`;
  return worksheet[cellRef]?.v;
}

/**
 * Procesa una fila de datos y la convierte a FactData
 */
function processRow(worksheet: XLSX.WorkSheet, row: number, columnMap: Map<string, number>): FactData | null {
  const getValue = (colName: string) => getCellValue(worksheet, row, columnMap.get(colName)!);
  
  const fact: FactData = {
    nroEnvases: 0,
    pesoReal: 0,
    pesoTeorico: 0
  };

  // Campos de texto
  fact.idEntrega = normalizeString(getValue('ID entrega'));
  fact.nombreCosecha = normalizeString(getValue('Nombre cosecha'));
  fact.nombreCampo = normalizeString(getValue('Nombre campo'));
  fact.cecoCampo = normalizeString(getValue('Ceco campo'));
  fact.etiquetasCampo = normalizeString(getValue('Etiquetas campo'));
  fact.cuartel = normalizeString(getValue('Cuartel'));
  fact.cecoCuartel = normalizeString(getValue('Ceco cuartel'));
  fact.etiquetasCuartel = normalizeString(getValue('Etiquetas cuartel'));
  fact.especie = normalizeString(getValue('Especie'));
  fact.variedad = normalizeString(getValue('Variedad'));
  fact.hora = normalizeString(getValue('Hora registro'));
  fact.nombreTrab = normalizeString(getValue('Nombre trabajador'));
  fact.contratista = normalizeString(getValue('Contratista'));
  fact.etiquetasContratista = normalizeString(getValue('Etiquetas contratista'));
  fact.envase = normalizeString(getValue('Envase'));
  fact.usuario = normalizeString(getValue('Usuario'));
  fact.cuadrilla = normalizeString(getValue('Cuadrilla'));
  fact.credencialEntrega = normalizeString(getValue('Código de credencial utilizada en la entrega'));
  fact.codigoEnvase = normalizeString(getValue('Código de envase'));

  // Campos numéricos
  fact.idTrab = parseInteger(getValue('ID trabajador'));
  fact.idContratista = parseInteger(getValue('ID contratista'));
  fact.nroEnvases = parseInteger(getValue('Nro envases')) || 0;
  fact.pesoReal = parseNumber(getValue('Peso real')) || 0;
  fact.pesoTeorico = parseNumber(getValue('Peso teorico')) || 0;
  fact.idUsuario = parseInteger(getValue('ID usuario'));

  // Fecha
  fact.fecha = parseDate(getValue('Fecha registro'));

  return fact;
}

/**
 * Función principal para leer y procesar archivo Excel
 */
export async function readDATOS(fileBuffer: Buffer, filename: string): Promise<ExcelValidationResult> {
  console.log('📊 [READDATOS] Iniciando procesamiento de archivo:', filename);
  
  try {
    console.log('📖 [READDATOS] Leyendo archivo Excel con XLSX...');
    // Leer el archivo Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    console.log('✅ [READDATOS] Archivo Excel leído exitosamente');
    console.log('📋 [READDATOS] Hojas disponibles:', workbook.SheetNames);
    
    // Verificar que existe la hoja DATOS
    if (!workbook.SheetNames.includes('DATOS')) {
      console.log('❌ [READDATOS] Hoja DATOS no encontrada');
      return {
        success: false,
        errors: ['Hoja "DATOS" no encontrada en el archivo Excel']
      };
    }

    console.log('📄 [READDATOS] Obteniendo hoja DATOS...');
    const worksheet = workbook.Sheets['DATOS'];
    console.log('✅ [READDATOS] Hoja DATOS obtenida');
    
    // Validar columnas requeridas
    console.log('🔍 [READDATOS] Validando columnas requeridas...');
    const columnErrors = validateColumns(worksheet);
    if (columnErrors.length > 0) {
      console.log('❌ [READDATOS] Errores de columnas:', columnErrors);
      return {
        success: false,
        errors: columnErrors
      };
    }
    console.log('✅ [READDATOS] Columnas validadas correctamente');

    // Crear mapa de columnas
    console.log('🗺️ [READDATOS] Creando mapa de columnas...');
    const columnMap = new Map<string, number>();
    for (const colName of REQUIRED_COLUMNS) {
      const index = findColumnIndex(worksheet, colName);
      if (index !== null) {
        columnMap.set(colName, index);
        console.log(`📍 [READDATOS] Columna "${colName}" en índice ${index}`);
      } else {
        console.log(`⚠️ [READDATOS] Columna "${colName}" no encontrada`);
      }
    }
    console.log('✅ [READDATOS] Mapa de columnas creado');

    // Determinar rango de datos
    console.log('📏 [READDATOS] Determinando rango de datos...');
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const startRow = 2; // Saltar encabezados
    const endRow = range.e.r;
    console.log(`📊 [READDATOS] Rango original: ${worksheet['!ref']}, range.e.r: ${range.e.r}`);
    
    // Si el rango está mal calculado, intentar encontrar la última fila con datos
    let actualEndRow = endRow;
    if (endRow < startRow) {
      console.log('⚠️ [READDATOS] Rango inválido, buscando última fila con datos...');
      // Buscar la última fila con datos en la columna A
      for (let row = startRow; row < 100000; row++) {
        const cellRef = `A${row}`;
        const cellValue = worksheet[cellRef]?.v;
        if (row % 1000 === 0) { // Log cada 1000 filas para no saturar
          console.log(`🔍 [READDATOS] Verificando fila ${row}: ${cellValue}`);
        }
        if (cellValue === undefined || cellValue === null || cellValue === '') {
          actualEndRow = row - 1;
          break;
        }
      }
      console.log(`🔍 [READDATOS] Última fila encontrada: ${actualEndRow}`);
      
      // Si no encontramos datos, intentar con columnas específicas que sabemos que tienen datos
      if (actualEndRow < startRow) {
        console.log('⚠️ [READDATOS] No se encontraron datos en columna A, probando columnas específicas...');
        // Buscar en columnas que sabemos que tienen datos (ID entrega, Envase, etc.)
        const searchColumns = ['A', 'B', 'C', 'R', 'S']; // ID entrega, Nombre cosecha, Nombre campo, Envase, Nro envases
        for (const colLetter of searchColumns) {
          for (let row = startRow; row < 100000; row++) {
            const cellRef = `${colLetter}${row}`;
            const cellValue = worksheet[cellRef]?.v;
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              actualEndRow = Math.max(actualEndRow, row);
              if (row % 1000 === 0) { // Log cada 1000 filas para no saturar
                console.log(`🔍 [READDATOS] Datos encontrados en ${cellRef}: ${cellValue}`);
              }
            }
          }
        }
        console.log(`🔍 [READDATOS] Última fila con datos: ${actualEndRow}`);
      }
    }
    
    console.log(`📊 [READDATOS] Rango final: filas ${startRow} a ${actualEndRow} (total: ${actualEndRow - startRow + 1})`);

    // Procesar filas en lotes
    const BATCH_SIZE = 1000;
    const facts: FactData[] = [];
    const envases = new Set<string>();
    const warnings: string[] = [];

    console.log('🔄 [READDATOS] Procesando filas...');
    for (let row = startRow; row <= actualEndRow; row++) {
      if (row % 100 === 0) {
        console.log(`📈 [READDATOS] Procesando fila ${row}/${actualEndRow}`);
      }
      
      const fact = processRow(worksheet, row, columnMap);
      
      if (fact) {
        // Agregar envase al Set (incluso si está vacío)
        if (fact.envase && fact.envase.trim() !== '') {
          envases.add(fact.envase);
        } else {
          envases.add('Sin especificar');
        }

        // Validaciones de negocio
        if (!fact.envase || fact.envase.trim() === '') {
          warnings.push(`Fila ${row}: Envase vacío - se marcará como "Sin especificar"`);
        }

        if (!fact.idTrab) {
          warnings.push(`Fila ${row}: ID trabajador vacío - no se calculará pago`);
        }

        if (fact.nroEnvases < 0) {
          warnings.push(`Fila ${row}: Nro envases negativo - normalizado a 0`);
          fact.nroEnvases = 0;
        }

        facts.push(fact);
      }
    }

    console.log(`✅ [READDATOS] Procesamiento completado: ${facts.length} facts, ${envases.size} envases únicos`);

    if (facts.length === 0) {
      console.log('❌ [READDATOS] No se encontraron datos válidos');
      return {
        success: false,
        errors: ['No se encontraron datos válidos en el archivo']
      };
    }

    // Crear registro de upload
    console.log('💾 [READDATOS] Creando registro de upload en base de datos...');
    const upload = await prisma.upload.create({
      data: {
        filename,
        rows: facts.length
      }
    });
    console.log('✅ [READDATOS] Upload creado con ID:', upload.id);

    // Crear tabla consolidada DailyHarvest
    console.log('📊 [READDATOS] Creando tabla consolidada DailyHarvest...');
    const dailyHarvestMap = new Map<string, {
      fecha: Date;
      nombreTrabajador: string;
      contratista: string;
      cuartel: string;
      envase: string;
      cantidad: number;
    }>();

    let processedCount = 0;
    let skippedCount = 0;

    facts.forEach((fact, index) => {
      // Usar valores por defecto para campos faltantes
      const fecha = fact.fecha || new Date();
      const nombreTrabajador = fact.nombreTrab || 'Sin especificar';
      const contratista = fact.contratista || 'Sin especificar';
      const cuartel = fact.cuartel || 'Sin especificar';
      const envase = fact.envase || 'Sin especificar';
      const cantidad = fact.nroEnvases || 0;

      // Solo saltar si no hay cantidad (envases)
      if (cantidad <= 0) {
        skippedCount++;
        return;
      }

      const key = `${fecha.toISOString().split('T')[0]}-${nombreTrabajador}-${contratista}-${cuartel}-${envase}`;
      
      if (dailyHarvestMap.has(key)) {
        const existing = dailyHarvestMap.get(key)!;
        existing.cantidad += cantidad;
      } else {
        dailyHarvestMap.set(key, {
          fecha,
          nombreTrabajador,
          contratista,
          cuartel,
          envase,
          cantidad
        });
      }
      
      processedCount++;
      
      // Log cada 1000 registros procesados
      if (processedCount % 1000 === 0) {
        console.log(`📊 [READDATOS] Consolidados: ${processedCount} registros procesados`);
      }
    });

    console.log(`📊 [READDATOS] Consolidación completada: ${processedCount} procesados, ${skippedCount} omitidos`);

    // Insertar registros consolidados
    const dailyHarvestData = Array.from(dailyHarvestMap.values()).map(item => ({
      uploadId: upload.id,
      fecha: item.fecha,
      nombreTrabajador: item.nombreTrabajador,
      contratista: item.contratista,
      cuartel: item.cuartel,
      envase: item.envase,
      cantidad: item.cantidad
    }));

    console.log(`📊 [READDATOS] Insertando ${dailyHarvestData.length} registros consolidados...`);
    await prisma.dailyHarvest.createMany({
      data: dailyHarvestData
    });
    console.log('✅ [READDATOS] Tabla consolidada creada exitosamente');

    // Insertar facts en lotes
    console.log('💾 [READDATOS] Insertando facts en base de datos...');
    for (let i = 0; i < facts.length; i += BATCH_SIZE) {
      const batch = facts.slice(i, i + BATCH_SIZE);
      console.log(`📦 [READDATOS] Insertando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(facts.length/BATCH_SIZE)} (${batch.length} facts)`);
      
      await prisma.fact.createMany({
        data: batch.map(fact => ({
          uploadId: upload.id,
          idEntrega: fact.idEntrega,
          nombreCosecha: fact.nombreCosecha,
          nombreCampo: fact.nombreCampo,
          cecoCampo: fact.cecoCampo,
          etiquetasCampo: fact.etiquetasCampo,
          cuartel: fact.cuartel,
          cecoCuartel: fact.cecoCuartel,
          etiquetasCuartel: fact.etiquetasCuartel,
          especie: fact.especie,
          variedad: fact.variedad,
          fecha: fact.fecha,
          hora: fact.hora,
          nombreTrab: fact.nombreTrab,
          idTrab: fact.idTrab,
          contratista: fact.contratista,
          idContratista: fact.idContratista,
          etiquetasContratista: fact.etiquetasContratista,
          envase: fact.envase,
          nroEnvases: fact.nroEnvases,
          pesoReal: fact.pesoReal,
          pesoTeorico: fact.pesoTeorico,
          usuario: fact.usuario,
          idUsuario: fact.idUsuario,
          cuadrilla: fact.cuadrilla,
          credencialEntrega: fact.credencialEntrega,
          codigoEnvase: fact.codigoEnvase
        }))
      });
      console.log(`✅ [READDATOS] Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado`);
    }

    console.log('🎉 [READDATOS] Procesamiento completado exitosamente');
    return {
      success: true,
      uploadId: upload.id,
      rows: facts.length,
      envases: Array.from(envases).sort(),
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('Error procesando archivo Excel:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
    }
    
    return {
      success: false,
      errors: [`Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    };
  }
}
