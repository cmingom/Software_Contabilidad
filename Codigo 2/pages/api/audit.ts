import { NextApiRequest, NextApiResponse } from 'next';
import { getAuditInfo, getAuditInfoByEntrega, getAuditInfoByTrabajadorFecha } from '../../src/lib/pricing/eval';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { factId, idEntrega, idTrab, fecha } = req.query;

    if (factId && typeof factId === 'string') {
      // Auditoría por ID de fact
      const auditInfo = await getAuditInfo(factId);
      
      if (!auditInfo) {
        return res.status(404).json({ error: 'Fact no encontrada' });
      }

      return res.status(200).json(auditInfo);
    }

    if (idEntrega && typeof idEntrega === 'string') {
      // Auditoría por ID de entrega
      const auditInfo = await getAuditInfoByEntrega(idEntrega);
      
      if (!auditInfo) {
        return res.status(404).json({ error: 'Entrega no encontrada' });
      }

      return res.status(200).json(auditInfo);
    }

    if (idTrab && fecha && typeof idTrab === 'string' && typeof fecha === 'string') {
      // Auditoría por trabajador y fecha
      const idTrabNumber = parseInt(idTrab);
      
      if (isNaN(idTrabNumber)) {
        return res.status(400).json({ error: 'ID trabajador debe ser un número' });
      }

      const auditInfos = await getAuditInfoByTrabajadorFecha(idTrabNumber, fecha);
      
      return res.status(200).json(auditInfos);
    }

    return res.status(400).json({ 
      error: 'Debe proporcionar factId, idEntrega, o idTrab+fecha' 
    });

  } catch (error) {
    console.error('Error en auditoría:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
