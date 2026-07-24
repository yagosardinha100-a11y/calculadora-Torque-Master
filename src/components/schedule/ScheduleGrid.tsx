import { ROLE_LABELS } from '@/constants/roles'
import { TEAM_COLORS } from '@/constants/teams'
import { ScheduleCell } from '@/components/schedule/ScheduleCell'
import type { Collaborator } from '@/types'
import type { DayInfo } from '@/utils/dates'
import type { ResolvedCell, ScheduleMatrix } from '@/utils/schedule'
import { cn } from '@/utils/cn'

interface ScheduleGridProps {
  days: DayInfo[]
  matrix: ScheduleMatrix
  onCellClick: (collaborator: Collaborator, cell: ResolvedCell) => void
}

/**
 * Grade principal estilo planilha: cabeçalho de dias fixo no topo, coluna de
 * colaboradores fixa à esquerda, linha de POB fixa na base e rolagem
 * horizontal para os dias do mês.
 */
export function ScheduleGrid({ days, matrix, onCellClick }: ScheduleGridProps) {
  return (
    <div className="schedule-scroll min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-0 left-0 z-40 w-44 min-w-44 border-r border-b border-slate-200 bg-slate-50 px-3 py-2 text-left align-middle sm:w-56 sm:min-w-56"
            >
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Colaborador
              </span>
            </th>
            {days.map((day) => (
              <th
                key={day.iso}
                scope="col"
                className={cn(
                  'sticky top-0 z-30 min-w-9 border-r border-b border-slate-200 px-0 py-1.5 text-center align-middle',
                  day.isToday ? 'bg-blue-600' : day.isWeekend ? 'bg-slate-100' : 'bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'block text-xs leading-tight font-bold',
                    day.isToday ? 'text-white' : 'text-slate-700',
                  )}
                >
                  {day.dayOfMonth}
                </span>
                <span
                  className={cn(
                    'block text-[10px] leading-tight font-medium',
                    day.isToday
                      ? 'text-blue-100'
                      : day.isWeekend
                        ? 'text-rose-400'
                        : 'text-slate-400',
                  )}
                >
                  {day.weekdayLetter}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {matrix.rows.map(({ collaborator, team, cells }) => {
            const teamColor = team ? TEAM_COLORS[team.color] : null
            return (
              <tr key={collaborator.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-20 border-r border-b border-slate-200 bg-white px-3 py-1 text-left align-middle"
                >
                  <div className="flex items-center gap-2">
                    {teamColor ? (
                      <span
                        className={cn('size-2 shrink-0 rounded-full', teamColor.dotClass)}
                        title={team?.name}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {collaborator.name}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {ROLE_LABELS[collaborator.role]}
                        {team ? ` · ${team.name}` : ''}
                      </p>
                    </div>
                  </div>
                </th>
                {cells.map((cell, index) => {
                  const day = days[index]
                  return (
                    <td
                      key={cell.date}
                      className="border-r border-b border-slate-200 p-0 align-middle"
                    >
                      <ScheduleCell
                        cell={cell}
                        collaboratorName={collaborator.name}
                        isToday={day?.isToday ?? false}
                        onClick={() => onCellClick(collaborator, cell)}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <th
              scope="row"
              className="sticky bottom-0 left-0 z-40 border-t border-r border-slate-700 bg-slate-800 px-3 py-2 text-left align-middle"
            >
              <span className="text-xs font-semibold tracking-wide text-white uppercase">
                POB · a bordo
              </span>
            </th>
            {matrix.pob.map((count, index) => {
              const day = days[index]
              return (
                <td
                  key={day?.iso ?? index}
                  className={cn(
                    'sticky bottom-0 z-30 border-t border-r border-slate-700 px-0 py-2 text-center align-middle',
                    day?.isToday ? 'bg-blue-700' : 'bg-slate-800',
                  )}
                >
                  <span className="text-xs font-bold text-white tabular-nums">{count}</span>
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
