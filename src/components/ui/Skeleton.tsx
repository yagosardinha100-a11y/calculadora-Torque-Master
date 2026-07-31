import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

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

export function LoadingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
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

export function ScheduleSkeleton() {
  const { isLight } = useTheme();

  return (
    <div className="p-2 sm:p-4 min-h-full flex flex-col max-w-[1700px] mx-auto gap-3 animate-fade-in">
      {/* Operations Command Banner Skeleton */}
      <div className={cn(
        "rounded-xl p-3 sm:p-4 border shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 sm:w-64" />
            <Skeleton className="h-4 w-32 sm:w-44" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Grid Controls Skeleton */}
      <div className={cn(
        "rounded-xl p-3 border shadow-xs flex flex-col sm:flex-row justify-between gap-3",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Schedule Grid Matrix Skeleton */}
      <div className={cn(
        "rounded-xl border shadow-sm overflow-hidden flex-1 p-3 space-y-3",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        {/* Table Header Row Skeleton */}
        <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          <Skeleton className="h-6 w-48 shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1 rounded" />
            ))}
          </div>
        </div>

        {/* Collaborator Rows Skeleton */}
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="w-48 shrink-0 flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
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
  const { isLight } = useTheme();

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner Skeleton */}
      <div className={cn(
        "rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-11 w-48 rounded-xl shrink-0" />
      </div>

      {/* Filters & Search Skeleton */}
      <div className={cn(
        "p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl p-5 border shadow-sm space-y-4",
              isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
  const { isLight } = useTheme();

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Title Header Skeleton */}
      <div className={cn(
        "rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>

      {/* Form Card Skeleton */}
      <div className={cn(
        "p-6 rounded-2xl border shadow-sm space-y-4",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <Skeleton className="h-5 w-44 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Collaborator List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <div
                  key={itemIndex}
                  className={cn(
                    "p-4 rounded-xl border shadow-xs flex items-center justify-between gap-3",
                    isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
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
  const { isLight } = useTheme();

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className={cn(
        "rounded-2xl p-6 border shadow-sm flex items-center gap-3",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className={cn(
        "p-6 rounded-2xl border shadow-sm space-y-4",
        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
