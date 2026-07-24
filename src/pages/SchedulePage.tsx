import { useMemo, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { UsersIcon } from '@/components/icons'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  CellEditorDrawer,
  type CellEditorTarget,
} from '@/components/schedule/CellEditorDrawer'
import { MonthNavigator } from '@/components/schedule/MonthNavigator'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { StatusLegend } from '@/components/schedule/StatusLegend'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { ROLE_ORDER } from '@/constants/roles'
import { useData } from '@/context/DataContext'
import type { Collaborator } from '@/types'
import type { PageId } from '@/types/navigation'
import { getMonthDays, shiftMonth } from '@/utils/dates'
import { buildScheduleMatrix, type ResolvedCell } from '@/utils/schedule'

interface SchedulePageProps {
  onNavigate: (page: PageId) => void
}

export function SchedulePage({ onNavigate }: SchedulePageProps) {
  const { collaborators, teams, lookups, cycle } = useData()

  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [editorTarget, setEditorTarget] = useState<CellEditorTarget | null>(null)

  const days = useMemo(() => getMonthDays(month), [month])

  const visibleCollaborators = useMemo(() => {
    return collaborators
      .filter((collaborator) => collaborator.active)
      .filter(
        (collaborator) => teamFilter === 'all' || collaborator.teamId === teamFilter,
      )
      .sort((a, b) => {
        const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
        if (roleDiff !== 0) return roleDiff
        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [collaborators, teamFilter])

  const matrix = useMemo(
    () => buildScheduleMatrix(visibleCollaborators, days, lookups, cycle),
    [visibleCollaborators, days, lookups, cycle],
  )

  const handleCellClick = (collaborator: Collaborator, cell: ResolvedCell) => {
    setEditorTarget({
      collaborator,
      team: lookups.teamsById.get(collaborator.teamId) ?? null,
      cell,
    })
  }

  const hasCollaborators = collaborators.some((collaborator) => collaborator.active)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="Escala"
        description="Escala 14x14 da equipe de mecânica — clique em um dia para ajustar."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator
          month={month}
          onPrevious={() => setMonth((current) => shiftMonth(current, -1))}
          onNext={() => setMonth((current) => shiftMonth(current, 1))}
          onToday={() => setMonth(startOfMonth(new Date()))}
        />
        <div className="w-full sm:w-52">
          <Select
            aria-label="Filtrar por turma"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          >
            <option value="all">Todas as turmas</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <StatusLegend />

      {hasCollaborators ? (
        <ScheduleGrid days={days} matrix={matrix} onCellClick={handleCellClick} />
      ) : (
        <EmptyState
          icon={<UsersIcon />}
          title="Nenhum colaborador ativo"
          description="Cadastre a equipe de mecânica para que a escala 14x14 seja gerada automaticamente a partir das turmas."
          action={
            <Button onClick={() => onNavigate('colaboradores')}>
              Cadastrar colaboradores
            </Button>
          }
        />
      )}

      <CellEditorDrawer target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  )
}
