import type { ReactNode } from 'react'
import { AnchorIcon } from '@/components/icons'
import { MobileNav, Sidebar } from '@/components/layout/Sidebar'
import type { PageId } from '@/types/navigation'

interface AppLayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="flex h-full">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho compacto apenas no mobile */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <AnchorIcon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Escala Mecânica</p>
            <p className="text-[11px] text-slate-400">Navio de Perfuração</p>
          </div>
        </header>
        <MobileNav currentPage={currentPage} onNavigate={onNavigate} />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
