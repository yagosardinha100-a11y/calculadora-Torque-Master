import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PageShell({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto space-y-4 p-3 sm:space-y-5 sm:p-6',
        wide ? 'max-w-7xl' : 'max-w-6xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="app-surface flex flex-col justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[13px] text-[var(--app-text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="app-surface flex items-center gap-3.5 rounded-2xl p-4">
      {icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--app-text-faint)] uppercase">
          {label}
        </p>
        <p className="font-display text-lg font-semibold text-[var(--app-text)]">{value}</p>
        {hint ? <p className="text-[11px] text-[var(--app-text-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SectionSurface({
  children,
  className,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={cn('app-surface overflow-hidden rounded-2xl', className)}>
      {title ? (
        <div className="flex flex-col gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-[12px] font-semibold tracking-wider text-[var(--app-text)] uppercase">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] text-[var(--app-text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1 block text-[12px] font-semibold text-[var(--app-text)]">
      {children}
      {hint ? <span className="ml-1 font-normal text-[var(--app-text-faint)]">{hint}</span> : null}
    </label>
  );
}

export function EmptyTableRow({ colSpan, title, hint }: { colSpan: number; title: string; hint?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--app-text-muted)]">{title}</p>
        {hint ? <p className="mt-1 text-[12px] text-[var(--app-text-faint)]">{hint}</p> : null}
      </td>
    </tr>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[11px] font-semibold tracking-wider text-[var(--app-text-muted)] uppercase">
      {children}
    </thead>
  );
}

export function ModalShell({
  title,
  icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div
        className={cn(
          'app-surface flex w-full flex-col gap-4 rounded-2xl p-5',
          wide ? 'max-w-lg' : 'max-w-md',
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-display text-[15px] font-semibold text-[var(--app-text)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--app-text-faint)] transition-colors hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
            aria-label="Fechar"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
