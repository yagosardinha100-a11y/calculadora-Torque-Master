import { useEffect, useState } from 'react'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { TEAM_COLORS } from '@/constants/teams'
import { useData } from '@/context/DataContext'
import type { Team, TeamColorKey } from '@/types'
import { TEAM_COLOR_KEYS } from '@/types'
import { isValidISODate, todayISO } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface TeamFormModalProps {
  open: boolean
  /** Turma em edição, ou `null` para cadastro. */
  team: Team | null
  onClose: () => void
}

interface FormState {
  name: string
  anchorDate: string
  color: TeamColorKey
}

export function TeamFormModal({ open, team, onClose }: TeamFormModalProps) {
  const { addTeam, updateTeam } = useData()

  const [form, setForm] = useState<FormState>({
    name: '',
    anchorDate: todayISO(),
    color: 'blue',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSaving(false)
    if (team) {
      setForm({ name: team.name, anchorDate: team.anchorDate, color: team.color })
    } else {
      setForm({ name: '', anchorDate: todayISO(), color: 'blue' })
    }
  }, [open, team])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome da turma.')
      return
    }
    if (!isValidISODate(form.anchorDate)) {
      setError('Informe uma data de início de embarque válida.')
      return
    }

    try {
      setSaving(true)
      if (team) {
        await updateTeam(team.id, form)
      } else {
        await addTeam(form)
      }
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a turma.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={team ? 'Editar turma' : 'Nova turma'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" htmlFor="team-name" required>
          <Input
            id="team-name"
            value={form.name}
            placeholder="Ex.: Turma A"
            autoFocus
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field
          label="Início de um embarque"
          htmlFor="team-anchor"
          required
          hint="Qualquer primeiro dia de embarque da turma. O ciclo 14x14 se repete a partir desta data, para frente e para trás."
        >
          <Input
            id="team-anchor"
            type="date"
            value={form.anchorDate}
            onChange={(event) => setForm({ ...form, anchorDate: event.target.value })}
          />
        </Field>

        <Field label="Cor de identificação" htmlFor="team-color">
          <div className="flex flex-wrap gap-2" id="team-color" role="radiogroup">
            {TEAM_COLOR_KEYS.map((colorKey) => {
              const config = TEAM_COLORS[colorKey]
              const isSelected = form.color === colorKey
              return (
                <button
                  key={colorKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={config.label}
                  title={config.label}
                  onClick={() => setForm({ ...form, color: colorKey })}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full transition-transform',
                    config.dotClass,
                    isSelected
                      ? 'scale-110 ring-2 ring-slate-900 ring-offset-2'
                      : 'hover:scale-105',
                  )}
                >
                  {isSelected ? <CheckIcon className="size-4 text-white" /> : null}
                </button>
              )
            })}
          </div>
        </Field>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
