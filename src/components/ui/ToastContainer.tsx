import { CheckIcon, InfoIcon, XIcon } from '@/components/icons'
import { useToast, type ToastKind } from '@/context/ToastContext'
import { cn } from '@/utils/cn'

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-slate-800 text-white',
}

const KIND_ICONS: Record<ToastKind, typeof CheckIcon> = {
  success: CheckIcon,
  error: XIcon,
  info: InfoIcon,
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = KIND_ICONS[toast.kind]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg',
              KIND_STYLES[toast.kind],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1 leading-snug">{toast.text}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded p-0.5 opacity-80 hover:opacity-100"
              aria-label="Fechar"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
