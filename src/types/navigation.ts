export const PAGE_IDS = ['escala', 'colaboradores', 'configuracoes'] as const

export type PageId = (typeof PAGE_IDS)[number]
