import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';
import { PriceMode } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const rules = await prisma.priceRule.findMany({
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return res.status(200).json(rules);
    } catch (error) {
      console.error('Error obteniendo reglas de precio:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { upsert, delete: deleteIds } = req.body;

      const results = [];

      // Eliminar reglas si se especifican
      if (deleteIds && Array.isArray(deleteIds) && deleteIds.length > 0) {
        await prisma.priceRule.deleteMany({
          where: {
            id: { in: deleteIds }
          }
        });
        results.push({ deleted: deleteIds.length });
      }

      // Crear/actualizar reglas
      if (upsert) {
        const rulesToUpsert = Array.isArray(upsert) ? upsert : [upsert];
        
        for (const rule of rulesToUpsert) {
          // Generar ID único si no existe
          if (!rule.id) {
            rule.id = 'rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          }

          // Validar regla
          if (!rule.mode || !Object.values(PriceMode).includes(rule.mode)) {
            return res.status(400).json({ 
              error: 'Mode debe ser OVERRIDE o DELTA' 
            });
          }

          if (typeof rule.amount !== 'number') {
            return res.status(400).json({ 
              error: 'Amount debe ser un número' 
            });
          }

          if (typeof rule.priority !== 'number' || rule.priority < 0) {
            return res.status(400).json({ 
              error: 'Priority debe ser un número >= 0' 
            });
          }

          // Validar fechas
          if (rule.dateStart && rule.dateEnd && rule.dateStart > rule.dateEnd) {
            return res.status(400).json({ 
              error: 'dateStart no puede ser mayor que dateEnd' 
            });
          }

          // Validar weekdays
          if (rule.weekdays && Array.isArray(rule.weekdays)) {
            const validDays = rule.weekdays.every((day: any) =>
              typeof day === 'number' && day >= 1 && day <= 7
            );
            if (!validDays) {
              return res.status(400).json({ 
                error: 'weekdays debe contener números del 1 al 7 (1=lunes, 7=domingo)' 
              });
            }
          }

          const result = await prisma.priceRule.upsert({
            where: { id: rule.id },
            update: {
              nombreCosecha: rule.nombreCosecha || null,
              nombreCampo: rule.nombreCampo || null,
              cecoCampo: rule.cecoCampo || null,
              etiquetasCampo: rule.etiquetasCampo || null,
              cuartel: rule.cuartel || null,
              cecoCuartel: rule.cecoCuartel || null,
              etiquetasCuartel: rule.etiquetasCuartel || null,
              especie: rule.especie || null,
              variedad: rule.variedad || null,
              contratista: rule.contratista || null,
              idContratista: rule.idContratista || null,
              envase: rule.envase || null,
              usuario: rule.usuario || null,
              idUsuario: rule.idUsuario || null,
              cuadrilla: rule.cuadrilla || null,
              dateStart: rule.dateStart ? new Date(rule.dateStart) : null,
              dateEnd: rule.dateEnd ? new Date(rule.dateEnd) : null,
              weekdays: rule.weekdays || [],
              mode: rule.mode,
              amount: rule.amount,
              priority: rule.priority,
              active: rule.active !== undefined ? rule.active : true
            },
            create: {
              nombreCosecha: rule.nombreCosecha || null,
              nombreCampo: rule.nombreCampo || null,
              cecoCampo: rule.cecoCampo || null,
              etiquetasCampo: rule.etiquetasCampo || null,
              cuartel: rule.cuartel || null,
              cecoCuartel: rule.cecoCuartel || null,
              etiquetasCuartel: rule.etiquetasCuartel || null,
              especie: rule.especie || null,
              variedad: rule.variedad || null,
              contratista: rule.contratista || null,
              idContratista: rule.idContratista || null,
              envase: rule.envase || null,
              usuario: rule.usuario || null,
              idUsuario: rule.idUsuario || null,
              cuadrilla: rule.cuadrilla || null,
              dateStart: rule.dateStart ? new Date(rule.dateStart) : null,
              dateEnd: rule.dateEnd ? new Date(rule.dateEnd) : null,
              weekdays: rule.weekdays || [],
              mode: rule.mode,
              amount: rule.amount,
              priority: rule.priority,
              active: rule.active !== undefined ? rule.active : true
            }
          });
          results.push(result);
        }
      }

      return res.status(200).json({
        message: 'Reglas de precio actualizadas correctamente',
        results
      });

    } catch (error) {
      console.error('Error actualizando reglas de precio:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID es requerido' });
      }

      const rule = await prisma.priceRule.update({
        where: { id },
        data: { active: active !== undefined ? active : true }
      });

      return res.status(200).json({
        message: 'Regla actualizada correctamente',
        rule
      });

    } catch (error) {
      console.error('Error actualizando regla:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
