/**
 * Dados mínimos criados na primeira execução: configurações padrão do ciclo
 * (14x14) e duas turmas alternadas cobrindo a embarcação continuamente.
 * Tudo é editável na tela de Configurações.
 */

import { STORE_NAMES } from '@/db/database'
import { getAllRecords, putRecord, putRecords } from '@/db/repository'
import type { AppSettings, Team } from '@/types'
import { SETTINGS_ID } from '@/types'
import { addDaysISO, todayISO } from '@/utils/dates'
import { createId } from '@/utils/id'
import { DEFAULT_CYCLE } from '@/utils/schedule'

export function buildDefaultSettings(): AppSettings {
  return {
    id: SETTINGS_ID,
    daysOn: DEFAULT_CYCLE.daysOn,
    daysOff: DEFAULT_CYCLE.daysOff,
    updatedAt: new Date().toISOString(),
  }
}

function buildDefaultTeams(): Team[] {
  const now = new Date().toISOString()
  // Turma A iniciou embarque há 7 dias (meio do embarque);
  // Turma B embarca quando a A desembarca, mantendo a cobertura contínua.
  const anchorA = addDaysISO(todayISO(), -7)
  const anchorB = addDaysISO(anchorA, DEFAULT_CYCLE.daysOn)

  return [
    { id: createId(), name: 'Turma A', anchorDate: anchorA, color: 'blue', createdAt: now },
    { id: createId(), name: 'Turma B', anchorDate: anchorB, color: 'emerald', createdAt: now },
  ]
}

/** Garante que configurações e turmas existam na primeira execução. */
export async function ensureSeedData(): Promise<void> {
  const [settings, teams] = await Promise.all([
    getAllRecords<AppSettings>(STORE_NAMES.settings),
    getAllRecords<Team>(STORE_NAMES.teams),
  ])

  if (settings.length === 0) {
    await putRecord(STORE_NAMES.settings, buildDefaultSettings())
  }

  if (teams.length === 0) {
    await putRecords(STORE_NAMES.teams, buildDefaultTeams())
  }
}
