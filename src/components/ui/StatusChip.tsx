import type { CSSProperties } from 'react';
import type { Status } from '../../types';
import { cn } from '../../lib/utils';

export const STATUS_META: Record<
  Status,
  { label: string; short: string; color: string }
> = {
  Escala: { label: 'Escala', short: 'E', color: 'var(--status-escala)' },
  Dobra: { label: 'Dobra', short: 'D', color: 'var(--status-dobra)' },
  Folga: { label: 'Folga', short: '·', color: 'var(--status-folga)' },
  Férias: { label: 'Férias', short: 'FÉR', color: 'var(--status-ferias)' },
  Treinamento: { label: 'Treinamento', short: 'TRE', color: 'var(--status-treinamento)' },
  'Exame Médico': { label: 'Atestado / Exame', short: 'ATE', color: 'var(--status-exame)' },
  'No Show': { label: 'No Show', short: 'NS', color: 'var(--status-noshow)' },
};

export function StatusChip({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1',
        className,
      )}
    >
      <span
        className="flex h-5 min-w-6 items-center justify-center rounded-md px-1 text-[9px] font-bold text-white"
        style={{ background: meta.color }}
      >
        {meta.short}
      </span>
      <span className="text-[12px] font-medium text-[var(--app-text)]">{meta.label}</span>
    </span>
  );
}

export function statusCellClass(status: Status): string {
  if (status === 'Folga') {
    return 'bg-slate-100/90 text-slate-400 dark:bg-slate-900/40 dark:text-slate-500';
  }
  return 'text-white font-bold shadow-xs';
}

export function statusCellStyle(status: Status): CSSProperties | undefined {
  if (status === 'Folga') return undefined;
  return { backgroundColor: STATUS_META[status].color };
}
