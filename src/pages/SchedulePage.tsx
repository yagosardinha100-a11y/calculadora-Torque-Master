import { useState } from 'react';
import { addMonths, subMonths, startOfMonth, startOfToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import ScheduleGrid from '../components/ScheduleGrid';
import { useData } from '../data/DataProvider';
import { cn } from '../lib/utils';
import type { Role } from '../domain/types';

const MONTHS_OPTIONS = [1, 3, 6, 12] as const;
type MonthsCount = (typeof MONTHS_OPTIONS)[number];

const ROLES: Role[] = [
  'Supervisor',
  'Chefe Mecânica',
  'Mecânico',
  'Assistente Mecânico',
  'Coordenador',
  'Outros',
];

export default function SchedulePage() {
  const { collaborators, loading } = useData();
  const [startMonth, setStartMonth] = useState(() => startOfMonth(new Date()));
  const [monthsCount, setMonthsCount] = useState<MonthsCount>(3);
  const [searchName, setSearchName] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const activeCount = collaborators.filter((c) => c.active !== false).length;
  const monthLabel = format(startMonth, 'MMMM yyyy', { locale: ptBR });
  const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="mx-auto flex h-full max-w-[1700px] flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="app-surface animate-rise flex flex-col gap-3 rounded-2xl p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl">
            Escala
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
            <Users className="size-3.5 shrink-0 text-[var(--app-accent)]" />
            {loading ? 'Carregando…' : `${activeCount} mecânicos ativos · ciclo 14×14`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1 scrollbar-none">
            <span className="shrink-0 px-2 text-[10px] font-semibold tracking-wide text-[var(--app-text-faint)] uppercase">
              Visão
            </span>
            {MONTHS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMonthsCount(n)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  monthsCount === n
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
                )}
              >
                {n}M
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
            <button
              type="button"
              className="flex h-8 cursor-pointer items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
              onClick={() => setStartMonth((m) => subMonths(m, monthsCount))}
              title={`Voltar ${monthsCount} meses`}
            >
              <ChevronLeft className="size-3.5" />
              <ChevronLeft className="-ml-2 size-3.5" />
            </button>
            <button
              type="button"
              className="flex h-8 cursor-pointer items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
              onClick={() => setStartMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setStartMonth(startOfMonth(startOfToday()))}
              className="min-w-[132px] cursor-pointer rounded-lg px-2 py-1.5 text-center text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface)]"
            >
              {capitalized}
            </button>
            <button
              type="button"
              className="flex h-8 cursor-pointer items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
              onClick={() => setStartMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex h-8 cursor-pointer items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
              onClick={() => setStartMonth((m) => addMonths(m, monthsCount))}
              title={`Avançar ${monthsCount} meses`}
            >
              <ChevronRight className="size-3.5" />
              <ChevronRight className="-ml-2 size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="app-surface animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-col gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] p-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--app-text-faint)]" />
            <input
              type="text"
              placeholder="Buscar colaborador…"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-2 pr-3 pl-8 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:ring-1 focus:ring-[var(--app-accent)] focus:outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[13px] font-medium text-[var(--app-text)] focus:ring-1 focus:ring-[var(--app-accent)] focus:outline-none"
          >
            <option value="">Todas as funções</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScheduleGrid
            startMonth={startMonth}
            monthsCount={monthsCount}
            searchName={searchName}
            filterRole={filterRole}
          />
        </div>
      </div>
    </div>
  );
}
