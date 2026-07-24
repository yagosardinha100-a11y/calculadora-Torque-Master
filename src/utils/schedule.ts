/**
 * Motor de cálculo da escala 14x14.
 *
 * O ciclo de cada colaborador é derivado exclusivamente da data âncora da sua
 * turma, garantindo que a escala permaneça sempre sincronizada com a turma.
 *
 * Precedência na resolução do status de um dia:
 *   1. Ajuste manual de célula (`CellOverride`)
 *   2. Dobra (período embarcado além do normal)
 *   3. Compromisso (treinamento, exame médico, férias)
 *   4. Ciclo base da turma (Escala / Folga)
 *
 * Regra da dobra: os dias dentro do período da dobra deixam de ser folga e
 * passam a contar como embarque; a folga restante é o que sobra entre o fim
 * da dobra e o próximo embarque — que NÃO muda, pois o ciclo é ancorado na
 * turma.
 */

import { APPOINTMENT_STATUS_MAP, ONBOARD_STATUSES } from '@/constants/status'
import type {
  Appointment,
  CellOverride,
  Collaborator,
  Dobra,
  ISODate,
  Team,
} from '@/types'
import { buildOverrideId, type DayStatus } from '@/types'
import { addDaysISO, diffDaysISO, isWithinISO, type DayInfo } from '@/utils/dates'

export interface CycleConfig {
  daysOn: number
  daysOff: number
}

export const DEFAULT_CYCLE: CycleConfig = { daysOn: 14, daysOff: 14 }

export type CellSource = 'BASE' | 'OVERRIDE' | 'DOBRA' | 'APPOINTMENT'

export interface ResolvedCell {
  date: ISODate
  status: DayStatus
  source: CellSource
  /** Status que o ciclo da turma determinaria sem nenhum ajuste. */
  baseStatus: Extract<DayStatus, 'ESCALA' | 'FOLGA'>
  override: CellOverride | null
  dobra: Dobra | null
  /** Compromisso que cobre o dia (inclusive tipo `OUTRO`, que não muda o status). */
  appointment: Appointment | null
  observation: string
}

export interface ScheduleRow {
  collaborator: Collaborator
  team: Team | null
  cells: ResolvedCell[]
}

export interface ScheduleMatrix {
  rows: ScheduleRow[]
  /** Total de pessoas a bordo (POB) em cada dia do período. */
  pob: number[]
}

/** Estruturas de consulta pré-indexadas para resolução O(1) por célula. */
export interface ScheduleLookups {
  teamsById: Map<string, Team>
  overridesById: Map<string, CellOverride>
  dobrasByCollaborator: Map<string, Dobra[]>
  appointmentsByCollaborator: Map<string, Appointment[]>
}

export function buildScheduleLookups(
  teams: Team[],
  overrides: CellOverride[],
  dobras: Dobra[],
  appointments: Appointment[],
): ScheduleLookups {
  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const overridesById = new Map(overrides.map((override) => [override.id, override]))

  const dobrasByCollaborator = new Map<string, Dobra[]>()
  for (const dobra of dobras) {
    const list = dobrasByCollaborator.get(dobra.collaboratorId) ?? []
    list.push(dobra)
    dobrasByCollaborator.set(dobra.collaboratorId, list)
  }

  const appointmentsByCollaborator = new Map<string, Appointment[]>()
  for (const appointment of appointments) {
    const list = appointmentsByCollaborator.get(appointment.collaboratorId) ?? []
    list.push(appointment)
    appointmentsByCollaborator.set(appointment.collaboratorId, list)
  }

  return { teamsById, overridesById, dobrasByCollaborator, appointmentsByCollaborator }
}

/* ------------------------------------------------------------------ */
/* Ciclo base                                                           */
/* ------------------------------------------------------------------ */

/** Status determinado apenas pelo ciclo da turma (sem ajustes). */
export function getBaseStatus(
  date: ISODate,
  team: Team | null,
  cycle: CycleConfig,
): Extract<DayStatus, 'ESCALA' | 'FOLGA'> {
  if (!team) return 'FOLGA'
  const cycleLength = cycle.daysOn + cycle.daysOff
  if (cycleLength <= 0) return 'FOLGA'
  const diff = diffDaysISO(date, team.anchorDate)
  const position = ((diff % cycleLength) + cycleLength) % cycleLength
  return position < cycle.daysOn ? 'ESCALA' : 'FOLGA'
}

/** Primeira data estritamente após `date` em que o ciclo volta a ser ESCALA. */
export function getNextEmbarkDate(
  date: ISODate,
  team: Team,
  cycle: CycleConfig,
): ISODate {
  const cycleLength = cycle.daysOn + cycle.daysOff
  const diff = diffDaysISO(date, team.anchorDate)
  const position = ((diff % cycleLength) + cycleLength) % cycleLength
  const daysUntilNextCycle = cycleLength - position
  return addDaysISO(date, daysUntilNextCycle)
}

/** Última data do embarque que contém ou antecede `date` no ciclo. */
export function getEmbarkEndDate(
  date: ISODate,
  team: Team,
  cycle: CycleConfig,
): ISODate {
  const cycleLength = cycle.daysOn + cycle.daysOff
  const diff = diffDaysISO(date, team.anchorDate)
  const position = ((diff % cycleLength) + cycleLength) % cycleLength
  return addDaysISO(date, cycle.daysOn - 1 - position)
}

/**
 * Dias de folga restantes entre o fim de uma dobra e o próximo embarque.
 * O próximo embarque nunca muda; a dobra apenas consome dias de folga.
 */
export function getRemainingFolgaAfter(
  dobraEnd: ISODate,
  team: Team,
  cycle: CycleConfig,
): { remainingDays: number; nextEmbarkDate: ISODate } {
  const nextEmbarkDate = getNextEmbarkDate(dobraEnd, team, cycle)
  const remainingDays = Math.max(0, diffDaysISO(nextEmbarkDate, dobraEnd) - 1)
  return { remainingDays, nextEmbarkDate }
}

/* ------------------------------------------------------------------ */
/* Resolução de células                                                 */
/* ------------------------------------------------------------------ */

function findCovering<T extends { startDate: ISODate; endDate: ISODate }>(
  records: T[] | undefined,
  date: ISODate,
): T | null {
  if (!records) return null
  return records.find((record) => isWithinISO(date, record.startDate, record.endDate)) ?? null
}

/** Resolve o status efetivo de um colaborador em um dia específico. */
export function resolveCell(
  collaborator: Collaborator,
  date: ISODate,
  lookups: ScheduleLookups,
  cycle: CycleConfig,
): ResolvedCell {
  const team = lookups.teamsById.get(collaborator.teamId) ?? null
  const baseStatus = getBaseStatus(date, team, cycle)

  const override = lookups.overridesById.get(buildOverrideId(collaborator.id, date)) ?? null
  const dobra = findCovering(lookups.dobrasByCollaborator.get(collaborator.id), date)
  const appointment = findCovering(
    lookups.appointmentsByCollaborator.get(collaborator.id),
    date,
  )

  if (override) {
    return {
      date,
      status: override.status,
      source: 'OVERRIDE',
      baseStatus,
      override,
      dobra,
      appointment,
      observation: override.observation,
    }
  }

  if (dobra) {
    return {
      date,
      status: 'DOBRA',
      source: 'DOBRA',
      baseStatus,
      override: null,
      dobra,
      appointment,
      observation: dobra.observation,
    }
  }

  if (appointment) {
    const mappedStatus = APPOINTMENT_STATUS_MAP[appointment.type]
    if (mappedStatus) {
      return {
        date,
        status: mappedStatus,
        source: 'APPOINTMENT',
        baseStatus,
        override: null,
        dobra: null,
        appointment,
        observation: appointment.notes,
      }
    }
    // Tipo OUTRO: mantém o status base, mas a célula exibe o marcador.
    return {
      date,
      status: baseStatus,
      source: 'BASE',
      baseStatus,
      override: null,
      dobra: null,
      appointment,
      observation: appointment.notes,
    }
  }

  return {
    date,
    status: baseStatus,
    source: 'BASE',
    baseStatus,
    override: null,
    dobra: null,
    appointment: null,
    observation: '',
  }
}

/* ------------------------------------------------------------------ */
/* Matriz da grade + POB                                                */
/* ------------------------------------------------------------------ */

export function buildScheduleMatrix(
  collaborators: Collaborator[],
  days: DayInfo[],
  lookups: ScheduleLookups,
  cycle: CycleConfig,
): ScheduleMatrix {
  const pob = new Array<number>(days.length).fill(0)

  const rows: ScheduleRow[] = collaborators.map((collaborator) => {
    const team = lookups.teamsById.get(collaborator.teamId) ?? null
    const cells = days.map((day, index) => {
      const cell = resolveCell(collaborator, day.iso, lookups, cycle)
      if (collaborator.active && ONBOARD_STATUSES.has(cell.status)) {
        pob[index] = (pob[index] ?? 0) + 1
      }
      return cell
    })
    return { collaborator, team, cells }
  })

  return { rows, pob }
}

/* ------------------------------------------------------------------ */
/* Disponibilidade                                                      */
/* ------------------------------------------------------------------ */

export type AvailabilityState =
  | 'DISPONIVEL'
  | 'EMBARCADO'
  | 'COMPROMISSO'
  | 'INATIVO'

export interface AvailabilityInfo {
  state: AvailabilityState
  todayStatus: DayStatus
  /** Próximo embarque previsto pelo ciclo da turma. */
  nextEmbarkDate: ISODate | null
  /** Compromissos com fim a partir de hoje, ordenados por início. */
  upcomingAppointments: Appointment[]
}

/**
 * Identifica automaticamente a situação do colaborador na data informada:
 * embarcado, em compromisso (treinamento/exame/férias) ou disponível na
 * folga — informação usada para decidir quem pode cobrir férias.
 */
export function getAvailabilityInfo(
  collaborator: Collaborator,
  date: ISODate,
  lookups: ScheduleLookups,
  cycle: CycleConfig,
): AvailabilityInfo {
  const team = lookups.teamsById.get(collaborator.teamId) ?? null
  const cell = resolveCell(collaborator, date, lookups, cycle)

  const upcomingAppointments = (
    lookups.appointmentsByCollaborator.get(collaborator.id) ?? []
  )
    .filter((appointment) => appointment.endDate >= date)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))

  const nextEmbarkDate =
    team === null
      ? null
      : cell.baseStatus === 'ESCALA'
        ? getNextEmbarkDate(getEmbarkEndDate(date, team, cycle), team, cycle)
        : getNextEmbarkDate(date, team, cycle)

  let state: AvailabilityState
  if (!collaborator.active) {
    state = 'INATIVO'
  } else if (ONBOARD_STATUSES.has(cell.status)) {
    state = 'EMBARCADO'
  } else if (
    cell.status === 'TREINAMENTO' ||
    cell.status === 'EXAME_MEDICO' ||
    cell.status === 'FERIAS' ||
    (cell.appointment !== null && cell.appointment.type === 'OUTRO')
  ) {
    state = 'COMPROMISSO'
  } else {
    state = 'DISPONIVEL'
  }

  return { state, todayStatus: cell.status, nextEmbarkDate, upcomingAppointments }
}
