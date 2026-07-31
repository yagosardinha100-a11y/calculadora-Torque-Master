import { useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { TeamFormModal } from '@/components/settings/TeamFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TEAM_COLORS } from '@/constants/teams'
import { useData } from '@/context/DataContext'
import type { Team, TeamColorKey } from '@/types'
import { formatShortDate, isValidISODate, todayISO } from '@/utils/dates'
import { getBaseStatus, getEmbarkEndDate, getNextEmbarkDate } from '@/utils/schedule'
import { cn } from '@/utils/cn'

export function TeamsSection() {
  const { teams, collaborators, cycle, deleteTeam } = useData()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Team | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayISO()

  const handleDelete = async () => {
    if (!pendingRemoval) return
    try {
      await deleteTeam(pendingRemoval.id)
      setError(null)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a turma.',
      )
    } finally {
      setPendingRemoval(null)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Turmas</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Cada turma define a âncora do ciclo {cycle.daysOn}x{cycle.daysOff}. A escala dos
            colaboradores permanece sempre sincronizada com a turma.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<PlusIcon />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Nova turma
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {teams.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhuma turma cadastrada.
          </li>
        ) : null}
        {teams.map((team) => {
          const colorKey = team.color in TEAM_COLORS ? team.color : ('slate' as TeamColorKey)
          const color = TEAM_COLORS[colorKey]
          const memberCount = collaborators.filter(
            (collaborator) => collaborator.teamId === team.id,
          ).length

          if (!isValidISODate(team.anchorDate)) {
            return (
              <li
                key={team.id}
                className="flex items-center gap-3 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <span className="min-w-0 flex-1">
                  Turma “{team.name}” com data âncora inválida — edite para corrigir.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(team)
                    setFormOpen(true)
                  }}
                  title="Editar turma"
                  aria-label={`Editar ${team.name}`}
                  className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-100"
                >
                  <PencilIcon className="size-4" />
                </button>
              </li>
            )
          }

          const baseToday = getBaseStatus(today, team, cycle)
          const statusText =
            baseToday === 'ESCALA'
              ? `Embarcada · a bordo até ${formatShortDate(getEmbarkEndDate(today, team, cycle))}`
              : `Em folga · embarca em ${formatShortDate(getNextEmbarkDate(today, team, cycle))}`

          return (
            <li key={team.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('size-3 shrink-0 rounded-full', color.dotClass)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{team.name}</p>
                  <Badge
                    className={
                      baseToday === 'ESCALA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {baseToday === 'ESCALA' ? 'Embarcada' : 'Em folga'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Âncora: {formatShortDate(team.anchorDate)} · {memberCount} colaborador(es) ·{' '}
                  {statusText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(team)
                  setFormOpen(true)
                }}
                title="Editar turma"
                aria-label={`Editar ${team.name}`}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <PencilIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setPendingRemoval(team)}
                title="Excluir turma"
                aria-label={`Excluir ${team.name}`}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>

      <TeamFormModal
        open={formOpen}
        team={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Excluir turma"
        message={
          pendingRemoval
            ? `A turma "${pendingRemoval.name}" será excluída. Turmas com colaboradores vinculados não podem ser excluídas.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingRemoval(null)}
      />
    </section>
  )
}
