import { NextApiRequest, NextApiResponse } from 'next';
import { recalculatePricing } from '../../../src/lib/pricing/eval';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { uploadId } = req.query;

    if (!uploadId || typeof uploadId !== 'string') {
      return res.status(400).json({ error: 'uploadId es requerido' });
    }

    const result = await recalculatePricing(uploadId);

    if (result.errors.length > 0) {
      return res.status(400).json({
        error: 'Error en el recálculo',
        details: result.errors,
        updated: result.updated,
        totalsByTrab: result.totalsByTrab,
        totalsByDate: result.totalsByDate
      });
    }

    return res.status(200).json({
      message: 'Recálculo completado correctamente',
      updated: result.updated,
      totalsByTrab: result.totalsByTrab,
      totalsByDate: result.totalsByDate
    });

  } catch (error) {
    console.error('Error en recálculo:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
