import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  key?: React.Key;
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--app-border)]/70 transition-colors duration-200',
        className,
      )}
      {...props}
    />
  );
}

export function LoadingSpinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }[size];

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-[var(--app-accent)]',
        sizeClasses,
        className,
      )}
      role="status"
      aria-label="Carregando..."
    >
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

const panel =
  'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm';

export function ScheduleSkeleton() {
  return (
    <div className="mx-auto flex min-h-full max-w-[1700px] flex-col gap-3 p-2 animate-fade-in sm:p-4">
      <div className={cn(panel, 'flex flex-col items-stretch justify-between gap-3 p-3 sm:p-4 lg:flex-row lg:items-center')}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 sm:w-64" />
            <Skeleton className="h-4 w-32 sm:w-44" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      <div className={cn(panel, 'flex flex-col justify-between gap-3 p-3 sm:flex-row')}>
        <Skeleton className="h-9 w-full rounded-lg sm:w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className={cn(panel, 'flex-1 space-y-3 overflow-hidden p-3')}>
        <div className="flex items-center gap-2 border-b border-[var(--app-border)] pb-3">
          <Skeleton className="h-6 w-48 shrink-0" />
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1 rounded" />
            ))}
          </div>
        </div>

        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-2 border-b border-[var(--app-border)]/60 py-1.5"
          >
            <div className="flex w-48 shrink-0 items-center gap-2">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
              {Array.from({ length: 14 }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-9 flex-1 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VacationSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 animate-fade-in sm:p-6">
      <div className={cn(panel, 'flex flex-col items-start justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center')}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-11 w-48 shrink-0 rounded-xl" />
      </div>

      <div className={cn(panel, 'flex flex-col items-center justify-between gap-3 p-4 sm:flex-row')}>
        <Skeleton className="h-10 w-full rounded-lg sm:w-80" />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(panel, 'space-y-4 p-5')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2 border-t border-[var(--app-border)] pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollaboratorsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 animate-fade-in sm:p-6">
      <div className={cn(panel, 'flex flex-col items-start justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center')}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>

      <div className={cn(panel, 'space-y-4 rounded-2xl p-6')}>
        <Skeleton className="mb-3 h-5 w-44" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <div
                  key={itemIndex}
                  className={cn(panel, 'flex items-center justify-between gap-3 p-4')}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 animate-fade-in sm:p-6">
      <div className={cn(panel, 'flex items-center gap-3 rounded-2xl p-6')}>
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className={cn(panel, 'space-y-4 rounded-2xl p-6')}>
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
