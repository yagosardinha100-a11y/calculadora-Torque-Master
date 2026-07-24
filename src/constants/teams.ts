import type { TeamColorKey } from '@/types'

export interface TeamColorConfig {
  label: string
  badgeClass: string
  dotClass: string
}

export const TEAM_COLORS: Record<TeamColorKey, TeamColorConfig> = {
  blue: {
    label: 'Azul',
    badgeClass: 'bg-blue-100 text-blue-800 ring-blue-200',
    dotClass: 'bg-blue-500',
  },
  emerald: {
    label: 'Verde',
    badgeClass: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  amber: {
    label: 'Âmbar',
    badgeClass: 'bg-amber-100 text-amber-800 ring-amber-200',
    dotClass: 'bg-amber-500',
  },
  violet: {
    label: 'Violeta',
    badgeClass: 'bg-violet-100 text-violet-800 ring-violet-200',
    dotClass: 'bg-violet-500',
  },
  rose: {
    label: 'Rosa',
    badgeClass: 'bg-rose-100 text-rose-800 ring-rose-200',
    dotClass: 'bg-rose-500',
  },
  teal: {
    label: 'Teal',
    badgeClass: 'bg-teal-100 text-teal-800 ring-teal-200',
    dotClass: 'bg-teal-500',
  },
  orange: {
    label: 'Laranja',
    badgeClass: 'bg-orange-100 text-orange-800 ring-orange-200',
    dotClass: 'bg-orange-500',
  },
  slate: {
    label: 'Cinza',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    dotClass: 'bg-slate-500',
  },
}
