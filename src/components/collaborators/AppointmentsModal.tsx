import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, TrashIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { APPOINTMENT_LABELS, APPOINTMENT_STATUS_MAP, STATUS_CONFIG } from '@/constants/status'
import { useData } from '@/context/DataContext'
import type { Appointment, AppointmentType, Collaborator } from '@/types'
import { APPOINTMENT_TYPES } from '@/types'
import { formatDateRange, todayISO } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface AppointmentsModalProps {
  collaborator: Collaborator | null
  onClose: () => void
}

interface FormState {
  id: string | null
  type: AppointmentType
  startDate: string
  endDate: string
  title: string
  notes: string
}

function emptyForm(): FormState {
  const today = todayISO()
  return { id: null, type: 'TREINAMENTO', startDate: today, endDate: today, title: '', notes: '' }
}

function appointmentBadgeClass(type: AppointmentType): string {
  const status = APPOINTMENT_STATUS_MAP[type]
  if (status) return STATUS_CONFIG[status].badgeClass
  return 'bg-indigo-100 text-indigo-800'
}

/**
 * Gerenciador de compromissos da folga (treinamentos, exames médicos,
 * férias e outros) de um colaborador.
 */
export function AppointmentsModal({ collaborator, onClose }: AppointmentsModalProps) {
  const { appointments, saveAppointment, removeAppointment } = useData()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<Appointment | null>(null)

  useEffect(() => {
    if (collaborator) {
      setForm(emptyForm())
      setError(null)
      setSaving(false)
      setPendingRemoval(null)
    }
  }, [collaborator])

  const collaboratorAppointments = useMemo(() => {
    if (!collaborator) return []
    return appointments
      .filter((appointment) => appointment.collaboratorId === collaborator.id)
      .sort((a, b) => (a.startDate > b.startDate ? -1 : 1))
  }, [appointments, collaborator])

  if (!collaborator) return null

  const handleSave = async () => {
    setError(null)
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setError('O período é inválido: a data final deve ser igual ou posterior à inicial.')
      return
    }
    if (form.type === 'OUTRO' && !form.title.trim()) {
      setError('Descreva o compromisso no campo "Descrição".')
      return
    }

    try {
      setSaving(true)
      await saveAppointment({
        id: form.id ?? undefined,
        collaboratorId: collaborator.id,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        title: form.type === 'OUTRO' ? form.title : '',
        notes: form.notes,
      })
      setForm(emptyForm())
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Não foi possível salvar o compromisso.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setForm({
      id: appointment.id,
      type: appointment.type,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      title: appointment.title,
      notes: appointment.notes,
    })
    setError(null)
  }

  const handleRemove = async () => {
    if (!pendingRemoval) return
    try {
      setSaving(true)
      await removeAppointment(pendingRemoval.id)
      if (form.id === pendingRemoval.id) setForm(emptyForm())
      setPendingRemoval(null)
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Não foi possível remover o compromisso.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open
        title={`Compromissos — ${collaborator.name}`}
        onClose={onClose}
        size="lg"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Formulário */}
          <div className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-700">
              {form.id ? 'Editar compromisso' : 'Novo compromisso'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Tipo" htmlFor="appointment-type" required>
                <Select
                  id="appointment-type"
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value as AppointmentType })
                  }
                >
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {APPOINTMENT_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Data inicial" htmlFor="appointment-start" required>
                <Input
                  id="appointment-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </Field>
              <Field label="Data final" htmlFor="appointment-end" required>
                <Input
                  id="appointment-end"
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </Field>
            </div>
            {form.type === 'OUTRO' ? (
              <Field label="Descrição" htmlFor="appointment-title" required>
                <Input
                  id="appointment-title"
                  value={form.title}
                  placeholder="Ex.: consulta odontológica, renovação de CIR…"
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </Field>
            ) : null}
            <Field label="Observação" htmlFor="appointment-notes">
              <Textarea
                id="appointment-notes"
                rows={2}
                value={form.notes}
                placeholder="Anotações livres…"
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </Field>

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Adicionar compromisso'}
              </Button>
              {form.id ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setForm(emptyForm())}
                  disabled={saving}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </div>

          {/* Lista */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Compromissos cadastrados ({collaboratorAppointments.length})
            </p>
            {collaboratorAppointments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum compromisso cadastrado para este colaborador.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {collaboratorAppointments.map((appointment) => (
                  <li key={appointment.id} className="flex items-center gap-3 px-4 py-3">
                    <Badge className={cn(appointmentBadgeClass(appointment.type))}>
                      {APPOINTMENT_LABELS[appointment.type]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {formatDateRange(appointment.startDate, appointment.endDate)}
                        {appointment.title ? ` · ${appointment.title}` : ''}
                      </p>
                      {appointment.notes ? (
                        <p className="truncate text-xs text-slate-500">{appointment.notes}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEdit(appointment)}
                      aria-label="Editar compromisso"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(appointment)}
                      aria-label="Excluir compromisso"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Excluir compromisso"
        message={
          pendingRemoval
            ? `O compromisso "${APPOINTMENT_LABELS[pendingRemoval.type]}" de ${formatDateRange(pendingRemoval.startDate, pendingRemoval.endDate)} será excluído.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  )
}
