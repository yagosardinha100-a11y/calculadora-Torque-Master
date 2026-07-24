/**
 * Tipos de domínio da aplicação de controle de escala offshore.
 *
 * Todas as datas de calendário são armazenadas como strings ISO (`yyyy-MM-dd`)
 * para evitar problemas de fuso horário na persistência em IndexedDB.
 */

/** Data de calendário no formato ISO `yyyy-MM-dd`. */
export type ISODate = string

/* ------------------------------------------------------------------ */
/* Status diário                                                        */
/* ------------------------------------------------------------------ */

export const DAY_STATUSES = [
  'ESCALA',
  'DOBRA',
  'FOLGA',
  'FERIAS',
  'TREINAMENTO',
  'EXAME_MEDICO',
  'NO_SHOW',
] as const

export type DayStatus = (typeof DAY_STATUSES)[number]

/* ------------------------------------------------------------------ */
/* Funções (cargos)                                                     */
/* ------------------------------------------------------------------ */

export const ROLES = [
  'SUPERVISOR',
  'CHEFE_MECANICA',
  'MECANICO',
  'ASSISTENTE_MECANICO',
  'COORDENADOR',
  'OUTROS',
] as const

export type Role = (typeof ROLES)[number]

/* ------------------------------------------------------------------ */
/* Turma                                                                */
/* ------------------------------------------------------------------ */

export const TEAM_COLOR_KEYS = [
  'blue',
  'emerald',
  'amber',
  'violet',
  'rose',
  'teal',
  'orange',
  'slate',
] as const

export type TeamColorKey = (typeof TEAM_COLOR_KEYS)[number]

export interface Team {
  id: string
  name: string
  /**
   * Data âncora do ciclo: primeiro dia de um embarque.
   * A partir dela o ciclo `daysOn x daysOff` se repete indefinidamente,
   * garantindo que a escala fique sempre sincronizada com a turma.
   */
  anchorDate: ISODate
  color: TeamColorKey
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* Colaborador                                                          */
/* ------------------------------------------------------------------ */

export interface Collaborator {
  id: string
  name: string
  role: Role
  teamId: string
  active: boolean
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Ajuste pontual de célula                                             */
/* ------------------------------------------------------------------ */

/**
 * Ajuste manual aplicado a um único dia de um colaborador.
 * Tem precedência sobre dobras, compromissos e sobre o ciclo base.
 */
export interface CellOverride {
  /** Chave composta `${collaboratorId}|${date}`. */
  id: string
  collaboratorId: string
  date: ISODate
  status: DayStatus
  observation: string
  updatedAt: string
}

export function buildOverrideId(collaboratorId: string, date: ISODate): string {
  return `${collaboratorId}|${date}`
}

/* ------------------------------------------------------------------ */
/* Dobra                                                                */
/* ------------------------------------------------------------------ */

/**
 * Período em que o colaborador permanece embarcado além do embarque normal.
 * Consome exatamente os dias de folga correspondentes; o próximo embarque
 * não é alterado, pois o ciclo permanece ancorado na turma.
 */
export interface Dobra {
  id: string
  collaboratorId: string
  startDate: ISODate
  endDate: ISODate
  reason: string
  observation: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Compromissos (durante a folga)                                       */
/* ------------------------------------------------------------------ */

export const APPOINTMENT_TYPES = [
  'TREINAMENTO',
  'EXAME_MEDICO',
  'FERIAS',
  'OUTRO',
] as const

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]

export interface Appointment {
  id: string
  collaboratorId: string
  type: AppointmentType
  startDate: ISODate
  endDate: ISODate
  /** Descrição livre — obrigatória apenas para o tipo `OUTRO`. */
  title: string
  notes: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Configurações                                                        */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  /** Chave fixa: existe apenas um registro de configurações. */
  id: 'app-settings'
  /** Dias embarcado por ciclo (padrão 14). */
  daysOn: number
  /** Dias de folga por ciclo (padrão 14). */
  daysOff: number
  updatedAt: string
}

export const SETTINGS_ID = 'app-settings' as const

/* ------------------------------------------------------------------ */
/* Backup                                                               */
/* ------------------------------------------------------------------ */

export interface BackupPayload {
  version: 1
  exportedAt: string
  data: {
    settings: AppSettings[]
    teams: Team[]
    collaborators: Collaborator[]
    overrides: CellOverride[]
    dobras: Dobra[]
    appointments: Appointment[]
  }
}
