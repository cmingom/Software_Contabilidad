import { NextApiRequest, NextApiResponse } from 'next';
import { createStandardTemplate } from '../../../src/lib/xlsx/createTemplate';
import * as path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { outputPath } = req.body;

    if (!outputPath) {
      return res.status(400).json({ 
        error: 'outputPath es requerido' 
      });
    }

    // Crear plantilla estándar
    const success = await createStandardTemplate(outputPath);

    if (success) {
      res.status(200).json({
        success: true,
        outputPath,
        message: 'Plantilla creada exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error creando plantilla'
      });
    }

  } catch (error) {
    console.error('Error creando plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
