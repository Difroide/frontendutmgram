import { HashRouter as Router } from 'react-router-dom'
import { SidebarProvider } from './components/sidebar/SidebarContext'
import { OperacaoProvider, useOperacao } from './contexts/OperacaoContext'
import { SelectedContasProvider } from './contexts/SelectedContasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ModoProvider } from './contexts/ModoContext'
import { TabProvider } from './contexts/TabContext'
import { DataProvider } from './contexts/DataContext'
import { VerificacaoProvider } from './contexts/VerificacaoContext'
import { ThemeInjector } from './components/ThemeInjector'
import { Layout } from './components/layout/Layout'
import { LoadingScreen } from './components/LoadingScreen'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './services/sessionVerifierService' // Iniciar serviço de verificação automática

function AppContent() {
  const { isLoading } = useOperacao()

  return (
    <>
      <LoadingScreen isVisible={isLoading} />
      <AppErrorBoundary>
      <SidebarProvider>
        <SelectedContasProvider>
          <DataProvider>
            <VerificacaoProvider>
              <TabProvider>
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <Layout />
                </Router>
              </TabProvider>
            </VerificacaoProvider>
          </DataProvider>
        </SelectedContasProvider>
      </SidebarProvider>
      </AppErrorBoundary>
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ModoProvider>
        <ThemeInjector />
        <OperacaoProvider>
          <AppContent />
        </OperacaoProvider>
      </ModoProvider>
    </ThemeProvider>
  )
}

export default App
