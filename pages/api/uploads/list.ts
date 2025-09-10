import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const uploads = await prisma.upload.findMany({
      orderBy: {
        importedAt: 'desc'
      },
      select: {
        id: true,
        filename: true,
        rows: true,
        importedAt: true
      }
    });

    return res.status(200).json(uploads);

  } catch (error) {
    console.error('Error obteniendo uploads:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
