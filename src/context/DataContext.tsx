/**
 * Contexto global de dados.
 *
 * Carrega todas as entidades do IndexedDB para memória na inicialização e
 * expõe operações de escrita que persistem primeiro no banco e depois
 * atualizam o estado — mantendo React e IndexedDB sempre sincronizados.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORE_NAMES, initStorage, isSchemaMismatchError, resetDatabase } from '@/db/database'
import {
  clearAllStores,
  deleteByCollaborator,
  deleteRecord,
  getAllRecords,
  putRecord,
  replaceStore,
  storageMode as getStorageMode,
} from '@/db/repository'
import { buildDefaultSettings, ensureSeedData } from '@/db/seed'
import type {
  Appointment,
  AppointmentType,
  AppSettings,
  BackupPayload,
  CellOverride,
  Collaborator,
  DayStatus,
  Dobra,
  ISODate,
  Role,
  Team,
  TeamColorKey,
} from '@/types'
import { buildOverrideId, SETTINGS_ID } from '@/types'
import {
  buildScheduleLookups,
  type CycleConfig,
  type ScheduleLookups,
} from '@/utils/schedule'
import { createId } from '@/utils/id'

/* ------------------------------------------------------------------ */
/* Tipos de entrada das ações                                           */
/* ------------------------------------------------------------------ */

export interface TeamInput {
  name: string
  anchorDate: ISODate
  color: TeamColorKey
}

export interface CollaboratorInput {
  name: string
  role: Role
  teamId: string
  active: boolean
}

export interface OverrideInput {
  collaboratorId: string
  date: ISODate
  status: DayStatus
  observation: string
}

export interface DobraInput {
  id?: string
  collaboratorId: string
  startDate: ISODate
  endDate: ISODate
  reason: string
  observation: string
}

export interface AppointmentInput {
  id?: string
  collaboratorId: string
  type: AppointmentType
  startDate: ISODate
  endDate: ISODate
  title: string
  notes: string
}

/* ------------------------------------------------------------------ */
/* Contrato do contexto                                                 */
/* ------------------------------------------------------------------ */

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface DataContextValue {
  status: LoadStatus
  loadError: string | null

  settings: AppSettings
  teams: Team[]
  collaborators: Collaborator[]
  overrides: CellOverride[]
  dobras: Dobra[]
  appointments: Appointment[]

  /** Estruturas indexadas para o motor de escala. */
  lookups: ScheduleLookups
  cycle: CycleConfig

  addTeam: (input: TeamInput) => Promise<Team>
  updateTeam: (id: string, input: TeamInput) => Promise<void>
  deleteTeam: (id: string) => Promise<void>

  addCollaborator: (input: CollaboratorInput) => Promise<Collaborator>
  updateCollaborator: (id: string, input: CollaboratorInput) => Promise<void>
  deleteCollaborator: (id: string) => Promise<void>

  saveOverride: (input: OverrideInput) => Promise<void>
  removeOverride: (id: string) => Promise<void>

  saveDobra: (input: DobraInput) => Promise<void>
  removeDobra: (id: string) => Promise<void>

  saveAppointment: (input: AppointmentInput) => Promise<void>
  removeAppointment: (id: string) => Promise<void>

  updateSettings: (daysOn: number, daysOff: number) => Promise<void>

  buildBackup: () => BackupPayload
  importBackup: (payload: BackupPayload) => Promise<void>
  clearAllData: () => Promise<void>
  resetLocalDatabase: () => Promise<void>
  storageMode: 'indexeddb' | 'memory'
}

const DataContext = createContext<DataContextValue | null>(null)

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [storageMode, setStorageMode] = useState<'indexeddb' | 'memory'>('indexeddb')

  const [settings, setSettings] = useState<AppSettings>(buildDefaultSettings)
  const [teams, setTeams] = useState<Team[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [overrides, setOverrides] = useState<CellOverride[]>([])
  const [dobras, setDobras] = useState<Dobra[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const loadAll = useCallback(async () => {
    const [
      settingsRecords,
      teamRecords,
      collaboratorRecords,
      overrideRecords,
      dobraRecords,
      appointmentRecords,
    ] = await Promise.all([
      getAllRecords<AppSettings>(STORE_NAMES.settings),
      getAllRecords<Team>(STORE_NAMES.teams),
      getAllRecords<Collaborator>(STORE_NAMES.collaborators),
      getAllRecords<CellOverride>(STORE_NAMES.overrides),
      getAllRecords<Dobra>(STORE_NAMES.dobras),
      getAllRecords<Appointment>(STORE_NAMES.appointments),
    ])

    setSettings(settingsRecords[0] ?? buildDefaultSettings())
    setTeams(teamRecords.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    setCollaborators(collaboratorRecords)
    setOverrides(overrideRecords)
    setDobras(dobraRecords)
    setAppointments(appointmentRecords)
  }, [])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      const mode = await initStorage()
      if (!cancelled) setStorageMode(mode)
      await ensureSeedData()
      await loadAll()
      if (!cancelled) {
        setLoadError(null)
        setStatus('ready')
        setStorageMode(getStorageMode())
      }
    }

    ;(async () => {
      try {
        await initialize()
      } catch (error) {
        if (!cancelled && isSchemaMismatchError(error)) {
          try {
            await resetDatabase()
            await initialize()
            return
          } catch (retryError) {
            if (!cancelled) {
              setLoadError(
                retryError instanceof Error
                  ? retryError.message
                  : 'Falha ao recriar o banco de dados local.',
              )
              setStatus('error')
            }
            return
          }
        }

        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Falha ao carregar os dados locais.',
          )
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadAll])

  /* ---------------------------- Turmas ---------------------------- */

  const addTeam = useCallback(async (input: TeamInput): Promise<Team> => {
    const team: Team = {
      id: createId(),
      name: input.name.trim(),
      anchorDate: input.anchorDate,
      color: input.color,
      createdAt: new Date().toISOString(),
    }
    await putRecord(STORE_NAMES.teams, team)
    setTeams((current) =>
      [...current, team].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    )
    return team
  }, [])

  const updateTeam = useCallback(
    async (id: string, input: TeamInput): Promise<void> => {
      const existing = teams.find((team) => team.id === id)
      if (!existing) throw new Error('Turma não encontrada.')
      const updated: Team = {
        ...existing,
        name: input.name.trim(),
        anchorDate: input.anchorDate,
        color: input.color,
      }
      await putRecord(STORE_NAMES.teams, updated)
      setTeams((current) =>
        current
          .map((team) => (team.id === id ? updated : team))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
    },
    [teams],
  )

  const deleteTeam = useCallback(
    async (id: string): Promise<void> => {
      const inUse = collaborators.some((collaborator) => collaborator.teamId === id)
      if (inUse) {
        throw new Error(
          'Não é possível excluir uma turma com colaboradores vinculados. Transfira-os antes.',
        )
      }
      await deleteRecord(STORE_NAMES.teams, id)
      setTeams((current) => current.filter((team) => team.id !== id))
    },
    [collaborators],
  )

  /* ------------------------- Colaboradores ------------------------ */

  const addCollaborator = useCallback(
    async (input: CollaboratorInput): Promise<Collaborator> => {
      const now = new Date().toISOString()
      const collaborator: Collaborator = {
        id: createId(),
        name: input.name.trim(),
        role: input.role,
        teamId: input.teamId,
        active: input.active,
        createdAt: now,
        updatedAt: now,
      }
      await putRecord(STORE_NAMES.collaborators, collaborator)
      setCollaborators((current) => [...current, collaborator])
      return collaborator
    },
    [],
  )

  const updateCollaborator = useCallback(
    async (id: string, input: CollaboratorInput): Promise<void> => {
      const existing = collaborators.find((collaborator) => collaborator.id === id)
      if (!existing) throw new Error('Colaborador não encontrado.')
      const updated: Collaborator = {
        ...existing,
        name: input.name.trim(),
        role: input.role,
        teamId: input.teamId,
        active: input.active,
        updatedAt: new Date().toISOString(),
      }
      await putRecord(STORE_NAMES.collaborators, updated)
      setCollaborators((current) =>
        current.map((collaborator) => (collaborator.id === id ? updated : collaborator)),
      )
    },
    [collaborators],
  )

  const deleteCollaborator = useCallback(async (id: string): Promise<void> => {
    await deleteByCollaborator(
      [STORE_NAMES.overrides, STORE_NAMES.dobras, STORE_NAMES.appointments],
      id,
    )
    await deleteRecord(STORE_NAMES.collaborators, id)
    setCollaborators((current) => current.filter((collaborator) => collaborator.id !== id))
    setOverrides((current) => current.filter((record) => record.collaboratorId !== id))
    setDobras((current) => current.filter((record) => record.collaboratorId !== id))
    setAppointments((current) => current.filter((record) => record.collaboratorId !== id))
  }, [])

  /* ---------------------------- Ajustes ---------------------------- */

  const saveOverride = useCallback(async (input: OverrideInput): Promise<void> => {
    const override: CellOverride = {
      id: buildOverrideId(input.collaboratorId, input.date),
      collaboratorId: input.collaboratorId,
      date: input.date,
      status: input.status,
      observation: input.observation.trim(),
      updatedAt: new Date().toISOString(),
    }
    await putRecord(STORE_NAMES.overrides, override)
    setOverrides((current) => [
      ...current.filter((record) => record.id !== override.id),
      override,
    ])
  }, [])

  const removeOverride = useCallback(async (id: string): Promise<void> => {
    await deleteRecord(STORE_NAMES.overrides, id)
    setOverrides((current) => current.filter((record) => record.id !== id))
  }, [])

  /* ----------------------------- Dobras ---------------------------- */

  const saveDobra = useCallback(
    async (input: DobraInput): Promise<void> => {
      const now = new Date().toISOString()
      const existing = input.id ? dobras.find((record) => record.id === input.id) : undefined
      const dobra: Dobra = {
        id: existing?.id ?? createId(),
        collaboratorId: input.collaboratorId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason.trim(),
        observation: input.observation.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await putRecord(STORE_NAMES.dobras, dobra)
      setDobras((current) => [
        ...current.filter((record) => record.id !== dobra.id),
        dobra,
      ])
    },
    [dobras],
  )

  const removeDobra = useCallback(async (id: string): Promise<void> => {
    await deleteRecord(STORE_NAMES.dobras, id)
    setDobras((current) => current.filter((record) => record.id !== id))
  }, [])

  /* -------------------------- Compromissos ------------------------- */

  const saveAppointment = useCallback(
    async (input: AppointmentInput): Promise<void> => {
      const now = new Date().toISOString()
      const existing = input.id
        ? appointments.find((record) => record.id === input.id)
        : undefined
      const appointment: Appointment = {
        id: existing?.id ?? createId(),
        collaboratorId: input.collaboratorId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        title: input.title.trim(),
        notes: input.notes.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await putRecord(STORE_NAMES.appointments, appointment)
      setAppointments((current) => [
        ...current.filter((record) => record.id !== appointment.id),
        appointment,
      ])
    },
    [appointments],
  )

  const removeAppointment = useCallback(async (id: string): Promise<void> => {
    await deleteRecord(STORE_NAMES.appointments, id)
    setAppointments((current) => current.filter((record) => record.id !== id))
  }, [])

  /* ------------------------- Configurações ------------------------- */

  const updateSettings = useCallback(
    async (daysOn: number, daysOff: number): Promise<void> => {
      const updated: AppSettings = {
        id: SETTINGS_ID,
        daysOn,
        daysOff,
        updatedAt: new Date().toISOString(),
      }
      await putRecord(STORE_NAMES.settings, updated)
      setSettings(updated)
    },
    [],
  )

  /* ----------------------------- Backup ---------------------------- */

  const buildBackup = useCallback((): BackupPayload => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: [settings],
        teams,
        collaborators,
        overrides,
        dobras,
        appointments,
      },
    }
  }, [settings, teams, collaborators, overrides, dobras, appointments])

  const importBackup = useCallback(
    async (payload: BackupPayload): Promise<void> => {
      await Promise.all([
        replaceStore(STORE_NAMES.settings, payload.data.settings),
        replaceStore(STORE_NAMES.teams, payload.data.teams),
        replaceStore(STORE_NAMES.collaborators, payload.data.collaborators),
        replaceStore(STORE_NAMES.overrides, payload.data.overrides),
        replaceStore(STORE_NAMES.dobras, payload.data.dobras),
        replaceStore(STORE_NAMES.appointments, payload.data.appointments),
      ])
      await ensureSeedData()
      await loadAll()
    },
    [loadAll],
  )

  const clearAllData = useCallback(async (): Promise<void> => {
    await clearAllStores()
    await ensureSeedData()
    await loadAll()
  }, [loadAll])

  const resetLocalDatabase = useCallback(async (): Promise<void> => {
    await resetDatabase()
    await ensureSeedData()
    await loadAll()
    setLoadError(null)
    setStorageMode(getStorageMode())
    setStatus('ready')
  }, [loadAll])

  /* ---------------------------- Derivados -------------------------- */

  const lookups = useMemo(
    () => buildScheduleLookups(teams, overrides, dobras, appointments),
    [teams, overrides, dobras, appointments],
  )

  const cycle = useMemo<CycleConfig>(
    () => ({ daysOn: settings.daysOn, daysOff: settings.daysOff }),
    [settings.daysOn, settings.daysOff],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      loadError,
      settings,
      teams,
      collaborators,
      overrides,
      dobras,
      appointments,
      lookups,
      cycle,
      addTeam,
      updateTeam,
      deleteTeam,
      addCollaborator,
      updateCollaborator,
      deleteCollaborator,
      saveOverride,
      removeOverride,
      saveDobra,
      removeDobra,
      saveAppointment,
      removeAppointment,
      updateSettings,
      buildBackup,
      importBackup,
      clearAllData,
      resetLocalDatabase,
      storageMode,
    }),
    [
      status,
      loadError,
      settings,
      teams,
      collaborators,
      overrides,
      dobras,
      appointments,
      lookups,
      cycle,
      addTeam,
      updateTeam,
      deleteTeam,
      addCollaborator,
      updateCollaborator,
      deleteCollaborator,
      saveOverride,
      removeOverride,
      saveDobra,
      removeDobra,
      saveAppointment,
      removeAppointment,
      updateSettings,
      buildBackup,
      importBackup,
      clearAllData,
      resetLocalDatabase,
      storageMode,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/* ------------------------------------------------------------------ */
/* Hook de consumo                                                      */
/* ------------------------------------------------------------------ */

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData deve ser usado dentro de <DataProvider>.')
  }
  return context
}
