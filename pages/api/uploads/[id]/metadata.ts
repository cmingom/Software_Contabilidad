import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de upload requerido' });
  }

  try {
    // Obtener cuarteles únicos usando SQL nativo
    const cuarteles = await prisma.$queryRaw`
      SELECT DISTINCT cuartel
      FROM "Fact"
      WHERE "uploadId" = ${id} AND cuartel IS NOT NULL AND cuartel != ''
      ORDER BY cuartel ASC
    `;

    // Obtener fechas únicas usando SQL nativo
    const fechas = await prisma.$queryRaw`
      SELECT DISTINCT DATE(fecha) as fecha
      FROM "Fact"
      WHERE "uploadId" = ${id} AND fecha IS NOT NULL
      ORDER BY DATE(fecha) ASC
    `;

    // Obtener envases únicos usando SQL nativo
    const envases = await prisma.$queryRaw`
      SELECT DISTINCT envase
      FROM "Fact"
      WHERE "uploadId" = ${id} AND envase IS NOT NULL AND envase != ''
      ORDER BY envase ASC
    `;

    return res.status(200).json({
      cuarteles: (cuarteles as any[]).map(item => item.cuartel),
      fechas: (fechas as any[]).map(item => item.fecha),
      envases: (envases as any[]).map(item => item.envase)
    });

  } catch (error) {
    console.error('Error obteniendo metadatos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
