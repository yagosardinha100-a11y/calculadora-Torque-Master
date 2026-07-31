import { Fragment, useMemo, useState } from 'react';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../data/DataProvider';
import { sortCollaborators, resolveDayStatus, isOnboardStatus, getTurmaLetterForCollaborator } from '../domain';
import type { Collaborator, ScheduleEvent, Status } from '../domain/types';
import EventSidebar from './EventSidebar';
import { cn } from '../lib/utils';

const STATUS_STYLE: Record<Status, { bg: string; label: string }> = {
  Escala: { bg: 'var(--status-escala)', label: 'E' },
  Dobra: { bg: 'var(--status-dobra)', label: 'D' },
  Férias: { bg: 'var(--status-ferias)', label: 'FÉR' },
  Treinamento: { bg: 'var(--status-treinamento)', label: 'TRE' },
  'Exame Médico': { bg: 'var(--status-exame)', label: 'ATE' },
  'No Show': { bg: 'var(--status-noshow)', label: 'NS' },
  Folga: { bg: 'transparent', label: '' },
};

const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildDays(startMonth: Date, monthsCount: number): Date[] {
  const days: Date[] = [];
  for (let m = 0; m < monthsCount; m++) {
    const mo = addMonths(startMonth, m);
    days.push(...eachDayOfInterval({ start: startOfMonth(mo), end: endOfMonth(mo) }));
  }
  return days;
}

function dateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isFirstDayOfBlock(
  colabId: string,
  dayIdx: number,
  days: Date[],
  status: Status,
  resolveCell: (colabId: string, day: Date) => Status,
): boolean {
  if (status === 'Folga') return false;
  if (dayIdx === 0) return true;
  return resolveCell(colabId, days[dayIdx - 1]) !== status;
}

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

  const days = useMemo(() => buildDays(startMonth, monthsCount), [startMonth, monthsCount]);

  const sorted = useMemo(() => {
    let list = collaborators.filter((c) => c.active !== false);
    if (searchName.trim()) {
      const q = searchName.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filterRole) list = list.filter((c) => c.role === filterRole);
    return sortCollaborators(list, turmas);
  }, [collaborators, turmas, searchName, filterRole]);

  const eventsByColab = useMemo(() => {
    const m = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const arr = m.get(e.collaboratorId) ?? [];
      arr.push(e);
      m.set(e.collaboratorId, arr);
    }
    return m;
  }, [events]);

  const resolveCell = (colabId: string, day: Date): Status => {
    const colab = sorted.find((c) => c.id === colabId);
    if (!colab) return 'Folga';
    const turma = turmas.find((t) => t.id === colab.turmaId) ?? null;
    return resolveDayStatus(dateStr(day), colab, turma, eventsByColab.get(colabId) ?? []).status;
  };

  const monthBoundaries = useMemo(() => {
    const map = new Map<number, string>();
    let lastMonth = '';
    days.forEach((d, i) => {
      const lbl = format(d, 'MMM/yy', { locale: ptBR });
      if (lbl !== lastMonth) {
        map.set(i, lbl);
        lastMonth = lbl;
      }
    });
    return map;
  }, [days]);

  const pobCounts = useMemo(() => {
    return days.map((d) => {
      let count = 0;
      for (const colab of sorted) {
        if (isOnboardStatus(resolveCell(colab.id, d))) count++;
      }
      return count;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, sorted, eventsByColab, turmas]);

  const groups = useMemo(() => {
    const g = new Map<string, Collaborator[]>();
    for (const c of sorted) {
      const arr = g.get(c.role) ?? [];
      arr.push(c);
      g.set(c.role, arr);
    }
    return g;
  }, [sorted]);

  const handleCellClick = (colab: Collaborator, day: Date) => {
    const ds = dateStr(day);
    const hit =
      (eventsByColab.get(colab.id) ?? []).find((e) => ds >= e.startDate && ds <= e.endDate) ?? null;
    setSidebar({ collaborator: colab, date: ds, event: hit });
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="font-display text-base font-semibold text-[var(--app-text)]">
          Nenhum colaborador ativo
        </p>
        <p className="text-[13px] text-[var(--app-text-muted)]">
          Adicione pessoas em Colaboradores para montar a matriz.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-max border-separate border-spacing-0 text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ minWidth: 240, width: 240 }} />
            {days.map((_, i) => (
              <col key={i} style={{ minWidth: 52, width: 52 }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th
                className="sticky top-0 left-0 z-40 px-3 py-2.5 text-left text-[12px] font-bold tracking-wide text-[var(--app-accent)] uppercase"
                style={{
                  background: 'var(--app-surface-muted)',
                  borderBottom: '1px solid var(--app-border)',
                  borderRight: '1px solid var(--app-border)',
                }}
              >
                Colaborador
              </th>
              {days.map((d, i) => {
                const monthLabel = monthBoundaries.get(i);
                const today = isToday(d);
                return (
                  <th
                    key={i}
                    className="sticky top-0 z-30 px-0 py-1.5 text-center"
                    style={{
                      background: today ? 'var(--app-accent)' : 'var(--app-surface-muted)',
                      color: today ? '#fff' : 'var(--app-text-muted)',
                      borderBottom: '1px solid var(--app-border)',
                      borderLeft: monthLabel ? '2px solid var(--app-accent)' : undefined,
                    }}
                  >
                    {monthLabel && (
                      <div className={cn('mb-0.5 text-[11px] leading-none font-bold tracking-wide uppercase', today ? 'text-white/90' : 'text-[var(--app-accent)]')}>
                        {monthLabel}
                      </div>
                    )}
                    <div className="text-[13px] leading-tight font-bold">{format(d, 'dd')}</div>
                    <div className={cn('text-[10px] leading-none font-semibold', today ? 'text-white/75' : 'text-[var(--app-text-faint)]')}>
                      {WEEKDAY[getDay(d)]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Array.from(groups.entries()).map(([role, colabs]) => (
              <Fragment key={`role-${role}`}>
                <tr>
                  <td
                    colSpan={days.length + 1}
                    className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-[var(--app-accent)] uppercase"
                    style={{
                      background: 'var(--app-surface-muted)',
                      borderBottom: '1px solid var(--app-border)',
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[var(--app-accent)]" />
                      {role}
                      <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-0.5 text-[10px] font-semibold tracking-normal text-[var(--app-text-muted)] normal-case">
                        {colabs.length}
                      </span>
                    </span>
                  </td>
                </tr>

                {colabs.map((colab) => {
                  const letter = getTurmaLetterForCollaborator(colab, turmas);
                  return (
                    <tr key={colab.id} className="group hover:bg-[var(--app-surface-muted)]/60">
                      <td
                        className="sticky left-0 z-20 px-2.5 py-1.5"
                        style={{
                          background: 'var(--app-surface)',
                          borderBottom: '1px solid var(--app-border)',
                          borderRight: '1px solid var(--app-border)',
                          boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-accent-soft)] text-[10px] font-bold text-[var(--app-accent)]">
                            {initials(colab.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-semibold text-[var(--app-text)]" title={colab.name}>
                              {colab.name}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="truncate text-[10px] text-[var(--app-text-muted)]">{colab.role}</span>
                              <span className="shrink-0 rounded border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-1 py-px text-[9px] font-bold text-[var(--app-text-muted)]">
                                T-{letter}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {days.map((d, i) => {
                        const status = resolveCell(colab.id, d);
                        const cfg = STATUS_STYLE[status];
                        const showLabel = isFirstDayOfBlock(colab.id, i, days, status, resolveCell);
                        const isFirstOfMonth = monthBoundaries.has(i);
                        const today = isToday(d);
                        const prevSame =
                          i > 0 && status !== 'Folga' && resolveCell(colab.id, days[i - 1]) === status;
                        const nextSame =
                          i < days.length - 1 &&
                          status !== 'Folga' &&
                          resolveCell(colab.id, days[i + 1]) === status;

                        let radius = 'rounded-md';
                        if (status !== 'Folga') {
                          if (!prevSame && nextSame) radius = 'rounded-l-md rounded-r-none';
                          else if (prevSame && nextSame) radius = 'rounded-none';
                          else if (prevSame && !nextSame) radius = 'rounded-r-md rounded-l-none';
                          else radius = 'rounded-md';
                        }

                        return (
                          <td
                            key={i}
                            className="cursor-pointer p-px select-none"
                            style={{
                              borderBottom: '1px solid var(--app-border)',
                              borderLeft: isFirstOfMonth ? '2px solid var(--app-accent)' : undefined,
                              background: today ? 'var(--app-accent-soft)' : undefined,
                            }}
                            onClick={() => handleCellClick(colab, d)}
                            title={`${colab.name} — ${format(d, 'dd/MM/yyyy')} — ${status}`}
                          >
                            <div
                              className={cn(
                                'flex h-11 min-h-11 w-full items-center justify-center overflow-hidden transition-opacity hover:opacity-90',
                                radius,
                              )}
                              style={{
                                background:
                                  status === 'Folga'
                                    ? today
                                      ? 'rgba(31,111,106,0.08)'
                                      : 'transparent'
                                    : cfg.bg,
                              }}
                            >
                              {status === 'Folga' ? (
                                <span
                                  className="inline-block size-1.5 rounded-full"
                                  style={{ background: 'var(--status-folga)', opacity: 0.55 }}
                                />
                              ) : showLabel ? (
                                <span className="text-[10px] leading-none font-bold tracking-tight text-white">
                                  {cfg.label}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}

            <tr>
              <td
                className="sticky left-0 z-20 px-3 py-2 text-[11px] font-bold tracking-wide text-[var(--app-header-text)] uppercase"
                style={{
                  background: 'var(--app-header)',
                  borderTop: '2px solid var(--app-accent)',
                  borderRight: '1px solid var(--app-border-strong)',
                }}
              >
                POB diário
              </td>
              {pobCounts.map((count, i) => (
                <td
                  key={i}
                  className="px-0 py-2 text-center text-[11px] font-bold"
                  style={{
                    background: 'var(--app-header)',
                    color: count > 0 ? 'var(--app-accent)' : 'rgba(232,238,242,0.35)',
                    borderTop: '2px solid var(--app-accent)',
                    borderLeft: monthBoundaries.has(i) ? '1px solid var(--app-border-strong)' : undefined,
                  }}
                >
                  {count || '·'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

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
