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
  Edit3, Search, Calendar, LayoutGrid, Anchor, 
  ShieldCheck, Users, Sparkles, Activity, BarChart2, ChevronDown
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

const SECONDARY_VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'board', label: 'Turmas' },
  { value: 'daily', label: 'Diário' },
  { value: 'month', label: 'Mensal' },
];

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
      <div className="flex flex-col items-center justify-center h-64 text-[var(--app-text-muted)] bg-[var(--app-surface-muted)] border border-[var(--app-border)] rounded-xl p-6 gap-3">
        <Users className="w-10 h-10 text-[var(--app-accent)]" />
        <p className="text-sm font-semibold text-[var(--app-text)]">Nenhum colaborador ativo encontrado.</p>
        <span className="text-xs text-[var(--app-text-faint)]">Adicione colaboradores na aba "Colaboradores" para gerar a matriz.</span>
      </div>
    );
  }

  const isSecondaryView = viewMode === 'board' || viewMode === 'daily' || viewMode === 'month';

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
      <div className="flex-1 border border-[var(--app-border)] rounded-xl shadow-xs overflow-hidden flex flex-col relative font-sans bg-[var(--app-surface)] transition-colors duration-200">
        
        {/* Modern Command & View Mode Selector Header */}
        <div className="px-3 sm:px-4 py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between text-xs gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-text)]">
          {/* Interactive View Mode Selector */}
          <div className="flex items-center gap-2 flex-wrap w-full justify-start md:justify-start">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] text-xs">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'timeline' 
                    ? "bg-[var(--app-accent)] text-white shadow-xs font-black" 
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
                )}
                title="Linha do Tempo Visual de Embarque (Gantt)"
              >
                <Activity className="w-4 h-4" />
                <span>Linha do Tempo</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
                  viewMode === 'grid' 
                    ? "bg-[var(--app-accent)] text-white shadow-xs font-black" 
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
                )}
                title="Visão Matriz Limpa"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Matriz</span>
              </button>

              <div className="relative">
                <select
                  value={isSecondaryView ? viewMode : ''}
                  onChange={(e) => {
                    const next = e.target.value as ViewMode;
                    if (next) setViewMode(next);
                  }}
                  className={cn(
                    "appearance-none pl-3 pr-7 py-1.5 rounded-lg font-bold text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)] border border-transparent transition-all",
                    isSecondaryView
                      ? "bg-[var(--app-accent)] text-white shadow-xs font-black"
                      : "text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
                  )}
                  title="Outras visualizações"
                >
                  <option value="" disabled hidden>Mais</option>
                  {SECONDARY_VIEWS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
                  isSecondaryView ? "text-white" : "text-[var(--app-text-muted)]"
                )} />
              </div>
            </div>

            <button
              onClick={() => setShowPobChart(prev => !prev)}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all select-none active:scale-95 hidden sm:flex cursor-pointer",
                showPobChart 
                  ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-border)] shadow-xs" 
                  : "bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
              )}
              title="Alternar Gráfico POB"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[var(--app-accent)]" />
              <span>Gráfico POB</span>
            </button>

            <div className="text-xs px-3 py-1.5 rounded-xl border border-[var(--app-border)] font-bold shrink-0 bg-[var(--app-surface)] text-[var(--app-text-muted)]">
              Integrantes: <strong className="text-[var(--app-accent)] font-black">{filteredCollaborators.length}</strong>/{collaborators.length}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-2 sm:p-2.5 border-b border-[var(--app-border)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 text-xs bg-[var(--app-surface-muted)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--app-text-faint)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar colaborador ou função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)] border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] placeholder:text-[var(--app-text-faint)]"
              />
            </div>
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-1 shrink-0 justify-between sm:justify-end">
            <span className="text-[10px] uppercase font-bold sm:hidden text-[var(--app-text-muted)]">Função:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="border border-[var(--app-border)] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)] w-full sm:w-auto cursor-pointer bg-[var(--app-surface)] text-[var(--app-text)]"
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
          <div className="border-b border-[var(--app-border)] p-2.5 sm:p-3 overflow-x-auto scrollbar-none bg-[var(--app-surface)]">
            <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase font-extrabold tracking-wider">
              <span className="flex items-center gap-1.5 font-bold text-[var(--app-accent)]">
                <BarChart2 className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                Curva de POB Embarcado Diário
              </span>
              <span className="font-medium text-[var(--app-text-muted)]">
                Pico Máximo: <strong className="text-[var(--app-text)]">{maxPob} Pessoas</strong>
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
                        ? "bg-[var(--app-accent-soft)]" 
                        : "hover:bg-[var(--app-surface-muted)]"
                    )}
                    title={`${format(d.date, 'dd/MM/yyyy')}: POB de ${count} pessoas`}
                  >
                    <div 
                      style={{ height: `${Math.max(heightPercent, 10)}%` }} 
                      className={cn(
                        "w-full rounded-t transition-all",
                        count > 0 
                          ? isToday
                            ? "bg-[var(--app-accent)] shadow-xs"
                            : "bg-[var(--app-accent)]/70 group-hover:bg-[var(--app-accent)]"
                          : "bg-[var(--app-border)]"
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
          <div className="overflow-auto flex-1 relative touch-pan-x touch-pan-y bg-[var(--app-surface)]">
            {/* Mobile swipe indicator */}
            <div className="md:hidden px-3 py-1 border-b border-[var(--app-border)] text-[10px] font-bold flex items-center justify-between sticky top-0 z-30 bg-[var(--app-surface-muted)] text-[var(--app-text)]">
              <span className="flex items-center gap-1.5 text-[var(--app-accent)]">
                <Sparkles className="w-3 h-3 text-[var(--app-accent)]" />
                Deslize a linha do tempo ↔
              </span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text-muted)]">
                14x14
              </span>
            </div>

            <table className="w-full border-collapse text-xs text-center min-w-max select-none">
              <thead className="sticky top-0 z-30 shadow-xs select-none">
                {/* Row 0: Month & Year Banner Grouping */}
                <tr className="font-black text-xs tracking-widest uppercase border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-accent)]">
                  <th colSpan={1} className="sticky left-0 z-40 px-3 py-2 text-left border-r border-[var(--app-border)] w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate md:hidden bg-[var(--app-surface-muted)] text-[var(--app-accent)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    EQUIPE
                  </th>
                  <th colSpan={3} className="hidden md:table-cell sticky left-0 z-40 px-4 py-2 text-left border-r border-[var(--app-border)] w-[400px] min-w-[400px] bg-[var(--app-surface-muted)] text-[var(--app-accent)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--app-accent)]" />
                      <span>PERÍODO & OPERAÇÃO</span>
                    </div>
                  </th>
                  {monthGroups.map((mg, idx) => (
                    <th 
                      key={idx} 
                      colSpan={mg.count} 
                      className="border-r border-[var(--app-border)] px-3 py-2 text-center font-black tracking-widest text-xs bg-[var(--app-surface-muted)] text-[var(--app-text)]"
                    >
                      {mg.monthLabel}
                    </th>
                  ))}
                </tr>

                {/* Row 1: Date formatted like 8-Aug */}
                <tr className="border-b border-[var(--app-border)] font-bold bg-[var(--app-surface-muted)] text-[var(--app-text)]">
                  <th className="md:hidden sticky left-0 z-40 border-r border-b border-[var(--app-border)] px-3 py-1.5 w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate text-left uppercase text-[9px] font-black bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    COLABORADOR
                  </th>

                  <th className="hidden md:table-cell sticky left-0 z-40 border-r border-b border-[var(--app-border)] px-3 py-1.5 w-48 min-w-[192px] max-w-[192px] text-left uppercase text-xs font-extrabold bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    NOME
                  </th>
                  <th className="hidden md:table-cell sticky left-48 z-40 border-r border-b border-[var(--app-border)] px-2 py-1.5 w-36 min-w-[144px] max-w-[144px] text-left uppercase text-xs font-extrabold bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    FUNÇÃO
                  </th>
                  <th className="hidden md:table-cell sticky left-84 z-40 border-r border-b border-[var(--app-border)] px-2 py-1.5 w-16 min-w-[64px] max-w-[64px] text-center uppercase text-xs font-extrabold bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    TURMA
                  </th>

                  {/* Day Date Headers */}
                  {daysInfo.map((d) => {
                    const isToday = d.dateStr === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <th 
                        key={d.dateStr} 
                        className={cn(
                          "px-1 py-1 font-extrabold text-[11px] min-w-[42px] border-r border-[var(--app-border)]",
                          isToday 
                            ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] font-black" 
                            : "text-[var(--app-text-muted)]"
                        )}
                      >
                        {format(d.date, 'd-MMM', { locale: ptBR })}
                      </th>
                    );
                  })}
                </tr>


                {/* Row 2: Day of Week */}
                <tr className="border-b border-[var(--app-border)] font-medium bg-[var(--app-surface)] text-[var(--app-text-muted)]">
                  <th className="sticky left-0 z-40 border-r border-b border-[var(--app-border)] md:hidden w-32 min-w-[128px] max-w-[128px] bg-[var(--app-surface)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]"></th>
                  <th className="hidden md:table-cell sticky left-0 z-40 border-r border-b border-[var(--app-border)] w-48 min-w-[192px] max-w-[192px] bg-[var(--app-surface)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]"></th>
                  <th className="hidden md:table-cell sticky left-48 z-40 border-r border-b border-[var(--app-border)] w-36 min-w-[144px] max-w-[144px] bg-[var(--app-surface)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]"></th>
                  <th className="hidden md:table-cell sticky left-84 z-40 border-r border-b border-[var(--app-border)] w-16 min-w-[64px] max-w-[64px] bg-[var(--app-surface)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]"></th>
                  {daysInfo.map((d) => {
                    const dayName = format(d.date, 'EEEE', { locale: ptBR });
                    const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
                    return (
                      <th 
                        key={d.dateStr} 
                        className={cn(
                          "px-0.5 py-1 text-[10px] uppercase font-bold truncate max-w-[40px] border-r border-[var(--app-border)]",
                          isWeekend 
                            ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] font-black" 
                            : "text-[var(--app-text-faint)]"
                        )}
                        title={dayName}
                      >
                        {dayName.substring(0, 3)}
                      </th>
                    );
                  })}
                </tr>

                {/* Row 3: Week Number Banner Grouping */}
                <tr className="border-b border-[var(--app-border)] text-[10px] font-black tracking-wider uppercase bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]">
                  <th colSpan={1} className="md:hidden sticky left-0 z-40 border-r border-[var(--app-border)] px-2 py-1 text-left w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate bg-[var(--app-surface-muted)] text-[var(--app-accent)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    CRONO
                  </th>
                  <th colSpan={3} className="hidden md:table-cell sticky left-0 z-40 border-r border-[var(--app-border)] px-3 py-1 text-left w-[400px] min-w-[400px] bg-[var(--app-surface-muted)] text-[var(--app-accent)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                    ROTAÇÃO 14x14
                  </th>
                  {weekGroups.map((wg, idx) => (
                    <th 
                      key={idx} 
                      colSpan={wg.count} 
                      className="border-r border-[var(--app-border)] px-1 py-1 font-bold bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]"
                    >
                      SEM {wg.weekNum}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
                {filteredCollaborators.length === 0 ? (
                  <tr>
                    <td colSpan={4 + daysInfo.length} className="py-12 text-center text-[var(--app-text-muted)] font-medium">
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
                          <tr key={`role-group-${colab.role}`} className="border-t-2 border-b border-[var(--app-border)] font-bold bg-[var(--app-surface-muted)] text-[var(--app-text)]">
                            <td className="md:hidden sticky left-0 z-20 px-2 py-2 text-left font-black tracking-wider uppercase text-[11px] w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate bg-[var(--app-surface-muted)] text-[var(--app-accent)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-[var(--app-accent)]"></span>
                                <span className="font-extrabold truncate">{colab.role}</span>
                              </div>
                            </td>
                            <td colSpan={daysInfo.length} className="md:hidden px-2 py-2 text-left text-[11px] font-medium bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]">
                              (Equipe Ativa)
                            </td>

                            <td colSpan={3} className="hidden md:table-cell sticky left-0 z-20 px-4 py-2 text-left font-black tracking-wider uppercase text-xs w-[400px] min-w-[400px] bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--app-accent)]"></span>
                                <span className="font-black text-[var(--app-text)]">{colab.role}</span>
                                <span className="text-[11px] normal-case font-medium ml-2 px-2 py-0.5 rounded-full border bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]">
                                  Escalas Opostas
                                </span>
                              </div>
                            </td>
                            <td colSpan={daysInfo.length} className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]">
                              (Linha do Tempo Visual de Embarque)
                            </td>
                          </tr>
                        )}
                        <tr key={colab.id} className="transition-all group hover:bg-[var(--app-surface-muted)]">
                          {/* Mobile Single Combined Fixed Column */}
                          <td
                            className="md:hidden sticky left-0 border-r border-[var(--app-border)] px-2 py-2 w-32 min-w-[128px] max-w-[128px] overflow-hidden text-left z-20 font-bold cursor-pointer transition-colors bg-[var(--app-surface)] group-hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)] hover:text-[var(--app-accent)]"
                            title={`Clique para editar ${colab.name}`}
                            onClick={() => setEditingCollaborator(colab)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 border bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-border)]">
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
                            className="hidden md:table-cell sticky left-0 border-r border-[var(--app-border)] px-3 py-2.5 w-48 min-w-[192px] max-w-[192px] text-left z-20 font-bold truncate cursor-pointer transition-colors bg-[var(--app-surface)] group-hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] shadow-[2px_0_8px_rgba(0,0,0,0.04)] hover:text-[var(--app-accent)]"
                            title={`Clique para editar ${colab.name}`}
                            onClick={() => setEditingCollaborator(colab)}
                          >
                            <div className="flex items-center justify-between gap-2 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 border shadow-xs bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-border)]">
                                  {getInitials(colab.name)}
                                </div>
                                <span className="truncate text-xs font-bold text-[var(--app-text)]">{colab.name}</span>
                              </div>
                              <Edit3 className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--app-text-faint)] group-hover:text-[var(--app-accent)]" />
                            </div>
                          </td>

                          <td className="hidden md:table-cell sticky left-48 border-r border-[var(--app-border)] px-3 py-2.5 w-36 min-w-[144px] max-w-[144px] text-left z-20 text-xs font-medium truncate bg-[var(--app-surface)] group-hover:bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]" title={colab.role}>
                            {colab.role}
                          </td>
                          <td className="hidden md:table-cell sticky left-84 border-r border-[var(--app-border)] px-1 py-1.5 w-16 min-w-[64px] max-w-[64px] text-center z-20 bg-[var(--app-surface)] group-hover:bg-[var(--app-surface-muted)] shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
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

                            // Timeline: label only on the first day of a contiguous block
                            const showBlockLabel =
                              viewMode === 'timeline'
                                ? isStatusBlock && !isSamePrev
                                : isStatusBlock;

                            return (
                              <td 
                                key={d.dateStr} 
                                className="p-[1px] relative cursor-pointer select-none transition-all hover:z-30 min-w-[42px] w-[42px]"
                                onClick={() => setSelectedCell({ cell, collaboratorName: colab.name })}
                                title={`${colab.name} - ${format(d.date, 'dd/MM/yyyy')}: ${cell.status}${cell.event?.motive ? ` (${cell.event.motive})` : ''}`}
                              >
                                <div className={cn(
                                  "w-full h-10 min-h-10 flex items-center justify-center transition-all text-xs font-black relative overflow-hidden",
                                  capClass,
                                  style?.bg
                                )}>
                                  {cell.status === 'Folga' ? (
                                    <span className={isLight ? "text-slate-300 font-bold text-[10px]" : "text-slate-800 font-bold text-[10px]"}>•</span>
                                  ) : showBlockLabel ? (
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter px-0.5 truncate text-white drop-shadow-xs leading-none">
                                      {style?.shortLabel || cell.status}
                                    </span>
                                  ) : null}
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
              <tfoot className="sticky bottom-0 z-30 font-black border-t-2 border-[var(--app-accent)] shadow-xs bg-[var(--app-header)] text-[var(--app-header-text)]">
                <tr>
                  <td colSpan={1} className="md:hidden sticky left-0 bg-[var(--app-header)] border-r border-[var(--app-border-strong)] px-3 py-2.5 font-black text-left z-40 text-[11px] uppercase tracking-tight shadow-md w-32 min-w-[128px] max-w-[128px] overflow-hidden truncate text-[var(--app-header-text)]">
                    POB DIA
                  </td>
                  <td colSpan={3} className="hidden md:table-cell sticky left-0 bg-[var(--app-header)] border-r border-[var(--app-border-strong)] px-4 py-2.5 font-black text-left z-40 text-xs tracking-wider shadow-md uppercase w-[400px] min-w-[400px] max-w-[400px] truncate text-[var(--app-header-text)]">
                    <div className="flex items-center gap-2">
                      <Anchor className="w-4 h-4 text-[var(--app-accent)]" />
                      <span>POB TOTAL EMBARCADO DIÁRIO</span>
                    </div>
                  </td>
                  {daysInfo.map(d => (
                    <td key={d.dateStr} className="px-1 py-2.5 font-black text-xs sm:text-sm text-[var(--app-header-text)]">
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
            <div className="bg-[var(--app-header)] text-[var(--app-header-text)] p-4 rounded-xl shadow-md flex items-center justify-between border border-[var(--app-accent)]">
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest text-[var(--app-accent)]">POB TOTAL EMBARCADO (OFFSHORE)</div>
                <div className="text-sm sm:text-base font-black mt-0.5 text-[var(--app-header-text)] capitalize">
                  {format(new Date(selectedDailyDateStr + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl text-xl font-black border shadow-xs bg-[var(--app-surface)] text-[var(--app-accent)] border-[var(--app-border)]">
                {pobCounts[selectedDailyDateStr] ?? 0} <span className="text-[10px] font-bold uppercase text-[var(--app-text-muted)]">Pessoas</span>
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


