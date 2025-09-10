import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Upload ID is required' })
  }

  try {
    // Usar consulta SQL optimizada con GROUP BY
    const envases = await prisma.$queryRaw`
      SELECT 
        envase,
        SUM(cantidad) as count
      FROM "DailyHarvest" 
      WHERE "uploadId" = ${id}
      GROUP BY envase
      ORDER BY envase ASC
    `

    // Obtener total de registros usando consulta SQL
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "DailyHarvest" 
      WHERE "uploadId" = ${id}
    `
    const totalRecords = Number((totalResult as any)[0].count)

    res.status(200).json({
      envases: (envases as any[]).map((item: any) => ({
        envase: item.envase,
        count: Number(item.count)
      })),
      totalRecords
    })
  } catch (error) {
    console.error('Error obteniendo datos consolidados:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  } finally {
    await prisma.$disconnect()
  }
}