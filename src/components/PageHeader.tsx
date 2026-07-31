import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'app-surface animate-rise flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--app-text)] sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-[var(--app-text-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
