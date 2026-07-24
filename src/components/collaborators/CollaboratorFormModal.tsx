import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { ROLE_LABELS } from '@/constants/roles'
import { useData } from '@/context/DataContext'
import type { Collaborator, Role } from '@/types'
import { ROLES } from '@/types'

interface CollaboratorFormModalProps {
  open: boolean
  /** Colaborador em edição, ou `null` para cadastro. */
  collaborator: Collaborator | null
  onClose: () => void
}

interface FormState {
  name: string
  role: Role
  teamId: string
  active: boolean
}

export function CollaboratorFormModal({
  open,
  collaborator,
  onClose,
}: CollaboratorFormModalProps) {
  const { teams, addCollaborator, updateCollaborator } = useData()

  const [form, setForm] = useState<FormState>({
    name: '',
    role: 'MECANICO',
    teamId: '',
    active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSaving(false)
    if (collaborator) {
      setForm({
        name: collaborator.name,
        role: collaborator.role,
        teamId: collaborator.teamId,
        active: collaborator.active,
      })
    } else {
      setForm({
        name: '',
        role: 'MECANICO',
        teamId: teams[0]?.id ?? '',
        active: true,
      })
    }
  }, [open, collaborator, teams])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome do colaborador.')
      return
    }
    if (!form.teamId) {
      setError('Selecione a turma. Cadastre turmas em Configurações, se necessário.')
      return
    }

    try {
      setSaving(true)
      if (collaborator) {
        await updateCollaborator(collaborator.id, form)
      } else {
        await addCollaborator(form)
      }
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Não foi possível salvar o colaborador.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={collaborator ? 'Editar colaborador' : 'Novo colaborador'}
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
        <Field label="Nome" htmlFor="collaborator-name" required>
          <Input
            id="collaborator-name"
            value={form.name}
            placeholder="Nome completo"
            autoFocus
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field label="Função" htmlFor="collaborator-role" required>
          <Select
            id="collaborator-role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Turma"
          htmlFor="collaborator-team"
          required
          hint="A escala 14x14 é gerada automaticamente a partir da data âncora da turma."
        >
          <Select
            id="collaborator-team"
            value={form.teamId}
            onChange={(event) => setForm({ ...form, teamId: event.target.value })}
          >
            {teams.length === 0 ? <option value="">Nenhuma turma cadastrada</option> : null}
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">Ativo</p>
            <p className="text-xs text-slate-500">
              Colaboradores inativos não aparecem na escala nem contam no POB.
            </p>
          </div>
          <Switch
            checked={form.active}
            onChange={(active) => setForm({ ...form, active })}
            label="Ativo"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
