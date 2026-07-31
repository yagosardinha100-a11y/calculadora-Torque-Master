import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface StorageBannerProps {
  mode: 'memory' | 'indexeddb'
}

/** Aviso quando o app usa fallback em memória (padrão Grok). */
export function StorageBanner({ mode }: StorageBannerProps) {
  if (mode !== 'memory') return null

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs',
        'border-amber-200 bg-amber-50 text-amber-900',
      )}
      role="status"
    >
      <span>
        IndexedDB indisponível — dados salvos em armazenamento alternativo do navegador.
        Exporte backup periodicamente.
      </span>
    </div>
  )
}

interface AppLayoutWithBannerProps {
  storageMode: 'memory' | 'indexeddb'
  children: ReactNode
}

export function AppLayoutWithBanner({ storageMode, children }: AppLayoutWithBannerProps) {
  return (
    <>
      <StorageBanner mode={storageMode} />
      {children}
    </>
  )
}
