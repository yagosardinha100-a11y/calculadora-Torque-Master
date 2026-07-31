import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangleIcon } from '@/components/icons'

interface PageErrorBoundaryProps {
  children: ReactNode
}

interface PageErrorBoundaryState {
  error: Error | null
}

/** Evita tela branca quando uma página quebra no render. */
export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro não tratado na interface:', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-100 p-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangleIcon className="size-7" />
          </div>
          <div className="max-w-md text-center">
            <p className="text-base font-semibold text-slate-900">Algo deu errado</p>
            <p className="mt-1 text-sm text-slate-500">{this.state.error.message}</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
