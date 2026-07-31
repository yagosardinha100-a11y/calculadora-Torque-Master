import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangleIcon, AnchorIcon } from '@/components/icons'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageErrorBoundary } from '@/components/layout/PageErrorBoundary'
import { AppLayoutWithBanner } from '@/components/layout/StorageBanner'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { Button } from '@/components/ui/Button'
import { DataProvider, useData } from '@/context/DataContext'
import { ToastProvider } from '@/context/ToastContext'
import { CollaboratorsPage } from '@/pages/CollaboratorsPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PAGE_PATHS, pageFromPath } from '@/types/navigation'

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

interface ErrorScreenProps {
  message: string
  onReset: () => void
}

function ErrorScreen({ message, onReset }: ErrorScreenProps) {
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
          Se o problema persistir, recrie o banco local. Seus dados atuais podem ser perdidos —
          exporte um backup antes, se possível.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
          <Button variant="danger" onClick={onReset}>
            Resetar dados locais
          </Button>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const { status, loadError, storageMode, resetLocalDatabase } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPage = pageFromPath(location.pathname)

  const handleNavigate = (page: keyof typeof PAGE_PATHS) => {
    navigate(PAGE_PATHS[page])
  }

  if (status === 'loading') return <LoadingScreen />
  if (status === 'error') {
    return (
      <ErrorScreen
        message={loadError ?? 'Erro desconhecido ao acessar o armazenamento local.'}
        onReset={() => void resetLocalDatabase()}
      />
    )
  }

  return (
    <AppLayoutWithBanner storageMode={storageMode}>
      <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
        <Routes>
          <Route path="/" element={<Navigate to="/escala" replace />} />
          <Route path="/escala" element={<SchedulePage onNavigate={handleNavigate} />} />
          <Route path="/colaboradores" element={<CollaboratorsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/escala" replace />} />
        </Routes>
      </AppLayout>
    </AppLayoutWithBanner>
  )
}

export default function App() {
  return (
    <PageErrorBoundary>
      <ToastProvider>
        <DataProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
          <ToastContainer />
        </DataProvider>
      </ToastProvider>
    </PageErrorBoundary>
  )
}
