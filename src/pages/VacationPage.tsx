import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Palmtree,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  UserCheck,
  Edit3,
  Trash2,
  ArrowRight,
  Send,
  RotateCcw,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { VacationModal } from '../components/VacationModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { VacationPlan } from '../types';
import { checkVacationAlignment } from '../lib/vacationUtils';
import { cn } from '../lib/utils';
import { VacationSkeleton } from '../components/ui/Skeleton';
import {
  MetricCard,
  PageHeader,
  PageShell,
  SectionSurface,
} from '../components/ui/PageChrome';

export default function VacationPage() {
  const {
    vacations,
    collaborators,
    turmas,
    loading,
    confirmVacationPlan,
    unconfirmVacationPlan,
    deleteVacationPlan,
  } = useData();
  const { canEdit } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<VacationPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'confirmed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'FULL' | 'SELL_10' | 'SELL_ALL'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return <VacationSkeleton />;
  }

  const colabMap = new Map(collaborators?.map(c => [c.id, c]) || []);
  const turmaMap = new Map(turmas?.map(t => [t.id, t]) || []);

  const handleOpenNew = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: VacationPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleConfirmPlan = async (planId: string) => {
    try {
      await confirmVacationPlan(planId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao confirmar férias.');
    }
  };

  const handleUnconfirmPlan = async (planId: string) => {
    try {
      await unconfirmVacationPlan(planId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao desfazer lançamento.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    await deleteVacationPlan(planId);
  };

  // Filtered plans
  const filteredPlans = (vacations || []).filter(plan => {
    if (filterStatus !== 'all' && plan.status !== filterStatus) return false;

    const planType = plan.vacationType || 'FULL';
    if (filterType !== 'all' && planType !== filterType) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const colabName = colabMap.get(plan.collaboratorId)?.name.toLowerCase() || '';
      const notes = (plan.note || '').toLowerCase();

      const coverageMatch = plan.coverages.some(cov => {
        const covName = colabMap.get(cov.collaboratorId)?.name.toLowerCase() || '';
        return covName.includes(term);
      });

      return colabName.includes(term) || notes.includes(term) || coverageMatch;
    }

    return true;
  });

  const totalConfirmed = vacations?.filter(v => v.status === 'confirmed').length || 0;
  const totalDraft = vacations?.filter(v => v.status === 'draft').length || 0;

  return (
    <PageShell wide>
      <PageHeader
        title="Férias"
        description="Programação de férias e coberturas para lançamento na escala."
        icon={<Palmtree className="size-5" />}
        actions={
          canEdit ? (
            <Button onClick={handleOpenNew} className="w-full gap-2 sm:w-auto">
              <Plus className="size-4" />
              Programar Férias
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          label="Total"
          value={vacations?.length || 0}
          hint="Programações cadastradas"
          icon={<Calendar className="size-5" />}
        />
        <MetricCard
          label="Em rascunho"
          value={totalDraft}
          hint="Aguardando confirmação"
          icon={<Clock className="size-5 text-amber-600 dark:text-amber-400" />}
        />
        <MetricCard
          label="Lançados na escala"
          value={totalConfirmed}
          hint="Confirmados"
          icon={<CheckCircle2 className="size-5 text-teal-600 dark:text-teal-400" />}
        />
      </div>

      <SectionSurface>
        <div className="flex flex-col items-stretch gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full items-center gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1 md:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filterStatus === 'all'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
              )}
            >
              Todos ({vacations?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('draft')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filterStatus === 'draft'
                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
              )}
            >
              <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
              Rascunhos ({totalDraft})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('confirmed')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filterStatus === 'confirmed'
                  ? 'border border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
              )}
            >
              <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400" />
              Lançados ({totalConfirmed})
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-3 sm:flex-row md:w-auto">
            <div className="relative w-full sm:w-48">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="pr-8 text-xs"
              >
                <option value="all">Todos os tipos</option>
                <option value="FULL">Integrais (30d)</option>
                <option value="SELL_10">Venda parcial (10d)</option>
                <option value="SELL_ALL">Venda total</option>
              </Select>
              <Filter className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-[var(--app-text-faint)]" />
            </div>

            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-text-faint)]" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador ou substituto…"
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>
      </SectionSurface>

      {filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-muted)] p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
            <Palmtree className="size-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[var(--app-text)]">
            Nenhuma programação encontrada
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--app-text-muted)]">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Tente remover os filtros ou buscar por outro termo.'
              : 'Programe as férias de um colaborador e defina quem fará a cobertura.'}
          </p>
          {!searchTerm && filterStatus === 'all' && filterType === 'all' && canEdit && (
            <Button onClick={handleOpenNew} className="mt-4 gap-2 text-xs">
              Programar primeira férias
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPlans.map(plan => {
            const colab = colabMap.get(plan.collaboratorId);
            const isConfirmed = plan.status === 'confirmed';

            let daysCount = 0;
            if (plan.startDate && plan.endDate) {
              try {
                daysCount = differenceInCalendarDays(parseISO(plan.endDate), parseISO(plan.startDate)) + 1;
              } catch {}
            }

            return (
              <div
                key={plan.id}
                className={cn(
                  'app-surface overflow-hidden rounded-2xl border transition-shadow hover:shadow-md',
                  isConfirmed ? 'border-teal-500/30' : 'border-amber-500/30',
                )}
              >
                <div className="flex flex-col justify-between gap-4 border-b border-[var(--app-border)] p-5 md:flex-row md:items-center">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'shrink-0 rounded-xl p-2.5',
                        isConfirmed
                          ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      <User className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-[var(--app-text)]">
                          {colab ? colab.name : 'Colaborador não encontrado'}
                        </h3>
                        {colab && (
                          <span className="rounded-md bg-[var(--app-surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--app-text-muted)]">
                            {colab.role}
                          </span>
                        )}
                        {(!plan.vacationType || plan.vacationType === 'FULL') && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                            <Palmtree className="size-3" />
                            Férias (30 dias)
                          </span>
                        )}
                        {plan.vacationType === 'SELL_10' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            <Palmtree className="size-3" />
                            Venda parcial
                          </span>
                        )}
                        {plan.vacationType === 'SELL_ALL' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--app-text-muted)]">
                            <Palmtree className="size-3" />
                            Venda total
                          </span>
                        )}

                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
                            <CheckCircle2 className="size-3" />
                            Lançado na escala
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            <Clock className="size-3" />
                            Rascunho
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--app-text-muted)]">
                        <span className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2 py-1 font-semibold text-[var(--app-text)]">
                          <Calendar className="size-3.5 text-[var(--app-accent)]" />
                          {plan.startDate ? format(parseISO(plan.startDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                          <ArrowRight className="size-3 text-[var(--app-text-faint)]" />
                          {plan.endDate ? format(parseISO(plan.endDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </span>

                        {daysCount > 0 && (
                          <span className="font-medium text-[var(--app-text-faint)]">
                            ({daysCount} dias)
                          </span>
                        )}

                        {plan.endDate && (
                          <span className="flex items-center gap-1 rounded border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
                            <Sparkles className="size-3" />
                            Retorno: {format(addDays(parseISO(plan.endDate), 1), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}

                        {plan.note && (
                          <span className="italic text-[var(--app-text-faint)]">
                            &bull; &ldquo;{plan.note}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEdit ? (
                  <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(plan)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit3 className="size-3.5" />
                      Editar
                    </Button>

                    {isConfirmed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnconfirmPlan(plan.id)}
                        className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                        title="Desfaz o lançamento das Férias e Dobras na aba Escala"
                      >
                        <RotateCcw className="size-3.5" />
                        Desfazer lançamento
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmPlan(plan.id)}
                        className="gap-1.5 text-xs"
                        title="Publica o status de Férias e as Dobras de cobertura na planilha Escala"
                      >
                        <Send className="size-3.5" />
                        Confirmar e lançar
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletePlanId(plan.id)}
                      className="text-[var(--app-danger)] hover:bg-rose-500/10"
                      title="Excluir programação"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  ) : null}
                </div>

                <div className="space-y-2 border-t border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--app-text-faint)] uppercase">
                    <UserCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
                    Cobertura ({plan.coverages.length}{' '}
                    {plan.coverages.length === 1 ? 'substituto' : 'substitutos'})
                  </span>

                  {plan.coverages.length === 0 ? (
                    <p className="text-xs italic text-[var(--app-text-faint)]">
                      Nenhum substituto atribuído a esta programação.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-3">
                      {plan.coverages.map((cov, idx) => {
                        const covColab = colabMap.get(cov.collaboratorId);
                        const isSlot1 = idx === 0;
                        const isSlot2 = idx === 1;

                        return (
                          <div
                            key={cov.id || idx}
                            className="flex items-start gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 text-xs"
                          >
                            <div className="mt-0.5 shrink-0 rounded-lg bg-amber-500/15 p-1.5 text-amber-700 dark:text-amber-300">
                              <UserCheck className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className="truncate font-semibold text-[var(--app-text)]">
                                  {covColab ? covColab.name : 'Substituto'}
                                </div>
                                {isSlot1 && (
                                  <span className="shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 dark:text-sky-300">
                                    Turno 1 (7d)
                                  </span>
                                )}
                                {isSlot2 && (
                                  <span className="shrink-0 rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-teal-800 dark:text-teal-300">
                                    Turno 2 (7d)
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                                Cobertura: {cov.startDate ? format(parseISO(cov.startDate), 'dd/MM', { locale: ptBR }) : ''}
                                {' a '}
                                {cov.endDate ? format(parseISO(cov.endDate), 'dd/MM', { locale: ptBR }) : ''}
                              </div>
                              {cov.note && (
                                <div className="mt-0.5 truncate text-[10px] text-[var(--app-text-faint)]">
                                  {cov.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <VacationModal
          initialPlan={selectedPlan}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deletePlanId}
        title="Excluir Programação de Férias"
        message="Tem certeza que deseja excluir esta programação? Se ela já estiver lançada na escala, os eventos de férias e dobras correspondentes também serão removidos."
        confirmText="Sim, Excluir"
        onClose={() => setDeletePlanId(null)}
        onConfirm={async () => {
          if (deletePlanId) {
            await handleDeletePlan(deletePlanId);
          }
        }}
      />
    </PageShell>
  );
}
