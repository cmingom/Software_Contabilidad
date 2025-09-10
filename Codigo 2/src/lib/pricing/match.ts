import { PriceRule, PriceMode } from '@prisma/client';

export interface FactForMatching {
  nombreCosecha?: string | null;
  nombreCampo?: string | null;
  cecoCampo?: string | null;
  etiquetasCampo?: string | null;
  cuartel?: string | null;
  cecoCuartel?: string | null;
  etiquetasCuartel?: string | null;
  especie?: string | null;
  variedad?: string | null;
  contratista?: string | null;
  idContratista?: number | null;
  envase?: string | null;
  usuario?: string | null;
  idUsuario?: number | null;
  cuadrilla?: string | null;
  fecha?: Date | null;
}

export interface MatchingRule extends PriceRule {
  specificity: number; // Número de campos no nulos para ordenamiento
}

/**
 * Calcula la especificidad de una regla (número de campos no nulos)
 */
function calculateSpecificity(rule: PriceRule): number {
  let count = 0;
  
  if (rule.nombreCosecha !== null) count++;
  if (rule.nombreCampo !== null) count++;
  if (rule.cecoCampo !== null) count++;
  if (rule.etiquetasCampo !== null) count++;
  if (rule.cuartel !== null) count++;
  if (rule.cecoCuartel !== null) count++;
  if (rule.etiquetasCuartel !== null) count++;
  if (rule.especie !== null) count++;
  if (rule.variedad !== null) count++;
  if (rule.contratista !== null) count++;
  if (rule.idContratista !== null) count++;
  if (rule.envase !== null) count++;
  if (rule.usuario !== null) count++;
  if (rule.idUsuario !== null) count++;
  if (rule.cuadrilla !== null) count++;
  if (rule.dateStart !== null) count++;
  if (rule.dateEnd !== null) count++;
  if (rule.weekdays !== null && rule.weekdays.length > 0) count++;
  
  return count;
}

/**
 * Verifica si una regla coincide con una fact
 */
export function matchesRule(fact: FactForMatching, rule: PriceRule): boolean {
  // Verificar campos de texto (case-insensitive)
  if (rule.nombreCosecha !== null && 
      fact.nombreCosecha?.toLowerCase() !== rule.nombreCosecha.toLowerCase()) {
    return false;
  }
  
  if (rule.nombreCampo !== null && 
      fact.nombreCampo?.toLowerCase() !== rule.nombreCampo.toLowerCase()) {
    return false;
  }
  
  if (rule.cecoCampo !== null && 
      fact.cecoCampo?.toLowerCase() !== rule.cecoCampo.toLowerCase()) {
    return false;
  }
  
  if (rule.etiquetasCampo !== null && 
      fact.etiquetasCampo?.toLowerCase() !== rule.etiquetasCampo.toLowerCase()) {
    return false;
  }
  
  if (rule.cuartel !== null && 
      fact.cuartel?.toLowerCase() !== rule.cuartel.toLowerCase()) {
    return false;
  }
  
  if (rule.cecoCuartel !== null && 
      fact.cecoCuartel?.toLowerCase() !== rule.cecoCuartel.toLowerCase()) {
    return false;
  }
  
  if (rule.etiquetasCuartel !== null && 
      fact.etiquetasCuartel?.toLowerCase() !== rule.etiquetasCuartel.toLowerCase()) {
    return false;
  }
  
  if (rule.especie !== null && 
      fact.especie?.toLowerCase() !== rule.especie.toLowerCase()) {
    return false;
  }
  
  if (rule.variedad !== null && 
      fact.variedad?.toLowerCase() !== rule.variedad.toLowerCase()) {
    return false;
  }
  
  if (rule.contratista !== null && 
      fact.contratista?.toLowerCase() !== rule.contratista.toLowerCase()) {
    return false;
  }
  
  if (rule.envase !== null && 
      fact.envase?.toLowerCase() !== rule.envase.toLowerCase()) {
    return false;
  }
  
  if (rule.usuario !== null && 
      fact.usuario?.toLowerCase() !== rule.usuario.toLowerCase()) {
    return false;
  }
  
  if (rule.cuadrilla !== null && 
      fact.cuadrilla?.toLowerCase() !== rule.cuadrilla.toLowerCase()) {
    return false;
  }
  
  // Verificar campos numéricos
  if (rule.idContratista !== null && fact.idContratista !== rule.idContratista) {
    return false;
  }
  
  if (rule.idUsuario !== null && fact.idUsuario !== rule.idUsuario) {
    return false;
  }
  
  // Verificar rango de fechas
  if (rule.dateStart !== null && fact.fecha && fact.fecha < rule.dateStart) {
    return false;
  }
  
  if (rule.dateEnd !== null && fact.fecha && fact.fecha > rule.dateEnd) {
    return false;
  }
  
  // Verificar días de la semana (1=lunes, 7=domingo)
  if (rule.weekdays !== null && rule.weekdays.length > 0 && fact.fecha) {
    const dayOfWeek = fact.fecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir a 1=lunes, 7=domingo
    if (!rule.weekdays.includes(normalizedDay)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Encuentra todas las reglas que coinciden con una fact
 */
export function findMatchingRules(fact: FactForMatching, rules: PriceRule[]): MatchingRule[] {
  const matchingRules = rules
    .filter(rule => rule.active && matchesRule(fact, rule))
    .map(rule => ({
      ...rule,
      specificity: calculateSpecificity(rule)
    }));
  
  // Ordenar por prioridad descendente, luego por especificidad descendente
  return matchingRules.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.specificity - a.specificity;
  });
}

/**
 * Obtiene la regla aplicable para una fact (la primera de la lista ordenada)
 */
export function getApplicableRule(fact: FactForMatching, rules: PriceRule[]): MatchingRule | null {
  const matchingRules = findMatchingRules(fact, rules);
  return matchingRules.length > 0 ? matchingRules[0] : null;
}

/**
 * Valida que no haya conflictos entre reglas OVERRIDE con la misma prioridad
 */
export function validateRuleConflicts(rules: PriceRule[]): string[] {
  const conflicts: string[] = [];
  const overrideRules = rules.filter(rule => rule.active && rule.mode === PriceMode.OVERRIDE);
  
  // Agrupar por prioridad
  const rulesByPriority = new Map<number, PriceRule[]>();
  for (const rule of overrideRules) {
    if (!rulesByPriority.has(rule.priority)) {
      rulesByPriority.set(rule.priority, []);
    }
    rulesByPriority.get(rule.priority)!.push(rule);
  }
  
  // Verificar conflictos dentro de cada grupo de prioridad
  for (const [priority, ruleGroup] of Array.from(rulesByPriority.entries())) {
    if (ruleGroup.length > 1) {
      // Verificar si hay reglas que podrían coincidir con la misma fact
      for (let i = 0; i < ruleGroup.length; i++) {
        for (let j = i + 1; j < ruleGroup.length; j++) {
          const rule1 = ruleGroup[i];
          const rule2 = ruleGroup[j];
          
          // Verificar si las reglas tienen campos conflictivos
          if (couldMatchSameFact(rule1, rule2)) {
            conflicts.push(
              `Conflicto detectado: Reglas "${rule1.id}" y "${rule2.id}" tienen la misma prioridad (${priority}) y podrían coincidir con la misma fact`
            );
          }
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Verifica si dos reglas podrían coincidir con la misma fact
 */
function couldMatchSameFact(rule1: PriceRule, rule2: PriceRule): boolean {
  // Si ambas reglas tienen el mismo envase específico, podrían coincidir
  if (rule1.envase !== null && rule2.envase !== null && 
      rule1.envase.toLowerCase() === rule2.envase.toLowerCase()) {
    return true;
  }
  
  // Si ambas reglas tienen el mismo trabajador específico, podrían coincidir
  if (rule1.idUsuario !== null && rule2.idUsuario !== null && 
      rule1.idUsuario === rule2.idUsuario) {
    return true;
  }
  
  // Si ambas reglas tienen el mismo contratista específico, podrían coincidir
  if (rule1.idContratista !== null && rule2.idContratista !== null && 
      rule1.idContratista === rule2.idContratista) {
    return true;
  }
  
  // Si ambas reglas tienen rangos de fechas superpuestos, podrían coincidir
  if (rule1.dateStart && rule1.dateEnd && rule2.dateStart && rule2.dateEnd) {
    if (rule1.dateStart <= rule2.dateEnd && rule2.dateStart <= rule1.dateEnd) {
      return true;
    }
  }
  
  // Si una regla no tiene restricciones de fecha y la otra sí, podrían coincidir
  if ((!rule1.dateStart && !rule1.dateEnd) || (!rule2.dateStart && !rule2.dateEnd)) {
    return true;
  }
  
  return false;
}
