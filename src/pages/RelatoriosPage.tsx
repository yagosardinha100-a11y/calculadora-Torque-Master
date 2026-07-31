import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Printer, Users, Palmtree, Sparkles, ShieldCheck, Download, Calendar, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function RelatoriosPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { collaborators, events, vacations, turmas, trainings } = useData();

  const [selectedTurma, setSelectedTurma] = useState<string>('all');

  const filteredColabs = collaborators.filter(c => selectedTurma === 'all' || c.turmaId === selectedTurma);

  const dobrasCount = events.filter(e => e.status === 'Dobra').length;
  const confirmedVacationsCount = vacations.filter(v => v.status === 'confirmed').length;
  const activeColabsCount = collaborators.filter(c => c.active).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans print:p-0 print:max-w-none">
      {/* Header Banner */}
      <div className={cn(
        "p-4 sm:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200 print:hidden",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className={cn("text-lg sm:text-xl font-bold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Relatórios & Resumos Operacionais
            </h1>
            <p className={cn("text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
              Visão consolidada da equipe mecânica offshore, total de dobras, férias programadas e certificações.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            onClick={handlePrint}
            className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs py-2.5 px-4 shadow-md w-full md:w-auto justify-center"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
        <div className={cn(
          "p-4 rounded-xl border flex flex-col justify-between shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efetivo Ativo</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <span className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{activeColabsCount}</span>
          <span className="text-[10px] text-slate-500 mt-1">Colaboradores em catálogo</span>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex flex-col justify-between shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Turmas</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <span className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{turmas.length}</span>
          <span className="text-[10px] text-slate-500 mt-1">Turmas de embarque</span>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex flex-col justify-between shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Dobras</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <span className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{dobrasCount}</span>
          <span className="text-[10px] text-slate-500 mt-1">Dobras cadastradas</span>
        </div>

        <div className={cn(
          "p-4 rounded-xl border flex flex-col justify-between shadow-xs",
          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Férias Confirmadas</span>
            <Palmtree className="w-4 h-4 text-indigo-500" />
          </div>
          <span className={cn("text-2xl font-black", isLight ? "text-slate-900" : "text-white")}>{confirmedVacationsCount}</span>
          <span className="text-[10px] text-slate-500 mt-1">Planos de férias ativas</span>
        </div>
      </div>

      {/* Filter Header */}
      <div className={cn(
        "p-4 rounded-xl border shadow-xs flex items-center justify-between print:hidden",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filtrar Relatório por Turma:</span>
        <Select
          value={selectedTurma}
          onChange={e => setSelectedTurma(e.target.value)}
          className="text-xs w-48"
        >
          <option value="all">Todas as Turmas</option>
          {turmas.map(t => (
            <option key={t.id} value={t.id}>Turma {t.name}</option>
          ))}
        </Select>
      </div>

      {/* Main Report Table */}
      <div className={cn(
        "border rounded-xl shadow-xs overflow-hidden transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="p-4 border-b flex items-center justify-between border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            Relatório de Performance e Escala por Colaborador
          </h2>
          <span className="text-xs font-semibold text-slate-400">Data: {format(new Date(), 'dd/MM/yyyy')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={cn(
              "border-b font-bold uppercase tracking-wider text-[11px]",
              isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-400"
            )}>
              <tr>
                <th className="px-4 py-3">Nome do Colaborador</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Total Dobras</th>
                <th className="px-4 py-3 text-center">Férias Agendadas</th>
                <th className="px-4 py-3 text-center">Certificados</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800")}>
              {filteredColabs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhum colaborador cadastrado.
                  </td>
                </tr>
              ) : (
                filteredColabs.map(colab => {
                  const turma = turmas.find(t => t.id === colab.turmaId);
                  const colabDobras = events.filter(e => e.collaboratorId === colab.id && e.status === 'Dobra').length;
                  const colabVacations = vacations.filter(v => v.collaboratorId === colab.id).length;
                  const colabTrainings = trainings.filter(t => t.collaboratorId === colab.id).length;

                  return (
                    <tr key={colab.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/50"}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {colab.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {colab.role}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 font-extrabold text-[11px]">
                          {turma?.name || 'Sem Turma'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {colab.active ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Ativo</span>
                        ) : (
                          <span className="text-slate-400">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {colabDobras}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {colabVacations}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-cyan-600 dark:text-cyan-400">
                        {colabTrainings}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
