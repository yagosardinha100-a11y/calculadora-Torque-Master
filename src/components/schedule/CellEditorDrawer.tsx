import { useEffect, useMemo, useState } from 'react'
import { InfoIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Drawer } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { STATUS_CONFIG, STATUS_ORDER } from '@/constants/status'
import { useData } from '@/context/DataContext'
import type { AppointmentType, Collaborator, DayStatus, Team } from '@/types'
import { formatDateRange, formatLongDate, formatShortDate } from '@/utils/dates'
import { getRemainingFolgaAfter, type ResolvedCell } from '@/utils/schedule'
import { cn } from '@/utils/cn'

export interface CellEditorTarget {
  collaborator: Collaborator
  team: Team | null
  cell: ResolvedCell
}

interface CellEditorDrawerProps {
  target: CellEditorTarget | null
  onClose: () => void
}

/** Opções do seletor: os sete status + compromisso genérico. */
type StatusOption = DayStatus | 'OUTRO_COMPROMISSO'

const APPOINTMENT_OPTION_TYPE: Partial<Record<StatusOption, AppointmentType>> = {
  FERIAS: 'FERIAS',
  TREINAMENTO: 'TREINAMENTO',
  EXAME_MEDICO: 'EXAME_MEDICO',
  OUTRO_COMPROMISSO: 'OUTRO',
}

interface FormState {
  status: StatusOption
  observation: string
  dobraReason: string
  dobraEndDate: string
  rangeStart: string
  rangeEnd: string
  otherTitle: string
}

function buildInitialForm(target: CellEditorTarget): FormState {
  const { cell } = target
  const base: FormState = {
    status: cell.baseStatus,
    observation: '',
    dobraReason: '',
    dobraEndDate: cell.date,
    rangeStart: cell.date,
    rangeEnd: cell.date,
    otherTitle: '',
  }

  if (cell.source === 'OVERRIDE' && cell.override) {
    return { ...base, status: cell.override.status, observation: cell.override.observation }
  }

  if (cell.source === 'DOBRA' && cell.dobra) {
    return {
      ...base,
      status: 'DOBRA',
      observation: cell.dobra.observation,
      dobraReason: cell.dobra.reason,
      dobraEndDate: cell.dobra.endDate,
    }
  }

  if (cell.source === 'APPOINTMENT' && cell.appointment) {
    return {
      ...base,
      status: cell.status,
      observation: cell.appointment.notes,
      rangeStart: cell.appointment.startDate,
      rangeEnd: cell.appointment.endDate,
    }
  }

  if (cell.appointment?.type === 'OUTRO') {
    return {
      ...base,
      status: 'OUTRO_COMPROMISSO',
      observation: cell.appointment.notes,
      rangeStart: cell.appointment.startDate,
      rangeEnd: cell.appointment.endDate,
      otherTitle: cell.appointment.title,
    }
  }

  return base
}

export function CellEditorDrawer({ target, onClose }: CellEditorDrawerProps) {
  const {
    cycle,
    saveOverride,
    removeOverride,
    saveDobra,
    removeDobra,
    saveAppointment,
    removeAppointment,
  } = useData()

  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmRemoval, setConfirmRemoval] = useState(false)

  useEffect(() => {
    if (target) {
      setForm(buildInitialForm(target))
      setError(null)
      setSaving(false)
      setConfirmRemoval(false)
    } else {
      setForm(null)
    }
  }, [target])

  const isAppointmentOption = form ? form.status in APPOINTMENT_OPTION_TYPE : false

  /** Informações da dobra: início efetivo, folga restante e próximo embarque. */
  const dobraInsights = useMemo(() => {
    if (!target || !form || form.status !== 'DOBRA' || !target.team) return null
    const startDate = target.cell.dobra?.startDate ?? target.cell.date
    if (!form.dobraEndDate || form.dobraEndDate < startDate) return { startDate, computed: null }
    const computed = getRemainingFolgaAfter(form.dobraEndDate, target.team, cycle)
    return { startDate, computed }
  }, [target, form, cycle])

  if (!target || !form) return null

  const { collaborator, team, cell } = target
  const currentConfig = STATUS_CONFIG[cell.status]

  /* -------------------------- Remoção de origem ------------------------- */

  const removalInfo = (() => {
    if (cell.source === 'OVERRIDE' && cell.override) {
      return {
        label: 'Remover ajuste deste dia',
        message: `O ajuste manual de ${formatShortDate(cell.date)} será removido e o dia voltará a seguir a escala da turma.`,
        run: () => removeOverride(cell.override!.id),
      }
    }
    if (cell.source === 'DOBRA' && cell.dobra) {
      return {
        label: 'Excluir dobra completa',
        message: `A dobra de ${formatDateRange(cell.dobra.startDate, cell.dobra.endDate)} será excluída por completo e os dias voltarão a seguir a escala da turma.`,
        run: () => removeDobra(cell.dobra!.id),
      }
    }
    if (cell.appointment && (cell.source === 'APPOINTMENT' || cell.appointment.type === 'OUTRO')) {
      return {
        label: 'Excluir compromisso',
        message: `O compromisso de ${formatDateRange(cell.appointment.startDate, cell.appointment.endDate)} será excluído por completo.`,
        run: () => removeAppointment(cell.appointment!.id),
      }
    }
    return null
  })()

  /* ------------------------------- Salvar ------------------------------- */

  const handleSave = async () => {
    setError(null)

    try {
      setSaving(true)

      if (form.status === 'DOBRA') {
        const startDate = cell.dobra?.startDate ?? cell.date
        if (!form.dobraReason.trim()) {
          setError('Informe o motivo da dobra.')
          return
        }
        if (!form.dobraEndDate || form.dobraEndDate < startDate) {
          setError('A data final da dobra deve ser igual ou posterior ao início.')
          return
        }
        await saveDobra({
          id: cell.dobra?.id,
          collaboratorId: collaborator.id,
          startDate,
          endDate: form.dobraEndDate,
          reason: form.dobraReason,
          observation: form.observation,
        })
        if (cell.override) await removeOverride(cell.override.id)
        onClose()
        return
      }

      const appointmentType = APPOINTMENT_OPTION_TYPE[form.status]
      if (appointmentType) {
        if (!form.rangeStart || !form.rangeEnd || form.rangeEnd < form.rangeStart) {
          setError('O período do compromisso é inválido: a data final deve ser igual ou posterior à inicial.')
          return
        }
        if (appointmentType === 'OUTRO' && !form.otherTitle.trim()) {
          setError('Descreva o compromisso no campo "Descrição".')
          return
        }
        const reuseId =
          cell.appointment && cell.appointment.type === appointmentType
            ? cell.appointment.id
            : undefined
        await saveAppointment({
          id: reuseId,
          collaboratorId: collaborator.id,
          type: appointmentType,
          startDate: form.rangeStart,
          endDate: form.rangeEnd,
          title: appointmentType === 'OUTRO' ? form.otherTitle : '',
          notes: form.observation,
        })
        if (cell.override) await removeOverride(cell.override.id)
        onClose()
        return
      }

      // Status pontuais: Escala, Folga e No Show.
      const status = form.status as DayStatus
      const matchesBase = status === cell.baseStatus && form.observation.trim() === ''
      if (matchesBase) {
        if (cell.override) await removeOverride(cell.override.id)
      } else {
        await saveOverride({
          collaboratorId: collaborator.id,
          date: cell.date,
          status,
          observation: form.observation,
        })
      }
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Não foi possível salvar a alteração.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!removalInfo) return
    try {
      setSaving(true)
      await removalInfo.run()
      setConfirmRemoval(false)
      onClose()
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : 'Não foi possível remover o registro.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Drawer
        open
        title={collaborator.name}
        subtitle={formatLongDate(cell.date)}
        onClose={onClose}
        footer={
          <>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Situação atual */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={currentConfig.badgeClass}>
              <span className={cn('size-2 rounded-full', currentConfig.dotClass)} />
              {currentConfig.label}
            </Badge>
            <span className="text-xs text-slate-500">
              Pela escala da turma{team ? ` (${team.name})` : ''}:{' '}
              {STATUS_CONFIG[cell.baseStatus].label}
            </span>
          </div>

          {/* Status */}
          <Field label="Status" htmlFor="cell-status">
            <Select
              id="cell-status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as StatusOption })
              }
            >
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
              <option value="OUTRO_COMPROMISSO">Outro compromisso</option>
            </Select>
          </Field>

          {/* Campos da dobra */}
          {form.status === 'DOBRA' ? (
            <div className="space-y-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <Field label="Motivo da dobra" htmlFor="dobra-reason" required>
                <Input
                  id="dobra-reason"
                  value={form.dobraReason}
                  placeholder="Ex.: cobertura de férias, falta de rendição…"
                  onChange={(event) => setForm({ ...form, dobraReason: event.target.value })}
                />
              </Field>
              <Field
                label="Data final da dobra"
                htmlFor="dobra-end"
                required
                hint={
                  dobraInsights
                    ? `Início da dobra: ${formatShortDate(dobraInsights.startDate)}`
                    : undefined
                }
              >
                <Input
                  id="dobra-end"
                  type="date"
                  value={form.dobraEndDate}
                  min={dobraInsights?.startDate ?? cell.date}
                  onChange={(event) => setForm({ ...form, dobraEndDate: event.target.value })}
                />
              </Field>
              {dobraInsights?.computed ? (
                <div className="flex items-start gap-2 rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-amber-900">
                  <InfoIcon className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Os dias de folga dentro da dobra são consumidos automaticamente. Restarão{' '}
                    <strong>{dobraInsights.computed.remainingDays} dia(s) de folga</strong> e o
                    próximo embarque permanece em{' '}
                    <strong>{formatShortDate(dobraInsights.computed.nextEmbarkDate)}</strong>{' '}
                    (não muda).
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Campos de compromisso */}
          {isAppointmentOption ? (
            <div className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              {form.status === 'OUTRO_COMPROMISSO' ? (
                <Field label="Descrição" htmlFor="other-title" required>
                  <Input
                    id="other-title"
                    value={form.otherTitle}
                    placeholder="Ex.: consulta odontológica, renovação de CIR…"
                    onChange={(event) => setForm({ ...form, otherTitle: event.target.value })}
                  />
                </Field>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data inicial" htmlFor="range-start" required>
                  <Input
                    id="range-start"
                    type="date"
                    value={form.rangeStart}
                    onChange={(event) => setForm({ ...form, rangeStart: event.target.value })}
                  />
                </Field>
                <Field label="Data final" htmlFor="range-end" required>
                  <Input
                    id="range-end"
                    type="date"
                    value={form.rangeEnd}
                    min={form.rangeStart}
                    onChange={(event) => setForm({ ...form, rangeEnd: event.target.value })}
                  />
                </Field>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                O compromisso será exibido em todos os dias do período na linha do colaborador.
              </p>
            </div>
          ) : null}

          {/* Observação */}
          <Field label="Observação" htmlFor="cell-observation">
            <Textarea
              id="cell-observation"
              value={form.observation}
              placeholder="Anotações livres sobre este registro…"
              onChange={(event) => setForm({ ...form, observation: event.target.value })}
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}

          {removalInfo ? (
            <div className="border-t border-slate-200 pt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmRemoval(true)}
                disabled={saving}
              >
                {removalInfo.label}
              </Button>
            </div>
          ) : null}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmRemoval}
        title="Confirmar remoção"
        message={removalInfo?.message ?? ''}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemoval(false)}
      />
    </>
  )
}
