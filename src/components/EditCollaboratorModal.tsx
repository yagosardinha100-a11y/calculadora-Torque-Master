import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { X, Calendar, UserCheck, Sparkles } from 'lucide-react';
import type { Collaborator, Role } from '../types';
import { getFullDayNameFromDateStr, getDayNameFromDateStr, DEFAULT_TURMAS } from '../lib/turmaUtils';
import { FieldLabel } from './ui/PageChrome';

interface EditCollaboratorModalProps {
  collaborator: Collaborator;
  onClose: () => void;
}

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Coordenador',
  'Mecânico',
  'Assistente Mecânico',
  'Outros',
];

export function EditCollaboratorModal({ collaborator, onClose }: EditCollaboratorModalProps) {
  const { turmas: contextTurmas, updateCollaborator } = useData();
  const { canEdit } = useAuth();
  const turmas = contextTurmas && contextTurmas.length > 0 ? contextTurmas : DEFAULT_TURMAS;
  const [name, setName] = useState(collaborator.name);
  const [role, setRole] = useState<Role>(collaborator.role);
  const [turmaId, setTurmaId] = useState(collaborator.turmaId);

  const currentTurma = turmas.find((t) => t.id === turmaId);
  const effectiveStartDate = collaborator.startDate || currentTurma?.baseDate || '2026-08-01';
  const [startDate, setStartDate] = useState(effectiveStartDate);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await updateCollaborator(collaborator.id, {
      name,
      role,
      turmaId: turmaId || 'turma-a',
      startDate: startDate || undefined,
    });
    onClose();
  };

  const dayOfWeekFull = getFullDayNameFromDateStr(startDate);
  const dayOfWeekAbbr = getDayNameFromDateStr(startDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="app-surface w-full max-w-md overflow-hidden rounded-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: 'var(--app-header)' }}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="size-5 text-[var(--app-accent)]" />
            <h3 className="font-display text-[15px] font-semibold">
              {canEdit ? 'Editar colaborador' : 'Detalhes do colaborador'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-5 text-sm">
          <div>
            <FieldLabel>Nome completo</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!canEdit} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Função</FieldLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={!canEdit}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Turma</FieldLabel>
              <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} disabled={!canEdit}>
                {turmas?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-accent-soft)] p-3">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--app-text)]">
              <Calendar className="size-4 text-[var(--app-accent)]" />
              Data do próximo embarque
            </label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={!canEdit} />
            {dayOfWeekFull ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[12px] font-semibold text-[var(--app-text)]">
                <Sparkles className="size-3.5 shrink-0 text-[var(--app-accent)]" />
                <span>
                  Dia de embarque: {dayOfWeekFull} ({dayOfWeekAbbr})
                </span>
              </div>
            ) : null}
            <p className="text-[11px] leading-snug text-[var(--app-text-muted)]">
              O ciclo 14×14 é calculado a partir desta data de embarque.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {canEdit ? 'Cancelar' : 'Fechar'}
            </Button>
            {canEdit ? <Button type="submit">Salvar e recalcular</Button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
