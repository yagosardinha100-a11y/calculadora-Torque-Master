import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps {
  className?: string
  children: ReactNode
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}
