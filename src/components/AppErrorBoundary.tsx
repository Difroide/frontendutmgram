import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary na raiz do app. Se qualquer parte da árvore lançar, exibe tela de erro
 * em vez de tela em branco/azul, e permite recarregar.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Erro não tratado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen w-full p-6"
          style={{ backgroundColor: '#0b0e14' }}
        >
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-[#0d1117] p-6 shadow-xl">
            <h1 className="text-xl font-bold text-red-300 mb-2">Algo deu errado</h1>
            <p className="text-sm text-gray-400 font-mono mb-4 break-words">
              {this.state.error.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
              >
                Recarregar a página
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
