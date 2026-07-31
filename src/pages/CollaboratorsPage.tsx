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
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { CollaboratorsSkeleton, LoadingSpinner } from '../components/ui/Skeleton';

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Coordenador',
  'Mecânico',
  'Assistente Mecânico',
  'Outros'
];

export default function CollaboratorsPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    collaborators,
    turmas: contextTurmas,
    loading,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
  } = useData();

  const turmas = (contextTurmas && contextTurmas.length > 0) ? contextTurmas : DEFAULT_TURMAS;
  
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Mecânico');
  const [turmaId, setTurmaId] = useState('turma-a');
  const [startDate, setStartDate] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    deduplicateCollaborators().catch(console.error);
  }, []);

  if (loading) {
    return <CollaboratorsSkeleton />;
  }

  const handleStartDateChange = (dateVal: string) => {
    setStartDate(dateVal);
  };

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
      const existing = collaborators.find(c => c.name.trim().toUpperCase().replace(/\s+/g, ' ') === normName);

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

  const handleDelete = async (id: string) => {
    await deleteCollaborator(id);
  };

  const toggleActive = async (colab: Collaborator) => {
    await updateCollaborator(colab.id, { active: !colab.active });
  };

  const updateCollaboratorRole = async (colabId: string, newRole: Role) => {
    await updateCollaborator(colabId, { role: newRole });
  };

  const updateCollaboratorTurma = async (colabId: string, newTurmaId: string) => {
    await updateCollaborator(colabId, { turmaId: newTurmaId });
  };

  const updateCollaboratorName = async (colabId: string, newName: string) => {
    if (!newName.trim()) return;
    await updateCollaborator(colabId, { name: newName });
  };

  const updateCollaboratorStartDate = async (colabId: string, newStartDate: string) => {
    await updateCollaborator(colabId, { startDate: newStartDate || undefined });
  };

  const activeCount = collaborators?.filter(c => c.active !== false).length || 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-5 sm:p-6">
      <div className="app-surface flex flex-col justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl">
            Colaboradores
          </h1>
          <p className="mt-1 text-[13px] text-[var(--app-text-muted)]">
            Equipe técnica, cargos e turmas do ciclo 14×14.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1.5 text-[12px] font-semibold">
          <span className="text-[var(--app-text-muted)]">Ativos</span>
          <span className="text-[var(--app-accent)]">
            {activeCount} / {collaborators?.length || 0}
          </span>
        </div>
      </div>
      
      {/* Register Form Card */}
      <div className="app-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-[var(--app-text)] uppercase">
            <UserPlus className="h-4 w-4 text-[var(--app-accent)]" />
            Novo colaborador
          </h2>
          <span className="hidden text-[11px] font-medium text-[var(--app-text-muted)] sm:inline">
            Função e data base vinculam à turma automaticamente
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>Nome Completo</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: João Silva" 
                required 
              />
            </div>
            <div>
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>Função</label>
              <Select value={role} onChange={e => setRole(e.target.value as Role)} required>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>Turma</label>
              <Select value={turmaId} onChange={e => setTurmaId(e.target.value)} required>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className={cn("block text-xs font-semibold mb-1", isLight ? "text-slate-700" : "text-slate-300")}>
                Data Embarque <span className={cn("font-normal", isLight ? "text-slate-400" : "text-slate-500")}>(Opcional)</span>
              </label>
              <Input 
                type="date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                placeholder="Usa a data da Turma se vazio"
              />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 w-full sm:w-auto justify-center">
                {isSubmitting ? <LoadingSpinner size="sm" className="text-white" /> : <Plus className="h-4 w-4" />}
                {isSubmitting ? 'Salvando...' : 'Adicionar Colaborador'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className={cn("border rounded-lg shadow-xs overflow-hidden transition-colors duration-200", isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[600px]">
          <thead className={cn("border-b font-semibold", isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-950 border-slate-800 text-slate-300")}>
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Início Embarque</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800")}>
            {(!collaborators || collaborators.length === 0) ? (
              <tr>
                <td colSpan={6} className={cn("px-4 py-8 text-center", isLight ? "text-slate-500" : "text-slate-400")}>
                  Nenhum colaborador cadastrado.
                </td>
              </tr>
            ) : (
              sortCollaborators(collaborators, turmas || []).map(colab => {
                const turma = turmas?.find(t => t.id === colab.turmaId);
                const effectiveStartDate = colab.startDate || turma?.baseDate || '';
                const dayAbbr = getDayNameFromDateStr(effectiveStartDate);
                const dayFull = getFullDayNameFromDateStr(effectiveStartDate);
                
                return (
                  <tr key={colab.id} className={isLight ? "hover:bg-slate-50/80" : "hover:bg-slate-800/50"}>
                    <td className={cn("px-4 py-3 font-semibold min-w-[180px]", isLight ? "text-slate-900" : "text-white")}>
                      {colab.name}
                    </td>
                    <td className="px-4 py-3 min-w-[170px]">
                      <Select
                        value={colab.role}
                        onChange={e => updateCollaboratorRole(colab.id, e.target.value as Role)}
                        className="h-8 text-xs font-semibold"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <Select
                        value={colab.turmaId}
                        onChange={e => updateCollaboratorTurma(colab.id, e.target.value)}
                        className="h-8 text-xs font-bold"
                      >
                        {turmas.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Select>
                    </td>
                    <td className={cn("px-4 py-3", isLight ? "text-slate-700" : "text-slate-300")}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <Input 
                          type="date"
                          value={effectiveStartDate}
                          onChange={e => updateCollaboratorStartDate(colab.id, e.target.value)}
                          className="h-8 text-xs w-36"
                        />
                        {dayAbbr && (
                          <span 
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shrink-0"
                            title={`Dia de Embarque: ${dayFull}`}
                          >
                            Embarque: {dayAbbr}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => toggleActive(colab)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          colab.active 
                            ? (isLight ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30')
                            : (isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')
                        }`}
                      >
                        {colab.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => setDeleteId(colab.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Excluir Colaborador"
        message="Tem certeza que deseja excluir este colaborador? O histórico de eventos e escala vinculados a ele também serão excluídos."
        confirmText="Sim, Excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await handleDelete(deleteId);
          }
        }}
      />
    </div>
  );
}

