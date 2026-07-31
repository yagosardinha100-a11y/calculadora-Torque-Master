export const PAGE_IDS = ['escala', 'colaboradores', 'configuracoes'] as const

export type PageId = (typeof PAGE_IDS)[number]

export const PAGE_PATHS: Record<PageId, string> = {
  escala: '/escala',
  colaboradores: '/colaboradores',
  configuracoes: '/configuracoes',
}

export function pageFromPath(pathname: string): PageId {
  if (pathname.startsWith('/colaboradores')) return 'colaboradores'
  if (pathname.startsWith('/configuracoes')) return 'configuracoes'
  return 'escala'
}
