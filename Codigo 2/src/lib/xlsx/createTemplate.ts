import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface TemplateOptions {
  outputPath: string;
  dataSheetName?: string;
  pivotSheetName?: string;
  columns?: Array<{
    header: string;
    key: string;
    width?: number;
    type?: 'text' | 'number' | 'currency' | 'date';
  }>;
}

/**
 * Crea una plantilla Excel con tabla dinámica preconfigurada
 */
export async function createExcelTemplate(options: TemplateOptions): Promise<boolean> {
  try {
    const {
      outputPath,
      dataSheetName = 'DATA',
      pivotSheetName = 'PIVOT',
      columns = [
        { header: 'Fecha', key: 'fecha', width: 12, type: 'date' },
        { header: 'Trabajador', key: 'trabajador', width: 25, type: 'text' },
        { header: 'ID Trabajador', key: 'idTrabajador', width: 12, type: 'text' },
        { header: 'Envase', key: 'envase', width: 15, type: 'text' },
        { header: 'Cantidad', key: 'cantidad', width: 10, type: 'number' },
        { header: 'Precio Unitario', key: 'precioUnitario', width: 15, type: 'currency' },
        { header: 'Monto Total', key: 'montoTotal', width: 15, type: 'currency' },
        { header: 'Cuartel', key: 'cuartel', width: 15, type: 'text' },
        { header: 'Contratista', key: 'contratista', width: 20, type: 'text' }
      ]
    } = options;

    console.log('📊 Creando plantilla Excel con tabla dinámica...');

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Contabilidad Postcosecha';
    workbook.created = new Date();

    // Crear hoja de datos
    const dataSheet = workbook.addWorksheet(dataSheetName);
    await createDataSheet(dataSheet, columns);

    // Crear hoja de tabla dinámica
    const pivotSheet = workbook.addWorksheet(pivotSheetName);
    await createPivotSheet(pivotSheet, dataSheetName, columns);

    // Asegurar directorio de salida
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Guardar plantilla
    await workbook.xlsx.writeFile(outputPath);
    
    console.log(`✅ Plantilla creada exitosamente: ${outputPath}`);
    return true;

  } catch (error) {
    console.error('❌ Error creando plantilla:', error);
    return false;
  }
}

/**
 * Crea la hoja de datos con encabezados y formato
 */
async function createDataSheet(sheet: ExcelJS.Worksheet, columns: any[]): Promise<void> {
  // Configurar columnas
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15
  }));

  // Formatear encabezados
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF366092' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Aplicar bordes a encabezados
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  // Congelar primera fila
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Agregar algunas filas de ejemplo para que la tabla dinámica funcione
  const exampleData = [
    {
      fecha: new Date('2025-01-01'),
      trabajador: 'Ejemplo Trabajador',
      idTrabajador: 'T001',
      envase: 'Basqueta',
      cantidad: 10,
      precioUnitario: 100,
      montoTotal: 1000,
      cuartel: 'Cuartel A',
      contratista: 'Contratista Ejemplo'
    }
  ];

  exampleData.forEach((row, index) => {
    const excelRow = sheet.addRow(row);
    
    // Aplicar formato según el tipo de columna
    columns.forEach((col, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      
      switch (col.type) {
        case 'currency':
          cell.numFmt = '$#,##0.00';
          break;
        case 'number':
          cell.numFmt = '0';
          break;
        case 'date':
          cell.numFmt = 'dd/mm/yyyy';
          break;
      }
    });
  });

  // Aplicar bordes a todas las celdas
  const rowCount = sheet.rowCount;
  const colCount = sheet.columnCount;
  
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 1; col <= colCount; col++) {
      const cell = sheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
}

/**
 * Crea la hoja de tabla dinámica con configuración
 */
async function createPivotSheet(sheet: ExcelJS.Worksheet, dataSheetName: string, columns: any[]): Promise<void> {
  // Título
  sheet.addRow(['Tabla Dinámica - Análisis de Entregas']);
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF366092' } };
  titleCell.alignment = { horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }
  };

  // Información
  sheet.addRow([]);
  sheet.addRow(['Esta tabla dinámica se conecta automáticamente a los datos de la hoja DATA']);
  sheet.addRow(['Para actualizar los datos, haga clic derecho en la tabla y seleccione "Actualizar"']);
  sheet.addRow([]);

  // Instrucciones para crear tabla dinámica
  sheet.addRow(['INSTRUCCIONES PARA CREAR LA TABLA DINÁMICA:']);
  sheet.addRow(['1. Seleccione los datos en la hoja DATA (A1:' + getColumnLetter(columns.length) + '2)']);
  sheet.addRow(['2. Vaya a Insertar > Tabla Dinámica']);
  sheet.addRow(['3. Configure los campos según la estructura sugerida']);
  sheet.addRow([]);

  // Estructura sugerida
  sheet.addRow(['ESTRUCTURA SUGERIDA:']);
  sheet.addRow(['Filas: Trabajador, Fecha, Envase']);
  sheet.addRow(['Columnas: Cuartel']);
  sheet.addRow(['Valores: Cantidad (Suma), Monto Total (Suma)']);
  sheet.addRow(['Filtros: Contratista']);
  sheet.addRow([]);

  // Configuración de tabla dinámica (para referencia)
  sheet.addRow(['CONFIGURACIÓN DE TABLA DINÁMICA:']);
  sheet.addRow(['Nombre: TablaDinamicaEntregas']);
  sheet.addRow(['Rango de datos: ' + dataSheetName + '!A1:' + getColumnLetter(columns.length) + '2']);
  sheet.addRow(['Actualización automática: Habilitada']);
  sheet.addRow([]);

  // Formatear instrucciones
  const instructionRows = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  instructionRows.forEach(rowNum => {
    const row = sheet.getRow(rowNum);
    row.font = { size: 11 };
    if (rowNum >= 5 && rowNum <= 8) {
      row.font = { bold: true, size: 11 };
    }
  });

  // Ajustar anchos de columna
  sheet.columns = [
    { width: 50 }, // Columna A para instrucciones
    { width: 15 }, // Columna B
    { width: 15 }, // Columna C
    { width: 15 }, // Columna D
    { width: 15 }, // Columna E
    { width: 15 }, // Columna F
    { width: 15 }, // Columna G
    { width: 15 }, // Columna H
    { width: 15 }, // Columna I
    { width: 15 }  // Columna J
  ];
}

/**
 * Convierte número de columna a letra
 */
function getColumnLetter(columnNumber: number): string {
  let result = '';
  while (columnNumber > 0) {
    columnNumber--;
    result = String.fromCharCode(65 + (columnNumber % 26)) + result;
    columnNumber = Math.floor(columnNumber / 26);
  }
  return result;
}

/**
 * Función de conveniencia para crear plantilla estándar
 */
export async function createStandardTemplate(outputPath: string): Promise<boolean> {
  return await createExcelTemplate({
    outputPath,
    dataSheetName: 'DATA',
    pivotSheetName: 'PIVOT'
  });
}
