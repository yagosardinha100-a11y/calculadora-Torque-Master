/**
 * Exportação e importação de backup em JSON.
 * Permite ao supervisor guardar uma cópia dos dados fora do navegador.
 */

import { format } from 'date-fns'
import type {
  Appointment,
  BackupPayload,
  CellOverride,
  Collaborator,
  Team,
} from '@/types'
import { APPOINTMENT_TYPES, DAY_STATUSES, ROLES, TEAM_COLOR_KEYS } from '@/types'
import { isValidISODate } from '@/utils/dates'

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `escala-mecanica-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isTeam(value: unknown): value is Team {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    typeof value.anchorDate === 'string' &&
    isValidISODate(value.anchorDate) &&
    (TEAM_COLOR_KEYS as readonly string[]).includes(value.color as string)
  )
}

function isCollaborator(value: unknown): value is Collaborator {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    (ROLES as readonly string[]).includes(value.role as string) &&
    isNonEmptyString(value.teamId) &&
    typeof value.active === 'boolean'
  )
}

function isOverride(value: unknown): value is CellOverride {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.collaboratorId) &&
    typeof value.date === 'string' &&
    isValidISODate(value.date) &&
    (DAY_STATUSES as readonly string[]).includes(value.status as string)
  )
}

function isDobra(value: unknown): value is { startDate: string; endDate: string } {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.collaboratorId) &&
    typeof value.startDate === 'string' &&
    isValidISODate(value.startDate) &&
    typeof value.endDate === 'string' &&
    isValidISODate(value.endDate)
  )
}

function isAppointment(value: unknown): value is Appointment {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.collaboratorId) &&
    (APPOINTMENT_TYPES as readonly string[]).includes(value.type as string) &&
    typeof value.startDate === 'string' &&
    isValidISODate(value.startDate) &&
    typeof value.endDate === 'string' &&
    isValidISODate(value.endDate)
  )
}

/**
 * Valida a estrutura de um arquivo de backup.
 * Lança `Error` com mensagem amigável quando o arquivo é inválido.
 */
export function parseBackupFile(rawText: string): BackupPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('O arquivo selecionado não é um JSON válido.')
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.data)) {
    throw new Error('O arquivo não é um backup válido desta aplicação.')
  }

  const data = parsed.data
  const lists = ['settings', 'teams', 'collaborators', 'overrides', 'dobras', 'appointments']
  for (const key of lists) {
    if (!Array.isArray(data[key])) {
      throw new Error(`O backup está incompleto: seção "${key}" ausente.`)
    }
  }

  const teams = data.teams as unknown[]
  const collaborators = data.collaborators as unknown[]
  const overrides = data.overrides as unknown[]
  const dobras = data.dobras as unknown[]
  const appointments = data.appointments as unknown[]

  if (!teams.every(isTeam)) throw new Error('O backup contém turmas inválidas.')
  if (!collaborators.every(isCollaborator)) {
    throw new Error('O backup contém colaboradores inválidos.')
  }
  if (!overrides.every(isOverride)) throw new Error('O backup contém ajustes inválidos.')
  if (!dobras.every(isDobra)) throw new Error('O backup contém dobras inválidas.')
  if (!appointments.every(isAppointment)) {
    throw new Error('O backup contém compromissos inválidos.')
  }

  return parsed as unknown as BackupPayload
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsText(file)
  })
}
