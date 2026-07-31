import { useState, useEffect, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { deduplicateCollaborators } from '../lib/deduplicateUtils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Trash2, Plus, UserPlus, Calendar } from 'lucide-react';
import type { Collaborator, Role } from '../types';
import { getDayNameFromDateStr, getFullDayNameFromDateStr, DEFAULT_TURMAS } from '../lib/turmaUtils';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { sortCollaborators } from '../lib/sortUtils';
import { CollaboratorsSkeleton, LoadingSpinner } from '../components/ui/Skeleton';
import {
  EmptyTableRow,
  FieldLabel,
  PageHeader,
  PageShell,
  SectionSurface,
  TableHead,
} from '../components/ui/PageChrome';

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Coordenador',
  'Mecânico',
  'Assistente Mecânico',
  'Outros',
];

export default function CollaboratorsPage() {
  const {
    collaborators,
    turmas: contextTurmas,
    loading,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
  } = useData();

  const turmas = contextTurmas && contextTurmas.length > 0 ? contextTurmas : DEFAULT_TURMAS;

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Mecânico');
  const [turmaId, setTurmaId] = useState('turma-a');
  const [startDate, setStartDate] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    deduplicateCollaborators().catch(console.error);
  }, []);

  if (loading) return <CollaboratorsSkeleton />;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;

    setIsSubmitting(true);
    try {
      let targetTurmaId = turmaId;
      if (!targetTurmaId && turmas && turmas.length > 0) {
        targetTurmaId = turmas[0].id;
      }

      const normName = name.trim().toUpperCase().replace(/\s+/g, ' ');
      const existing = collaborators.find(
        (c) => c.name.trim().toUpperCase().replace(/\s+/g, ' ') === normName,
      );

      if (existing) {
        await updateCollaborator(existing.id, {
          name,
          role,
          turmaId: targetTurmaId || 'turma-a',
          startDate: startDate || undefined,
          active: true,
        });
      } else {
        await addCollaborator({
          name,
          role,
          turmaId: targetTurmaId || 'turma-a',
          startDate: startDate || undefined,
          active: true,
        });
      }

      setName('');
      setStartDate('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (colab: Collaborator) => {
    await updateCollaborator(colab.id, { active: !colab.active });
  };

  const activeCount = collaborators?.filter((c) => c.active !== false).length || 0;

  return (
    <PageShell>
      <PageHeader
        title="Colaboradores"
        description="Equipe técnica, cargos e turmas do ciclo 14×14."
        actions={
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1.5 text-[12px] font-semibold">
            <span className="text-[var(--app-text-muted)]">Ativos </span>
            <span className="text-[var(--app-accent)]">
              {activeCount} / {collaborators?.length || 0}
            </span>
          </div>
        }
      />

      <SectionSurface
        title="Novo colaborador"
        subtitle="Função e data base vinculam à turma automaticamente"
        actions={<UserPlus className="size-4 text-[var(--app-accent)]" />}
      >
        <div className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <FieldLabel>Nome completo</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" required />
            </div>
            <div>
              <FieldLabel>Função</FieldLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)} required>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Turma</FieldLabel>
              <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel hint="(opcional)">Data embarque</FieldLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex justify-end md:col-span-5">
              <Button type="submit" disabled={isSubmitting} className="w-full gap-2 sm:w-auto">
                {isSubmitting ? <LoadingSpinner size="sm" className="text-white" /> : <Plus className="size-4" />}
                {isSubmitting ? 'Salvando…' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </div>
      </SectionSurface>

      <SectionSurface>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <TableHead>
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Início embarque</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {!collaborators || collaborators.length === 0 ? (
                <EmptyTableRow colSpan={6} title="Nenhum colaborador cadastrado." />
              ) : (
                sortCollaborators(collaborators, turmas || []).map((colab) => {
                  const turma = turmas?.find((t) => t.id === colab.turmaId);
                  const effectiveStartDate = colab.startDate || turma?.baseDate || '';
                  const dayAbbr = getDayNameFromDateStr(effectiveStartDate);
                  const dayFull = getFullDayNameFromDateStr(effectiveStartDate);

                  return (
                    <tr key={colab.id} className="hover:bg-[var(--app-surface-muted)]">
                      <td className="min-w-[180px] px-4 py-3 font-semibold text-[var(--app-text)]">
                        {colab.name}
                      </td>
                      <td className="min-w-[170px] px-4 py-3">
                        <Select
                          value={colab.role}
                          onChange={(e) =>
                            void updateCollaborator(colab.id, { role: e.target.value as Role })
                          }
                          className="h-8 text-xs font-semibold"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="min-w-[130px] px-4 py-3">
                        <Select
                          value={colab.turmaId}
                          onChange={(e) => void updateCollaborator(colab.id, { turmaId: e.target.value })}
                          className="h-8 text-xs font-semibold"
                        >
                          {turmas.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-[var(--app-text-muted)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <Calendar className="size-3.5 shrink-0 text-[var(--app-text-faint)]" />
                          <Input
                            type="date"
                            value={effectiveStartDate}
                            onChange={(e) =>
                              void updateCollaborator(colab.id, {
                                startDate: e.target.value || undefined,
                              })
                            }
                            className="h-8 w-36 text-xs"
                          />
                          {dayAbbr ? (
                            <span
                              className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300"
                              title={`Dia de embarque: ${dayFull}`}
                            >
                              Embarque: {dayAbbr}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => void toggleActive(colab)}
                          className={
                            colab.active
                              ? 'inline-flex rounded-md bg-teal-500/15 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300'
                              : 'inline-flex rounded-md bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-[var(--app-text-muted)]'
                          }
                        >
                          {colab.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--app-danger)] hover:bg-rose-500/10"
                          onClick={() => setDeleteId(colab.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionSurface>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Excluir colaborador"
        message="Tem certeza que deseja excluir este colaborador? O histórico de eventos e escala vinculados também serão excluídos."
        confirmText="Sim, excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deleteCollaborator(deleteId);
        }}
      />
    </PageShell>
  );
}
