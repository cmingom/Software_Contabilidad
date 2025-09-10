import { NextApiRequest, NextApiResponse } from 'next';
import { exportWithPivotTemplate } from '../../../src/lib/xlsx/writeFACT';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { uploadId } = req.query;

    if (!uploadId || typeof uploadId !== 'string') {
      return res.status(400).json({ error: 'uploadId es requerido' });
    }

    const result = await exportWithPivotTemplate(uploadId);

    if (!result.success) {
      return res.status(400).json({
        error: 'Error generando archivo de exportación',
        details: result.errors
      });
    }

    // Leer archivo generado
    const filePath = path.join(process.cwd(), 'storage', result.filePath!);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filePath}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Enviar archivo
    res.send(fileBuffer);

    // Limpiar archivo temporal después de un delay
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error eliminando archivo temporal:', error);
      }
    }, 30000); // 30 segundos

  } catch (error) {
    console.error('Error en exportación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
