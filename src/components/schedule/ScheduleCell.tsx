import { memo } from 'react'
import { STATUS_CONFIG } from '@/constants/status'
import type { ResolvedCell } from '@/utils/schedule'
import { cn } from '@/utils/cn'
import { formatShortDate } from '@/utils/dates'

interface ScheduleCellProps {
  cell: ResolvedCell
  collaboratorName: string
  isToday: boolean
  onClick: () => void
}

function buildTooltip(cell: ResolvedCell, collaboratorName: string): string {
  const config = STATUS_CONFIG[cell.status]
  const parts = [`${collaboratorName} — ${formatShortDate(cell.date)}`, config.label]
  if (cell.dobra && cell.status === 'DOBRA' && cell.dobra.reason) {
    parts.push(`Motivo: ${cell.dobra.reason}`)
  }
  if (cell.appointment?.type === 'OUTRO' && cell.appointment.title) {
    parts.push(`Compromisso: ${cell.appointment.title}`)
  }
  if (cell.observation) {
    parts.push(`Obs.: ${cell.observation}`)
  }
  return parts.join('\n')
}

export const ScheduleCell = memo(function ScheduleCell({
  cell,
  collaboratorName,
  isToday,
  onClick,
}: ScheduleCellProps) {
  const config = STATUS_CONFIG[cell.status]
  const hasOtherAppointment = cell.appointment?.type === 'OUTRO'
  const hasObservation = cell.observation.length > 0

  return (
    <button
      type="button"
      onClick={onClick}
      title={buildTooltip(cell, collaboratorName)}
      aria-label={`${collaboratorName}, ${formatShortDate(cell.date)}: ${config.label}`}
      className={cn(
        'relative flex h-9 w-full cursor-pointer items-center justify-center text-[10px] font-bold transition-colors',
        config.cellClass,
        isToday && 'ring-2 ring-blue-500 ring-inset',
      )}
    >
      {config.code}
      {hasObservation ? (
        <span
          className={cn(
            'absolute top-1 right-1 size-1.5 rounded-full',
            cell.status === 'FOLGA' ? 'bg-slate-500' : 'bg-white/90',
          )}
        />
      ) : null}
      {hasOtherAppointment ? (
        <span className="absolute right-1 bottom-1 size-1.5 rounded-full bg-indigo-500 ring-1 ring-white" />
      ) : null}
    </button>
  )
})
