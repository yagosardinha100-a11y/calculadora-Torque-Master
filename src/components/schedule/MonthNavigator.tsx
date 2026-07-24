import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { formatMonthTitle } from '@/utils/dates'

interface MonthNavigatorProps {
  month: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function MonthNavigator({ month, onPrevious, onNext, onToday }: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Mês anterior"
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
      >
        <ChevronLeftIcon className="size-5" />
      </button>
      <h2 className="min-w-40 text-center text-base font-semibold text-slate-900">
        {formatMonthTitle(month)}
      </h2>
      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo mês"
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
      >
        <ChevronRightIcon className="size-5" />
      </button>
      <Button variant="secondary" size="sm" onClick={onToday} className="ml-2">
        Hoje
      </Button>
    </div>
  )
}
