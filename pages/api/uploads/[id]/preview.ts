import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID es requerido' });
    }

    const maxRows = parseInt(process.env.NEXT_PUBLIC_MAX_PREVIEW_ROWS || '100');

    const facts = await prisma.fact.findMany({
      where: {
        uploadId: id
      },
      select: {
        id: true,
        idEntrega: true,
        nombreTrab: true,
        idTrab: true,
        envase: true,
        nroEnvases: true,
        fecha: true,
        unitPrice: true,
        amount: true
      },
      orderBy: [
        { idTrab: 'asc' },
        { fecha: 'asc' }
      ],
      take: maxRows
    });

    return res.status(200).json(facts);

  } catch (error) {
    console.error('Error obteniendo preview:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
