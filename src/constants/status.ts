import type { AppointmentType, DayStatus } from '@/types'

export interface StatusConfig {
  /** Nome completo exibido em legendas e formulários. */
  label: string
  /** Código curto exibido dentro da célula, como em uma planilha. */
  code: string
  /** Classes da célula na grade (fundo + texto). */
  cellClass: string
  /** Classes do marcador de legenda / chips. */
  dotClass: string
  /** Classes de badge (fundo claro + texto escuro). */
  badgeClass: string
  /** Descrição auxiliar exibida no editor de célula. */
  description: string
}

export const STATUS_CONFIG: Record<DayStatus, StatusConfig> = {
  ESCALA: {
    label: 'Escala',
    code: 'E',
    cellClass: 'bg-emerald-500 text-white hover:bg-emerald-600',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    description: 'Colaborador embarcado no período normal de trabalho.',
  },
  DOBRA: {
    label: 'Dobra',
    code: 'D',
    cellClass: 'bg-amber-500 text-white hover:bg-amber-600',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800',
    description:
      'Permanência a bordo além do embarque normal, consumindo dias de folga.',
  },
  FOLGA: {
    label: 'Folga',
    code: 'F',
    cellClass: 'bg-slate-100 text-slate-400 hover:bg-slate-200',
    dotClass: 'bg-slate-300',
    badgeClass: 'bg-slate-100 text-slate-600',
    description: 'Período de descanso em terra.',
  },
  FERIAS: {
    label: 'Férias',
    code: 'FÉ',
    cellClass: 'bg-sky-500 text-white hover:bg-sky-600',
    dotClass: 'bg-sky-500',
    badgeClass: 'bg-sky-100 text-sky-800',
    description: 'Período oficial de férias.',
  },
  TREINAMENTO: {
    label: 'Treinamento',
    code: 'T',
    cellClass: 'bg-violet-500 text-white hover:bg-violet-600',
    dotClass: 'bg-violet-500',
    badgeClass: 'bg-violet-100 text-violet-800',
    description: 'Treinamento ou curso durante a folga.',
  },
  EXAME_MEDICO: {
    label: 'Exame Médico',
    code: 'EX',
    cellClass: 'bg-cyan-500 text-white hover:bg-cyan-600',
    dotClass: 'bg-cyan-500',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    description: 'Exame médico ocupacional durante a folga.',
  },
  NO_SHOW: {
    label: 'No Show',
    code: 'NS',
    cellClass: 'bg-rose-600 text-white hover:bg-rose-700',
    dotClass: 'bg-rose-600',
    badgeClass: 'bg-rose-100 text-rose-800',
    description: 'Colaborador escalado que não se apresentou para embarque.',
  },
}

/** Ordem de exibição em legendas e seletores. */
export const STATUS_ORDER: DayStatus[] = [
  'ESCALA',
  'DOBRA',
  'FOLGA',
  'FERIAS',
  'TREINAMENTO',
  'EXAME_MEDICO',
  'NO_SHOW',
]

/** Status que contam como pessoa a bordo (POB). */
export const ONBOARD_STATUSES: ReadonlySet<DayStatus> = new Set([
  'ESCALA',
  'DOBRA',
])

/** Tipos de compromisso que alteram o status exibido na célula. */
export const APPOINTMENT_STATUS_MAP: Partial<Record<AppointmentType, DayStatus>> = {
  TREINAMENTO: 'TREINAMENTO',
  EXAME_MEDICO: 'EXAME_MEDICO',
  FERIAS: 'FERIAS',
}

export const APPOINTMENT_LABELS: Record<AppointmentType, string> = {
  TREINAMENTO: 'Treinamento',
  EXAME_MEDICO: 'Exame Médico',
  FERIAS: 'Férias',
  OUTRO: 'Outro compromisso',
}
