import { useMemo, useState, Fragment } from 'react';
import { getDaysInMonth, startOfMonth, addDays, addMonths, format, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSchedule, type CellData } from '../hooks/useSchedule';
import { EventSidebar } from './EventSidebar';
import { EditCollaboratorModal } from './EditCollaboratorModal';
import { cn } from '../lib/utils';
import type { Status, Collaborator, Role } from '../types';
import { getDayNameFromDateStr } from '../lib/turmaUtils';
import { useTheme } from '../context/ThemeContext';
import { 
  Edit3, Search, Filter, Calendar, LayoutGrid, ListFilter, Anchor, 
  ShieldCheck, Users, Sparkles, Activity, Clock, BarChart2, Kanban,
  CheckCircle2, ArrowRight, UserCheck, AlertCircle
} from 'lucide-react';

interface ScheduleGridProps {
  startMonth: Date;
  monthsCount?: number;
}

import { DEFAULT_TURMAS, getTurmaLetterForCollaborator } from '../lib/turmaUtils';

// Colors matching status legend — solid fills for clarity in the grid
const STATUS_STYLES: Record<Status, { 
  bg: string; 
  text: string; 
  label: string; 
  shortLabel: string;
  badgeClass: string;
  showValue: boolean;
}> = {
  'Escala': { 
    bg: 'bg-[var(--status-escala)] text-white font-bold shadow-xs', 
    badgeClass: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30',
    text: 'text-white font-bold', 
    label: 'Escala', 
    shortLabel: 'EMBARQUE',
    showValue: true 
  },
  'Dobra': { 
    bg: 'bg-[var(--status-dobra)] text-white font-bold shadow-xs', 
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    text: 'text-white font-bold', 
    label: 'Dobra', 
    shortLabel: 'DOBRA',
    showValue: true 
  },
  'Férias': { 
    bg: 'bg-[var(--status-ferias)] text-white font-semibold shadow-xs', 
    badgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    text: 'text-sky-100 font-semibold', 
    label: 'Férias', 
    shortLabel: 'FÉRIAS',
    showValue: false 
  },
  'Treinamento': { 
    bg: 'bg-[var(--status-treinamento)] text-white font-semibold shadow-xs', 
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    text: 'text-white font-semibold', 
    label: 'Treinamento', 
    shortLabel: 'TREINAMENTO',
    showValue: false 
  },
  'Exame Médico': { 
    bg: 'bg-[var(--status-exame)] text-white font-semibold shadow-xs', 
    badgeClass: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
    text: 'text-white font-semibold', 
    label: 'Atestado', 
    shortLabel: 'ATESTADO',
    showValue: false 
  },
  'No Show': { 
    bg: 'bg-[var(--status-noshow)] text-white font-bold shadow-xs', 
    badgeClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
    text: 'text-white font-bold', 
    label: 'No Show', 
    shortLabel: 'NO SHOW',
    showValue: true 
  },
  'Folga': { 
    bg: 'bg-slate-100/90 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 hover:text-slate-500', 
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    text: 'text-slate-500', 
    label: 'Folga', 
    shortLabel: '',
    showValue: false 
  },
};

const TURMA_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'turma-a': { bg: 'bg-teal-500/15', text: 'text-teal-800 dark:text-teal-300', border: 'border-teal-500/35', label: 'Turma A' },
  'turma-b': { bg: 'bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-500/35', label: 'Turma B' },
  'turma-c': { bg: 'bg-sky-500/15', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-500/35', label: 'Turma C' },
  'turma-d': { bg: 'bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/35', label: 'Turma D' },
  'A': { bg: 'bg-teal-500/15', text: 'text-teal-800 dark:text-teal-300', border: 'border-teal-500/35', label: 'Turma A' },
  'B': { bg: 'bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-500/35', label: 'Turma B' },
  'C': { bg: 'bg-sky-500/15', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-500/35', label: 'Turma C' },
  'D': { bg: 'bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/35', label: 'Turma D' },
};

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Coordenador',
  'Mecânico',
  'Assistente Mecânico',
  'Outros'
];

type ViewMode = 'timeline' | 'board' | 'grid' | 'daily' | 'month';

export function ScheduleGrid({ startMonth, monthsCount = 12 }: ScheduleGridProps) {
  const { isLight } = useTheme();
  const [selectedCell, setSelectedCell] = useState<{ cell: CellData; collaboratorName: string } | null>(null);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);

  
  // Interactive View Controls
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedDailyDateStr, setSelectedDailyDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showPobChart, setShowPobChart] = useState<boolean>(true);

  const daysInfo = useMemo(() => {
    const start = startOfMonth(startMonth);
    let totalDays = 0;
    for (let m = 0; m < monthsCount; m++) {
      totalDays += getDaysInMonth(addMonths(start, m));
    }

    return Array.from({ length: totalDays }).map((_, i) => {
      const date = addDays(start, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        weekNum: getWeek(date, { weekStartsOn: 1 }),
      };
    });
  }, [startMonth, monthsCount]);

  // Ensure default daily date falls within range
  useMemo(() => {
    if (daysInfo.length > 0 && !daysInfo.some(d => d.dateStr === selectedDailyDateStr)) {
      setSelectedDailyDateStr(daysInfo[0].dateStr);
    }
  }, [daysInfo, selectedDailyDateStr]);

  // Group columns by Month for the top header row
  const monthGroups = useMemo(() => {
    const groups: { monthLabel: string; count: number }[] = [];
    daysInfo.forEach(d => {
      const label = format(d.date, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      const last = groups[groups.length - 1];
      if (last && last.monthLabel === label) {
        last.count++;
      } else {
        groups.push({ monthLabel: label, count: 1 });
      }
    });
    return groups;
  }, [daysInfo]);

  // Group columns by week for the week header row
  const weekGroups = useMemo(() => {
    const groups: { weekNum: number; count: number }[] = [];
    daysInfo.forEach(d => {
      const last = groups[groups.length - 1];
      if (last && last.weekNum === d.weekNum) {
        last.count++;
      } else {
        groups.push({ weekNum: d.weekNum, count: 1 });
      }
    });
    return groups;
  }, [daysInfo]);

  const { buildGrid, turmas: rawTurmas } = useSchedule(startMonth);
  const turmas = (rawTurmas && rawTurmas.length > 0) ? rawTurmas : DEFAULT_TURMAS;
  const { grid, pobCounts, collaborators } = buildGrid(daysInfo);

  // Filter collaborators based on search and role filter
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(colab => {
      const matchesSearch = colab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            colab.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === 'ALL' || colab.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [collaborators, searchTerm, selectedRoleFilter]);

  // Maximum POB for sparkline graph
  const maxPob = useMemo(() => {
    const values = Object.values(pobCounts);
    return Math.max(...values, 1);
  }, [pobCounts]);

  if (collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-6 gap-3">
        <Users className="w-10 h-10 text-cyan-400" />
        <p className="text-sm font-semibold">Nenhum colaborador ativo encontrado.</p>
        <span className="text-xs text-slate-500">Adicione colaboradores na aba "Colaboradores" para gerar a matriz.</span>
      </div>
    );
  }

  // Helper to extract initials for modern avatars
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper for short clean mobile name display
  const getShortName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  return (
    <>
      <div className={cn(
        "flex-1 border rounded-xl shadow-xs overflow-hidden flex flex-col relative font-sans transition-colors duration-200",
        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800 shadow-2xl"
      )}>
        
        {/* Modern Command & View Mode Selector Header */}
        <div className={cn(
          "px-3 sm:px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between text-xs gap-2 border-b transition-colors duration-200",
          isLight ? "bg-slate-50/90 text-slate-800 border-slate-200" : "bg-slate-900/95 text-white border-slate-800"
        )}>
          {/* Interactive View Mode Selector */}
          <div className="flex items-center gap-2 flex-wrap w-full justify-start md:justify-start">
            <div className={cn(
              "flex items-center gap-1.5 p-1.5 rounded-xl border text-xs",
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800 shadow-inner"
            )}>
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'timeline' 
                    ? "bg-blue-600 text-white shadow-xs border-b-2 border-blue-800 font-black" 
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
                )}
                title="Linha do Tempo Visual de Embarque (Gantt)"
              >
                <Activity className="w-4 h-4 text-cyan-300" />
                <span>Linha do Tempo</span>
              </button>

              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'board' 
                    ? "bg-blue-600 text-white shadow-xs border-b-2 border-blue-800 font-black" 
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
                )}
                title="Visão por Quadro de Turmas"
              >
                <Kanban className="w-4 h-4 text-cyan-300" />
                <span>Turmas</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'grid' 
                    ? "bg-blue-600 text-white shadow-xs border-b-2 border-blue-800 font-black" 
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
                )}
                title="Visão Matriz Limpa"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Matriz</span>
              </button>

              <button
                onClick={() => setViewMode('daily')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'daily' 
                    ? "bg-blue-600 text-white shadow-xs border-b-2 border-blue-800 font-black" 
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
                )}
                title="Diário de Embarque por Data"
              >
                <ListFilter className="w-4 h-4" />
                <span>Diário</span>
              </button>

              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'month' 
                    ? "bg-blue-600 text-white shadow-xs border-b-2 border-blue-800 font-black" 
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
                )}
                title="Visão Mensal em Calendário"
              >
                <Calendar className="w-4 h-4 text-cyan-300" />
                <span>Mensal</span>
              </button>
            </div>

            <button
              onClick={() => setShowPobChart(prev => !prev)}
              className={cn(
                "px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all select-none active:scale-95 hidden sm:flex cursor-pointer",
                showPobChart 
                  ? "bg-blue-50 text-blue-800 border-blue-200 shadow-xs" 
                  : isLight
                    ? "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
              title="Alternar Gráfico POB"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Gráfico POB</span>
            </button>

            <div className={cn(
              "text-xs px-3 py-1.5 rounded-xl border font-bold shrink-0",
              isLight ? "bg-white text-slate-700 border-slate-200" : "text-slate-300 bg-slate-950 border-slate-800"
            )}>
              Integrantes: <strong className={isLight ? "text-blue-700 font-black" : "text-cyan-400 font-black"}>{filteredCollaborators.length}</strong>/{collaborators.length}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className={cn(
          "p-2.5 sm:p-3 border-b flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 text-xs transition-colors duration-200",
          isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
        )}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar colaborador ou função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 border",
                  isLight 
                    ? "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" 
                    : "bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500"
                )}
              />
            </div>
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-1 shrink-0 justify-between sm:justify-end">
            <span className={cn("text-[10px] uppercase font-bold sm:hidden", isLight ? "text-slate-500" : "text-slate-400")}>Função:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className={cn(
                "border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto cursor-pointer",
                isLight 
                  ? "bg-white text-slate-800 border-slate-300" 
                  : "bg-slate-950 border-slate-800 text-slate-200"
              )}
            >
              <option value="ALL">Todas as Funções</option>
              {ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic POB Sparkline Visualizer */}
        {showPobChart && (viewMode === 'timeline' || viewMode === 'grid') && (
          <div className={cn(
            "border-b p-2.5 sm:p-3 overflow-x-auto scrollbar-none transition-colors duration-200",
            isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
          )}>
            <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              <span className={cn("flex items-center gap-1.5 font-bold", isLight ? "text-blue-900" : "text-cyan-300")}>
                <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                Curva de POB Embarcado Diário
              </span>
              <span className={cn("font-medium", isLight ? "text-slate-500" : "text-slate-500")}>
                Pico Máximo: <strong className={isLight ? "text-slate-900" : "text-white"}>{maxPob} Pessoas</strong>
              </span>
            </div>
            <div className="flex items-end gap-[2px] h-10 min-w-max pt-1">
              {daysInfo.map(d => {
                const count = pobCounts[d.dateStr] ?? 0;
                const heightPercent = maxPob > 0 ? (count / maxPob) * 100 : 0;
                const isToday = d.dateStr === format(new Date(), 'yyyy-MM-dd');
                const isSelected = d.dateStr === selectedDailyDateStr;

                return (
                  <div
                    key={d.dateStr}
                    onClick={() => setSelectedDailyDateStr(d.dateStr)}
                    className={cn(
                      "w-[34px] sm:w-[38px] flex flex-col items-center justify-end h-full cursor-pointer group transition-all rounded-t-xs",
                      isSelected 
                        ? (isLight ? "bg-blue-100" : "bg-cyan-500/20") 
                        : (isLight ? "hover:bg-slate-100" : "hover:bg-slate-800/60")
                    )}
                    title={`${format(d.date, 'dd/MM/yyyy')}: POB de ${count} pessoas`}
                  >
                    <div 
                      style={{ height: `${Math.max(heightPercent, 10)}%` }} 
                      className={cn(
                        "w-full rounded-t transition-all",
                        count > 0 
                          ? isToday
                            ? "bg-gradient-to-t from-blue-600 to-cyan-500 shadow-xs"
                            : "bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300"
                          : (isLight ? "bg-slate-200" : "bg-slate-800/40")
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 1: Visão Linha do Tempo Visual (Gantt) & Visão Matriz Limpa */}
        {(viewMode === 'timeline' || viewMode === 'grid') && (
          <div className={cn("overflow-auto flex-1 relative touch-pan-x touch-pan-y", isLight ? "bg-white" : "bg-slate-950")}>
            {/* Mobile swipe indicator */}
            <div className={cn(
              "md:hidden px-3 py-1 border-b text-[10px] font-bold flex items-center justify-between sticky top-0 z-30",
              isLight ? "bg-slate-100/90 border-slate-200 text-slate-700" : "bg-slate-900/90 border-slate-800 text-slate-300"
            )}>
              <span className={cn("flex items-center gap-1.5", isLight ? "text-blue-900" : "text-cyan-300")}>
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
                Deslize a linha do tempo ↔
              </span>
              <span className={cn(
                "text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border",
                isLight ? "bg-white border-slate-200 text-slate-600" : "bg-slate-800 border-slate-700 text-slate-400"
              )}>
                14x14
              </span>
            </div>

            <table className="w-full border-collapse text-xs text-center min-w-max select-none">
              <thead className="sticky top-0 z-30 shadow-xs select-none">
                {/* Row 0: Month & Year Banner Grouping */}
                <tr className={cn(
                  "font-black text-xs tracking-widest uppercase border-b transition-colors duration-200",
                  isLight 
                    ? "bg-slate-100 text-blue-900 border-slate-200" 
                    : "bg-slate-900/95 backdrop-blur-md text-cyan-300 border-slate-800"
                )}>
                  <th colSpan={1} className={cn(
                    "sticky left-0 z-40 px-3 py-2 text-left border-r w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate md:hidden",
                    isLight 
                      ? "bg-slate-100 text-blue-900 border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" 
                      : "bg-slate-900 text-cyan-300 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    EQUIPE
                  </th>
                  <th colSpan={3} className={cn(
                    "hidden md:table-cell sticky left-0 z-40 px-4 py-2 text-left border-r w-[400px] min-w-[400px]",
                    isLight 
                      ? "bg-slate-100 text-blue-900 border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" 
                      : "bg-slate-900 text-cyan-300 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                      <span>PERÍODO & OPERAÇÃO</span>
                    </div>
                  </th>
                  {monthGroups.map((mg, idx) => (
                    <th 
                      key={idx} 
                      colSpan={mg.count} 
                      className={cn(
                        "border-r px-3 py-2 text-center font-black tracking-widest text-xs",
                        isLight
                          ? "bg-gradient-to-r from-blue-50 via-slate-100 to-blue-50 text-blue-900 border-slate-200"
                          : "bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 text-cyan-200 border-slate-800/80"
                      )}
                    >
                      {mg.monthLabel}
                    </th>
                  ))}
                </tr>

                {/* Row 1: Date formatted like 8-Aug */}
                <tr className={cn(
                  "border-b font-bold transition-colors duration-200",
                  isLight ? "bg-slate-50 text-slate-800 border-slate-200" : "bg-slate-900/90 text-slate-200 border-slate-800"
                )}>
                  <th className={cn(
                    "md:hidden sticky left-0 z-40 border-r border-b px-3 py-1.5 w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate text-left uppercase text-[9px] font-black",
                    isLight ? "bg-slate-50 border-slate-200 text-slate-700 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 border-slate-800 text-slate-300 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    COLABORADOR
                  </th>

                  <th className={cn(
                    "hidden md:table-cell sticky left-0 z-40 border-r border-b px-3 py-1.5 w-48 min-w-[192px] max-w-[192px] text-left uppercase text-xs font-extrabold",
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 border-slate-800 text-slate-300 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    NOME
                  </th>
                  <th className={cn(
                    "hidden md:table-cell sticky left-48 z-40 border-r border-b px-2 py-1.5 w-36 min-w-[144px] max-w-[144px] text-left uppercase text-xs font-extrabold",
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 border-slate-800 text-slate-300 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    FUNÇÃO
                  </th>
                  <th className={cn(
                    "hidden md:table-cell sticky left-84 z-40 border-r border-b px-2 py-1.5 w-16 min-w-[64px] max-w-[64px] text-center uppercase text-xs font-extrabold",
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 border-slate-800 text-slate-300 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                  )}>
                    TURMA
                  </th>

                  {/* Day Date Headers */}
                  {daysInfo.map((d) => {
                    const isToday = d.dateStr === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <th 
                        key={d.dateStr} 
                        className={cn(
                          "px-1 py-1 font-extrabold text-[11px] min-w-[42px] border-r",
                          isLight ? "border-slate-200" : "border-slate-800/40",
                          isToday 
                            ? (isLight ? "bg-blue-100 text-blue-900 font-black" : "bg-cyan-500/20 text-cyan-300 font-black") 
                            : (isLight ? "text-slate-700" : "text-slate-300")
                        )}
                      >
                        {format(d.date, 'd-MMM', { locale: ptBR })}
                      </th>
                    );
                  })}
                </tr>


                {/* Row 2: Day of Week */}
                <tr className={cn("border-b font-medium", isLight ? "bg-white text-slate-500 border-slate-200" : "bg-slate-950 text-slate-400 border-slate-800")}>
                  <th className={cn("sticky left-0 z-40 border-r border-b md:hidden w-32 min-w-[128px] max-w-[128px]", isLight ? "bg-white border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-950 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}></th>
                  <th className={cn("hidden md:table-cell sticky left-0 z-40 border-r border-b w-48 min-w-[192px] max-w-[192px]", isLight ? "bg-white border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-950 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}></th>
                  <th className={cn("hidden md:table-cell sticky left-48 z-40 border-r border-b w-36 min-w-[144px] max-w-[144px]", isLight ? "bg-white border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-950 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}></th>
                  <th className={cn("hidden md:table-cell sticky left-84 z-40 border-r border-b w-16 min-w-[64px] max-w-[64px]", isLight ? "bg-white border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-950 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}></th>
                  {daysInfo.map((d) => {
                    const dayName = format(d.date, 'EEEE', { locale: ptBR });
                    const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
                    return (
                      <th 
                        key={d.dateStr} 
                        className={cn(
                          "px-0.5 py-1 text-[10px] uppercase font-bold truncate max-w-[40px] border-r",
                          isLight ? "border-slate-200" : "border-slate-800/40",
                          isWeekend 
                            ? (isLight ? "bg-blue-50 text-blue-800 font-black" : "bg-blue-500/10 text-cyan-300 font-black") 
                            : (isLight ? "text-slate-400" : "text-slate-500")
                        )}
                        title={dayName}
                      >
                        {dayName.substring(0, 3)}
                      </th>
                    );
                  })}
                </tr>

                {/* Row 3: Week Number Banner Grouping */}
                <tr className={cn("border-b text-[10px] font-black tracking-wider uppercase", isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-900/80 text-slate-300 border-slate-800")}>
                  <th colSpan={1} className={cn("md:hidden sticky left-0 z-40 border-r px-2 py-1 text-left w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate", isLight ? "bg-slate-100 text-blue-900 border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 text-cyan-300 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}>
                    CRONO
                  </th>
                  <th colSpan={3} className={cn("hidden md:table-cell sticky left-0 z-40 border-r px-3 py-1 text-left w-[400px] min-w-[400px]", isLight ? "bg-slate-100 text-blue-900 border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 text-cyan-300 border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}>
                    ROTAÇÃO 14x14
                  </th>
                  {weekGroups.map((wg, idx) => (
                    <th 
                      key={idx} 
                      colSpan={wg.count} 
                      className={cn("border-r px-1 py-1 font-bold", isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-900 text-slate-300 border-slate-800/80")}
                    >
                      SEM {wg.weekNum}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className={cn("divide-y transition-colors duration-200", isLight ? "bg-white divide-slate-200" : "bg-slate-950 divide-slate-800/40")}>
                {filteredCollaborators.length === 0 ? (
                  <tr>
                    <td colSpan={4 + daysInfo.length} className="py-12 text-center text-slate-500 font-medium">
                      Nenhum colaborador corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredCollaborators.map((colab, index) => {
                    const row = grid[colab.id];
                    const turmaObj = turmas?.find(t => t.id === colab.turmaId);
                    const turmaLetter = getTurmaLetterForCollaborator(colab, turmas);
                    const turmaStyle = TURMA_STYLES[turmaLetter] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: `Turma ${turmaLetter}` };
                    
                    const colabBaseDate = colab.startDate || turmaObj?.baseDate || '';
                    const colabEmbarqueDay = getDayNameFromDateStr(colabBaseDate);

                    const isNewRole = index === 0 || colab.role !== filteredCollaborators[index - 1].role;

                    return (
                      <Fragment key={colab.id}>
                        {isNewRole && (
                          <tr key={`role-group-${colab.role}`} className={cn("border-t-2 border-b font-bold", isLight ? "bg-slate-100/90 text-slate-900 border-slate-200" : "bg-slate-900/90 text-slate-200 border-slate-800/80")}>
                            <td className={cn("md:hidden sticky left-0 z-20 px-2 py-2 text-left font-black tracking-wider uppercase text-[11px] w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate", isLight ? "bg-slate-100 text-blue-900 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 text-cyan-400 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}>
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", isLight ? "bg-blue-600" : "bg-cyan-400")}></span>
                                <span className="font-extrabold truncate">{colab.role}</span>
                              </div>
                            </td>
                            <td colSpan={daysInfo.length} className={cn("md:hidden px-2 py-2 text-left text-[11px] font-medium", isLight ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-slate-400")}>
                              (Equipe Ativa)
                            </td>

                            <td colSpan={3} className={cn("hidden md:table-cell sticky left-0 z-20 px-4 py-2 text-left font-black tracking-wider uppercase text-xs w-[400px] min-w-[400px]", isLight ? "bg-slate-100 text-slate-900 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" : "bg-slate-900 text-cyan-300 shadow-[4px_0_15px_rgba(0,0,0,0.6)]")}>
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", isLight ? "bg-blue-600" : "bg-cyan-400")}></span>
                                <span className={cn("font-black", isLight ? "text-slate-900" : "text-white")}>{colab.role}</span>
                                <span className={cn("text-[11px] normal-case font-medium ml-2 px-2 py-0.5 rounded-full border", isLight ? "bg-white text-slate-600 border-slate-300" : "bg-slate-800 text-slate-400 border-slate-700")}>
                                  Escalas Opostas
                                </span>
                              </div>
                            </td>
                            <td colSpan={daysInfo.length} className={cn("hidden md:table-cell px-4 py-2 text-left text-xs font-medium", isLight ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-slate-400")}>
                              (Linha do Tempo Visual de Embarque)
                            </td>
                          </tr>
                        )}
                        <tr key={colab.id} className={cn("transition-all group", isLight ? "hover:bg-slate-50/80" : "hover:bg-slate-900/80")}>
                          {/* Mobile Single Combined Fixed Column */}
                          <td
                            className={cn(
                              "md:hidden sticky left-0 border-r px-2 py-2 w-32 min-w-[128px] max-w-[128px] overflow-hidden text-left z-20 font-bold cursor-pointer transition-colors",
                              isLight 
                                ? "bg-white group-hover:bg-slate-50 border-slate-200 text-slate-900 shadow-[2px_0_8px_rgba(0,0,0,0.04)] hover:text-blue-700" 
                                : "bg-slate-950 group-hover:bg-slate-900 border-slate-800/80 text-slate-100 shadow-[4px_0_15px_rgba(0,0,0,0.6)] hover:text-cyan-300"
                            )}
                            title={`Clique para editar ${colab.name}`}
                            onClick={() => setEditingCollaborator(colab)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-6 h-6 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 border", isLight ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-800 text-cyan-300 border-slate-700")}>
                                {getInitials(colab.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={cn("w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-black", isLight ? "text-slate-900" : "text-white")} title={colab.name}>
                                  {getShortName(colab.name)}
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5 overflow-hidden">
                                  <span className={cn("text-[9px] truncate flex-1 min-w-0 font-medium", isLight ? "text-slate-500" : "text-slate-400")}>{colab.role}</span>
                                  <span className={cn("text-[9px] font-black px-1 py-0 rounded border shrink-0 leading-none", turmaStyle.bg, turmaStyle.text, turmaStyle.border)}>
                                    T-{turmaLetter}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Desktop 3 Fixed Columns */}
                          <td 
                            className={cn(
                              "hidden md:table-cell sticky left-0 border-r px-3 py-2.5 w-48 min-w-[192px] max-w-[192px] text-left z-20 font-bold truncate cursor-pointer transition-colors",
                              isLight 
                                ? "bg-white group-hover:bg-slate-50 border-slate-200 text-slate-900 shadow-[2px_0_8px_rgba(0,0,0,0.04)] hover:text-blue-700" 
                                : "bg-slate-950 group-hover:bg-slate-900 border-slate-800/80 text-slate-100 shadow-[4px_0_15px_rgba(0,0,0,0.6)] hover:text-cyan-300"
                            )}
                            title={`Clique para editar ${colab.name}`}
                            onClick={() => setEditingCollaborator(colab)}
                          >
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn("w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 border shadow-xs", isLight ? "bg-blue-100 text-blue-900 border-blue-200" : "bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-300 border-slate-700")}>
                                  {getInitials(colab.name)}
                                </div>
                                <span className={cn("truncate text-xs font-bold", isLight ? "text-slate-900" : "text-slate-100")}>{colab.name}</span>
                              </div>
                              <Edit3 className={cn("w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", isLight ? "text-slate-400 group-hover:text-blue-700" : "text-slate-500 group-hover:text-cyan-300")} />
                            </div>
                          </td>

                          <td className={cn(
                            "hidden md:table-cell sticky left-48 border-r px-3 py-2.5 w-36 min-w-[144px] max-w-[144px] text-left z-20 text-xs font-medium truncate",
                            isLight 
                              ? "bg-white group-hover:bg-slate-50 border-slate-200 text-slate-600 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" 
                              : "bg-slate-950 group-hover:bg-slate-900 border-slate-800/80 text-slate-400 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                          )} title={colab.role}>
                            {colab.role}
                          </td>
                          <td className={cn(
                            "hidden md:table-cell sticky left-84 border-r px-1 py-1.5 w-16 min-w-[64px] max-w-[64px] text-center z-20",
                            isLight 
                              ? "bg-white group-hover:bg-slate-50 border-slate-200 shadow-[2px_0_8px_rgba(0,0,0,0.04)]" 
                              : "bg-slate-950 group-hover:bg-slate-900 border-slate-800/80 shadow-[4px_0_15px_rgba(0,0,0,0.6)]"
                          )}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn("px-1.5 py-0.5 rounded-md border text-[10px] font-black leading-none", turmaStyle.bg, turmaStyle.text, turmaStyle.border)}>
                                T-{turmaLetter}
                              </span>
                              {colabEmbarqueDay && (
                                <span className={cn(
                                  "text-[9px] font-extrabold px-1 py-0.2 rounded border",
                                  isLight 
                                    ? "text-amber-900 bg-amber-50 border-amber-200" 
                                    : "text-amber-300 bg-amber-950/60 border-amber-500/30"
                                )}>
                                  {colabEmbarqueDay}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Day Cells Rendered as Continuous Shift Tracks or Modern Grid Badges */}
                          {daysInfo.map((d, i) => {
                            const cell = row ? row[d.dateStr] : null;
                            if (!cell) return <td key={d.dateStr} className="p-0.5"></td>;
                            const style = STATUS_STYLES[cell.status];
                            
                            // Check contiguous block for Gantt/Timeline styling
                            const prevCell = i > 0 ? row[daysInfo[i - 1].dateStr] : null;
                            const nextCell = i < daysInfo.length - 1 ? row[daysInfo[i + 1].dateStr] : null;

                            const isSamePrev = prevCell && prevCell.status === cell.status;
                            const isSameNext = nextCell && nextCell.status === cell.status;

                            const isStatusBlock = cell.status !== 'Folga';

                            // Rounding caps for timeline track
                            let capClass = 'rounded-md';
                            if (viewMode === 'timeline' && isStatusBlock) {
                              if (!isSamePrev && isSameNext) capClass = 'rounded-l-lg border-l-2 border-white/30';
                              else if (isSamePrev && isSameNext) capClass = 'rounded-none';
                              else if (isSamePrev && !isSameNext) capClass = 'rounded-r-lg border-r-2 border-white/30';
                              else capClass = 'rounded-lg';
                            }

                            return (
                              <td 
                                key={d.dateStr} 
                                className="p-[1px] relative cursor-pointer select-none transition-all hover:z-30 hover:scale-105"
                                onClick={() => setSelectedCell({ cell, collaboratorName: colab.name })}
                                title={`${colab.name} - ${format(d.date, 'dd/MM/yyyy')}: ${cell.status}${cell.event?.motive ? ` (${cell.event.motive})` : ''}`}
                              >
                                <div className={cn(
                                  "w-full h-8 flex items-center justify-center transition-all text-xs font-black relative overflow-hidden",
                                  capClass,
                                  style?.bg
                                )}>
                                  {cell.status === 'Folga' ? (
                                    <span className={isLight ? "text-slate-300 font-bold text-[10px]" : "text-slate-800 font-bold text-[10px]"}>•</span>
                                  ) : (
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter px-0.5 truncate text-white drop-shadow-xs leading-none">
                                      {style?.shortLabel || cell.status}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Subtotal Row - Total da equipe embarcada */}
              <tfoot className={cn(
                "sticky bottom-0 z-30 font-black border-t-2 shadow-xs transition-colors duration-200",
                isLight 
                  ? "bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white border-blue-400" 
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white border-cyan-400/50 shadow-[0_-10px_25px_rgba(6,182,212,0.3)]"
              )}>
                <tr>
                  <td colSpan={1} className="md:hidden sticky left-0 bg-blue-600 border-r border-blue-700 px-3 py-2.5 font-black text-left z-40 text-[11px] uppercase tracking-tight shadow-md w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate text-white">
                    POB DIA
                  </td>
                  <td colSpan={3} className="hidden md:table-cell sticky left-0 bg-blue-600 border-r border-blue-700 px-4 py-2.5 font-black text-left z-40 text-xs tracking-wider shadow-md uppercase w-[400px] min-w-[400px] max-w-[400px] truncate text-white">
                    <div className="flex items-center gap-2">
                      <Anchor className="w-4 h-4 text-cyan-300" />
                      <span>POB TOTAL EMBARCADO DIÁRIO</span>
                    </div>
                  </td>
                  {daysInfo.map(d => (
                    <td key={d.dateStr} className="px-1 py-2.5 font-black text-xs sm:text-sm text-white">
                      {pobCounts[d.dateStr]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* View Mode 2: Quadro por Turma (Board View) */}
        {viewMode === 'board' && (
          <div className={cn("p-4 overflow-y-auto flex-1 transition-colors duration-200", isLight ? "bg-white" : "bg-slate-950")}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const style = TURMA_STYLES[letter] || TURMA_STYLES['A'];
                const teamCollaborators = filteredCollaborators.filter(c => {
                  return getTurmaLetterForCollaborator(c, turmas) === letter;
                });
                const tId = `turma-${letter.toLowerCase()}`;

                // Count active on board today
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const activeOnBoard = teamCollaborators.filter(c => {
                  const cell = grid[c.id]?.[todayStr];
                  return cell?.status === 'Escala' || cell?.status === 'Dobra';
                }).length;

                const isEmbarcada = activeOnBoard > 0;

                return (
                  <div key={tId} className={cn(
                    "border rounded-2xl p-4 flex flex-col gap-3 shadow-xs transition-colors duration-200",
                    isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900 border-slate-800 shadow-xl"
                  )}>
                    {/* Turma Header */}
                    <div className={cn("flex items-center justify-between border-b pb-3", isLight ? "border-slate-200" : "border-slate-800")}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border", style.bg, style.text, style.border)}>
                          {letter}
                        </div>
                        <div>
                          <h3 className={cn("font-extrabold text-sm", isLight ? "text-slate-900" : "text-white")}>{style.label}</h3>
                          <span className={cn("text-[10px] font-medium", isLight ? "text-slate-500" : "text-slate-400")}>{teamCollaborators.length} Integrantes</span>
                        </div>
                      </div>

                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        isEmbarcada 
                          ? (isLight ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-cyan-500/20 text-cyan-300 border-cyan-400/40")
                          : (isLight ? "bg-slate-200 text-slate-600 border-slate-300" : "bg-slate-800 text-slate-400 border-slate-700")
                      )}>
                        {isEmbarcada ? 'Embarcada (Offshore)' : 'Em Folga'}
                      </div>
                    </div>

                    {/* Turma Stats */}
                    <div className={cn("p-2.5 rounded-xl border flex items-center justify-between text-xs", isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800/80")}>
                      <span className={isLight ? "text-slate-600 font-medium" : "text-slate-400 font-medium"}>POB Hoje (Embarcados):</span>
                      <strong className={isLight ? "text-blue-700 font-black text-sm" : "text-cyan-300 font-black text-sm"}>{activeOnBoard} / {teamCollaborators.length}</strong>
                    </div>

                    {/* Member Cards */}
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1">
                      {teamCollaborators.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-xs italic">Nenhum integrante nesta turma.</div>
                      ) : (
                        teamCollaborators.map((c) => {
                          const todayCell = grid[c.id]?.[todayStr];
                          const statusStyle = todayCell ? STATUS_STYLES[todayCell.status] : null;

                          return (
                            <div 
                              key={c.id} 
                              onClick={() => setEditingCollaborator(c)}
                              className={cn(
                                "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group",
                                isLight 
                                  ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs" 
                                  : "bg-slate-950 border-slate-800/80 hover:border-slate-700 shadow-sm"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn("w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 border", isLight ? "bg-blue-100 text-blue-900 border-blue-200" : "bg-slate-800 text-cyan-300 border-slate-700")}>
                                  {getInitials(c.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className={cn("font-extrabold text-xs truncate transition-colors", isLight ? "text-slate-900 group-hover:text-blue-700" : "text-white group-hover:text-cyan-300")}>{c.name}</div>
                                  <div className={cn("text-[10px] font-medium truncate", isLight ? "text-slate-500" : "text-slate-400")}>{c.role}</div>
                                </div>
                              </div>

                              {statusStyle && (
                                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black shrink-0", statusStyle.bg)}>
                                  {todayCell?.status}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 4: Visão Mensal (Calendário do Mês) */}
        {viewMode === 'month' && (
          <div className={cn("p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 transition-colors duration-200", isLight ? "bg-white" : "bg-slate-950")}>
            {/* Header / Summary stats for current month */}
            <div className={cn(
              "p-4 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3",
              isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white shadow-xl"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black shadow-md shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight capitalize">
                    {format(startMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <p className={cn("text-xs font-medium", isLight ? "text-slate-500" : "text-slate-400")}>
                    Visão Geral e Calendário de Rotação Offshore
                  </p>
                </div>
              </div>

              {/* Monthly Overview Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2", isLight ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30")}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Média POB: {
                    Math.round(
                      daysInfo
                        .filter(d => d.date.getMonth() === startMonth.getMonth())
                        .reduce((acc, d) => acc + (pobCounts[d.dateStr] || 0), 0) / Math.max(1, getDaysInMonth(startMonth))
                    )
                  } Mecânicos/Dia</span>
                </div>

                <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2", isLight ? "bg-blue-50 text-blue-900 border-blue-200" : "bg-blue-950/60 text-cyan-300 border-blue-500/30")}>
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>{collaborators.length} Colaboradores Cadastrados</span>
                </div>
              </div>
            </div>

            {/* Monthly Calendar Grid */}
            <div className={cn("border rounded-2xl p-3 sm:p-4 space-y-3", isLight ? "bg-slate-50/50 border-slate-200" : "bg-slate-900/60 border-slate-800")}>
              {/* Day Headers (Seg - Dom) */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'].map((dayName, idx) => (
                  <div 
                    key={dayName}
                    className={cn(
                      "py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg border",
                      idx >= 5 
                        ? (isLight ? "bg-amber-50/80 text-amber-900 border-amber-200/80" : "bg-amber-950/40 text-amber-300 border-amber-500/20")
                        : (isLight ? "bg-white text-slate-700 border-slate-200" : "bg-slate-950 text-slate-300 border-slate-800")
                    )}
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Padding cells before start of month */}
                {Array.from({ length: (startOfMonth(startMonth).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className={cn("min-h-[100px] rounded-xl border border-dashed opacity-30", isLight ? "border-slate-300 bg-slate-100/50" : "border-slate-800 bg-slate-950/50")} />
                ))}

                {/* Days of current month */}
                {daysInfo
                  .filter(d => d.date.getMonth() === startMonth.getMonth())
                  .map((d) => {
                    const pob = pobCounts[d.dateStr] || 0;
                    const isToday = format(d.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;

                    // Calculate status breakdown on this day
                    let embarcados = 0;
                    let dobras = 0;
                    let ferias = 0;
                    let atestados = 0;
                    let treinamentos = 0;
                    let noshows = 0;

                    collaborators.forEach(c => {
                      const status = grid[c.id]?.[d.dateStr]?.status;
                      if (status === 'Escala') embarcados++;
                      else if (status === 'Dobra') dobras++;
                      else if (status === 'Férias') ferias++;
                      else if (status === 'Exame Médico') atestados++;
                      else if (status === 'Treinamento') treinamentos++;
                      else if (status === 'No Show') noshows++;
                    });

                    return (
                      <div
                        key={d.dateStr}
                        onClick={() => {
                          setSelectedDailyDateStr(d.dateStr);
                          setViewMode('daily');
                        }}
                        className={cn(
                          "min-h-[100px] sm:min-h-[115px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md group relative overflow-hidden",
                          isToday
                            ? (isLight ? "bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20" : "bg-blue-950/60 border-cyan-400 ring-2 ring-cyan-500/30")
                            : isWeekend
                              ? (isLight ? "bg-slate-100/70 border-slate-200" : "bg-slate-950/70 border-slate-800/80")
                              : (isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-slate-950 border-slate-800 hover:border-slate-700")
                        )}
                      >
                        {/* Day Card Top Bar */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn(
                            "w-6 h-6 rounded-full font-black text-xs flex items-center justify-center",
                            isToday
                              ? "bg-blue-600 text-white shadow-xs"
                              : isLight ? "bg-slate-100 text-slate-800" : "bg-slate-800 text-slate-200"
                          )}>
                            {format(d.date, 'd')}
                          </span>

                          {pob > 0 && (
                            <span className={cn(
                              "text-[10px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 shrink-0",
                              isLight ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                            )}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              POB: {pob}
                            </span>
                          )}
                        </div>

                        {/* Status Badges Preview for Day */}
                        <div className="space-y-1 my-1">
                          {embarcados > 0 && (
                            <div className="flex items-center justify-between text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate">
                              <span>Embarque:</span>
                              <strong>{embarcados}</strong>
                            </div>
                          )}

                          {dobras > 0 && (
                            <div className="flex items-center justify-between text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 truncate">
                              <span>Dobra:</span>
                              <strong>{dobras}</strong>
                            </div>
                          )}

                          {ferias > 0 && (
                            <div className="flex items-center justify-between text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20 truncate">
                              <span>Férias:</span>
                              <strong>{ferias}</strong>
                            </div>
                          )}

                          {(atestados > 0 || treinamentos > 0 || noshows > 0) && (
                            <div className="flex items-center justify-between text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 truncate">
                              <span>Outros:</span>
                              <strong>{atestados + treinamentos + noshows}</strong>
                            </div>
                          )}
                        </div>

                        {/* Action hint at bottom of card */}
                        <div className={cn("text-[9px] font-bold text-center transition-colors group-hover:text-blue-600 dark:group-hover:text-cyan-400", isLight ? "text-slate-400" : "text-slate-500")}>
                          Ver Diário &rarr;
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        {viewMode === 'daily' && (
          <div className={cn("p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 transition-colors duration-200", isLight ? "bg-white" : "bg-slate-950")}>
            {/* Day Selector */}
            <div className={cn("border p-3 sm:p-4 rounded-xl shadow-xs flex items-center justify-between gap-3", isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800 shadow-lg")}>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
                <span className={cn("text-xs sm:text-sm font-extrabold", isLight ? "text-slate-900" : "text-white")}>Selecione o Dia de Operação:</span>
              </div>
              <input
                type="date"
                value={selectedDailyDateStr}
                onChange={(e) => setSelectedDailyDateStr(e.target.value)}
                className={cn("border rounded-xl px-3 py-1.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer", isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-cyan-300")}
              />
            </div>

            {/* POB Summary Banner for Selected Day */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between border border-blue-400">
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest text-blue-100">POB TOTAL EMBARCADO (OFFSHORE)</div>
                <div className="text-sm sm:text-base font-black mt-0.5 text-white capitalize">
                  {format(new Date(selectedDailyDateStr + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
              <div className={cn("px-4 py-2 rounded-xl text-xl font-black border shadow-xs", isLight ? "bg-white text-blue-900 border-blue-200" : "bg-slate-950 text-cyan-300 border-slate-800")}>
                {pobCounts[selectedDailyDateStr] ?? 0} <span className={cn("text-[10px] font-bold uppercase", isLight ? "text-slate-500" : "text-slate-300")}>Pessoas</span>
              </div>
            </div>

            {/* Collaborator Daily Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCollaborators.length === 0 ? (
                <div className={cn("col-span-full p-8 text-center text-xs rounded-xl border", isLight ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-slate-900 text-slate-500 border-slate-800")}>
                  Nenhum colaborador encontrado com os filtros atuais.
                </div>
              ) : (
                filteredCollaborators.map((colab) => {
                  const row = grid[colab.id];
                  const cell = row ? row[selectedDailyDateStr] : null;
                  if (!cell) return null;
                  const style = STATUS_STYLES[cell.status];
                  const turmaLetter = colab.turmaId.replace('turma-', '').toUpperCase();
                  const turmaStyle = TURMA_STYLES[turmaLetter] ?? { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };

                  return (
                    <div 
                      key={colab.id}
                      onClick={() => setSelectedCell({ cell, collaboratorName: colab.name })}
                      className={cn(
                        "p-3.5 rounded-xl border shadow-xs flex items-center justify-between gap-3 active:scale-98 transition-all cursor-pointer",
                        isLight ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50" : "bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn("w-10 h-10 rounded-full font-black text-xs flex items-center justify-center shrink-0 border", isLight ? "bg-blue-100 text-blue-900 border-blue-200" : "bg-slate-800 text-cyan-300 border-slate-700")}>
                          {getInitials(colab.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-extrabold text-xs sm:text-sm truncate", isLight ? "text-slate-900" : "text-white")}>{colab.name}</span>
                            <span className={cn("text-[9px] font-black px-1.5 py-0.2 rounded border shrink-0", turmaStyle.bg, turmaStyle.text, turmaStyle.border)}>
                              TURMA {turmaLetter}
                            </span>
                          </div>
                          <div className={cn("text-xs mt-0.5 flex items-center gap-2 font-medium", isLight ? "text-slate-500" : "text-slate-400")}>
                            <span>{colab.role}</span>
                            {cell.isOverride && (
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", isLight ? "bg-blue-50 text-blue-800 border-blue-200" : "text-cyan-300 bg-cyan-500/10 border-cyan-500/30")}>
                                Sobrescrito
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black shrink-0 flex items-center gap-1.5 shadow-xs",
                        style.bg
                      )}>
                        <span>{cell.status}</span>
                        {cell.event?.motive && (
                          <span className="text-[10px] opacity-80 font-normal">({cell.event.motive})</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {selectedCell && (
        <EventSidebar 
          cell={selectedCell.cell} 
          collaboratorName={selectedCell.collaboratorName}
          onClose={() => setSelectedCell(null)} 
        />
      )}

      {editingCollaborator && (
        <EditCollaboratorModal
          collaborator={editingCollaborator}
          onClose={() => setEditingCollaborator(null)}
        />
      )}
    </>
  );
}


