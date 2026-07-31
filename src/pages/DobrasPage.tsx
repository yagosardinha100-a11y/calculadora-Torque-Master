import { useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Calendar, Search, Users, AlertCircle, Sparkles, Filter, Info, ShieldCheck, X } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import type { ScheduleEvent, Status } from '../types';
import { GenericPageSkeleton } from '../components/ui/Skeleton';

export default function DobrasPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { collaborators, events: allEvents, turmas, loading, addEvent, deleteEvent } = useData();

  if (loading) {
    return <GenericPageSkeleton />;
  }
  const events = allEvents.filter(e => e.status === 'Dobra');

  const [search, setSearch] = useState('');
  const [selectedColabId, setSelectedColabId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formColabId, setFormColabId] = useState('');
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formEndDate, setFormEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formMotive, setFormMotive] = useState('');
  const [formNote, setFormNote] = useState('');

  const handleAddDobra = async (e: FormEvent) => {
    e.preventDefault();
    if (!formColabId || !formStartDate || !formEndDate) return;

    await addEvent({
      collaboratorId: formColabId,
      startDate: formStartDate,
      endDate: formEndDate,
      status: 'Dobra' as Status,
      motive: formMotive || 'Dobra de cobertura',
      note: formNote,
    });

    setShowAddModal(false);
    setFormMotive('');
    setFormNote('');
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setDeleteId(null);
  };

  // Filtered dobras
  const filteredEvents = events.filter(evt => {
    const colab = collaborators.find(c => c.id === evt.collaboratorId);
    const colabName = colab ? colab.name.toLowerCase() : '';
    const matchesSearch = colabName.includes(search.toLowerCase()) || (evt.motive || '').toLowerCase().includes(search.toLowerCase());
    const matchesColab = selectedColabId === 'all' || evt.collaboratorId === selectedColabId;
    return matchesSearch && matchesColab;
  });

  // Calculate total days
  const totalDays = events.reduce((sum, evt) => {
    try {
      const days = differenceInCalendarDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
      return sum + (days > 0 ? days : 1);
    } catch {
      return sum + 1;
    }
  }, 0);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* Header Banner */}
      <div className={cn(
        "p-4 sm:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className={cn("text-lg sm:text-xl font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Gestão de Dobras e Coberturas
            </h1>
            <p className={cn("text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
              Lançamento, acompanhamento de justificativas e estatísticas de horas extras e dobras offshore.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs py-2.5 px-4 shadow-md shrink-0 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Lançar Nova Dobra
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>Total de Registros</span>
            <span className={cn("text-lg font-black", isLight ? "text-slate-900" : "text-white")}>{events.length} dobras</span>
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>Total de Dias Dobrados</span>
            <span className={cn("text-lg font-black", isLight ? "text-slate-900" : "text-white")}>{totalDays} dias acumulados</span>
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className={cn("text-xs font-semibold block", isLight ? "text-slate-500" : "text-slate-400")}>Ativas na Equipe</span>
            <span className={cn("text-lg font-black", isLight ? "text-slate-900" : "text-white")}>
              {new Set(events.map(e => e.collaboratorId)).size} colaboradores
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={cn(
        "p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por colaborador ou motivo..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <Select
            value={selectedColabId}
            onChange={e => setSelectedColabId(e.target.value)}
            className="text-xs"
          >
            <option value="all">Todos os Colaboradores</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Dobras Table */}
      <div className={cn(
        "border rounded-xl shadow-xs overflow-hidden transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={cn(
              "border-b font-bold uppercase tracking-wider text-[11px]",
              isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-400"
            )}>
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Turma & Função</th>
                <th className="px-4 py-3">Período da Dobra</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Motivo / Justificativa</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800")}>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn("px-4 py-12 text-center", isLight ? "text-slate-500" : "text-slate-400")}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-sm">Nenhum registro de dobra encontrado.</p>
                      <p className="text-xs">Utilize o botão "Lançar Nova Dobra" para cadastrar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map(evt => {
                  const colab = collaborators.find(c => c.id === evt.collaboratorId);
                  const turma = turmas.find(t => t.id === colab?.turmaId);
                  let days = 1;
                  try {
                    days = differenceInCalendarDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
                  } catch {
                    days = 1;
                  }

                  return (
                    <tr key={evt.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/50"}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {colab?.name || 'Não Identificado'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold mr-1.5">
                          {turma?.name || 's/T'}
                        </span>
                        {colab?.role || '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(evt.startDate), 'dd/MM/yyyy')} &rarr; {format(parseISO(evt.endDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 font-black text-amber-600 dark:text-amber-400">
                        {days} {days === 1 ? 'dia' : 'dias'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                        {evt.motive || 'Dobra de cobertura'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(evt.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Lançar Dobra */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={cn(
            "w-full max-w-md rounded-2xl border p-5 shadow-2xl flex flex-col gap-4",
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Lançar Registro de Dobra</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDobra} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Colaborador</label>
                <Select
                  value={formColabId}
                  onChange={e => setFormColabId(e.target.value)}
                  required
                >
                  <option value="">Selecione o colaborador...</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Data Início</label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Data Fim</label>
                  <Input
                    type="date"
                    value={formEndDate}
                    min={formStartDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Motivo da Dobra</label>
                <Input
                  value={formMotive}
                  onChange={e => setFormMotive(e.target.value)}
                  placeholder="Ex: Cobertura emergencial de férias / Demanda offshore"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observação</label>
                <textarea
                  className="w-full rounded-xl border p-2.5 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[70px]"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                  Salvar Dobra
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Remover Dobra"
        message="Tem certeza que deseja excluir esta dobra registrada?"
        confirmText="Sim, Excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
        }}
      />
    </div>
  );
}
