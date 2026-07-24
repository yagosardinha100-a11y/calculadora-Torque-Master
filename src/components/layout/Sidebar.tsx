import type { ComponentType, SVGProps } from 'react'
import {
  AnchorIcon,
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
} from '@/components/icons'
import type { PageId } from '@/types/navigation'
import { cn } from '@/utils/cn'

interface NavItem {
  id: PageId
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'escala', label: 'Escala', icon: CalendarIcon },
  { id: 'colaboradores', label: 'Colaboradores', icon: UsersIcon },
  { id: 'configuracoes', label: 'Configurações', icon: SettingsIcon },
]

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <AnchorIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Escala Mecânica</p>
          <p className="truncate text-xs text-slate-400">Navio de Perfuração</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3" aria-label="Menu principal">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === currentPage
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs leading-relaxed text-slate-500">
          Escala 14x14 · Dados armazenados localmente no navegador
        </p>
      </div>
    </aside>
  )
}

interface MobileNavProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

/** Navegação compacta exibida em telas pequenas, abaixo do cabeçalho. */
export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  return (
    <nav
      className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 py-2 md:hidden"
      aria-label="Menu principal"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === currentPage
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
