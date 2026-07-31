import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { VacationPlan } from '../domain/types';
import Button from '../components/ui/Button';
import VacationForm from '../components/VacationForm';

function fmtDate(s: string) {
  try { return format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }); } catch { return s; }
}

export default function VacationPage() {
  const { vacations, collaborators, confirmVacationPlan, unconfirmVacationPlan, deleteVacationPlan } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<VacationPlan | null>(null);

  const sorted = [...vacations].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const handleDelete = async (planId: string) => {
    if (!confirm('Excluir plano de férias?')) return;
    try { await deleteVacationPlan(planId); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  const handleConfirm = async (plan: VacationPlan) => {
    try { await confirmVacationPlan(plan.id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao confirmar.'); }
  };

  const handleUnconfirm = async (plan: VacationPlan) => {
    if (!confirm('Reverter para rascunho? Os eventos de escala vinculados serão removidos.')) return;
    try { await unconfirmVacationPlan(plan.id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao reverter.'); }
  };

  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--app-text)' }}>
            Férias
          </h1>
          <Button size="sm" onClick={() => { setEditPlan(null); setShowForm(true); }}>
            <Plus size={14} /> Nova Programação
          </Button>
        </div>

        {/* Form modal */}
        {showForm && (
          <VacationForm
            plan={editPlan}
            onClose={() => { setShowForm(false); setEditPlan(null); }}
          />
        )}

        {/* List */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--app-surface-muted)' }}>
                {['Colaborador', 'Tipo', 'Início', 'Fim', 'Cobertura', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(plan => {
                const colab = collaborators.find(c => c.id === plan.collaboratorId);
                const typeLabel = plan.vacationType === 'SELL_10' ? 'Venda 10d' : plan.vacationType === 'SELL_ALL' ? 'Venda Total' : 'Integral';
                return (
                  <tr
                    key={plan.id}
                    className="transition-colors hover:bg-[var(--app-surface-muted)]"
                    style={{ borderBottom: '1px solid var(--app-border)' }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--app-text)' }}>
                      {colab?.name ?? plan.collaboratorId}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{typeLabel}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{fmtDate(plan.startDate)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>{fmtDate(plan.endDate)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                      {plan.coverages.length > 0
                        ? plan.coverages.map(cov => collaborators.find(c => c.id === cov.collaboratorId)?.name ?? '?').join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: plan.status === 'confirmed' ? 'rgba(2,132,199,0.15)' : 'rgba(148,163,184,0.15)',
                          color: plan.status === 'confirmed' ? 'var(--status-ferias)' : 'var(--app-text-faint)',
                        }}
                      >
                        {plan.status === 'confirmed' ? 'Confirmado' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          className="p-1 rounded hover:opacity-70"
                          title="Editar"
                          onClick={() => { setEditPlan(plan); setShowForm(true); }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--app-text-muted)' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        </button>
                        {plan.status === 'draft' && (
                          <button
                            className="p-1 rounded hover:opacity-70"
                            title="Confirmar"
                            onClick={() => handleConfirm(plan)}
                          >
                            <CheckCircle2 size={13} style={{ color: 'var(--status-escala)' }} />
                          </button>
                        )}
                        {plan.status === 'confirmed' && (
                          <button
                            className="p-1 rounded hover:opacity-70"
                            title="Reverter para Rascunho"
                            onClick={() => handleUnconfirm(plan)}
                          >
                            <RotateCcw size={13} style={{ color: 'var(--app-text-muted)' }} />
                          </button>
                        )}
                        <button
                          className="p-1 rounded hover:opacity-70"
                          title="Excluir"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 size={13} style={{ color: 'var(--app-danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--app-text-faint)' }}>
                    Nenhum plano de férias cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
