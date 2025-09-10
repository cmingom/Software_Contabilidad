import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const priceBases = await prisma.priceBase.findMany({
        where: { active: true },
        orderBy: { envase: 'asc' }
      });

      return res.status(200).json(priceBases);
    } catch (error) {
      console.error('Error obteniendo precios base:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items debe ser un array' });
      }

      // Validar items
      for (const item of items) {
        if (!item.envase || typeof item.price !== 'number' || item.price < 0) {
          return res.status(400).json({ 
            error: 'Cada item debe tener envase (string) y price (number >= 0)' 
          });
        }
      }

      // Upsert precios base
      const results = [];
      for (const item of items) {
        const result = await prisma.priceBase.upsert({
          where: { envase: item.envase },
          update: {
            price: item.price,
            active: item.active !== undefined ? item.active : true
          },
          create: {
            envase: item.envase,
            price: item.price,
            active: item.active !== undefined ? item.active : true
          }
        });
        results.push(result);
      }

      return res.status(200).json({
        message: 'Precios base actualizados correctamente',
        count: results.length,
        items: results
      });

    } catch (error) {
      console.error('Error actualizando precios base:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { envase } = req.body;

      if (!envase) {
        return res.status(400).json({ error: 'Envase es requerido' });
      }

      await prisma.priceBase.update({
        where: { envase },
        data: { active: false }
      });

      return res.status(200).json({ message: 'Precio base desactivado correctamente' });

    } catch (error) {
      console.error('Error desactivando precio base:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
