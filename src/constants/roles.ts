import type { Role } from '@/types'

export const ROLE_LABELS: Record<Role, string> = {
  SUPERVISOR: 'Supervisor',
  CHEFE_MECANICA: 'Chefe Mecânica',
  MECANICO: 'Mecânico',
  ASSISTENTE_MECANICO: 'Assistente Mecânico',
  COORDENADOR: 'Coordenador',
  OUTROS: 'Outros',
}

/**
 * Ordem hierárquica usada para ordenar a grade da escala,
 * do cargo mais sênior para o mais júnior.
 */
export const ROLE_ORDER: Record<Role, number> = {
  COORDENADOR: 0,
  SUPERVISOR: 1,
  CHEFE_MECANICA: 2,
  MECANICO: 3,
  ASSISTENTE_MECANICO: 4,
  OUTROS: 5,
}
