import { useState } from 'react';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { Button } from '../components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Users } from 'lucide-react';
import { format, addMonths, subMonths, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { ScheduleSkeleton } from '../components/ui/Skeleton';

const STATUS_LEGEND = [
  { key: 'escala', label: 'Escala', sample: '1', color: 'var(--status-escala)' },
  { key: 'dobra', label: 'Dobra', sample: '1', color: 'var(--status-dobra)' },
  { key: 'ferias', label: 'Férias', sample: 'FÉR', color: 'var(--status-ferias)' },
  { key: 'exame', label: 'Atestado / Exame', sample: 'ATE', color: 'var(--status-exame)' },
  { key: 'treino', label: 'Treinamento', sample: 'TRE', color: 'var(--status-treinamento)' },
  { key: 'noshow', label: 'No Show', sample: '1', color: 'var(--status-noshow)' },
  { key: 'folga', label: 'Folga', sample: '·', color: 'var(--status-folga)' },
] as const;

export default function SchedulePage() {
  const { isLight } = useTheme();
  const { collaborators, loading } = useData();
  const [startMonth, setStartMonth] = useState(() => startOfToday());
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [showLegendMobile, setShowLegendMobile] = useState(false);

  if (loading) {
    return <ScheduleSkeleton />;
  }

  const activeCollaboratorsCount = collaborators.filter((c) => c.active !== false).length;

  const nextMonth = () => setStartMonth((prev) => addMonths(prev, 1));
  const prevMonth = () => setStartMonth((prev) => subMonths(prev, 1));
  const nextPeriod = () => setStartMonth((prev) => addMonths(prev, monthsCount));
  const prevPeriod = () => setStartMonth((prev) => subMonths(prev, monthsCount));
  const goToToday = () => setStartMonth(startOfToday());

  const controlBtn = cn(
    'flex h-8 items-center justify-center rounded-lg border px-2 transition-colors',
    isLight
      ? 'border-[var(--app-border)] bg-white text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]'
      : 'border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
  );

  return (
    <div className="mx-auto flex min-h-full max-w-[1700px] flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      {/* Toolbar — one job: navigate the schedule */}
      <div className="app-surface flex flex-col gap-3 rounded-2xl p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl">
            Escala
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
            <Users className="size-3.5 shrink-0 text-[var(--app-accent)]" />
            {activeCollaboratorsCount} mecânicos ativos · ciclo 14×14
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={cn(
              'flex items-center gap-1 overflow-x-auto rounded-xl border p-1 scrollbar-none',
              'border-[var(--app-border)] bg-[var(--app-surface-muted)]',
            )}
          >
            <span className="shrink-0 px-2 text-[10px] font-semibold tracking-wide text-[var(--app-text-faint)] uppercase">
              Visão
            </span>
            {[1, 3, 6, 12, 18, 24].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMonthsCount(count)}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  monthsCount === count
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
                )}
              >
                {count === 1 ? '1M' : `${count}M`}
              </button>
            ))}
          </div>

          <div
            className={cn(
              'flex items-center gap-1 rounded-xl border p-1',
              'border-[var(--app-border)] bg-[var(--app-surface-muted)]',
            )}
          >
            <button type="button" className={controlBtn} onClick={prevPeriod} title={`Voltar ${monthsCount} meses`}>
              <ChevronLeft className="size-3.5" />
              <ChevronLeft className="-ml-2 size-3.5" />
            </button>
            <button type="button" className={controlBtn} onClick={prevMonth} title="Mês anterior">
              <ChevronLeft className="size-3.5" />
            </button>

            <div className="flex min-w-[120px] items-center justify-center gap-1.5 px-2 text-[13px] font-semibold capitalize sm:min-w-[160px]">
              <CalendarIcon className="size-3.5 shrink-0 text-[var(--app-accent)]" />
              <span className="truncate">
                {monthsCount === 1
                  ? format(startMonth, "MMMM 'de' yyyy", { locale: ptBR })
                  : `${format(startMonth, 'MMM/yy', { locale: ptBR })} – ${format(addMonths(startMonth, monthsCount - 1), 'MMM/yy', { locale: ptBR })}`}
              </span>
            </div>

            <button type="button" className={controlBtn} onClick={nextMonth} title="Próximo mês">
              <ChevronRight className="size-3.5" />
            </button>
            <button type="button" className={controlBtn} onClick={nextPeriod} title={`Avançar ${monthsCount} meses`}>
              <ChevronRight className="size-3.5" />
              <ChevronRight className="-ml-2 size-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <input
              type="month"
              value={format(startMonth, 'yyyy-MM')}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setStartMonth(new Date(year, month - 1, 1));
                }
              }}
              className={cn(
                'h-8 cursor-pointer rounded-lg border px-2 text-xs font-semibold',
                'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--app-accent-soft)]',
              )}
              title="Ir para mês/ano"
            />
            <button
              type="button"
              onClick={goToToday}
              className="h-8 rounded-lg bg-[var(--app-accent)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--app-accent-hover)]"
            >
              Hoje
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegendMobile((prev) => !prev)}
              className="gap-1 border border-[var(--app-border)] md:hidden"
            >
              <Info className="size-3.5" />
              Legenda
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ScheduleGrid startMonth={startMonth} monthsCount={monthsCount} />
      </div>

      <div
        className={cn(
          'app-surface shrink-0 rounded-2xl p-3 text-xs',
          showLegendMobile ? 'block' : 'hidden md:block',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-[var(--app-text-faint)] uppercase">
            <Info className="size-3.5 text-[var(--app-accent)]" />
            Legenda
          </span>
          {STATUS_LEGEND.map((item) => (
            <div
              key={item.key}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1"
            >
              <div
                className="flex h-5 min-w-6 items-center justify-center rounded-md px-1 text-[9px] font-bold text-white"
                style={{ background: item.color }}
              >
                {item.sample}
              </div>
              <span className="text-[12px] font-medium text-[var(--app-text)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
