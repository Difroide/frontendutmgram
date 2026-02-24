import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary para o conteúdo das abas.
 * Se a página (ex: Contas) lançar um erro, exibe fallback e mantém layout/sidebar visíveis.
 */
export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TabErrorBoundary] Erro ao renderizar aba:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-[#0d1117] rounded-xl border border-red-500/30">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Erro ao carregar a página</h2>
          <p className="text-sm text-gray-400 font-mono mb-4 break-all text-center max-w-xl">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
