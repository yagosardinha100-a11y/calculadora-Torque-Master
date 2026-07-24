import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full resize-y rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm',
        'ring-1 ring-inset ring-slate-300 placeholder:text-slate-400',
        'focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
