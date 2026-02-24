import { useEffect, useState } from 'react'
import { Users, UsersRound, Bot, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DashboardStats } from './DashboardStats'
import { CraftPayProvider } from '@/contexts/CraftPayContext'
import { CraftPayStatsCards } from './components/CraftPayStatsCards'
import { VerificacaoDiaria } from './components/VerificacaoDiaria'
import { DashboardCharts } from './components/DashboardCharts'
import { useData } from '@/contexts/DataContext'
import { useVerificacao } from '@/contexts/VerificacaoContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useModo } from '@/contexts/ModoContext'
import { dashboardService } from './dashboardService'

/** Tag que a sessão deve ter (na aba Contas) para ser usada no verificador de disparo */
export const TAG_VERIFICADOR_DISPARO = 'Verificador disparo'

const CRAFTPAY_VISIBLE_KEY = 'dashboard_craftpay_visible'

// Hook para animar números de 0 até o valor final
function useAnimatedNumber(targetValue: number, duration: number = 1500, delay: number = 0, shouldAnimate: boolean = true) {
  const [currentValue, setCurrentValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!shouldAnimate || hasAnimated) {
      if (targetValue !== currentValue) {
        setCurrentValue(targetValue)
      }
      return
    }

    if (targetValue === 0) {
      setCurrentValue(0)
      setHasAnimated(true)
      return
    }

    const timer = setTimeout(() => {
      const startTime = Date.now()
      const startValue = 0

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        const easeOut = 1 - Math.pow(1 - progress, 3)
        const value = Math.floor(startValue + (targetValue - startValue) * easeOut)

        setCurrentValue(value)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCurrentValue(targetValue)
          setHasAnimated(true)
        }
      }

      animate()
    }, delay)

    return () => clearTimeout(timer)
  }, [targetValue, duration, delay, shouldAnimate, hasAnimated, currentValue])

  return { currentValue }
}

export default function Dashboard() {
  const { currentTheme } = useTheme()
  const navigate = useNavigate()
  const { modo } = useModo()
  const { stats, isLoading, isInitialLoad } = useData()
  const { lastProgress } = useVerificacao()
  // Grupos ativos: priorizar o número da verificação diária (quando existir)
  const gruposAtivos = lastProgress?.grupos?.online ?? stats?.totalGrupos ?? 0

  // Estado para histórico de grupos (Line Chart)
  const [history, setHistory] = useState<Array<{ date: string; online: number; offline: number }>>([])

  // Card lateral colapsável (modo Difroide - layout Gabriel)
  const [isCardExpanded, setIsCardExpanded] = useState(true)

  // CraftPay visibility state with localStorage persistence
  const [craftPayVisible, setCraftPayVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(CRAFTPAY_VISIBLE_KEY)
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const toggleCraftPayVisible = () => {
    setCraftPayVisible((prev) => {
      const next = !prev
      try {
        localStorage.setItem(CRAFTPAY_VISIBLE_KEY, String(next))
      } catch { }
      return next
    })
  }

  // Buscar histórico de grupos ao montar o componente
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await dashboardService.getHistoricalGroupData()
        if (data && data.length > 0) {
          setHistory(data)
        }
      } catch (error) {
        console.warn('[Dashboard] Erro ao buscar histórico, usando mock:', error)
        // Dados mockados para demonstração
        const mockData = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          mockData.push({
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            online: Math.floor(Math.random() * 100) + 600,
            offline: Math.floor(Math.random() * 50) + 10,
          })
        }
        setHistory(mockData)
      }
    }
    fetchHistory()
  }, [])


  const animatedContas = useAnimatedNumber(stats?.totalContas || 0, 1200, 100, isInitialLoad)
  const animatedBots = useAnimatedNumber(stats?.botsAtivos || 0, 1200, 200, isInitialLoad)
  const animatedGrupos = useAnimatedNumber(gruposAtivos, 1200, 300, isInitialLoad)

  const maxContas = 200
  const maxGrupos = 1000

  const statCards = stats
    ? [
      {
        label: 'Contas Conectadas',
        value: animatedContas.currentValue.toString(),
        icon: Users,
        iconColor: currentTheme.colors.primary,
        progress: Math.min((stats.totalContas / maxContas) * 100, 100),
        progressColor: currentTheme.colors.primary,
        badge: stats.totalContas > 0 ? {
          text: `${stats.totalContas} total`,
          style: {
            backgroundColor: `${currentTheme.colors.primary}20`,
            borderColor: `${currentTheme.colors.primary}40`,
            color: currentTheme.colors.primaryLight,
            border: '1px solid',
          }
        } : undefined,
        onClick: () => navigate('/contas'),
      },
      {
        label: 'Bots Ativos',
        value: animatedBots.currentValue.toString(),
        icon: Bot,
        iconColor: '#10b981',
        progress: 95,
        progressColor: '#10b981',
        badge: {
          text: '98% Online',
          color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        },
        onClick: () => navigate('/bots-midia'),
      },
      {
        label: 'Grupos Ativos',
        value: animatedGrupos.currentValue.toString(),
        icon: UsersRound,
        iconColor: '#a855f7',
        progress: Math.min((gruposAtivos / maxGrupos) * 100, 100),
        progressColor: '#a855f7',
        badge: stats.gruposCriadosHoje > 0 ? {
          text: `+${stats.gruposCriadosHoje} hoje`,
          style: {
            backgroundColor: `${currentTheme.colors.primary}20`,
            borderColor: `${currentTheme.colors.primary}40`,
            color: currentTheme.colors.primaryLight,
            border: '1px solid',
          }
        } : undefined,
        onClick: () => navigate('/configuracoes/grupos'),
      },
    ]
    : []

  // Se está carregando inicialmente, mostrar loading simples
  if (isLoading && isInitialLoad) {
    return (
      <div className="min-h-screen -m-6 p-6 bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const hasCraftPay = !!(window as any).electron?.craftpay

  // Calcular dados para o gráfico baseado no último progresso ou stats
  const chartData = {
    total: stats?.totalGrupos || 0,
    online: lastProgress?.grupos?.online || 0,
    offline: (lastProgress?.grupos?.caidos?.length || 0),
    privado: 0 // Se tiver contagem de privados no futuro, adicionar aqui
  };

  // Se não tiver dados de progresso recente, tentar estimar ou mostrar zerado
  // (O ideal é persistir isso no backend, mas por agora usamos o estado da verificação ou 0)

  // Ajuste fino: se offline + online < total, o resto é desconhecido ou não verificado
  const naoVerificados = Math.max(0, chartData.total - chartData.online - chartData.offline);

  // Layout modo Difroide: card central + card lateral — alinhados ao topo e à base do card da sidebar
  // Sidebar (modo Difroide) usa padding 10px top/bottom no wrapper → card em 50px até 100vh-10px
  const isDifroide = modo === 'difroide' || modo === 'ruivo'
  const contentAreaHeight = 'calc(100vh - 40px)'
  const sidebarCardGap = 10 // mesmo padding top/bottom do sidebar-wrapper (Difroide)

  const difroideContent = (
    <div
      className="flex gap-3 px-4 -m-6"
      style={{
        height: contentAreaHeight,
        paddingTop: `${sidebarCardGap}px`,
        paddingBottom: `${sidebarCardGap}px`,
      }}
    >
      {/* Card central: estatísticas CraftPay, evolução dos grupos, central de verificação */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="rounded-xl overflow-hidden shadow-xl border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
          <div className="relative z-10 flex flex-col h-full min-h-0">
            <div className="px-6 pt-6 pb-4 border-b border-gray-600/30 flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-300 text-sm mt-1">Visão geral do sistema</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {/* Estatísticas CraftPay */}
              {hasCraftPay && (
                <div className="space-y-4">
                  <CraftPayStatsCards visible={true} onToggleVisibility={() => {}} />
                </div>
              )}
              {/* Evolução dos Grupos */}
              <DashboardCharts
                data={{
                  total: chartData.total,
                  online: chartData.online,
                  offline: chartData.offline + naoVerificados,
                  privado: 0,
                }}
                history={history}
              />
              {/* Central de Verificação */}
              <div className="rounded-xl border border-gray-600/30 bg-gray-800/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-600/20">
                  <h2 className="text-base font-semibold text-white">Central de Verificação</h2>
                </div>
                <div className="p-0">
                  <VerificacaoDiaria />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card lateral: contas conectadas, bots ativos, grupos ativos — mesma altura do card central e da sidebar */}
      <div className={`flex-shrink-0 flex flex-col min-h-0 transition-all duration-300 ${isCardExpanded ? 'w-72' : 'w-12'}`}>
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
          <div className="h-full flex flex-col">
            <div className={`px-6 pt-6 pb-4 border-b border-gray-600/30 flex items-center ${isCardExpanded ? 'justify-between' : 'justify-center'}`}>
              {isCardExpanded && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-0.5">Resumo</h2>
                  <p className="text-gray-300 text-sm">Informações rápidas</p>
                </div>
              )}
              <button
                onClick={() => setIsCardExpanded(!isCardExpanded)}
                className={`p-2 rounded-lg bg-transparent hover:bg-gray-700/30 transition-all text-gray-300 hover:text-white flex items-center justify-center ${isCardExpanded ? 'ml-auto' : ''}`}
                aria-label={isCardExpanded ? 'Colapsar card' : 'Expandir card'}
              >
                {isCardExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
            {isCardExpanded && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-600/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-600/20">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Resumo</h3>
                  </div>
                  <div className="divide-y divide-gray-700/30">
                    <button
                      onClick={() => navigate('/contas')}
                      className="flex items-center justify-between w-full p-3 hover:bg-gray-700/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Contas conectadas</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-100">{animatedContas.currentValue}</span>
                    </button>
                    <button
                      onClick={() => navigate('/bots-midia')}
                      className="flex items-center justify-between w-full p-3 hover:bg-gray-700/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-gray-300">Bots ativos</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-100">{animatedBots.currentValue}</span>
                    </button>
                    <button
                      onClick={() => navigate('/configuracoes/grupos')}
                      className="flex items-center justify-between w-full p-3 hover:bg-gray-700/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <UsersRound className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">Grupos ativos</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-100">{animatedGrupos.currentValue}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const content = (
    <div className="min-h-screen -m-6 p-8 bg-[#0b0e14]">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* CRAFT PAY - TOPO */}
        {hasCraftPay && (
          <div className="space-y-4">
            <CraftPayStatsCards visible={true} onToggleVisibility={() => { }} />
          </div>
        )}

        {/* 1. Stats Cards (KPIs) - Mantendo a linha visual limpa */}
        {stats && <DashboardStats stats={statCards} />}

        {/* 2. Charts Section - O "Gráfico Bonitinho" solicitado */}
        <DashboardCharts
          data={{
            total: chartData.total,
            online: chartData.online,
            offline: chartData.offline + naoVerificados, // Agrupar para simplificar visualizaçao inicial
            privado: 0
          }}
          history={history}
        />

        {/* 3. Action Panel: Verificação Diária */}
        <div className="bg-[#1c2333] border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-800/20">
            <h2 className="text-base font-semibold text-white">Central de Verificação</h2>
          </div>
          <div className="p-0">
            <VerificacaoDiaria />
          </div>
        </div>


      </div>
    </div>
  )

  const rendered = isDifroide ? difroideContent : content
  return hasCraftPay ? <CraftPayProvider>{rendered}</CraftPayProvider> : rendered
}
