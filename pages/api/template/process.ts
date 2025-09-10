import { NextApiRequest, NextApiResponse } from 'next';
import { TemplateProcessor } from '../../../src/lib/xlsx/templateProcessor';
import * as path from 'path';
import * as fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { 
      templatePath, 
      dataPath, 
      outputPath, 
      dataSheetName = 'DATA',
      dataType = 'csv' // 'csv' o 'json'
    } = req.body;

    if (!templatePath || !dataPath || !outputPath) {
      return res.status(400).json({ 
        error: 'templatePath, dataPath y outputPath son requeridos' 
      });
    }

    // Verificar que existe la plantilla
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ 
        error: `Plantilla no encontrada: ${templatePath}` 
      });
    }

    // Verificar que existe el archivo de datos
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: `Archivo de datos no encontrado: ${dataPath}` 
      });
    }

    // Crear procesador
    const processor = new TemplateProcessor({
      templatePath,
      outputPath,
      dataSheetName,
      batchSize: 1000
    });

    // Procesar según el tipo de archivo
    let result;
    if (dataType === 'json') {
      result = await processor.processFromJSON(dataPath);
    } else {
      result = await processor.processFromCSV(dataPath);
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        outputPath: result.outputPath,
        rowsProcessed: result.rowsProcessed,
        message: 'Plantilla procesada exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error procesando plantilla',
        details: result.errors
      });
    }

  } catch (error) {
    console.error('Error procesando plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
