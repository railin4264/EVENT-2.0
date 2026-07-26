'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Import logger dynamically to avoid SSR issues
    import('@/lib/utils/logger').then(({ logger }) => {
      logger.error('ErrorBoundary caught an error:', error, errorInfo)
    }).catch(() => {
      // Fallback to console if logger fails
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    })

    this.setState({
      error,
      errorInfo
    })
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReport = () => {
    // In a real app, you would send this to your error reporting service
    const errorReport = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString()
    }
    
    console.log('Error Report:', errorReport)
    alert('Error reportado. Nuestro equipo será notificado.')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ¡Oops! Algo salió mal
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ocurrió un error inesperado. Nuestro equipo ha sido notificado y estamos trabajando para solucionarlo.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-left text-sm">
                <p className="font-semibold text-red-600 dark:text-red-400 mb-2">
                  Error: {this.state.error?.message}
                </p>
                <pre className="text-gray-600 dark:text-gray-400 overflow-auto text-xs">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleRefresh}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Página
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Inicio
                </button>
                
                <button
                  onClick={this.handleReport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Reportar
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}