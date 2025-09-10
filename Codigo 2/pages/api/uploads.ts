import { NextApiRequest, NextApiResponse } from 'next';
import { readDATOS } from '../../src/lib/xlsx/readDATOS';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Parsear archivo usando formidable
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      filter: ({ mimetype }) => {
        return mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               mimetype === 'application/vnd.ms-excel';
      }
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    // Leer archivo
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Procesar con readDATOS
    const result = await readDATOS(fileBuffer, file.originalFilename || 'archivo.xlsx');
    
    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Error procesando archivo',
        details: result.errors,
        warnings: result.warnings
      });
    }

    return res.status(200).json({
      uploadId: result.uploadId,
      rows: result.rows,
      envases: result.envases,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('Error en upload:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
    }
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
