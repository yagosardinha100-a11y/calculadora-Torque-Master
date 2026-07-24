import { useState } from 'react'
import { AlertTriangleIcon, AnchorIcon } from '@/components/icons'
import { AppLayout } from '@/components/layout/AppLayout'
import { DataProvider, useData } from '@/context/DataContext'
import { CollaboratorsPage } from '@/pages/CollaboratorsPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { SettingsPage } from '@/pages/SettingsPage'
import type { PageId } from '@/types/navigation'

function LoadingScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-blue-600 text-white">
        <AnchorIcon className="size-7" />
      </div>
      <p className="text-sm font-medium text-slate-500">Carregando dados locais…</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-100 p-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangleIcon className="size-7" />
      </div>
      <div className="max-w-md text-center">
        <p className="text-base font-semibold text-slate-900">
          Não foi possível carregar os dados
        </p>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        <p className="mt-3 text-xs text-slate-400">
          Verifique se o navegador permite armazenamento local (IndexedDB) e recarregue a
          página.
        </p>
      </div>
    </div>
  )
}

function AppContent() {
  const { status, loadError } = useData()
  const [currentPage, setCurrentPage] = useState<PageId>('escala')

  if (status === 'loading') return <LoadingScreen />
  if (status === 'error') {
    return <ErrorScreen message={loadError ?? 'Erro desconhecido ao acessar o IndexedDB.'} />
  }

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'escala' ? <SchedulePage onNavigate={setCurrentPage} /> : null}
      {currentPage === 'colaboradores' ? <CollaboratorsPage /> : null}
      {currentPage === 'configuracoes' ? <SettingsPage /> : null}
    </AppLayout>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
