import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface TemplateProcessorOptions {
  templatePath: string;
  outputPath: string;
  dataSheetName: string;
  pivotSheetName?: string;
  batchSize?: number;
}

export interface DataRow {
  [key: string]: any;
}

export interface ProcessResult {
  success: boolean;
  outputPath?: string;
  rowsProcessed?: number;
  errors?: string[];
}

/**
 * Procesador de plantillas Excel con tabla dinámica
 * Toma un archivo CSV/JSON, actualiza una plantilla Excel y mantiene la tabla dinámica
 */
export class TemplateProcessor {
  private templatePath: string;
  private outputPath: string;
  private dataSheetName: string;
  private pivotSheetName: string;
  private batchSize: number;

  constructor(options: TemplateProcessorOptions) {
    this.templatePath = options.templatePath;
    this.outputPath = options.outputPath;
    this.dataSheetName = options.dataSheetName;
    this.pivotSheetName = options.pivotSheetName || 'PIVOT';
    this.batchSize = options.batchSize || 1000;
  }

  /**
   * Procesa datos desde CSV
   */
  async processFromCSV(csvPath: string): Promise<ProcessResult> {
    try {
      console.log('📊 Procesando datos desde CSV...');
      
      // Leer archivo CSV
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const data = this.parseCSV(csvContent);
      
      return await this.processData(data);
    } catch (error) {
      console.error('❌ Error procesando CSV:', error);
      return {
        success: false,
        errors: [`Error procesando CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      };
    }
  }

  /**
   * Procesa datos desde JSON
   */
  async processFromJSON(jsonPath: string): Promise<ProcessResult> {
    try {
      console.log('📊 Procesando datos desde JSON...');
      
      // Leer archivo JSON
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(jsonContent);
      
      if (!Array.isArray(data)) {
        throw new Error('El archivo JSON debe contener un array de objetos');
      }
      
      return await this.processData(data);
    } catch (error) {
      console.error('❌ Error procesando JSON:', error);
      return {
        success: false,
        errors: [`Error procesando JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      };
    }
  }

  /**
   * Procesa datos desde array de objetos
   */
  async processData(data: DataRow[]): Promise<ProcessResult> {
    try {
      console.log(`📊 Procesando ${data.length} registros...`);
      
      // Verificar que existe la plantilla
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Plantilla no encontrada: ${this.templatePath}`);
      }

      // Cargar plantilla
      console.log('📁 Cargando plantilla Excel...');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.templatePath);

      // Obtener hoja de datos
      const dataSheet = workbook.getWorksheet(this.dataSheetName);
      if (!dataSheet) {
        throw new Error(`Hoja de datos no encontrada: ${this.dataSheetName}`);
      }

      // Limpiar datos existentes (mantener encabezados)
      console.log('🧹 Limpiando datos existentes...');
      this.clearExistingData(dataSheet);

      // Procesar datos en lotes
      console.log(`📦 Procesando datos en lotes de ${this.batchSize}...`);
      await this.processDataInBatches(dataSheet, data);

      // Actualizar tabla dinámica
      console.log('🔄 Actualizando tabla dinámica...');
      await this.updatePivotTable(workbook, dataSheet);

      // Ajustar anchos de columna
      console.log('📏 Ajustando anchos de columna...');
      this.autoFitColumns(dataSheet);

      // Guardar archivo
      console.log('💾 Guardando archivo...');
      await this.ensureOutputDirectory();
      await workbook.xlsx.writeFile(this.outputPath);

      console.log(`✅ Procesamiento completado: ${this.outputPath}`);
      return {
        success: true,
        outputPath: this.outputPath,
        rowsProcessed: data.length
      };

    } catch (error) {
      console.error('❌ Error procesando datos:', error);
      return {
        success: false,
        errors: [`Error procesando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      };
    }
  }

  /**
   * Limpia datos existentes manteniendo encabezados
   */
  private clearExistingData(sheet: ExcelJS.Worksheet): void {
    const rowCount = sheet.rowCount;
    const colCount = sheet.columnCount;
    
    // Eliminar filas de datos (mantener encabezados en fila 1)
    if (rowCount > 1) {
      sheet.spliceRows(2, rowCount - 1);
    }
  }

  /**
   * Procesa datos en lotes para mejor rendimiento
   */
  private async processDataInBatches(sheet: ExcelJS.Worksheet, data: DataRow[]): Promise<void> {
    const totalBatches = Math.ceil(data.length / this.batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * this.batchSize;
      const end = Math.min(start + this.batchSize, data.length);
      const batch = data.slice(start, end);
      
      console.log(`📦 Procesando lote ${i + 1}/${totalBatches} (${batch.length} registros)`);
      
      // Agregar datos del lote
      batch.forEach((row, index) => {
        const rowNumber = start + index + 2; // +2 porque la fila 1 son encabezados
        this.addDataRow(sheet, row, rowNumber);
      });
      
      // Pequeña pausa para no sobrecargar
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Agrega una fila de datos a la hoja
   */
  private addDataRow(sheet: ExcelJS.Worksheet, rowData: DataRow, rowNumber: number): void {
    const row = sheet.getRow(rowNumber);
    
    // Obtener encabezados de la primera fila
    const headers = this.getHeaders(sheet);
    
    // Mapear datos a las columnas
    headers.forEach((header, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const value = rowData[header];
      
      if (value !== undefined && value !== null) {
        // Aplicar formato según el tipo de dato
        if (typeof value === 'number') {
          cell.value = value;
          if (header.toLowerCase().includes('precio') || header.toLowerCase().includes('monto')) {
            cell.numFmt = '$#,##0.00';
          } else if (header.toLowerCase().includes('cantidad')) {
            cell.numFmt = '0';
          }
        } else if (value instanceof Date) {
          cell.value = value;
          cell.numFmt = 'dd/mm/yyyy';
        } else {
          cell.value = String(value);
        }
      }
    });
  }

  /**
   * Obtiene los encabezados de la primera fila
   */
  private getHeaders(sheet: ExcelJS.Worksheet): string[] {
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[colNumber - 1] = String(cell.value);
      }
    });
    
    return headers.filter(Boolean);
  }

  /**
   * Actualiza la tabla dinámica para cubrir el nuevo rango de datos
   */
  private async updatePivotTable(workbook: ExcelJS.Workbook, dataSheet: ExcelJS.Worksheet): Promise<void> {
    try {
      // Buscar hoja de tabla dinámica
      const pivotSheet = workbook.getWorksheet(this.pivotSheetName);
      if (!pivotSheet) {
        console.log('⚠️ No se encontró hoja de tabla dinámica, saltando actualización');
        return;
      }

      // Calcular nuevo rango de datos
      const rowCount = dataSheet.rowCount;
      const colCount = dataSheet.columnCount;
      const newRange = `${this.dataSheetName}!A1:${this.getColumnLetter(colCount)}${rowCount}`;
      
      console.log(`🔄 Actualizando rango de tabla dinámica: ${newRange}`);

      // Buscar y actualizar referencias de tabla dinámica
      // Nota: ExcelJS no soporta modificar tablas dinámicas directamente,
      // pero podemos actualizar el rango en las fórmulas y referencias
      this.updatePivotReferences(pivotSheet, newRange);

    } catch (error) {
      console.warn('⚠️ No se pudo actualizar tabla dinámica:', error);
    }
  }

  /**
   * Actualiza referencias de tabla dinámica en la hoja
   */
  private updatePivotReferences(sheet: ExcelJS.Worksheet, newRange: string): void {
    // Buscar celdas que contengan referencias a la tabla dinámica
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.formula && cell.formula.includes(this.dataSheetName)) {
          // Actualizar fórmula con nuevo rango
          const updatedFormula = cell.formula.replace(
            new RegExp(`${this.dataSheetName}!A\\d+:\\w+\\d+`, 'g'),
            newRange
          );
          cell.formula = updatedFormula;
        }
      });
    });
  }

  /**
   * Ajusta automáticamente el ancho de las columnas
   */
  private autoFitColumns(sheet: ExcelJS.Worksheet): void {
    const colCount = sheet.columnCount;
    
    for (let col = 1; col <= colCount; col++) {
      let maxLength = 0;
      
      // Calcular ancho máximo basado en el contenido
      sheet.eachRow((row, rowNumber) => {
        const cell = row.getCell(col);
        if (cell.value) {
          const cellLength = String(cell.value).length;
          maxLength = Math.max(maxLength, cellLength);
        }
      });
      
      // Aplicar ancho con un mínimo y máximo
      const width = Math.max(10, Math.min(maxLength + 2, 50));
      sheet.getColumn(col).width = width;
    }
  }

  /**
   * Asegura que el directorio de salida existe
   */
  private async ensureOutputDirectory(): Promise<void> {
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Convierte número de columna a letra (1=A, 2=B, etc.)
   */
  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  /**
   * Parsea contenido CSV
   */
  private parseCSV(csvContent: string): DataRow[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: DataRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: DataRow = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Intentar convertir a número
        if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }
        
        // Intentar convertir a fecha
        if (typeof value === 'string' && value.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = date;
          }
        }
        
        row[header] = value;
      });
      
      data.push(row);
    }

    return data;
  }
}

/**
 * Función de conveniencia para procesar desde CSV
 */
export async function processTemplateFromCSV(
  templatePath: string,
  csvPath: string,
  outputPath: string,
  dataSheetName: string = 'DATA'
): Promise<ProcessResult> {
  const processor = new TemplateProcessor({
    templatePath,
    outputPath,
    dataSheetName
  });
  
  return await processor.processFromCSV(csvPath);
}

/**
 * Función de conveniencia para procesar desde JSON
 */
export async function processTemplateFromJSON(
  templatePath: string,
  jsonPath: string,
  outputPath: string,
  dataSheetName: string = 'DATA'
): Promise<ProcessResult> {
  const processor = new TemplateProcessor({
    templatePath,
    outputPath,
    dataSheetName
  });
  
  return await processor.processFromJSON(jsonPath);
}
