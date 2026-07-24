import { useMemo, useState } from 'react'
import {
  ClipboardIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from '@/components/icons'
import { AppointmentsModal } from '@/components/collaborators/AppointmentsModal'
import { CollaboratorFormModal } from '@/components/collaborators/CollaboratorFormModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ROLE_LABELS, ROLE_ORDER } from '@/constants/roles'
import { APPOINTMENT_LABELS, STATUS_CONFIG } from '@/constants/status'
import { TEAM_COLORS } from '@/constants/teams'
import { useData } from '@/context/DataContext'
import type { Collaborator } from '@/types'
import { formatDateRange, formatShortDate, todayISO } from '@/utils/dates'
import { getAvailabilityInfo, type AvailabilityState } from '@/utils/schedule'
import { cn } from '@/utils/cn'

const AVAILABILITY_CONFIG: Record<AvailabilityState, { label: string; badgeClass: string }> = {
  DISPONIVEL: { label: 'Disponível', badgeClass: 'bg-blue-100 text-blue-800' },
  EMBARCADO: { label: 'Embarcado', badgeClass: 'bg-emerald-100 text-emerald-800' },
  COMPROMISSO: { label: 'Em compromisso', badgeClass: 'bg-violet-100 text-violet-800' },
  INATIVO: { label: 'Inativo', badgeClass: 'bg-slate-100 text-slate-500' },
}

export function CollaboratorsPage() {
  const { collaborators, lookups, cycle, deleteCollaborator, updateCollaborator } = useData()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Collaborator | null>(null)
  const [managingAppointments, setManagingAppointments] = useState<Collaborator | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Collaborator | null>(null)

  const today = todayISO()

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return collaborators
      .filter(
        (collaborator) =>
          term === '' || collaborator.name.toLocaleLowerCase('pt-BR').includes(term),
      )
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
        if (roleDiff !== 0) return roleDiff
        return a.name.localeCompare(b.name, 'pt-BR')
      })
      .map((collaborator) => ({
        collaborator,
        team: lookups.teamsById.get(collaborator.teamId) ?? null,
        availability: getAvailabilityInfo(collaborator, today, lookups, cycle),
      }))
  }, [collaborators, search, lookups, cycle, today])

  const handleToggleActive = async (collaborator: Collaborator, active: boolean) => {
    await updateCollaborator(collaborator.id, {
      name: collaborator.name,
      role: collaborator.role,
      teamId: collaborator.teamId,
      active,
    })
  }

  const handleDelete = async () => {
    if (!pendingRemoval) return
    await deleteCollaborator(pendingRemoval.id)
    setPendingRemoval(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <PageHeader
        title="Colaboradores"
        description="Equipe de mecânica, disponibilidade e compromissos da folga."
        actions={
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Novo colaborador
          </Button>
        }
      />

      <div className="relative w-full max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          placeholder="Buscar por nome…"
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {collaborators.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="Nenhum colaborador cadastrado"
          description="Cadastre a equipe de mecânica para gerar a escala 14x14 automaticamente."
          action={
            <Button
              icon={<PlusIcon />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Novo colaborador
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-4xl border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th className="border-b border-slate-200 px-4 py-3">Colaborador</th>
                <th className="border-b border-slate-200 px-4 py-3">Função</th>
                <th className="border-b border-slate-200 px-4 py-3">Turma</th>
                <th className="border-b border-slate-200 px-4 py-3">Hoje</th>
                <th className="border-b border-slate-200 px-4 py-3">Disponibilidade</th>
                <th className="border-b border-slate-200 px-4 py-3">Compromissos</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center">Ativo</th>
                <th className="border-b border-slate-200 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ collaborator, team, availability }) => {
                const availabilityConfig = AVAILABILITY_CONFIG[availability.state]
                const todayConfig = STATUS_CONFIG[availability.todayStatus]
                const teamColor = team ? TEAM_COLORS[team.color] : null
                const upcoming = availability.upcomingAppointments.slice(0, 2)
                const extraCount = availability.upcomingAppointments.length - upcoming.length

                return (
                  <tr
                    key={collaborator.id}
                    className={cn(
                      'transition-colors hover:bg-slate-50',
                      !collaborator.active && 'opacity-60',
                    )}
                  >
                    <td className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{collaborator.name}</p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                      {ROLE_LABELS[collaborator.role]}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {team && teamColor ? (
                        <Badge className={cn('ring-1', teamColor.badgeClass)}>
                          <span className={cn('size-2 rounded-full', teamColor.dotClass)} />
                          {team.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Sem turma</span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <Badge className={todayConfig.badgeClass}>
                        <span className={cn('size-2 rounded-full', todayConfig.dotClass)} />
                        {todayConfig.label}
                      </Badge>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={availabilityConfig.badgeClass}>
                          {availabilityConfig.label}
                        </Badge>
                        {availability.nextEmbarkDate ? (
                          <span className="text-xs text-slate-400">
                            Próx. embarque: {formatShortDate(availability.nextEmbarkDate)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {upcoming.length === 0 ? (
                          <span className="text-xs text-slate-400">Nenhum agendado</span>
                        ) : (
                          upcoming.map((appointment) => (
                            <span key={appointment.id} className="text-xs text-slate-600">
                              {APPOINTMENT_LABELS[appointment.type]} ·{' '}
                              {formatDateRange(appointment.startDate, appointment.endDate)}
                            </span>
                          ))
                        )}
                        {extraCount > 0 ? (
                          <span className="text-xs text-slate-400">+{extraCount} outro(s)</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center">
                      <Switch
                        checked={collaborator.active}
                        onChange={(active) => void handleToggleActive(collaborator, active)}
                        label={`Ativo: ${collaborator.name}`}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setManagingAppointments(collaborator)}
                          title="Gerenciar compromissos"
                          aria-label={`Compromissos de ${collaborator.name}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <ClipboardIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(collaborator)
                            setFormOpen(true)
                          }}
                          title="Editar"
                          aria-label={`Editar ${collaborator.name}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRemoval(collaborator)}
                          title="Excluir"
                          aria-label={`Excluir ${collaborator.name}`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Nenhum colaborador encontrado para “{search}”.
            </p>
          ) : null}
        </div>
      )}

      <CollaboratorFormModal
        open={formOpen}
        collaborator={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <AppointmentsModal
        collaborator={managingAppointments}
        onClose={() => setManagingAppointments(null)}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Excluir colaborador"
        message={
          pendingRemoval
            ? `${pendingRemoval.name} será excluído junto com todos os seus ajustes, dobras e compromissos. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  )
}
