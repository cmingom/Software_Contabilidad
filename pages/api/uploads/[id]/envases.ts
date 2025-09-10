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
    // Obtener el upload
    const upload = await prisma.upload.findUnique({
      where: { id },
      include: {
        facts: {
          select: {
            envase: true,
            nroEnvases: true
          }
        }
      }
    })

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' })
    }

    // Agrupar por envase y sumar cantidades
    const envaseMap = new Map<string, number>()
    
    upload.facts.forEach(fact => {
      const envase = fact.envase || 'Sin especificar'
      const cantidad = fact.nroEnvases || 0
      
      if (envaseMap.has(envase)) {
        envaseMap.set(envase, envaseMap.get(envase)! + cantidad)
      } else {
        envaseMap.set(envase, cantidad)
      }
    })

    // Convertir a array
    const envases = Array.from(envaseMap.entries()).map(([envase, count]) => ({
      envase,
      count
    })).sort((a, b) => a.envase.localeCompare(b.envase))

    res.status(200).json(envases)
  } catch (error) {
    console.error('Error obteniendo envases:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  } finally {
    await prisma.$disconnect()
  }
}
