import { useState } from 'react';
import { useData } from '../context/DataContext';
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
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { VacationModal } from '../components/VacationModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { VacationPlan } from '../types';
import { checkVacationAlignment } from '../lib/vacationUtils';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { VacationSkeleton } from '../components/ui/Skeleton';

export default function VacationPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    vacations,
    collaborators,
    turmas,
    loading,
    confirmVacationPlan,
    unconfirmVacationPlan,
    deleteVacationPlan,
  } = useData();

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
    await confirmVacationPlan(planId);
  };

  const handleUnconfirmPlan = async (planId: string) => {
    await unconfirmVacationPlan(planId);
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 rounded-xl border transition-colors duration-200",
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900 border-slate-800 shadow-xl"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 sm:p-3 rounded-xl shrink-0", isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/10 text-cyan-400 border border-cyan-500/20")}>
            <Palmtree className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className={cn("text-lg sm:text-xl font-bold", isLight ? "text-slate-900" : "text-white")}>Programação de Férias & Coberturas</h1>
            <p className={cn("text-[11px] sm:text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
              Programação de férias e definição de substitutos para lançamento na escala.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-3.5 py-2 shrink-0 text-xs w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Programar Férias
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn("p-4 rounded-xl border flex items-center justify-between transition-colors duration-200", isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-900 border-slate-800 shadow-lg")}>
          <div>
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>Total de Programações</span>
            <div className={cn("text-2xl font-black mt-1", isLight ? "text-slate-900" : "text-white")}>{vacations?.length || 0}</div>
          </div>
          <div className={cn("p-2.5 rounded-lg", isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-300")}>
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className={cn("p-4 rounded-xl border flex items-center justify-between transition-colors duration-200", isLight ? "bg-white border-amber-200 bg-amber-50/20 shadow-2xs" : "bg-slate-900 border-amber-500/30 bg-amber-500/5 shadow-lg")}>
          <div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Em Rascunho</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{totalDraft}</div>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className={cn("p-4 rounded-xl border flex items-center justify-between transition-colors duration-200", isLight ? "bg-white border-emerald-200 bg-emerald-50/20 shadow-2xs" : "bg-slate-900 border-emerald-500/30 bg-emerald-500/5 shadow-lg")}>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Lançados na Escala</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{totalConfirmed}</div>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={cn("p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200", isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800")}>
        <div className={cn("flex items-center gap-1 p-1 rounded-lg w-full md:w-auto", isLight ? "bg-slate-100" : "bg-slate-950 border border-slate-800")}>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? (isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-slate-800 text-white shadow-xs')
                : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
            }`}
          >
            Todos ({vacations?.length || 0})
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterStatus === 'draft'
                ? (isLight ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs')
                : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Rascunhos ({totalDraft})
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterStatus === 'confirmed'
                ? (isLight ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs')
                : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Lançados na Escala ({totalConfirmed})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className={cn(
                "w-full appearance-none rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors",
                isLight 
                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              )}
            >
              <option value="all">Todos os Tipos</option>
              <option value="FULL">Integrais (30d)</option>
              <option value="SELL_10">Venda Parcial (10d)</option>
              <option value="SELL_ALL">Venda Total</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador ou substituto..."
              className="pl-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Vacation Plans List */}
      {filteredPlans.length === 0 ? (
        <div className={cn("rounded-xl border border-dashed p-12 text-center space-y-3", isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-800")}>
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto", isLight ? "bg-slate-100 text-slate-400" : "bg-slate-800 text-slate-500")}>
            <Palmtree className="w-6 h-6" />
          </div>
          <h3 className={cn("font-bold text-sm", isLight ? "text-slate-800" : "text-white")}>Nenhuma programação de férias encontrada</h3>
          <p className={cn("text-xs max-w-sm mx-auto", isLight ? "text-slate-500" : "text-slate-400")}>
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Tente remover os filtros ou buscar por outro termo.'
              : 'Clique no botão acima para programar as férias de um colaborador e definir quem fará a cobertura.'}
          </p>
          {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
            <Button onClick={handleOpenNew} className="bg-emerald-600 text-white font-semibold text-xs mt-2">
              Programar Primeira Férias
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
                  "rounded-xl border transition-all shadow-xs hover:shadow-md",
                  isLight 
                    ? (isConfirmed ? 'bg-white border-emerald-200' : 'bg-white border-amber-200')
                    : (isConfirmed ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-amber-500/30')
                )}
              >
                <div className={cn("p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b", isLight ? "border-slate-100" : "border-slate-800")}>
                  {/* Vacationer info */}
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-lg shrink-0", isConfirmed ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300")}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn("font-bold text-base", isLight ? "text-slate-900" : "text-white")}>
                          {colab ? colab.name : 'Colaborador não encontrado'}
                        </h3>
                        {colab && (
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", isLight ? "text-slate-600 bg-slate-100" : "text-slate-300 bg-slate-800")}>
                            {colab.role}
                          </span>
                        )}
                        {/* Tipo de Férias Badge */}
                        {(!plan.vacationType || plan.vacationType === 'FULL') && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 px-2 py-0.5 rounded-full">
                            <Palmtree className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
                            Férias (30 dias)
                          </span>
                        )}
                        {plan.vacationType === 'SELL_10' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Palmtree className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Venda Parcial
                          </span>
                        )}
                        {plan.vacationType === 'SELL_ALL' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <Palmtree className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Venda Total
                          </span>
                        )}
                        
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Lançado na Escala
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Rascunho (Aguardando Confirmação)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1.5 flex-wrap">
                        <span className={cn("flex items-center gap-1 font-semibold px-2 py-1 rounded border", isLight ? "text-slate-800 bg-slate-50 border-slate-200" : "text-slate-200 bg-slate-800 border-slate-700")}>
                          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                          {plan.startDate ? format(parseISO(plan.startDate), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          {plan.endDate ? format(parseISO(plan.endDate), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </span>

                        {daysCount > 0 && (
                          <span className={cn("font-medium", isLight ? "text-slate-500" : "text-slate-400")}>
                            ({daysCount} dias)
                          </span>
                        )}

                        {plan.endDate && (
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Retorno: {format(addDays(parseISO(plan.endDate), 1), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}

                        {plan.note && (
                          <span className={cn("italic", isLight ? "text-slate-500" : "text-slate-400")}>
                            &bull; "{plan.note}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(plan)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </Button>

                    {isConfirmed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnconfirmPlan(plan.id)}
                        className="gap-1.5 text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100"
                        title="Desfaz o lançamento das Férias e Dobras na aba Escala"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Desfazer Lançamento
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmPlan(plan.id)}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        title="Publica o status de Férias e as Dobras de cobertura na planilha Escala"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Confirmar e Lançar na Escala
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletePlanId(plan.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Excluir programação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Coverage Details Section */}
                <div className={cn("p-4 rounded-b-xl border-t space-y-2", isLight ? "bg-slate-50/70 border-slate-100" : "bg-slate-950/70 border-slate-800")}>
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5", isLight ? "text-slate-500" : "text-slate-400")}>
                    <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Cobertura de Férias Definida ({plan.coverages.length} {plan.coverages.length === 1 ? 'Substituto' : 'Substitutos'})
                  </span>

                  {plan.coverages.length === 0 ? (
                    <p className={cn("text-xs italic", isLight ? "text-slate-400" : "text-slate-500")}>
                      Nenhum substituto foi atribuído ainda a esta férias.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {plan.coverages.map((cov, idx) => {
                        const covColab = colabMap.get(cov.collaboratorId);
                        const isSlot1 = idx === 0;
                        const isSlot2 = idx === 1;

                        return (
                          <div
                            key={cov.id || idx}
                            className={cn("p-2.5 rounded-lg border text-xs flex items-start gap-2 shadow-2xs", isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800")}
                          >
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded shrink-0 mt-0.5">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className={cn("font-bold truncate", isLight ? "text-slate-800" : "text-white")}>
                                  {covColab ? covColab.name : 'Substituto'}
                                </div>
                                {isSlot1 && (
                                  <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-500/30 shrink-0">
                                    Turno 1 (7d)
                                  </span>
                                )}
                                {isSlot2 && (
                                  <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                                    Turno 2 (7d)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                                Cobertura: {cov.startDate ? format(parseISO(cov.startDate), "dd/MM", { locale: ptBR }) : ''}
                                {' a '}
                                {cov.endDate ? format(parseISO(cov.endDate), "dd/MM", { locale: ptBR }) : ''}
                              </div>
                              {cov.note && (
                                <div className={cn("text-[10px] truncate mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
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

      {/* Vacation Modal */}
      {isModalOpen && (
        <VacationModal
          initialPlan={selectedPlan}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Confirm Delete Modal */}
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
    </div>
  );
}
