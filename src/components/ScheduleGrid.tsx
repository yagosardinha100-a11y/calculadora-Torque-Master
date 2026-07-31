import { useMemo, useState } from 'react';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../data/DataProvider';
import { sortCollaborators, resolveDayStatus, isOnboardStatus } from '../domain';
import type { Collaborator, ScheduleEvent, Status } from '../domain/types';
import EventSidebar from './EventSidebar';

/* ─────────────────────── status config ─────────────────────── */

const STATUS_STYLE: Record<Status, { bg: string; label: string }> = {
  Escala:        { bg: 'var(--status-escala)',      label: 'E'   },
  Dobra:         { bg: 'var(--status-dobra)',       label: 'D'   },
  Férias:        { bg: 'var(--status-ferias)',      label: 'FÉR' },
  Treinamento:   { bg: 'var(--status-treinamento)', label: 'TRE' },
  'Exame Médico':{ bg: 'var(--status-exame)',       label: 'ATE' },
  'No Show':     { bg: 'var(--status-noshow)',      label: 'NS'  },
  Folga:         { bg: 'transparent',               label: ''    },
};

/* ─────────────────────── helpers ─────────────────────── */

function buildDays(startMonth: Date, monthsCount: number): Date[] {
  const days: Date[] = [];
  for (let m = 0; m < monthsCount; m++) {
    const mo = addMonths(startMonth, m);
    days.push(...eachDayOfInterval({ start: startOfMonth(mo), end: endOfMonth(mo) }));
  }
  return days;
}

function fmtDay(d: Date): string {
  return format(d, 'dd');
}

function fmtMonthHeader(d: Date): string {
  return format(d, 'MMM/yy', { locale: ptBR });
}

function dateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/* For short label: show only on first day of a contiguous same-status block */
function isFirstDayOfBlock(
  colabId: string,
  dayIdx: number,
  days: Date[],
  status: Status,
  resolveCell: (colabId: string, day: Date) => Status
): boolean {
  if (status === 'Folga') return false;
  if (dayIdx === 0) return true;
  const prev = resolveCell(colabId, days[dayIdx - 1]);
  return prev !== status;
}

/* ─────────────────────── component ─────────────────────── */

interface ScheduleGridProps {
  startMonth: Date;
  monthsCount: number;
  searchName: string;
  filterRole: string;
}

export default function ScheduleGrid({
  startMonth,
  monthsCount,
  searchName,
  filterRole,
}: ScheduleGridProps) {
  const { collaborators, turmas, events } = useData();

  const [sidebar, setSidebar] = useState<{
    collaborator: Collaborator;
    date: string;
    event: ScheduleEvent | null;
  } | null>(null);

  /* Build day list */
  const days = useMemo(() => buildDays(startMonth, monthsCount), [startMonth, monthsCount]);

  /* Filter & sort collaborators */
  const sorted = useMemo(() => {
    let list = collaborators.filter(c => c.active !== false);
    if (searchName.trim()) {
      const q = searchName.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    if (filterRole) {
      list = list.filter(c => c.role === filterRole);
    }
    return sortCollaborators(list, turmas);
  }, [collaborators, turmas, searchName, filterRole]);

  /* Events indexed by collaboratorId */
  const eventsByColab = useMemo(() => {
    const m = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const arr = m.get(e.collaboratorId) ?? [];
      arr.push(e);
      m.set(e.collaboratorId, arr);
    }
    return m;
  }, [events]);

  /* Resolve cell status */
  const resolveCell = (colabId: string, day: Date): Status => {
    const colab = sorted.find(c => c.id === colabId);
    if (!colab) return 'Folga';
    const turma = turmas.find(t => t.id === colab.turmaId) ?? null;
    const colabEvents = eventsByColab.get(colabId) ?? [];
    return resolveDayStatus(dateStr(day), colab, turma, colabEvents).status;
  };

  /* Month boundary markers */
  const monthBoundaries = useMemo(() => {
    const map = new Map<number, string>();
    let lastMonth = '';
    days.forEach((d, i) => {
      const lbl = fmtMonthHeader(d);
      if (lbl !== lastMonth) {
        map.set(i, lbl);
        lastMonth = lbl;
      }
    });
    return map;
  }, [days]);

  /* POB counts per day */
  const pobCounts = useMemo(() => {
    return days.map(d => {
      let count = 0;
      for (const colab of sorted) {
        const st = resolveCell(colab.id, d);
        if (isOnboardStatus(st)) count++;
      }
      return count;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, sorted, eventsByColab, turmas]);

  /* Click handler */
  const handleCellClick = (colab: Collaborator, day: Date) => {
    const ds = dateStr(day);
    const colabEvents = eventsByColab.get(colab.id) ?? [];
    const hit = colabEvents.find(e => ds >= e.startDate && ds <= e.endDate) ?? null;
    setSidebar({ collaborator: colab, date: ds, event: hit });
  };

  /* Group by role */
  const groups = useMemo(() => {
    const g = new Map<string, Collaborator[]>();
    for (const c of sorted) {
      const arr = g.get(c.role) ?? [];
      arr.push(c);
      g.set(c.role, arr);
    }
    return g;
  }, [sorted]);

  if (days.length === 0) return null;

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Table scroll container */}
      <div className="flex-1 overflow-auto">
        <table className="border-separate border-spacing-0 text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ minWidth: 160, width: 160 }} />
            {days.map((_, i) => <col key={i} style={{ minWidth: 36, width: 36 }} />)}
          </colgroup>

          {/* Month header row */}
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 text-left px-2 py-1 text-xs font-semibold"
                style={{ background: 'var(--app-header)', color: 'var(--app-header-text)', borderBottom: '1px solid var(--app-border)' }}
              >
                Colaborador
              </th>
              {days.map((d, i) => {
                const monthLabel = monthBoundaries.get(i);
                const today = isToday(d);
                return (
                  <th
                    key={i}
                    className="sticky top-0 z-20 text-center py-0.5"
                    style={{
                      background: today ? 'var(--app-accent)' : 'var(--app-header)',
                      color: today ? '#fff' : 'var(--app-header-text)',
                      borderBottom: '1px solid var(--app-border)',
                      borderLeft: monthLabel ? '1px solid var(--app-border-strong)' : undefined,
                    }}
                  >
                    {monthLabel && (
                      <div className="text-[9px] opacity-60 leading-none">{monthLabel}</div>
                    )}
                    <div className="leading-none text-[10px]">{fmtDay(d)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Array.from(groups.entries()).map(([role, colabs]) => (
              <>
                {/* Role group header */}
                <tr key={`role-${role}`}>
                  <td
                    colSpan={days.length + 1}
                    className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: 'var(--app-bg-accent)', color: 'var(--app-text-muted)', borderBottom: '1px solid var(--app-border)' }}
                  >
                    {role}
                  </td>
                </tr>

                {colabs.map(colab => (
                  <tr key={colab.id} className="group">
                    {/* Sticky name column */}
                    <td
                      className="sticky left-0 z-10 px-2 py-0.5 text-xs truncate max-w-[160px]"
                      style={{
                        background: 'var(--app-surface)',
                        borderBottom: '1px solid var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    >
                      {colab.name}
                    </td>

                    {/* Day cells */}
                    {days.map((d, i) => {
                      const status = resolveCell(colab.id, d);
                      const cfg = STATUS_STYLE[status];
                      const showLabel = isFirstDayOfBlock(colab.id, i, days, status, resolveCell);
                      const isFirstOfMonth = monthBoundaries.has(i);
                      const today = isToday(d);

                      return (
                        <td
                          key={i}
                          className="cursor-pointer select-none"
                          style={{
                            height: 36,
                            minWidth: 36,
                            background: status === 'Folga'
                              ? (today ? 'rgba(47,145,138,0.08)' : 'transparent')
                              : cfg.bg,
                            borderBottom: '1px solid var(--app-border)',
                            borderLeft: isFirstOfMonth ? '1px solid var(--app-border-strong)' : '1px solid transparent',
                            outline: today ? '1px solid var(--app-accent)' : undefined,
                            outlineOffset: '-1px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            position: 'relative',
                          }}
                          onClick={() => handleCellClick(colab, d)}
                          title={`${colab.name} — ${format(d, 'dd/MM/yyyy')} — ${status}`}
                        >
                          {status === 'Folga' ? (
                            <span
                              className="inline-block h-1 w-1 rounded-full"
                              style={{ background: 'var(--status-folga)', opacity: 0.5 }}
                            />
                          ) : showLabel ? (
                            <span
                              className="text-[9px] font-bold leading-none"
                              style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                            >
                              {cfg.label}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}

            {/* POB footer row */}
            <tr>
              <td
                className="sticky left-0 z-10 px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: 'var(--app-surface-muted)',
                  color: 'var(--app-text-muted)',
                  borderTop: '2px solid var(--app-border-strong)',
                }}
              >
                POB
              </td>
              {pobCounts.map((count, i) => (
                <td
                  key={i}
                  className="text-center text-[10px] font-bold"
                  style={{
                    background: 'var(--app-surface-muted)',
                    borderTop: '2px solid var(--app-border-strong)',
                    borderLeft: monthBoundaries.has(i) ? '1px solid var(--app-border-strong)' : undefined,
                    color: count > 0 ? 'var(--status-escala)' : 'var(--app-text-faint)',
                  }}
                >
                  {count || ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Event sidebar */}
      {sidebar && (
        <EventSidebar
          collaborator={sidebar.collaborator}
          date={sidebar.date}
          event={sidebar.event}
          onClose={() => setSidebar(null)}
        />
      )}
    </div>
  );
}
