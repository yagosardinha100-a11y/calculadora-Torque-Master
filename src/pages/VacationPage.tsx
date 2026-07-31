import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CheckCircle2, RotateCcw, Trash2, Pencil } from 'lucide-react';
import { useData } from '../data/DataProvider';
import type { VacationPlan } from '../domain/types';
import Button from '../components/ui/Button';
import VacationForm from '../components/VacationForm';
import { PageHeader } from '../components/PageHeader';

function fmtDate(s: string) {
  try {
    return format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return s;
  }
}

export default function VacationPage() {
  const { vacations, collaborators, confirmVacationPlan, unconfirmVacationPlan, deleteVacationPlan } =
    useData();
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<VacationPlan | null>(null);

  const sorted = [...vacations].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const handleDelete = async (planId: string) => {
    if (!confirm('Excluir plano de férias?')) return;
    try {
      await deleteVacationPlan(planId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  const handleConfirm = async (plan: VacationPlan) => {
    try {
      await confirmVacationPlan(plan.id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao confirmar.');
    }
  };

  const handleUnconfirm = async (plan: VacationPlan) => {
    if (!confirm('Reverter para rascunho? Os eventos de escala vinculados serão removidos.')) return;
    try {
      await unconfirmVacationPlan(plan.id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao reverter.');
    }
  };

  return (
    <div className="mx-auto h-full max-w-5xl space-y-4 overflow-y-auto p-3 sm:p-4">
      <PageHeader
        title="Férias"
        subtitle="Programação alinhada ao ciclo 14×14"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditPlan(null);
              setShowForm(true);
            }}
          >
            <Plus size={14} /> Nova programação
          </Button>
        }
      />

      {showForm && (
        <VacationForm
          plan={editPlan}
          onClose={() => {
            setShowForm(false);
            setEditPlan(null);
          }}
        />
      )}

      <div className="app-surface animate-rise overflow-hidden rounded-2xl" style={{ animationDelay: '60ms' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--app-surface-muted)]">
              {['Colaborador', 'Tipo', 'Início', 'Fim', 'Cobertura', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="border-b border-[var(--app-border)] px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-[var(--app-text-muted)] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((plan) => {
              const colab = collaborators.find((c) => c.id === plan.collaboratorId);
              const typeLabel =
                plan.vacationType === 'SELL_10'
                  ? 'Venda 10d'
                  : plan.vacationType === 'SELL_ALL'
                    ? 'Venda total'
                    : 'Integral';
              return (
                <tr
                  key={plan.id}
                  className="border-b border-[var(--app-border)] transition-colors hover:bg-[var(--app-surface-muted)]"
                >
                  <td className="px-3 py-2.5 font-semibold text-[var(--app-text)]">
                    {colab?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{typeLabel}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{fmtDate(plan.startDate)}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{fmtDate(plan.endDate)}</td>
                  <td className="px-3 py-2.5 text-[var(--app-text-muted)]">{plan.coverages?.length ?? 0}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background:
                          plan.status === 'confirmed' ? 'var(--app-accent-soft)' : 'rgba(148,163,184,0.18)',
                        color:
                          plan.status === 'confirmed' ? 'var(--status-escala)' : 'var(--app-text-muted)',
                      }}
                    >
                      {plan.status === 'confirmed' ? 'Confirmado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {plan.status === 'draft' ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded-lg p-1.5 text-[var(--app-accent)] transition hover:bg-[var(--app-accent-soft)]"
                          title="Confirmar"
                          onClick={() => handleConfirm(plan)}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cursor-pointer rounded-lg p-1.5 text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-muted)]"
                          title="Reverter"
                          onClick={() => handleUnconfirm(plan)}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg p-1.5 text-[var(--app-text-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
                        title="Editar"
                        onClick={() => {
                          setEditPlan(plan);
                          setShowForm(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg p-1.5 text-[var(--app-danger)] transition hover:bg-rose-500/10"
                        title="Excluir"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-[var(--app-text-faint)]">
                  Nenhuma programação de férias.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
