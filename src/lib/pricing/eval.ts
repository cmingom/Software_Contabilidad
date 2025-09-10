import { prisma } from '../prisma';
import { PriceMode } from '@prisma/client';
import { getApplicableRule, FactForMatching, MatchingRule } from './match';

export interface PricingResult {
  updated: number;
  totalsByTrab: Array<{
    idTrab: number;
    nombreTrab: string;
    monto: number;
  }>;
  totalsByDate: Array<{
    fecha: string;
    monto: number;
  }>;
  errors: string[];
}

export interface AuditInfo {
  factId: string;
  priceBase: number;
  ruleId?: string;
  ruleName?: string;
  finalPrice: number;
  calculationSteps: string[];
}

/**
 * Obtiene el precio base para un envase
 */
async function getPriceBase(envase: string): Promise<number> {
  const priceBase = await prisma.priceBase.findFirst({
    where: {
      envase: envase,
      active: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return priceBase?.price || 0;
}

/**
 * Obtiene todas las reglas activas
 */
async function getActiveRules(): Promise<any[]> {
  return await prisma.priceRule.findMany({
    where: {
      active: true
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Calcula el precio unitario para una fact
 */
async function calculateUnitPrice(fact: any, rules: any[]): Promise<{
  unitPrice: number;
  ruleId?: string;
  calculationSteps: string[];
}> {
  const calculationSteps: string[] = [];
  
  // Obtener precio base
  const priceBase = await getPriceBase(fact.envase || '');
  calculationSteps.push(`Precio base para envase "${fact.envase}": $${priceBase}`);
  
  if (priceBase === 0) {
    calculationSteps.push(`⚠️ No se encontró precio base para envase "${fact.envase}"`);
  }
  
  // Preparar fact para matching
  const factForMatching: FactForMatching = {
    nombreCosecha: fact.nombreCosecha,
    nombreCampo: fact.nombreCampo,
    cecoCampo: fact.cecoCampo,
    etiquetasCampo: fact.etiquetasCampo,
    cuartel: fact.cuartel,
    cecoCuartel: fact.cecoCuartel,
    etiquetasCuartel: fact.etiquetasCuartel,
    especie: fact.especie,
    variedad: fact.variedad,
    contratista: fact.contratista,
    idContratista: fact.idContratista,
    envase: fact.envase,
    usuario: fact.usuario,
    idUsuario: fact.idUsuario,
    cuadrilla: fact.cuadrilla,
    fecha: fact.fecha
  };
  
  // Buscar regla aplicable
  const applicableRule = getApplicableRule(factForMatching, rules);
  
  if (applicableRule) {
    calculationSteps.push(`Regla aplicada: ${applicableRule.id} (prioridad: ${applicableRule.priority})`);
    
    if (applicableRule.mode === PriceMode.OVERRIDE) {
      calculationSteps.push(`Modo OVERRIDE: precio final = $${applicableRule.amount}`);
      return {
        unitPrice: applicableRule.amount,
        ruleId: applicableRule.id,
        calculationSteps
      };
    } else if (applicableRule.mode === PriceMode.DELTA) {
      const finalPrice = priceBase + applicableRule.amount;
      calculationSteps.push(`Modo DELTA: precio base + delta = $${priceBase} + $${applicableRule.amount} = $${finalPrice}`);
      return {
        unitPrice: finalPrice,
        ruleId: applicableRule.id,
        calculationSteps
      };
    }
  } else {
    calculationSteps.push('No se aplicaron reglas condicionales');
  }
  
  calculationSteps.push(`Precio final: $${priceBase}`);
  return {
    unitPrice: priceBase,
    calculationSteps
  };
}

/**
 * Recalcula precios para un upload específico
 */
export async function recalculatePricing(uploadId: string): Promise<PricingResult> {
  try {
    // Obtener todas las facts del upload
    const facts = await prisma.fact.findMany({
      where: {
        uploadId: uploadId
      },
      orderBy: [
        { idTrab: 'asc' },
        { fecha: 'asc' }
      ]
    });
    
    if (facts.length === 0) {
      return {
        updated: 0,
        totalsByTrab: [],
        totalsByDate: [],
        errors: ['No se encontraron datos para el upload especificado']
      };
    }
    
    // Obtener reglas activas
    const rules = await getActiveRules();
    
    // Procesar cada fact
    let updated = 0;
    const errors: string[] = [];
    
    for (const fact of facts) {
      try {
        // Saltar facts sin envase o sin ID trabajador
        if (!fact.envase || !fact.idTrab) {
          continue;
        }
        
        const { unitPrice, ruleId } = await calculateUnitPrice(fact, rules);
        const amount = fact.nroEnvases * unitPrice;
        
        // Actualizar fact
        await prisma.fact.update({
          where: { id: fact.id },
          data: {
            unitPrice,
            amount
          }
        });
        
        updated++;
      } catch (error) {
        errors.push(`Error procesando fact ${fact.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    
    // Calcular totales por trabajador
    const totalsByTrab = await prisma.fact.groupBy({
      by: ['idTrab', 'nombreTrab'],
      where: {
        uploadId: uploadId,
        idTrab: { not: null }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        idTrab: 'asc'
      }
    });
    
    // Calcular totales por fecha
    const totalsByDate = await prisma.fact.groupBy({
      by: ['fecha'],
      where: {
        uploadId: uploadId,
        fecha: { not: null }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        fecha: 'asc'
      }
    });
    
    return {
      updated,
      totalsByTrab: totalsByTrab.map(t => ({
        idTrab: t.idTrab!,
        nombreTrab: t.nombreTrab || 'Sin nombre',
        monto: t._sum.amount || 0
      })),
      totalsByDate: totalsByDate.map(t => ({
        fecha: t.fecha!.toISOString().split('T')[0],
        monto: t._sum.amount || 0
      })),
      errors
    };
    
  } catch (error) {
    console.error('Error en recalculatePricing:', error);
    return {
      updated: 0,
      totalsByTrab: [],
      totalsByDate: [],
      errors: [`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    };
  }
}

/**
 * Obtiene información de auditoría para una fact específica
 */
export async function getAuditInfo(factId: string): Promise<AuditInfo | null> {
  try {
    const fact = await prisma.fact.findUnique({
      where: { id: factId }
    });
    
    if (!fact) {
      return null;
    }
    
    // Obtener precio base
    const priceBase = await getPriceBase(fact.envase || '');
    
    // Obtener reglas activas
    const rules = await getActiveRules();
    
    // Calcular precio unitario y obtener información de la regla aplicada
    const { unitPrice, ruleId, calculationSteps } = await calculateUnitPrice(fact, rules);
    
    // Obtener información de la regla aplicada
    let ruleName: string | undefined;
    if (ruleId) {
      const rule = rules.find(r => r.id === ruleId);
      if (rule) {
        ruleName = `Regla ${rule.id} (Prioridad: ${rule.priority})`;
      }
    }
    
    return {
      factId: fact.id,
      priceBase,
      ruleId,
      ruleName,
      finalPrice: unitPrice,
      calculationSteps
    };
    
  } catch (error) {
    console.error('Error obteniendo información de auditoría:', error);
    return null;
  }
}

/**
 * Obtiene información de auditoría para una fact por ID de entrega
 */
export async function getAuditInfoByEntrega(idEntrega: string): Promise<AuditInfo | null> {
  try {
    const fact = await prisma.fact.findFirst({
      where: { idEntrega: idEntrega }
    });
    
    if (!fact) {
      return null;
    }
    
    return await getAuditInfo(fact.id);
    
  } catch (error) {
    console.error('Error obteniendo información de auditoría por ID entrega:', error);
    return null;
  }
}

/**
 * Obtiene información de auditoría para una fact por ID trabajador y fecha
 */
export async function getAuditInfoByTrabajadorFecha(idTrab: number, fecha: string): Promise<AuditInfo[]> {
  try {
    const fechaDate = new Date(fecha);
    const facts = await prisma.fact.findMany({
      where: {
        idTrab: idTrab,
        fecha: {
          gte: new Date(fechaDate.getFullYear(), fechaDate.getMonth(), fechaDate.getDate()),
          lt: new Date(fechaDate.getFullYear(), fechaDate.getMonth(), fechaDate.getDate() + 1)
        }
      }
    });
    
    const auditInfos: AuditInfo[] = [];
    
    for (const fact of facts) {
      const auditInfo = await getAuditInfo(fact.id);
      if (auditInfo) {
        auditInfos.push(auditInfo);
      }
    }
    
    return auditInfos;
    
  } catch (error) {
    console.error('Error obteniendo información de auditoría por trabajador y fecha:', error);
    return [];
  }
}
