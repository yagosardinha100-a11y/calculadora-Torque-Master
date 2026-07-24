import { STATUS_CONFIG, STATUS_ORDER } from '@/constants/status'
import { cn } from '@/utils/cn'

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status]
        return (
          <span key={status} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={cn('size-3 rounded-sm', config.dotClass)} />
            {config.label}
          </span>
        )
      })}
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        <span className="size-2 rounded-full bg-indigo-500" />
        Outro compromisso
      </span>
    </div>
  )
}
