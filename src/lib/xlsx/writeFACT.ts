import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { prisma } from '../prisma';

export interface ExportOptions {
  includeFACT?: boolean;
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
      fecha: fact.fecha ? new Date(fact.fecha).toLocaleDateString('es-CL') : '',
      nombreTrab: fact.nombreTrab,
      idTrab: fact.idTrab,
      envase: fact.envase,
      nroEnvases: fact.nroEnvases,
      unitPrice: fact.unitPrice,
      amount: fact.amount,
      cuartel: fact.cuartel,
      contratista: fact.contratista
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
 * Función principal para exportar datos a Excel
 */
export async function exportToExcel(uploadId: string, options: ExportOptions = {}): Promise<ExportResult> {
  try {
    const { includeFACT = true } = options;
    
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
    
    // Crear hoja FACT
    if (includeFACT) {
      await createFACTSheet(workbook, facts);
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

