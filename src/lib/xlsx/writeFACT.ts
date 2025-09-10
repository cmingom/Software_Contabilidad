import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { prisma } from '../prisma';

export interface ExportOptions {
  includeFACT?: boolean;
  includePIVOT?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  errors?: string[];
}

/**
 * Obtiene datos consolidados de facts para un upload usando consulta SQL optimizada con cálculo de precios
 */
async function getFactsData(uploadId: string) {
  // Usar consulta SQL nativa con consolidación por trabajador, fecha, envase y cuartel
  return await prisma.$queryRaw`
    SELECT 
      f.fecha,
      f."nombreTrab",
      f."idTrab",
      f.envase,
      f.cuartel,
      f.contratista,
      SUM(f."nroEnvases")::INTEGER as "nroEnvases",
      COALESCE(
        -- Buscar regla específica por fecha, cuartel y envase
        (SELECT pr.amount FROM "PriceRule" pr 
         WHERE pr.envase = f.envase 
           AND (pr.cuartel IS NULL OR pr.cuartel = f.cuartel)
           AND (pr."dateStart" IS NULL OR pr."dateStart"::date = f.fecha::date)
           AND pr.active = true
         ORDER BY 
           CASE WHEN pr.cuartel IS NOT NULL AND pr."dateStart" IS NOT NULL THEN 1 ELSE 2 END,
           CASE WHEN pr.cuartel IS NOT NULL THEN 1 ELSE 2 END,
           CASE WHEN pr."dateStart" IS NOT NULL THEN 1 ELSE 2 END
         LIMIT 1),
        -- Si no hay regla específica, usar precio base
        (SELECT pb.price FROM "PriceBase" pb 
         WHERE pb.envase = f.envase AND pb.active = true
         LIMIT 1),
        0
      ) as "unitPrice",
      (SUM(f."nroEnvases")::INTEGER * COALESCE(
        (SELECT pr.amount FROM "PriceRule" pr 
         WHERE pr.envase = f.envase 
           AND (pr.cuartel IS NULL OR pr.cuartel = f.cuartel)
           AND (pr."dateStart" IS NULL OR pr."dateStart"::date = f.fecha::date)
           AND pr.active = true
         ORDER BY 
           CASE WHEN pr.cuartel IS NOT NULL AND pr."dateStart" IS NOT NULL THEN 1 ELSE 2 END,
           CASE WHEN pr.cuartel IS NOT NULL THEN 1 ELSE 2 END,
           CASE WHEN pr."dateStart" IS NOT NULL THEN 1 ELSE 2 END
         LIMIT 1),
        (SELECT pb.price FROM "PriceBase" pb 
         WHERE pb.envase = f.envase AND pb.active = true
         LIMIT 1),
        0
      ))::NUMERIC(10,2) as amount
    FROM "Fact" f
    WHERE f."uploadId" = ${uploadId}
    GROUP BY f.fecha, f."nombreTrab", f."idTrab", f.envase, f.cuartel, f.contratista
    ORDER BY f."idTrab" ASC, f.fecha ASC, f.envase ASC
  `;
}

/**
 * Crea la hoja FACT con todos los datos
 */
async function createFACTSheet(workbook: ExcelJS.Workbook, facts: any[]) {
  const worksheet = workbook.addWorksheet('FACT');
  
  // Definir columnas principales para liquidación (sin ID de entrega)
  const columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Trabajador', key: 'nombreTrab', width: 25 },
    { header: 'ID Trabajador', key: 'idTrab', width: 12 },
    { header: 'Envase', key: 'envase', width: 15 },
    { header: 'Cantidad', key: 'nroEnvases', width: 10 },
    { header: 'Precio Unitario', key: 'unitPrice', width: 15 },
    { header: 'Monto Total', key: 'amount', width: 15 },
    { header: 'Cuartel', key: 'cuartel', width: 15 },
    { header: 'Contratista', key: 'contratista', width: 20 }
  ];
  
  worksheet.columns = columns;
  
  // Aplicar formato a los encabezados
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Agregar datos
  facts.forEach((fact, index) => {
    const row = worksheet.addRow({
      id: fact.id,
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
      fecha: fact.fecha ? new Date(fact.fecha).toLocaleDateString('es-CL') : '',
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
      codigoEnvase: fact.codigoEnvase,
      unitPrice: fact.unitPrice,
      amount: fact.amount
    });
    
    // Aplicar formato a las columnas numéricas
    row.getCell('nroEnvases').numFmt = '0';
    row.getCell('unitPrice').numFmt = '$#,##0.00';
    row.getCell('amount').numFmt = '$#,##0.00';
  });
  
  // Aplicar bordes a toda la tabla
  const rowCount = worksheet.rowCount;
  const colCount = worksheet.columnCount;
  
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 1; col <= colCount; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
  
  // Congelar la primera fila
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  return worksheet;
}

/**
 * Crea la hoja PIVOT con tabla dinámica precalculada
 */
async function createPIVOTSheet(workbook: ExcelJS.Workbook, facts: any[]) {
  const worksheet = workbook.addWorksheet('PIVOT');
  
  // Agregar encabezado
  worksheet.addRow(['Tabla Dinámica - Análisis de Entregas']);
  worksheet.mergeCells('A1:J1');
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Agregar información de la tabla dinámica
  worksheet.addRow([]);
  worksheet.addRow(['Esta tabla dinámica muestra datos consolidados por trabajador, fecha y envase']);
  worksheet.addRow(['Los datos se actualizan automáticamente desde la hoja FACT']);
  worksheet.addRow([]);
  
  // Crear tabla dinámica precalculada
  // Agrupar datos por trabajador, fecha, envase y cuartel
  const pivotData = new Map();
  
  facts.forEach(fact => {
    const key = `${fact.nombreTrab}|${fact.fecha}|${fact.envase}|${fact.cuartel}`;
    if (!pivotData.has(key)) {
      pivotData.set(key, {
        trabajador: fact.nombreTrab,
        fecha: fact.fecha,
        envase: fact.envase,
        cuartel: fact.cuartel,
        cantidad: 0,
        montoTotal: 0,
        precioUnitario: fact.unitPrice
      });
    }
    
    const item = pivotData.get(key);
    item.cantidad += fact.nroEnvases;
    item.montoTotal += fact.amount;
  });
  
  // Convertir a array y ordenar
  const sortedPivotData = Array.from(pivotData.values()).sort((a, b) => {
    if (a.trabajador !== b.trabajador) return a.trabajador.localeCompare(b.trabajador);
    if (a.fecha !== b.fecha) return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    if (a.envase !== b.envase) return a.envase.localeCompare(b.envase);
    return a.cuartel.localeCompare(b.cuartel);
  });
  
  // Crear encabezados de la tabla dinámica
  const headers = [
    'Trabajador',
    'Fecha', 
    'Envase',
    'Cuartel',
    'Cantidad',
    'Precio Unitario',
    'Monto Total'
  ];
  
  worksheet.addRow(headers);
  
  // Aplicar formato a los encabezados
  const headerRow = worksheet.getRow(worksheet.rowCount);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Agregar datos de la tabla dinámica
  sortedPivotData.forEach(item => {
    const row = worksheet.addRow([
      item.trabajador,
      item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : '',
      item.envase,
      item.cuartel,
      item.cantidad,
      item.precioUnitario,
      item.montoTotal
    ]);
    
    // Aplicar formato a las columnas numéricas
    row.getCell(5).numFmt = '0'; // Cantidad
    row.getCell(6).numFmt = '$#,##0.00'; // Precio Unitario
    row.getCell(7).numFmt = '$#,##0.00'; // Monto Total
  });
  
  // Aplicar bordes a toda la tabla
  const rowCount = worksheet.rowCount;
  const colCount = 7; // Solo las columnas de la tabla dinámica
  
  for (let row = 5; row <= rowCount; row++) { // Empezar desde la fila 5 (después de los títulos)
    for (let col = 1; col <= colCount; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
  
  // Agregar totales al final
  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    sortedPivotData.reduce((sum, item) => sum + item.cantidad, 0),
    '',
    sortedPivotData.reduce((sum, item) => sum + item.montoTotal, 0)
  ]);
  
  // Formatear fila de totales
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' }
  };
  
  totalRow.getCell(5).numFmt = '0';
  totalRow.getCell(7).numFmt = '$#,##0.00';
  
  // Aplicar bordes a la fila de totales
  for (let col = 1; col <= colCount; col++) {
    const cell = totalRow.getCell(col);
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  }
  
  // Ajustar ancho de columnas
  worksheet.columns = [
    { width: 25 }, // Trabajador
    { width: 12 }, // Fecha
    { width: 15 }, // Envase
    { width: 15 }, // Cuartel
    { width: 10 }, // Cantidad
    { width: 15 }, // Precio Unitario
    { width: 15 }  // Monto Total
  ];
  
  // Congelar la primera fila de datos (fila 5)
  worksheet.views = [{ state: 'frozen', ySplit: 5 }];
  
  // Agregar resumen de datos al final
  worksheet.addRow([]);
  worksheet.addRow(['RESUMEN DE DATOS:']);
  worksheet.addRow(['Total de registros: ' + facts.length]);
  worksheet.addRow(['Total de trabajadores: ' + new Set(facts.map(f => f.idTrab).filter(Boolean)).size]);
  worksheet.addRow(['Total de envases únicos: ' + new Set(facts.map(f => f.envase).filter(Boolean)).size]);
  worksheet.addRow(['Rango de fechas: ' + 
    (facts.length > 0 ? 
      new Date(Math.min(...facts.map(f => f.fecha ? new Date(f.fecha).getTime() : Infinity))).toLocaleDateString('es-CL') + 
      ' - ' + 
      new Date(Math.max(...facts.map(f => f.fecha ? new Date(f.fecha).getTime() : -Infinity))).toLocaleDateString('es-CL') 
      : 'N/A'
    )
  ]);
  
  return worksheet;
}

/**
 * Función principal para exportar datos a Excel
 */
export async function exportToExcel(uploadId: string, options: ExportOptions = {}): Promise<ExportResult> {
  try {
    const { includeFACT = true, includePIVOT = true } = options;
    
    // Obtener datos
    const facts = await getFactsData(uploadId) as any[];
    
    if (facts.length === 0) {
      return {
        success: false,
        errors: ['No se encontraron datos para exportar']
      };
    }
    
    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Contabilidad Postcosecha';
    workbook.created = new Date();
    
    // Crear hojas según opciones
    if (includeFACT) {
      await createFACTSheet(workbook, facts);
    }
    
    if (includePIVOT) {
      await createPIVOTSheet(workbook, facts);
    }
    
    // Generar archivo
    const fileName = `export_${uploadId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(process.cwd(), 'storage', fileName);
    
    // Asegurar que el directorio existe
    const fs = require('fs');
    const storageDir = path.dirname(filePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    return {
      success: true,
      filePath: fileName
    };
    
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    return {
      success: false,
      errors: [`Error exportando: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    };
  }
}

/**
 * Crea un archivo Excel con tabla dinámica prearmada usando plantilla
 */
export async function exportWithPivotTemplate(uploadId: string): Promise<ExportResult> {
  try {
    // Obtener datos
    const facts = await getFactsData(uploadId) as any[];
    
    if (facts.length === 0) {
      return {
        success: false,
        errors: ['No se encontraron datos para exportar']
      };
    }
    
    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    
    // Crear hoja FACT
    const factSheet = await createFACTSheet(workbook, facts);
    
    // Crear hoja PIVOT con tabla dinámica
    const pivotSheet = await createPIVOTSheet(workbook, facts);
    
    // Generar archivo
    const fileName = `pivot_export_${uploadId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(process.cwd(), 'storage', fileName);
    
    // Asegurar que el directorio existe
    const fs = require('fs');
    const storageDir = path.dirname(filePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    return {
      success: true,
      filePath: fileName
    };
    
  } catch (error) {
    console.error('Error exportando con plantilla pivot:', error);
    return {
      success: false,
      errors: [`Error exportando: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    };
  }
}
