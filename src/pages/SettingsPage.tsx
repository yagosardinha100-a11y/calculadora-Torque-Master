import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { format } from 'date-fns';
import { Trash2, Plus, Settings2 } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  EmptyTableRow,
  FieldLabel,
  PageHeader,
  PageShell,
  SectionSurface,
  TableHead,
} from '../components/ui/PageChrome';

export default function SettingsPage() {
  const { turmas, addTurma, deleteTurma } = useData();
  const { canEdit } = useAuth();
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaDate, setNewTurmaDate] = useState('');
  const [deleteTurmaId, setDeleteTurmaId] = useState<string | null>(null);

  const handleAddTurma = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTurmaName || !newTurmaDate) return;

    await addTurma({
      name: newTurmaName,
      baseDate: newTurmaDate,
    });

    setNewTurmaName('');
    setNewTurmaDate('');
  };

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Turmas"
        description="Datas base do ciclo 14×14 por turma de embarque."
        icon={<Settings2 className="size-5" />}
      />

      <SectionSurface
        title="Turmas e datas base"
        subtitle="Ponto de partida do ciclo para cada turma"
      >
        <div className="p-4 sm:p-6">
          {canEdit ? (
          <form
            onSubmit={handleAddTurma}
            className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex-1">
              <FieldLabel>Nome da turma</FieldLabel>
              <Input
                value={newTurmaName}
                onChange={(e) => setNewTurmaName(e.target.value)}
                placeholder="Ex: TER, QUI, SEX…"
                required
              />
            </div>
            <div className="flex-1">
              <FieldLabel>Data base de embarque</FieldLabel>
              <Input
                type="date"
                value={newTurmaDate}
                onChange={(e) => setNewTurmaDate(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full shrink-0 gap-2 sm:w-auto">
              <Plus className="size-4" />
              Adicionar
            </Button>
          </form>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <TableHead>
                <tr>
                  <th className="px-4 py-3">Turma</th>
                  <th className="px-4 py-3">Data base</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </TableHead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {!turmas || turmas.length === 0 ? (
                  <EmptyTableRow colSpan={3} title="Nenhuma turma cadastrada." />
                ) : (
                  turmas.map((turma) => (
                    <tr key={turma.id} className="hover:bg-[var(--app-surface-muted)]">
                      <td className="px-4 py-3 font-semibold text-[var(--app-text)]">{turma.name}</td>
                      <td className="px-4 py-3 text-[var(--app-text-muted)]">
                        {format(new Date(turma.baseDate + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--app-danger)] hover:bg-rose-500/10"
                            onClick={() => setDeleteTurmaId(turma.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--app-text-faint)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionSurface>

      <ConfirmModal
        isOpen={!!deleteTurmaId}
        title="Excluir turma"
        message="Tem certeza que deseja excluir esta turma?"
        confirmText="Sim, excluir"
        onClose={() => setDeleteTurmaId(null)}
        onConfirm={async () => {
          if (deleteTurmaId) await deleteTurma(deleteTurmaId);
        }}
      />
    </PageShell>
  );
}
