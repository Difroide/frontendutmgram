import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiltrosCard } from './FiltrosCard'
import { ContasTable } from './ContasTable'
import { useSelectedContas } from '@/contexts/SelectedContasContext'
import { useData } from '@/contexts/DataContext'
import { useTabs } from '@/contexts/TabContext'
import { FiltrosModal } from './components/FiltrosModal'
import { CriarGruposModal } from './components/CriarGruposModal'
import { VerificarContasModal } from './components/VerificarContasModal'
import { AdicionarListasModal } from './components/AdicionarListasModal'
import { EncherGruposModal } from './components/EncherGruposModal'
import { TrocarBotModal, TrocarBotOptions } from './components/TrocarBotModal'
import { GerenciarTagsModal } from './components/GerenciarTagsModal'
import { EditarTagsContaModal } from './components/EditarTagsContaModal'
import { AlterarCategoriaEmMassaModal } from './components/AlterarCategoriaEmMassaModal'
import { AlterarTagsEmMassaModal } from './components/AlterarTagsEmMassaModal'
import { CriarBotModal } from './components/CriarBotModal'
import { ImportarContasModal } from './components/ImportarContasModal'
import { AdicionarContasModal } from './components/AdicionarContasModal'
import { CriarApiAutomaticaModal } from '../configurações/components/CriarApiAutomaticaModal'
import { VerificarMembrosModal } from './components/VerificarMembrosModal'
import { GerenciarBotsModal } from './components/GerenciarBotsModal'
import { VerificacaoResumoModal } from './components/VerificacaoResumoModal'
import { contaService } from './contaService'
import { Conta, FiltroTipo, FiltroTag } from '@/types/Conta'
import { botMidiaService } from '../BotsMidia/botMidiaService'
import { automacaoService } from '@/services/automacaoService'
import { useOperacao } from '@/contexts/OperacaoContext'
import { TransferirEntreOpsModal } from './components/TransferirEntreOpsModal'
import { ApagarGruposModal } from './components/ApagarGruposModal'
import {
  FolderTree,
  Tag,
  Trash2,
  ArrowRightLeft,
  Layers,
  Users,
  UserPlus,
  ListPlus,
  ShieldCheck,
  UsersRound,
  Bot,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useModo } from '@/contexts/ModoContext'

export default function Contas() {
  const { operacaoAtual, operacoes } = useOperacao()
  const { currentTheme } = useTheme()
  const { modo } = useModo()
  const isDifroide = modo === 'difroide' || modo === 'ruivo'
  const [isContasCardExpanded, setIsContasCardExpanded] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { setSelectedCount } = useSelectedContas()
  const { openTab } = useTabs()
  
  // Usar dados do contexto global - instantâneo!
  const { contas, refreshContas, refreshBots } = useData()
  const [_error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('Todas')
  const [botSelecionado, setBotSelecionado] = useState<number | string | null>(null)
  const [filtrosTags, setFiltrosTags] = useState<Set<FiltroTag>>(new Set(['Todas']))
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string; rodando?: boolean }>>([])
  const [todasCategorias, setTodasCategorias] = useState<Array<{ id: string; nome: string; rodando?: boolean }>>([])
  const [quantidadeGruposSelecionada, setQuantidadeGruposSelecionada] = useState<number | null>(null)
  const [quantidadeMembrosSelecionada, setQuantidadeMembrosSelecionada] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContas, setSelectedContas] = useState<Set<number>>(new Set())

  // Atualizar contagem de contas selecionadas no contexto
  useEffect(() => {
    setSelectedCount(selectedContas.size)
  }, [selectedContas.size, setSelectedCount])
  const [isCriarGruposModalOpen, setIsCriarGruposModalOpen] = useState(false)
  const [isVerificarContasModalOpen, setIsVerificarContasModalOpen] = useState(false)
  const [isAdicionarListasModalOpen, setIsAdicionarListasModalOpen] = useState(false)
  const [isEncherGruposModalOpen, setIsEncherGruposModalOpen] = useState(false)
  const [isGerenciarTagsModalOpen, setIsGerenciarTagsModalOpen] = useState(false)
  const [isEditarTagsContaModalOpen, setIsEditarTagsContaModalOpen] = useState(false)
  const [contaParaEditarTags, setContaParaEditarTags] = useState<Conta | null>(null)
  const [isTrocarBotModalOpen, setIsTrocarBotModalOpen] = useState(false)
  const [isAlterarCategoriaModalOpen, setIsAlterarCategoriaModalOpen] = useState(false)
  const [isAlterarTagsModalOpen, setIsAlterarTagsModalOpen] = useState(false)
  const [isCriarBotModalOpen, setIsCriarBotModalOpen] = useState(false)
  const [isImportarContasModalOpen, setIsImportarContasModalOpen] = useState(false)
  const [isAdicionarContasModalOpen, setIsAdicionarContasModalOpen] = useState(false)
  const [contasEncontradasImportacao, setContasEncontradasImportacao] = useState<string[]>([])
  const [importandoContas, setImportandoContas] = useState(false)
  const [isFiltrosModalOpen, setIsFiltrosModalOpen] = useState(false)
  const [isCriarApiModalOpen, setIsCriarApiModalOpen] = useState(false)
  const [isVerificarMembrosModalOpen, setIsVerificarMembrosModalOpen] = useState(false)
  const [abrirDetalhesNumero, setAbrirDetalhesNumero] = useState<string | null>(null)
  const [isGerenciarBotsModalOpen, setIsGerenciarBotsModalOpen] = useState(false)
  const [isTransferirEntreOpsModalOpen, setIsTransferirEntreOpsModalOpen] = useState(false)
  const [isApagarGruposModalOpen, setIsApagarGruposModalOpen] = useState(false)
  const [isApagarGruposProcessing, setIsApagarGruposProcessing] = useState(false)
  const [verificacaoResumo, setVerificacaoResumo] = useState<any | null>(null)
  const [showVerificacaoResumo, setShowVerificacaoResumo] = useState(false)
  const [botsMidia, setBotsMidia] = useState<Array<{ id: number | string; name: string; nichoId?: string; botUsername?: string }>>([])
  const [listasBots, setListasBots] = useState<Array<{ id: string; listName: string; bots: string[] }>>([])
  const [contasWallpaper, setContasWallpaper] = useState<string | null>(null)
  
  // Cache para evitar recarregamentos desnecessários
  const lastBotsLoadRef = useRef<number>(0)
  const lastContasLoadRef = useRef<number>(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Constantes para cache (evitar recarregar muito frequente)
  const BOTS_CACHE_DURATION = 30000 // 30 segundos
  const CONTAS_CACHE_DURATION = 10000 // 10 segundos

  useEffect(() => {
    // IMPORTANTE: Limpeza automática DESABILITADA para evitar apagar dados reais
    // Contas já são carregadas pelo DataContext - só precisa carregar dados adicionais
    
    loadListasBots()
    loadCategorias()
    
    // Carregar bots após contas (para extrair bots das contas)
    setTimeout(() => {
      loadBotsMidia(true) // Forçar carregamento inicial
    }, 100)

    // Carregar wallpaper de Contas
    const loadContasWallpaper = async () => {
      try {
        if ((window as any).electron?.database?.getWallpaper) {
          const result = await (window as any).electron.database.getWallpaper('contas', null)
          if (result?.success && result.data) {
            setContasWallpaper(result.data)
            localStorage.setItem('contas-card-wallpaper', result.data)
          } else {
            // Fallback para localStorage
            const saved = localStorage.getItem('contas-card-wallpaper')
            if (saved) setContasWallpaper(saved)
          }
        } else {
          const saved = localStorage.getItem('contas-card-wallpaper')
          if (saved) setContasWallpaper(saved)
        }
      } catch (error) {
        console.error('[Contas] Erro ao carregar wallpaper:', error)
        const saved = localStorage.getItem('contas-card-wallpaper')
        if (saved) setContasWallpaper(saved)
      }
    }

    loadContasWallpaper()

    // Aplicar filtros passados via location.state (navegação do Dashboard)
    if (location.state?.filterTags && Array.isArray(location.state.filterTags)) {
      const filterTagsArray = location.state.filterTags as FiltroTag[]
      // Converter array para Set e remover "Todas" se houver outras tags
      const newFilterTags = new Set<FiltroTag>(filterTagsArray)
      if (newFilterTags.size > 0 && !newFilterTags.has('Todas')) {
        setFiltrosTags(newFilterTags)
      }
      // Limpar location.state para evitar reaplicar os filtros ao recarregar
      navigate(location.pathname, { replace: true, state: {} })
    }

    // Listener para atualizar wallpaper quando mudar
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'contas-card-wallpaper') {
        if (e.newValue) {
          setContasWallpaper(e.newValue)
        } else {
          setContasWallpaper(null)
        }
      }
    }

    // Listener para evento customizado de mudança de wallpaper
    const handleWallpaperChange = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.target === 'contas') {
        if (customEvent.detail?.wallpaper) {
          setContasWallpaper(customEvent.detail.wallpaper)
        } else {
          setContasWallpaper(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('wallpaper-changed', handleWallpaperChange as EventListener)

    // Inscrever-se em conclusão de verificar contas para recarregar
    const unsubscribe = automacaoService.onVerificarContasComplete(() => {
      console.log('Verificação de contas concluída, recarregando contas e grupos...')
      // Delay para garantir que os JSONs foram gravados no disco
      setTimeout(() => {
        lastContasLoadRef.current = Date.now()
        refreshContas()
        setTimeout(() => {
          loadBotsMidia(true)
        }, 100)
        // Segundo refresh após 1s para garantir dados atualizados (Windows pode atrasar flush)
        setTimeout(() => {
          refreshContas()
        }, 1000)
      }, 800)
    })

    // Recarregar quando a janela recebe foco (usuário volta para a aba)
    // OTIMIZADO: Usar debounce para evitar múltiplos recarregamentos rápidos
    const handleWindowFocus = () => {
      // Limpar timer anterior se existir
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Debounce: aguardar 500ms antes de recarregar
      debounceTimerRef.current = setTimeout(() => {
        const now = Date.now()
        // Só recarregar contas se passou tempo suficiente desde último carregamento
        if ((now - lastContasLoadRef.current) >= CONTAS_CACHE_DURATION) {
          lastContasLoadRef.current = now
      loadContas()
          // Recarregar bots também (com cache)
      setTimeout(() => {
        loadBotsMidia()
      }, 100)
        }
      }, 500)
    }
    
    window.addEventListener('focus', handleWindowFocus)

    const handleResumoVerificacao = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail) {
        setVerificacaoResumo(customEvent.detail)
        setShowVerificacaoResumo(true)
      }
    }

    window.addEventListener('verificacao-contas-resumo', handleResumoVerificacao as EventListener)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('wallpaper-changed', handleWallpaperChange as EventListener)
      window.removeEventListener('verificacao-contas-resumo', handleResumoVerificacao as EventListener)
    }
  }, [refreshContas])

  // Recarregar bots quando contas mudarem (para pegar novos bots das contas)
  // OTIMIZADO: Usar debounce para evitar recarregamentos múltiplos quando várias contas mudam rapidamente
  useEffect(() => {
    if (contas.length > 0) {
      // Limpar timer anterior se existir
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Debounce: aguardar 500ms antes de recarregar
      debounceTimerRef.current = setTimeout(() => {
      loadBotsMidia()
      }, 500)
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
      }
    }
  }, [contas.length]) // Recarregar apenas quando o número de contas mudar

  // Verificar se o bot selecionado ainda existe após recarregar bots
  useEffect(() => {
    if (botSelecionado !== null && botsMidia.length > 0) {
      const botAindaExiste = botsMidia.some(b => String(b.id) === String(botSelecionado))
      if (!botAindaExiste) {
        console.warn('[Contas] Bot selecionado (ID:', botSelecionado, ') não existe mais. Limpando seleção.')
        console.warn('[Contas] Bots disponíveis:', botsMidia.map(b => ({ id: b.id, name: b.name })))
        setBotSelecionado(null)
      }
    }
  }, [botsMidia, botSelecionado])

  const loadBotsMidia = async (force = false) => {
    // Verificar cache antes de carregar
    const now = Date.now()
    if (!force && (now - lastBotsLoadRef.current) < BOTS_CACHE_DURATION) {
      return // Usar cache, não recarregar
    }
    
    try {
      lastBotsLoadRef.current = now
      const bots = await botMidiaService.getAll()
      const botsMapeados = bots.map((bot) => {
        // Normalizar username: remover @ se existir, mas manter original também
        const usernameOriginal = bot.username || ''
        const usernameSemArroba = usernameOriginal.replace(/^@/, '')
        
        // Criar nome de exibição: username ou nome, sempre mostrando algo
        const nomeExibicao = usernameSemArroba || bot.nome || `Bot ${bot.id}`
        
        return { 
          id: bot.id, // Manter ID original (pode ser string ou number)
          name: nomeExibicao, // Sempre ter um nome para exibição
          nomeOriginal: bot.nome, // Manter nome original
          nichoId: bot.nichoId,
          botUsername: usernameSemArroba || bot.nome || '', // Usar username sem @ ou nome como fallback
          botUsernameOriginal: usernameOriginal, // Manter original para debug
          botId: String(bot.id), // ID como string para comparação
          isCadastrado: true, // Marcar como cadastrado
        }
      })
      
      // Extrair todos os bots únicos que aparecem nas contas (mesmo não cadastrados)
      const botsDasContas = new Set<string>()
      contas.forEach(conta => {
        if (conta.botsMidiaAdmin && conta.botsMidiaAdmin.length > 0) {
          conta.botsMidiaAdmin.forEach(botAdmin => {
            const botNormalizado = normalizarUsername(botAdmin)
            if (botNormalizado) {
              botsDasContas.add(botNormalizado)
            }
          })
        }
      })
      
      // Adicionar bots das contas que não estão cadastrados
      const botsNaoCadastrados: Array<{ id: string; name: string; nomeOriginal: string; nichoId?: string; botUsername: string; botUsernameOriginal: string; botId: string; isCadastrado: boolean }> = []
      
      botsDasContas.forEach(botUsername => {
        // Verificar se o bot já está na lista de cadastrados
        const jaExiste = botsMapeados.some(b => 
          normalizarUsername(b.botUsername) === botUsername ||
          normalizarUsername(b.name) === botUsername ||
          normalizarUsername((b as any).botUsernameOriginal) === botUsername
        )
        
        if (!jaExiste) {
          // Criar ID único baseado no username
          const botId = `bot_${botUsername}`
          botsNaoCadastrados.push({
            id: botId,
            name: botUsername,
            nomeOriginal: botUsername,
            botUsername: botUsername,
            botUsernameOriginal: botUsername,
            botId: botId,
            isCadastrado: false, // Marcar como não cadastrado
          })
        }
      })
      
      // Combinar bots cadastrados e não cadastrados
      const todosBots = [...botsMapeados, ...botsNaoCadastrados]
      
      // Ordenar: cadastrados primeiro, depois por nome
      todosBots.sort((a, b) => {
        if (a.isCadastrado !== b.isCadastrado) {
          return a.isCadastrado ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      
      setBotsMidia(todosBots)
      
      // Log detalhado para debug
      console.log('[Contas] Bots cadastrados:', botsMapeados.length)
      console.log('[Contas] Bots encontrados nas contas (não cadastrados):', botsNaoCadastrados.length)
      console.log('[Contas] Total de bots no filtro:', todosBots.length)
      console.log('[Contas] IDs dos bots (primeiros 10):', todosBots.slice(0, 10).map(b => ({ 
        id: b.id, 
        idType: typeof b.id, 
        name: b.name,
        isCadastrado: (b as any).isCadastrado
      })))
      if (botsNaoCadastrados.length > 0) {
        console.log('[Contas] Bots não cadastrados encontrados:', botsNaoCadastrados.map(b => ({ id: b.id, name: b.name })))
      }
    } catch (error) {
      console.error('Erro ao carregar bots de mídia:', error)
    }
  }

  const loadCategorias = async () => {
    try {
      // Aguardar um pouco para garantir que os handlers estão registrados
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if ((window as any).electron?.criador?.carregarCategorias) {
        console.log('[Contas] Carregando categorias...')
        const data = await (window as any).electron.criador.carregarCategorias()
        console.log('[Contas] Categorias recebidas:', data)
        
        // Salvar todas as categorias (incluindo rodando) para verificar status das contas
        setTodasCategorias(data || [])
        // Filtrar categorias que estão "rodando" (ocultar nos selects)
        const categoriasFiltradas = (data || []).filter((cat: { rodando?: boolean }) => !cat.rodando)
        setCategorias(categoriasFiltradas)
      } else {
        console.warn('[Contas] API criador.carregarCategorias não disponível ainda')
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadListasBots = async () => {
    try {
      if ((window as any).electron?.criador) {
        const listas = await (window as any).electron.criador.carregarTodasListas()
        setListasBots(listas || [])
      }
    } catch (error) {
      console.error('Erro ao carregar listas de bots:', error)
    }
  }

  const loadContas = async () => {
    try {
      setError(null)
      // Usar refresh do contexto global
      await refreshContas()
      console.log('Contas atualizadas via DataContext')
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar contas')
    }
  }

  // Função para normalizar username (remove @ e converte para lowercase)
  const normalizarUsername = (username: string | undefined): string => {
    if (!username) return ''
    return username.replace(/^@/, '').toLowerCase().trim()
  }

  // Filtragem das contas
  const contasFiltradas = useMemo(() => {
    let filtered = [...contas]

    // CRÍTICO: Filtrar TODAS as contas que pertencem a categorias rodando (ocultar completamente da aba)
    // Quando uma categoria está rodando, TODAS as contas associadas a ela devem DESAPARECER
    if (todasCategorias.length > 0) {
      const categoriasRodandoIds = new Set(
        todasCategorias
          .filter((cat) => cat.rodando === true)
          .map((cat) => String(cat.id)) // Garantir que todos os IDs são strings para comparação
      )
      
      if (categoriasRodandoIds.size > 0) {
        console.log(`[Contas] 🔒 Filtrando contas: ${categoriasRodandoIds.size} categoria(s) rodando - IDs: ${Array.from(categoriasRodandoIds).join(', ')}`)
        
        const contasAntes = filtered.length
        filtered = filtered.filter((conta) => {
          // Se a conta não tem categoriaId, mostrar normalmente
          if (!conta.categoriaId) {
            return true
          }
          
          // CRÍTICO: Se a conta tem categoriaId e a categoria está rodando, OCULTAR completamente
          // Comparar como string para garantir match correto
          const categoriaRodando = categoriasRodandoIds.has(String(conta.categoriaId))
          if (categoriaRodando) {
            console.log(`[Contas] 🚫 Ocultando conta ${conta.numero} - pertence à categoria rodando ${conta.categoriaId}`)
            return false // OCULTAR conta de categoria rodando
          }
          
          return true // Mostrar conta normal
        })
        
        const contasOcultadas = contasAntes - filtered.length
        if (contasOcultadas > 0) {
          console.log(`[Contas] ✅ ${contasOcultadas} conta(s) ocultada(s) por pertencerem a categorias rodando`)
        }
      }
    }

    // Filtro por bot de mídia
    if (filtroTipo === 'Bots' && botSelecionado !== null) {
      // Tentar encontrar o bot por ID primeiro
      let botSelecionadoObj = botsMidia.find(bot => {
        // Comparar IDs (pode ser string ou number) - normalizar para string para comparação
        return String(bot.id) === String(botSelecionado)
      })
      
      // Se não encontrou por ID, tentar encontrar por nome (caso o ID tenha mudado)
      if (!botSelecionadoObj) {
        // Tentar encontrar pelo valor do botSelecionado como nome
        const botSelecionadoStr = String(botSelecionado)
        botSelecionadoObj = botsMidia.find(bot => {
          const botNameNormalizado = normalizarUsername(bot.name)
          const botUsernameNormalizado = normalizarUsername(bot.botUsername)
          return botNameNormalizado === botSelecionadoStr || 
                 botUsernameNormalizado === botSelecionadoStr ||
                 bot.name === botSelecionadoStr ||
                 bot.botUsername === botSelecionadoStr
        })
      }
      
      if (botSelecionadoObj) {
        // Criar lista de possíveis usernames para comparar
        // O backend pode salvar com ou sem @, e pode usar botUsername ou botId
        const possiveisUsernames: string[] = []
        
        // Adicionar botUsername (já vem sem @ do loadBotsMidia)
        if (botSelecionadoObj.botUsername) {
          possiveisUsernames.push(botSelecionadoObj.botUsername)
        }
        
        // Adicionar botUsernameOriginal se existir (pode ter @)
        if ((botSelecionadoObj as any).botUsernameOriginal) {
          possiveisUsernames.push((botSelecionadoObj as any).botUsernameOriginal)
          possiveisUsernames.push((botSelecionadoObj as any).botUsernameOriginal.replace(/^@/, ''))
        }
        
        // Adicionar name (pode ser usado como fallback)
        if (botSelecionadoObj.name) {
          possiveisUsernames.push(botSelecionadoObj.name)
          possiveisUsernames.push(botSelecionadoObj.name.replace(/^@/, ''))
        }
        
        // Adicionar ID como string (caso o backend use o ID como username)
        if ((botSelecionadoObj as any).botId) {
          possiveisUsernames.push((botSelecionadoObj as any).botId)
        }
        possiveisUsernames.push(String(botSelecionadoObj.id))
        
        // Normalizar todos os possíveis usernames
        const usernamesNormalizados = possiveisUsernames
          .map(u => normalizarUsername(u))
          .filter(u => u.length > 0)
          // Remover duplicatas
          .filter((value, index, self) => self.indexOf(value) === index)
        
        console.log('[Filtro Bot] Bot selecionado:', {
          id: botSelecionadoObj.id,
          name: botSelecionadoObj.name,
          botUsername: botSelecionadoObj.botUsername,
          botUsernameOriginal: (botSelecionadoObj as any).botUsernameOriginal,
          botId: (botSelecionadoObj as any).botId,
          possiveisUsernames: possiveisUsernames,
          usernamesNormalizados: usernamesNormalizados
        })
        
        filtered = filtered.filter((conta) => {
          // Coletar todos os bots possíveis da conta (de botsMidiaAdmin e gruposDetalhes)
          const todosBotsDaConta: string[] = []
          
          // Adicionar bots de botsMidiaAdmin
          if (conta.botsMidiaAdmin && conta.botsMidiaAdmin.length > 0) {
            todosBotsDaConta.push(...conta.botsMidiaAdmin)
          }
          
          // Adicionar bots de gruposDetalhes (verificar bot_midia_admin e bots_midia_admin)
          if (conta.gruposDetalhes && conta.gruposDetalhes.length > 0) {
            conta.gruposDetalhes.forEach(grupo => {
              // Verificar campo antigo bot_midia_admin (string)
              if (grupo.bot_midia_admin) {
                todosBotsDaConta.push(grupo.bot_midia_admin)
              }
              // Verificar campo novo bots_midia_admin (array)
              if (Array.isArray(grupo.bots_midia_admin) && grupo.bots_midia_admin.length > 0) {
                todosBotsDaConta.push(...grupo.bots_midia_admin)
              }
            })
          }
          
          // Se não tem nenhum bot, retornar false
          if (todosBotsDaConta.length === 0) {
            return false
          }
          
          // Remover duplicatas
          const botsUnicos = Array.from(new Set(todosBotsDaConta))
          
          // Comparar com todos os possíveis usernames normalizados
          const temBot = botsUnicos.some(botAdmin => {
            const botAdminNormalizado = normalizarUsername(botAdmin)
            
            // Verificar se algum dos usernames normalizados corresponde
            const match = usernamesNormalizados.some(usernameNormalizado => {
              // Comparação exata (mais comum)
              if (botAdminNormalizado === usernameNormalizado) {
                return true
              }
              
              // Comparação parcial (caso o botAdmin tenha mais informações ou vice-versa)
              // Ex: "botname" vs "botname123" ou "prefix_botname"
              if (botAdminNormalizado.length > 0 && usernameNormalizado.length > 0) {
                if (botAdminNormalizado.includes(usernameNormalizado) || 
                    usernameNormalizado.includes(botAdminNormalizado)) {
                  return true
                }
              }
              
              return false
            })
            
            if (match) {
              console.log('[Filtro Bot] ✅ Match encontrado:', {
                conta: conta.numero,
                botAdmin: botAdmin,
                botAdminNormalizado: botAdminNormalizado,
                usernameMatch: usernamesNormalizados.find(u => 
                  botAdminNormalizado === u || 
                  botAdminNormalizado.includes(u) || 
                  u.includes(botAdminNormalizado)
                )
              })
            }
            
            return match
          })
          
          // Debug específico para a conta mencionada
          if (conta.numero === '573225983062') {
            console.log('[Filtro Bot] 🔍 Debug conta 573225983062:', {
              botsMidiaAdmin: conta.botsMidiaAdmin,
              botsMidiaAdminNormalizados: conta.botsMidiaAdmin?.map(b => normalizarUsername(b)),
              todosBotsDaConta: botsUnicos,
              todosBotsNormalizados: botsUnicos.map(b => normalizarUsername(b)),
              usernamesNormalizados: usernamesNormalizados,
              temBot: temBot,
              matchDetails: botsUnicos.map(botAdmin => {
                const botAdminNormalizado = normalizarUsername(botAdmin)
                return {
                  botAdmin,
                  botAdminNormalizado,
                  matches: usernamesNormalizados.filter(u => 
                    botAdminNormalizado === u || 
                    botAdminNormalizado.includes(u) || 
                    u.includes(botAdminNormalizado)
                  )
                }
              }),
              gruposDetalhes: conta.gruposDetalhes?.map(g => ({
                nome: g.nome,
                bot_midia_admin: g.bot_midia_admin,
                bots_midia_admin: g.bots_midia_admin
              }))
            })
          }
          
          return temBot
        })
        
        console.log('[Filtro Bot] Resultado:', {
          contasFiltradas: filtered.length,
          totalContas: contas.length,
          porcentagem: contas.length > 0 ? ((filtered.length / contas.length) * 100).toFixed(1) + '%' : '0%'
        })
        
        // Log de debug: mostrar algumas contas que não foram encontradas (se houver)
        if (filtered.length === 0 && contas.length > 0) {
          console.warn('[Filtro Bot] ⚠️ Nenhuma conta encontrada. Exemplos de botsMidiaAdmin nas contas:')
          const contasComBots = contas.filter(c => c.botsMidiaAdmin && c.botsMidiaAdmin.length > 0)
          if (contasComBots.length > 0) {
            contasComBots.slice(0, 10).forEach(conta => {
              const botsNormalizados = (conta.botsMidiaAdmin || []).map(b => normalizarUsername(b))
              console.log(`  - Conta ${conta.numero}:`, {
                original: conta.botsMidiaAdmin,
                normalizados: botsNormalizados,
                temMatch: botsNormalizados.some(b => usernamesNormalizados.includes(b))
              })
            })
            console.warn('[Filtro Bot] Usernames normalizados procurados:', usernamesNormalizados)
            
            // Verificar especificamente a conta mencionada
            const contaEspecifica = contas.find(c => c.numero === '573225983062')
            if (contaEspecifica) {
              console.warn('[Filtro Bot] 🔍 Conta específica 573225983062:', {
                botsMidiaAdmin: contaEspecifica.botsMidiaAdmin,
                botsNormalizados: contaEspecifica.botsMidiaAdmin?.map(b => normalizarUsername(b)),
                gruposDetalhes: contaEspecifica.gruposDetalhes?.map(g => ({
                  nome: g.nome,
                  bot_midia_admin: g.bot_midia_admin,
                  bots_midia_admin: g.bots_midia_admin
                }))
              })
            }
          } else {
            console.warn('[Filtro Bot] Nenhuma conta tem botsMidiaAdmin preenchido')
          }
        }
      } else {
        console.warn('[Filtro Bot] ❌ Bot não encontrado com ID/nome:', botSelecionado)
        console.warn('[Filtro Bot] Tipo do botSelecionado:', typeof botSelecionado, 'Valor:', botSelecionado)
        console.warn('[Filtro Bot] Total de bots disponíveis:', botsMidia.length)
        console.warn('[Filtro Bot] Bots disponíveis (primeiros 10):', botsMidia.slice(0, 10).map(b => ({ 
          id: b.id, 
          idType: typeof b.id,
          idString: String(b.id),
          name: b.name, 
          botUsername: b.botUsername,
          botUsernameOriginal: (b as any).botUsernameOriginal,
          isCadastrado: (b as any).isCadastrado
        })))
        console.warn('[Filtro Bot] Busca detalhada:', {
          botSelecionado,
          botSelecionadoType: typeof botSelecionado,
          botSelecionadoString: String(botSelecionado),
          matchesById: botsMidia.filter(b => String(b.id) === String(botSelecionado)),
          matchesByName: botsMidia.filter(b => normalizarUsername(b.name) === normalizarUsername(String(botSelecionado))),
          matchesByUsername: botsMidia.filter(b => normalizarUsername(b.botUsername) === normalizarUsername(String(botSelecionado)))
        })
        // Se o bot não foi encontrado, não mostrar nenhuma conta
        filtered = []
      }
    }

    // Filtro por quantidade de grupos
    if (filtroTipo === 'Grupos' && quantidadeGruposSelecionada !== null) {
      filtered = filtered.filter((conta) => {
        // Mostrar contas que têm pelo menos a quantidade selecionada de grupos
        return conta.grupos >= quantidadeGruposSelecionada
      })
    }

    // Filtro por quantidade de membros nos grupos
    if (filtroTipo === 'Membros' && quantidadeMembrosSelecionada !== null) {
      filtered = filtered.filter((conta) => {
        // Verificar se a conta tem grupos com informações detalhadas
        if (!conta.gruposDetalhes || conta.gruposDetalhes.length === 0) {
          return false
        }
        
        // Determinar o intervalo baseado na seleção
        // 100 = grupos de 0 até 100 (membros <= 100)
        // 200 = grupos de 100+ até 200 (membros >= 100 && membros <= 200)
        // 300 = grupos de 200+ até 300 (membros >= 200 && membros <= 300)
        // etc.
        const membrosMin = quantidadeMembrosSelecionada === 100 
          ? 0 
          : quantidadeMembrosSelecionada - 100
        const membrosMax = quantidadeMembrosSelecionada
        
        // Verificar se pelo menos um grupo está no intervalo
        return conta.gruposDetalhes.some((grupo) => {
          const membros = grupo.membros || 0
          // Para 100: 0 <= membros <= 100
          // Para 200+: membrosMin <= membros <= membrosMax (ex: 100 <= membros <= 200)
          return membros >= membrosMin && membros <= membrosMax
        })
      })
    }

    // Filtro por tags (múltiplos filtros simultâneos - AND logic)
    // Se "Todas" estiver selecionada, não aplicar filtros de tag
    if (!filtrosTags.has('Todas') && filtrosTags.size > 0) {
      filtered = filtered.filter((conta) => {
        // Aplicar TODOS os filtros selecionados (AND logic)
        // Uma conta deve satisfazer TODOS os filtros para aparecer
        return Array.from(filtrosTags).every((filtroTag) => {
          switch (filtroTag) {
            case 'Todas':
              return true // "Todas" não filtra nada
            case 'Com grupos':
              return conta.grupos > 0
            case 'Sem grupos':
              // Excluir contas com tags especiais (elas têm status próprio, não são "sem grupos")
              const temTagEspecial = conta.tags.includes('Congeladas') || 
                                     conta.tags.includes('Banidas') || 
                                     conta.tags.includes('Usuário restrito')
              return conta.grupos === 0 && !temTagEspecial
            case 'Grupos sem membros':
              // Contas que têm pelo menos um grupo com 0 membros
              if (conta.grupos === 0) return false
              if (!conta.gruposDetalhes || conta.gruposDetalhes.length === 0) return false
              return conta.gruposDetalhes.some((grupo: any) => {
                const membros = grupo.membros || 0
                return membros === 0
              })
            case 'Grupos com erro':
              // Contas que têm pelo menos um grupo com problema (sem membros ou sem link)
              if (conta.grupos === 0) return false
              if (!conta.gruposDetalhes || conta.gruposDetalhes.length === 0) return false
              return conta.gruposDetalhes.some(grupo => {
                // Grupo com erro: sem membros (0) ou sem link válido
                const semMembros = (grupo.membros || 0) === 0
                const semLink = !grupo.link_convite || grupo.link_convite.trim() === ''
                return semMembros || semLink
              })
            case 'Sem lista':
              // Verificar se a conta tem grupos sem listas (sem listas_adicionadas)
              if (conta.grupos === 0) return false
              if (!conta.gruposDetalhes || conta.gruposDetalhes.length === 0) return false
              return conta.gruposDetalhes.some((grupo: any) => {
                // Verificar se o grupo tem listas adicionadas
                const listasAdicionadas = Array.isArray(grupo.listas_adicionadas) ? grupo.listas_adicionadas : []
                // Grupo sem lista se não tem listas_adicionadas ou está vazio
                return listasAdicionadas.length === 0
              })
            case 'SEM LISTA-URGENTE':
              // Verificar se a conta tem a tag "SEM LISTA-URGENTE"
              return conta.tags.includes('SEM LISTA-URGENTE')
            case 'Usuário restrito':
              return conta.tags.includes('Usuário restrito')
            case 'Congeladas':
              return conta.tags.includes('Congeladas')
            case 'Sem tags':
              return !conta.tags || conta.tags.length === 0
            case 'Pronta para uso':
              // Pronta para uso = conta sem grupos (virgem, pode ser usada)
              // NÃO deve ter:
              // - Tag "Congeladas"
              // - Tag "Banidas"
              // - Tag "Usuário restrito"
              // - Tags de bots (BOT DE DISPARO, @bot_username, etc)
              // - Tag "GRUPO BASE" (sessões de grupo base não devem aparecer como disponíveis)
              // - Grupos (grupos === 0) - contas SEM grupos são prontas para uso
              const temTagEspecialPronta = conta.tags.includes('Congeladas') || 
                                           conta.tags.includes('Banidas') || 
                                           conta.tags.includes('Usuário restrito') ||
                                           conta.tags.includes('GRUPO BASE')
              
              // Verificar se tem tags de bots
              const temTagsBots = conta.tags.some((tag: string) => {
                if (typeof tag !== 'string') return false
                const tagLower = tag.toLowerCase()
                return (
                  tagLower.includes('bot de disparo') ||
                  tagLower.includes('bot disparo') ||
                  tagLower.includes('(bot de disparo)') ||
                  tag.trim().startsWith('@') || // Username de bot
                  (tagLower.includes('bot') && tagLower.includes('disparo'))
                )
              })
              
              const semGrupos = conta.grupos === 0
              
              // Pronta para uso = sem tags especiais (problemas), sem tags de bots, sem grupo base e sem grupos (virgem)
              return !temTagEspecialPronta && !temTagsBots && semGrupos
            case 'Banidas':
              return conta.tags.includes('Banidas')
            case 'Com bots':
              // Verificar se tem botsMidiaAdmin ou se tem grupos com bots
              const temBotsMidiaAdmin = !!(conta.botsMidiaAdmin && conta.botsMidiaAdmin.length > 0)
              const temGruposComBots = conta.gruposDetalhes?.some(grupo => 
                (Array.isArray(grupo.bots_midia_admin) && grupo.bots_midia_admin.length > 0) ||
                (grupo.bot_midia_admin && grupo.bot_midia_admin)
              ) || false
              return temBotsMidiaAdmin || temGruposComBots
            case 'Bots Criados':
              // Filtro exclusivo para contas que criaram bots via "Criar Bots"
              // Essas contas têm tags com @ (ex: @meu_bot)
              return conta.tags.some(tag => 
                typeof tag === 'string' && tag.trim().startsWith('@')
              )
            case 'Sem membros suficientes':
              return conta.tags.includes('Sem membros suficientes')
            default:
              // Para tags personalizadas, verificar se a conta tem essa tag
              return conta.tags.includes(filtroTag)
          }
        })
      })
    }

    // Filtro por categoria
    if (categoriaFiltro) {
      filtered = filtered.filter((conta) => {
        // Verificar se a conta tem a categoria selecionada
        return conta.categoriaId === categoriaFiltro
      })
    }

    // Filtro por busca (número)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((conta) =>
        conta.numero.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [contas, filtroTipo, botSelecionado, filtrosTags, quantidadeGruposSelecionada, quantidadeMembrosSelecionada, searchTerm, botsMidia, categoriaFiltro, todasCategorias])

  // Contas selecionadas para ações em massa - usar TODAS as contas, não só as filtradas.
  // Assim as 30 contas selecionadas (de várias categorias) são usadas, não apenas as 10 da categoria visível.
  const contasSelecionadasParaAcoes = useMemo(
    () => contas.filter((c) => selectedContas.has(c.id)),
    [contas, selectedContas]
  )

  const handleToggleSelect = (id: number) => {
    setSelectedContas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleDeselectAll = () => {
    setSelectedContas(new Set())
  }

  const handleExecutarTelegram = async (pastaPath: string) => {
    await contaService.executarTelegram(pastaPath)
  }

  const handleExcluirNumero = async (numero: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o número ${numero}?`)) {
      await contaService.excluirNumero(numero)
      await loadContas()
    }
  }

  const handleExcluirContas = async () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para excluir')
      return
    }

    const contasSelecionadas = contasSelecionadasParaAcoes
    const quantidade = contasSelecionadas.length
    
    const confirmMessage = quantidade === 1
      ? `Tem certeza que deseja excluir a conta ${contasSelecionadas[0].numero}?`
      : `Tem certeza que deseja excluir ${quantidade} contas?\n\nEsta ação não pode ser desfeita!`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      let sucesso = 0
      let erros = 0
      const errosDetalhes: string[] = []

      for (const conta of contasSelecionadas) {
        try {
          await contaService.excluirNumero(conta.numero)
          sucesso++
        } catch (error) {
          erros++
          errosDetalhes.push(`${conta.numero}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      // Limpar seleção após exclusão
      setSelectedContas(new Set())

      // Recarregar contas
      await loadContas()

      // Mostrar resultado
      if (erros === 0) {
        alert(`${sucesso} ${sucesso === 1 ? 'conta excluída' : 'contas excluídas'} com sucesso!`)
      } else {
        alert(`${sucesso} ${sucesso === 1 ? 'conta excluída' : 'contas excluídas'} com sucesso.\n\n${erros} ${erros === 1 ? 'erro' : 'erros'}:\n${errosDetalhes.join('\n')}`)
      }
    } catch (error) {
      console.error('Erro ao excluir contas:', error)
      alert(`Erro ao excluir contas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleExecutarTelegramContas = async () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para executar o Telegram')
      return
    }

    const contasSelecionadas = contasSelecionadasParaAcoes

    try {
      let sucesso = 0
      let erros = 0
      const errosDetalhes: string[] = []

      for (const conta of contasSelecionadas) {
        try {
          await contaService.executarTelegram(conta.pastaPath)
          sucesso++
        } catch (error) {
          erros++
          errosDetalhes.push(`${conta.numero}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      // Mostrar resultado
      if (erros === 0) {
        alert(`${sucesso} ${sucesso === 1 ? 'Telegram executado' : 'Telegrams executados'} com sucesso!`)
      } else {
        alert(`${sucesso} ${sucesso === 1 ? 'Telegram executado' : 'Telegrams executados'} com sucesso.\n\n${erros} ${erros === 1 ? 'erro' : 'erros'}:\n${errosDetalhes.join('\n')}`)
      }
    } catch (error) {
      console.error('Erro ao executar Telegram das contas:', error)
      alert(`Erro ao executar Telegram: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleAdicionarContas = () => {
    setIsAdicionarContasModalOpen(true)
  }

  const handleConfirmarImportacao = async (tagSelecionada: string | null) => {
    setImportandoContas(true)
    try {
      const result = await contaService.importarContas(contasEncontradasImportacao, tagSelecionada)
      
      if (result.pastasMovidas && result.pastasMovidas.length > 0) {
        const mensagem = result.pastasMovidas.length === 1
          ? `Conta "${result.pastasMovidas[0]}" importada com sucesso!`
          : `${result.pastasMovidas.length} contas importadas com sucesso!`
        
        if (result.erros && result.erros.length > 0) {
          alert(`${mensagem}\n\nAvisos:\n${result.erros.join('\n')}`)
        } else {
          alert(mensagem)
        }
        
        setIsImportarContasModalOpen(false)
        setContasEncontradasImportacao([])
        await loadContas()
      } else if (result.erros && result.erros.length > 0) {
        alert(`Erro ao importar contas:\n${result.erros.join('\n')}`)
      }
    } catch (error) {
      console.error('Erro ao importar contas:', error)
      alert(`Erro ao importar contas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setImportandoContas(false)
    }
  }

  const handleCriarGrupos = () => {
    const contasSelecionadas = contasSelecionadasParaAcoes
    if (contasSelecionadas.length === 0) {
      alert('Selecione pelo menos uma conta para criar grupos')
      return
    }
    console.log('[handleCriarGrupos] Abrindo modal com', contasSelecionadas.length, 'contas selecionadas')
    setIsCriarGruposModalOpen(true)
  }

  const handleSaveCriarGrupos = async (data: {
    quantidadeGrupos: number
    gruposPorConta?: Array<{ accountId: string; groupCount: number }>
    tipoGrupo?: 'publico' | 'privado'
    bots: Array<{ id: string; botId: string; botName: string; nicheId?: string; porcentagem: string }>
    criarBots?: boolean
    quantidadeBots?: number
    botsDisparo?: Array<{ id: string; nome: string; username: string; foto?: string }>
    usarDescricao?: boolean
    descricaoGrupo?: string
    botsExtras?: string[]
    painelSMM?: string
    codigoServico?: string
    quantidadeMembros?: number
    categoriaId?: string
    arquivoNomesId?: string
    grupoNomesId?: string
    usarNomeSistema?: boolean
    nomeEspecifico?: string
    usarFotos?: boolean
    grupoBaseId?: string
    sessoesParalelas?: number
    proxyId?: number | null
  }, contasSelecionadasNoModal?: Conta[]) => {
    try {
      // Usar as contas passadas pelo modal, ou fallback para selectedContas do estado
      const contasParaUsar = contasSelecionadasNoModal || contasSelecionadasParaAcoes
      
      // Verificar se alguma sessão tem grupo VIP
      const { verificarSessoesVIP, mostrarAlertaVIP } = await import('@/utils/verificarVIP')
      const verificacaoVIP = await verificarSessoesVIP(contasParaUsar)
      
      if (verificacaoVIP.temVIP) {
        mostrarAlertaVIP(verificacaoVIP.sessoesVIP)
        return
      }
      
      console.log('[handleSaveCriarGrupos] Contas para usar:', {
        contasSelecionadasNoModal: contasSelecionadasNoModal?.length || 0,
        selectedContasSize: selectedContas.size,
        contasParaUsar: contasParaUsar.length,
        contasParaUsarNumeros: contasParaUsar.map(c => c.numero)
      })
      
      // Se gruposPorConta foi fornecido, filtrar accountIds para incluir apenas contas que precisam criar grupos
      let accountIds: string[];
      if (data.gruposPorConta && data.gruposPorConta.length > 0) {
        // Criar um Set com os accountIds que precisam criar grupos (groupCount > 0)
        const accountIdsComGruposParaCriar = new Set(
          data.gruposPorConta
            .filter(item => item.groupCount > 0)
            .map(item => item.accountId)
        );
        
        // Filtrar contas para incluir apenas as que estão no gruposPorConta com groupCount > 0
        accountIds = contasParaUsar
          .map((conta) => conta.numero)
          .filter((numero): numero is string => {
            const temNumero = !!numero;
            const precisaCriar = accountIdsComGruposParaCriar.has(numero);
            if (!precisaCriar && temNumero) {
              console.log(`[handleSaveCriarGrupos] ⏭️ Conta ${numero} não precisa criar grupos (já tem grupos suficientes). Filtrando...`);
            }
            return temNumero && precisaCriar;
          });
        
        console.log(`[handleSaveCriarGrupos] 🔍 Filtrando contas por gruposPorConta:`, {
          gruposPorContaLength: data.gruposPorConta.length,
          gruposPorContaWithGroupCount: data.gruposPorConta.filter(g => g.groupCount > 0).length,
          contasOriginais: contasParaUsar.length,
          contasFiltradas: accountIds.length,
          accountIdsFiltrados: accountIds
        });
      } else {
        // Se não há gruposPorConta, usar todas as contas selecionadas (comportamento antigo)
        accountIds = contasParaUsar
          .map((conta) => conta.numero)
          .filter((numero): numero is string => !!numero);
      }

      console.log('[handleSaveCriarGrupos] accountIds resultantes:', accountIds)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada. Por favor, selecione pelo menos uma conta na tabela antes de criar grupos.')
        return
      }

      // Iniciar automação em background
      try {
        await automacaoService.iniciarCriarGrupos({
        quantidadeGrupos: data.quantidadeGrupos,
        gruposPorConta: data.gruposPorConta, // Passar gruposPorConta para o backend
        tipoGrupo: data.tipoGrupo,
        bots: data.bots,
        criarBots: data.criarBots,
        quantidadeBots: data.quantidadeBots,
        usarDescricao: data.usarDescricao,
        descricaoGrupo: data.descricaoGrupo,
        botsExtras: data.botsExtras,
        painelSMM: data.painelSMM,
        codigoServico: data.codigoServico,
        quantidadeMembros: data.quantidadeMembros,
        categoriaId: data.categoriaId,
        arquivoNomesId: data.arquivoNomesId,
        grupoNomesId: data.grupoNomesId,
        usarNomeSistema: data.usarNomeSistema,
        nomeEspecifico: data.nomeEspecifico,
        usarFotos: data.usarFotos,
        grupoBaseId: data.grupoBaseId,
        sessoesParalelas: data.sessoesParalelas || 1,
        accountIds: accountIds, // Já filtrado para incluir apenas contas que precisam criar grupos
        proxyId: data.proxyId || null,
      })
      
      console.log('[handleSaveCriarGrupos] Payload enviado para automacaoService:', {
        quantidadeGrupos: data.quantidadeGrupos,
        accountIds: accountIds,
        accountIdsLength: accountIds.length,
        accountIdsContent: accountIds,
      })

        setIsCriarGruposModalOpen(false)
        // Automação iniciada (sem alerta - progresso visível na aba Tarefas)
      } catch (error: any) {
        // Verificar se é erro de contas grupo base
        if (error?.error === 'CONTAS_GRUPO_BASE' || error?.message?.includes('CONTAS_GRUPO_BASE')) {
          const contasGrupoBase = error.contasGrupoBase || []
          const mensagem = error.mensagem || `⚠️ ATENÇÃO: ${contasGrupoBase.length} conta(s) selecionada(s) está(ão) marcada(s) como GRUPO BASE:\n\n${contasGrupoBase.map((c: any) => `- ${c.accountId}: ${c.nome}`).join('\n')}\n\nSessões de grupo base NÃO devem ser usadas para criar grupos.\n\nDeseja continuar mesmo assim?`
          
          const confirmar = window.confirm(mensagem)
          if (!confirmar) {
            return // Usuário cancelou
          }
          
          // Se confirmou, tentar novamente removendo as contas de grupo base
          const accountIdsFiltrados = accountIds.filter(id => {
            return !contasGrupoBase.some((c: any) => c.accountId === id)
          })
          
          if (accountIdsFiltrados.length === 0) {
            alert('Todas as contas selecionadas são de grupo base. Nenhuma conta será processada.')
            return
          }
          
          // Tentar novamente apenas com contas que não são grupo base
          await automacaoService.iniciarCriarGrupos({
            quantidadeGrupos: data.quantidadeGrupos,
            tipoGrupo: data.tipoGrupo,
            bots: data.bots,
            criarBots: data.criarBots,
            quantidadeBots: data.quantidadeBots,
            usarDescricao: data.usarDescricao,
            descricaoGrupo: data.descricaoGrupo,
            botsExtras: data.botsExtras,
            painelSMM: data.painelSMM,
            codigoServico: data.codigoServico,
            quantidadeMembros: data.quantidadeMembros,
            categoriaId: data.categoriaId,
            arquivoNomesId: data.arquivoNomesId,
            grupoNomesId: data.grupoNomesId,
            usarNomeSistema: data.usarNomeSistema,
            nomeEspecifico: data.nomeEspecifico,
            usarFotos: data.usarFotos,
            grupoBaseId: data.grupoBaseId,
            sessoesParalelas: data.sessoesParalelas || 1,
            accountIds: accountIdsFiltrados,
            proxyId: data.proxyId || null,
          })
          
          setIsCriarGruposModalOpen(false)
        } else {
          console.error('Erro ao iniciar automação de criar grupos:', error)
          alert(`Erro ao iniciar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }
      
      // Recarregar contas após um delay para atualizar dados quando a automação terminar
      // (isso será feito automaticamente quando a automação concluir)
    } catch (error) {
      console.error('Erro ao iniciar automação de criar grupos:', error)
      alert(`Erro ao iniciar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleAdicionarListas = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para adicionar listas')
      return
    }
    setIsAdicionarListasModalOpen(true)
  }

  const handleConfirmAdicionarListas = async (listNames: string[], sessoesParalelas?: number, proxyId?: number | null) => {
    try {
      // Obter números das contas selecionadas
      const accountIds = Array.from(selectedContas)
        .map((id) => contas.find((c) => c.id === id)?.numero)
        .filter((numero): numero is string => !!numero)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada')
        setIsAdicionarListasModalOpen(false)
        return
      }

      if (listNames.length === 0) {
        alert('Nenhuma lista cadastrada no sistema')
        setIsAdicionarListasModalOpen(false)
        return
      }

      // Criar uma única tarefa consolidada para todas as listas
      try {
        await automacaoService.iniciarAdicionarListas({
          accountIds,
          listNames, // Todas as listas de uma vez
          sessoesParalelas: sessoesParalelas || 1,
          proxyId: proxyId || null,
        })

        setIsAdicionarListasModalOpen(false)
      } catch (error: any) {
        // Verificar se é erro de contas grupo base
        if (error?.error === 'CONTAS_GRUPO_BASE' || error?.message?.includes('CONTAS_GRUPO_BASE')) {
          const contasGrupoBase = error.contasGrupoBase || []
          const mensagem = error.mensagem || `⚠️ ATENÇÃO: ${contasGrupoBase.length} conta(s) selecionada(s) está(ão) marcada(s) como GRUPO BASE.\n\nSessões de grupo base NÃO devem ser usadas para adicionar listas.\n\nDeseja continuar mesmo assim?`
          
          const confirmar = window.confirm(mensagem)
          if (!confirmar) {
            return // Usuário cancelou
          }
          
          // Se confirmou, tentar novamente (o backend vai processar mesmo assim)
          // Mas vamos remover as contas de grupo base da lista
          const accountIdsFiltrados = accountIds.filter(id => {
            return !contasGrupoBase.some((c: any) => c.accountId === id)
          })
          
          if (accountIdsFiltrados.length === 0) {
            alert('Todas as contas selecionadas são de grupo base. Nenhuma conta será processada.')
            return
          }
          
          // Tentar novamente apenas com contas que não são grupo base
          await automacaoService.iniciarAdicionarListas({
            accountIds: accountIdsFiltrados,
            listNames,
            sessoesParalelas: sessoesParalelas || 1,
            proxyId: proxyId || null,
          })
          
          setIsAdicionarListasModalOpen(false)
        } else {
          throw error // Re-lançar outros erros
        }
      }
      // Automação iniciada (sem alerta - progresso visível na aba Tarefas)
      
      // Recarregar contas após um delay para atualizar dados quando a automação terminar
      // (isso será feito automaticamente quando a automação concluir)
    } catch (error) {
      console.error('Erro ao iniciar automação de adicionar listas:', error)
      alert(`Erro ao iniciar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleVerificarContas = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para verificar')
      return
    }
    setIsVerificarContasModalOpen(true)
  }

  const handleCriarBot = async (botName: string, botUsername: string, fotoBase64: string | null, accountId: string) => {
    try {
      if (!(window as any).electron?.telegram?.criarBot) {
        throw new Error('API para criar bot não disponível')
      }

      console.log(`[handleCriarBot] Criando bot ${botName} (@${botUsername}) para conta ${accountId}`)

      // Chamar handler IPC para criar bot
      const result = await (window as any).electron.telegram.criarBot(
        accountId,
        botName,
        botUsername,
        fotoBase64,
        null // Proxy não necessário para criar bot
      )

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar bot')
      }

      console.log(`[handleCriarBot] Bot criado com sucesso:`, result)

      // Atualizar lista de bots e contas na hora (aba Bots usa DataContext)
      refreshBots()
      refreshContas()
      loadBotsMidia()

      return result
    } catch (error) {
      console.error('Erro ao criar bot:', error)
      throw error
    }
  }

  const handleConfirmVerificarContas = async (options: string[], sessoesParalelas: number = 1, proxyId?: number | null) => {
    if (!options || options.length === 0) {
      alert('Selecione pelo menos uma opção de verificação')
      return
    }

    try {
      // Obter números das contas selecionadas
      const accountIds = Array.from(selectedContas)
        .map((id) => {
          const conta = contas.find((c) => c.id === id)
          if (!conta) {
            console.warn(`[Verificar Contas] Conta com ID ${id} não encontrada nas contas filtradas`)
            return null
          }
          if (!conta.numero) {
            console.warn(`[Verificar Contas] Conta com ID ${id} não tem número válido:`, conta)
            return null
          }
          return conta.numero
        })
        .filter((numero): numero is string => !!numero && /^\d+$/.test(numero))

      console.log(`[Verificar Contas] AccountIds extraídos:`, accountIds)
      console.log(`[Verificar Contas] Contas selecionadas:`, Array.from(selectedContas))
      console.log(`[Verificar Contas] Contas filtradas (primeiras 5):`, contasFiltradas.slice(0, 5).map(c => ({ id: c.id, numero: c.numero })))
      console.log(`[Verificar Contas] Opções selecionadas:`, options)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada ou números inválidos encontrados')
        setIsVerificarContasModalOpen(false)
        return
      }

      // Removido: criação de API integrada (disponível apenas na aba Criar API)

      // Iniciar automação em background
      await automacaoService.iniciarVerificarContas({
        accountIds: accountIds,
        options: options as any, // Cast para VerificationOption[]
        sessoesParalelas: sessoesParalelas || 1,
        proxyId: proxyId || null,
      })

      setIsVerificarContasModalOpen(false)
      // Automação iniciada (sem alerta - progresso visível na aba Tarefas)
      
      // Recarregar contas após um delay para atualizar dados quando a automação terminar
      // (isso será feito automaticamente quando a automação concluir)
    } catch (error) {
      console.error('Erro ao iniciar automação de verificar contas:', error)
      alert(`Erro ao iniciar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      setIsVerificarContasModalOpen(false)
    }
  }

  const handleEncherGrupos = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para encher grupos')
      return
    }
    setIsEncherGruposModalOpen(true)
  }

  const handleTrocarBots = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para trocar bots')
      return
    }
    setIsTrocarBotModalOpen(true)
  }


  const handleAlterarCategoria = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para alterar a categoria')
      return
    }
    setIsAlterarCategoriaModalOpen(true)
  }

  const handleAlterarTags = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para alterar as tags')
      return
    }
    setIsAlterarTagsModalOpen(true)
  }

  const handleApagarGrupos = () => {
    if (selectedContas.size === 0) {
      alert('Selecione pelo menos uma conta para apagar os grupos')
      return
    }
    setIsApagarGruposModalOpen(true)
  }

  const handleConfirmApagarGrupos = async (sessoesParalelas: number) => {
    const accountNumeros = contasSelecionadasParaAcoes
      .map((c) => c.numero)
      .filter(Boolean)

    if (accountNumeros.length === 0) {
      alert('Nenhuma conta selecionada')
      return
    }

    setIsApagarGruposProcessing(true)
    try {
      const result = await (window as any).electron?.contingencia?.apagarGruposContas?.(accountNumeros, sessoesParalelas)
      if (!result) {
        throw new Error('API para apagar grupos não disponível')
      }
      if (result.success) {
        alert(`Grupos apagados com sucesso! ${result.processadas ?? accountNumeros.length} conta(s) atualizada(s).`)
        refreshContas()
        setSelectedContas(new Set())
        setIsApagarGruposModalOpen(false)
      } else if (result.erros && result.erros.length > 0) {
        const erroMsg = result.erros.map((e: { accountId: string; error: string }) => `${e.accountId}: ${e.error}`).join('\n')
        alert(`Algumas contas tiveram erro:\n\n${erroMsg}\n\nProcessadas: ${result.processadas ?? 0}`)
        refreshContas()
        setIsApagarGruposModalOpen(false)
      } else {
        throw new Error(result.erros?.[0]?.error ?? 'Erro desconhecido ao apagar grupos')
      }
    } catch (error) {
      console.error('Erro ao apagar grupos:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsApagarGruposProcessing(false)
    }
  }

  const handleConfirmAlterarCategoria = async (categoriaId: string | null) => {
    try {
      const accountIds = Array.from(selectedContas)
        .map((id) => contas.find((c) => c.id === id)?.numero)
        .filter((numero): numero is string => !!numero)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada')
        setIsAlterarCategoriaModalOpen(false)
        return
      }

      if (!(window as any).electron?.telegram?.alterarCategoriaEmMassa) {
        throw new Error('API para alterar categoria não disponível')
      }

      const result = await (window as any).electron.telegram.alterarCategoriaEmMassa(accountIds, categoriaId)

      if (result.success) {
        alert(`Categoria alterada com sucesso! ${result.successCount} conta(s) atualizada(s).`)
        setIsAlterarCategoriaModalOpen(false)
        loadContas()
        loadCategorias() // Recarregar categorias caso tenha criado uma nova
      } else {
        throw new Error(result.error || 'Erro desconhecido ao alterar categoria')
      }
    } catch (error) {
      console.error('Erro ao alterar categoria:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleConfirmAlterarTags = async (tagsParaAdicionar: string[], tagsParaRemover: string[]) => {
    try {
      const accountIds = Array.from(selectedContas)
        .map((id) => contas.find((c) => c.id === id)?.numero)
        .filter((numero): numero is string => !!numero)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada')
        setIsAlterarTagsModalOpen(false)
        return
      }

      if (!(window as any).electron?.telegram?.alterarTagsEmMassa) {
        throw new Error('API para alterar tags não disponível')
      }

      const result = await (window as any).electron.telegram.alterarTagsEmMassa(
        accountIds,
        tagsParaAdicionar,
        tagsParaRemover
      )

      if (result.success) {
        alert(`Tags alteradas com sucesso! ${result.successCount} conta(s) atualizada(s).`)
        setIsAlterarTagsModalOpen(false)
        loadContas()
      } else {
        throw new Error(result.error || 'Erro desconhecido ao alterar tags')
      }
    } catch (error) {
      console.error('Erro ao alterar tags:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleConfirmTrocarBots = async (options: TrocarBotOptions) => {
    try {
      const accountIds = Array.from(selectedContas)
        .map((id) => contas.find((c) => c.id === id)?.numero)
        .filter((numero): numero is string => !!numero)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada')
        setIsTrocarBotModalOpen(false)
        return
      }

      if (!(window as any).electron?.grupos?.trocarBots) {
        throw new Error('API de trocar bots não disponível')
      }

      const result = await (window as any).electron.grupos.trocarBots.executar({
        accountIds,
        type: options.type,
        botsToRemove: options.botsToRemove,
        botsToAdd: options.botsToAdd,
        proxyId: options.proxyId || null,
        maxSessoes: options.maxSessoes || 3,
      })

      if (result.success) {
        const message = options.type === 'adicionar-novo'
          ? `Bot adicionado com sucesso! ${result.successCount} conta(s) processada(s). ${result.botsRemovidos || 0} bot(s) banido(s) removido(s), ${result.botsAdicionados || 0} bot(s) adicionado(s).`
          : `Troca de bots concluída! ${result.successCount} conta(s) processada(s). ${result.botsRemovidos || 0} bot(s) removido(s), ${result.botsAdicionados || 0} bot(s) adicionado(s).`
        alert(message)
        setIsTrocarBotModalOpen(false)
        loadContas()
      } else {
        throw new Error(result.error || 'Erro desconhecido ao executar operação')
      }
    } catch (error) {
      console.error('Erro ao trocar/limpar bots:', error)
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleConfirmEncherGrupos = async (data: {
    painelSMM: string
    codigoServico: string
    quantidadeMembros: number
  }, contasSelecionadasNoModal?: Conta[]) => {
    try {
      // Usar as contas passadas pelo modal, ou fallback para selectedContas do estado
      const contasParaUsar = contasSelecionadasNoModal || contasSelecionadasParaAcoes
      
      // Verificar se alguma sessão tem grupo VIP
      const { verificarSessoesVIP, mostrarAlertaVIP } = await import('@/utils/verificarVIP')
      const verificacaoVIP = await verificarSessoesVIP(contasParaUsar)
      
      if (verificacaoVIP.temVIP) {
        mostrarAlertaVIP(verificacaoVIP.sessoesVIP)
        return
      }
      
      console.log('[handleConfirmEncherGrupos] Contas para usar:', {
        contasSelecionadasNoModal: contasSelecionadasNoModal?.length || 0,
        selectedContasSize: selectedContas.size,
        contasParaUsar: contasParaUsar.length,
        contasParaUsarNumeros: contasParaUsar.map(c => c.numero)
      })
      
      // Converter para array de números das contas
      const accountIds = contasParaUsar
        .map((conta) => conta.numero)
        .filter((numero): numero is string => !!numero)

      console.log('[handleConfirmEncherGrupos] accountIds resultantes:', accountIds)

      if (accountIds.length === 0) {
        alert('Nenhuma conta selecionada. Por favor, selecione pelo menos uma conta na tabela antes de encher grupos.')
        setIsEncherGruposModalOpen(false)
        return
      }

      // Iniciar automação em background
      await automacaoService.iniciarEncherGrupos({
        accountIds: accountIds,
        painelSMM: data.painelSMM,
        codigoServico: data.codigoServico,
        quantidadeMembros: data.quantidadeMembros,
      })

      setIsEncherGruposModalOpen(false)
      // Automação iniciada (sem alerta - progresso visível na aba Tarefas)
    } catch (error) {
      console.error('Erro ao iniciar automação de encher grupos:', error)
      alert(`Erro ao iniciar automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      setIsEncherGruposModalOpen(false)
    }
  }

  // Verificar se há erro crítico
  if (_error) {
    return (
      <div className={isDifroide ? 'p-4' : 'space-y-6 min-h-screen -m-6 p-6'}>
        <div className="bg-red-800/40 backdrop-blur-md rounded-lg border border-red-600/30 shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-200">Erro ao carregar contas</h1>
          <p className="text-red-300 mt-2">{_error}</p>
          <button
            onClick={() => {
              setError(null)
              loadContas()
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!operacaoAtual) {
    return (
      <div className={isDifroide ? 'p-4' : 'space-y-6 min-h-screen -m-6 p-6 bg-[#0b0e14]'}>
        <div className="bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-600/30 shadow-lg p-6">
          <h1 className="text-2xl font-bold text-white">Contas</h1>
          <p className="text-gray-400 mt-2">Selecione uma operação para continuar</p>
        </div>
      </div>
    )
  }

  // Layout modo Difroide: card central (contas) + card lateral (ações) — alinhados ao topo e à base do card da sidebar
  const contentAreaHeight = 'calc(100vh - 40px)'
  const sidebarCardGap = 10 // mesmo padding top/bottom do sidebar-wrapper (Difroide)

  const difroideContasContent = (
    <div
      className="flex gap-3 px-4 -m-6"
      style={{
        height: contentAreaHeight,
        paddingTop: `${sidebarCardGap}px`,
        paddingBottom: `${sidebarCardGap}px`,
      }}
    >
      {/* Card central: tabela de contas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="rounded-xl overflow-hidden shadow-xl border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
          <div className="relative z-10 flex flex-col h-full min-h-0">
            <div className="px-6 pt-6 pb-4 border-b border-gray-600/30 flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">Contas</h1>
              <p className="text-gray-300 text-sm mt-1">Gerenciar contas do sistema</p>
            </div>
            <div className="flex-1 overflow-auto flex flex-col min-h-0">
              {/* Ações em massa - quando há contas selecionadas */}
              {selectedContas.size > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-b border-gray-600/30 bg-gray-800/30">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-300">
                      {selectedContas.size} {selectedContas.size === 1 ? 'conta selecionada' : 'contas selecionadas'}
                    </span>
                    <button
                      onClick={handleAlterarCategoria}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 hover:bg-gray-700 border border-gray-600/30 text-gray-200 flex items-center gap-1.5"
                    >
                      <FolderTree className="w-4 h-4" />
                      Alterar Categoria
                    </button>
                    <button
                      onClick={handleAlterarTags}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 flex items-center gap-1.5"
                    >
                      <Tag className="w-4 h-4" />
                      Alterar Tags
                    </button>
                    <button onClick={handleApagarGrupos} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      Apagar Grupos
                    </button>
                    <button
                      onClick={() => selectedContas.size > 0 && setIsVerificarMembrosModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4" />
                      Verificar Membros
                    </button>
                    <button onClick={handleExcluirContas} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                    <button onClick={() => setIsTransferirEntreOpsModalOpen(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 hover:bg-gray-700 border border-gray-600/30 text-gray-200 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4" />
                      Transferir
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ContasTable
                  contas={contasFiltradas}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedContas={selectedContas}
                  onToggleSelect={handleToggleSelect}
                  onDeselectAll={handleDeselectAll}
                  onExecutarTelegram={handleExecutarTelegram}
                  onExcluirNumero={handleExcluirNumero}
                  onAdicionarContas={handleAdicionarContas}
                  onExcluirContas={handleExcluirContas}
                  onExecutarTelegramContas={handleExecutarTelegramContas}
                  onEditarTags={(conta) => {
                    setContaParaEditarTags(conta)
                    setIsEditarTagsContaModalOpen(true)
                  }}
                  onAlterarCategoria={handleAlterarCategoria}
                  onAlterarTags={handleAlterarTags}
                  categorias={categorias}
                  filtrosTags={filtrosTags}
                  categoriaFiltro={categoriaFiltro}
                  onCategoriaFiltroChange={setCategoriaFiltro}
                  onAbrirFiltros={() => setIsFiltrosModalOpen(true)}
                  onGerenciarTags={() => setIsGerenciarTagsModalOpen(true)}
                  abrirDetalhesNumero={abrirDetalhesNumero}
                  onDetalhesAberto={() => setAbrirDetalhesNumero(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card lateral: ações (adicionar contas, criar grupos, etc.) — mesma altura do card central e da sidebar */}
      <div className={`flex-shrink-0 flex flex-col min-h-0 transition-all duration-300 ${isContasCardExpanded ? 'w-72' : 'w-12'}`}>
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-600/30 bg-gray-800/40 backdrop-blur-md flex-1 flex flex-col min-h-0">
          <div className={`px-4 pt-4 pb-3 border-b border-gray-600/30 flex items-center ${isContasCardExpanded ? 'justify-between' : 'justify-center'}`}>
            {isContasCardExpanded && (
              <div>
                <h2 className="text-lg font-bold text-white">Ações</h2>
                <p className="text-gray-400 text-xs mt-0.5">Contas e grupos</p>
              </div>
            )}
            <button
              onClick={() => setIsContasCardExpanded(!isContasCardExpanded)}
              className={`p-2 rounded-lg bg-transparent hover:bg-gray-700/30 transition-all text-gray-300 hover:text-white ${isContasCardExpanded ? 'ml-auto' : ''}`}
              aria-label={isContasCardExpanded ? 'Colapsar' : 'Expandir'}
            >
              {isContasCardExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
          {isContasCardExpanded && (
            <div className="flex-1 overflow-y-auto p-3 space-y-0 divide-y divide-gray-600/30">
              <button
                onClick={() => setIsFiltrosModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
              >
                <Filter className="w-4 h-4 text-gray-400" />
                Filtros
              </button>
              <button onClick={handleAdicionarContas} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <UserPlus className="w-4 h-4 text-blue-400" />
                Adicionar contas
              </button>
              <button onClick={handleCriarGrupos} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <Users className="w-4 h-4 text-emerald-400" />
                Criar grupos
              </button>
              <button onClick={handleAdicionarListas} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <ListPlus className="w-4 h-4 text-cyan-400" />
                Adicionar listas
              </button>
              <button onClick={handleVerificarContas} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                Verificar contas
              </button>
              <button onClick={handleEncherGrupos} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <UsersRound className="w-4 h-4 text-purple-400" />
                Encher grupos
              </button>
              <button onClick={handleTrocarBots} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                Trocar bots
              </button>
              <button onClick={() => setIsGerenciarTagsModalOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <Tag className="w-4 h-4 text-indigo-400" />
                Gerenciar tags
              </button>
              <button
                onClick={() => {
                  if (selectedContas.size === 0) {
                    alert('Selecione pelo menos uma conta para criar o bot')
                    return
                  }
                  setIsCriarBotModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
              >
                <Bot className="w-4 h-4 text-teal-400" />
                Criar bot
              </button>
              <button
                onClick={() => {
                  if (selectedContas.size === 0) {
                    alert('Selecione pelo menos uma conta para criar a API')
                    return
                  }
                  setIsCriarApiModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                Criar API
              </button>
              <button onClick={() => setIsGerenciarBotsModalOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700/20 hover:text-white transition-colors">
                <Settings className="w-4 h-4 text-gray-400" />
                Gerenciar bots
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (isDifroide) {
    return (
      <>
        {difroideContasContent}
        {/* Modais - mesmos do layout normal */}
        <FiltrosModal
          isOpen={isFiltrosModalOpen}
          onClose={() => setIsFiltrosModalOpen(false)}
          filtrosTags={filtrosTags}
          onTagChange={(tag: FiltroTag) => {
            setFiltrosTags((prev) => {
              const newSet = new Set(prev)
              if (tag === 'Todas') return new Set(['Todas'])
              if (newSet.has('Todas')) newSet.delete('Todas')
              if (newSet.has(tag)) {
                newSet.delete(tag)
                if (newSet.size === 0) return new Set(['Todas'])
              } else {
                if (tag === 'Com grupos') newSet.delete('Sem grupos')
                else if (tag === 'Sem grupos') newSet.delete('Com grupos')
                if (tag === 'Sem tags') {
                  newSet.delete('Com grupos')
                  newSet.delete('Sem grupos')
                  newSet.delete('Grupos sem membros')
                  newSet.delete('Sem lista')
                  newSet.delete('Com bots')
                }
                newSet.add(tag)
              }
              return newSet
            })
          }}
          onLimparFiltros={() => setFiltrosTags(new Set(['Todas']))}
          categoriaFiltro={categoriaFiltro}
          onCategoriaFiltroChange={setCategoriaFiltro}
          categorias={categorias}
          onGerenciarTags={() => setIsGerenciarTagsModalOpen(true)}
        />
        <CriarGruposModal
          isOpen={isCriarGruposModalOpen}
          onClose={() => setIsCriarGruposModalOpen(false)}
          onSave={handleSaveCriarGrupos}
          selectedContas={contasSelecionadasParaAcoes}
        />
        <VerificarContasModal
          isOpen={isVerificarContasModalOpen}
          onClose={() => setIsVerificarContasModalOpen(false)}
          onConfirm={handleConfirmVerificarContas}
          selectedContas={contasSelecionadasParaAcoes}
          isVerifying={false}
          progress={undefined}
        />
        <AdicionarListasModal
          isOpen={isAdicionarListasModalOpen}
          onClose={() => setIsAdicionarListasModalOpen(false)}
          onConfirm={handleConfirmAdicionarListas}
          selectedContas={contasSelecionadasParaAcoes}
          listasBots={listasBots}
        />
        <EncherGruposModal
          isOpen={isEncherGruposModalOpen}
          onClose={() => setIsEncherGruposModalOpen(false)}
          onConfirm={handleConfirmEncherGrupos}
          selectedContas={contasSelecionadasParaAcoes}
        />
        <TrocarBotModal
          isOpen={isTrocarBotModalOpen}
          onClose={() => setIsTrocarBotModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          botsMidia={botsMidia}
          onConfirm={handleConfirmTrocarBots}
        />
        <GerenciarTagsModal
          isOpen={isGerenciarTagsModalOpen}
          onClose={() => setIsGerenciarTagsModalOpen(false)}
        />
        <EditarTagsContaModal
          isOpen={isEditarTagsContaModalOpen}
          onClose={() => { setIsEditarTagsContaModalOpen(false); setContaParaEditarTags(null) }}
          conta={contaParaEditarTags}
          onSave={() => { setIsEditarTagsContaModalOpen(false); setContaParaEditarTags(null); refreshContas() }}
        />
        <AlterarCategoriaEmMassaModal
          isOpen={isAlterarCategoriaModalOpen}
          onClose={() => setIsAlterarCategoriaModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          categorias={categorias}
          onConfirm={handleConfirmAlterarCategoria}
          onCategoriaCriada={loadCategorias}
        />
        <AlterarTagsEmMassaModal
          isOpen={isAlterarTagsModalOpen}
          onClose={() => setIsAlterarTagsModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          onConfirm={handleConfirmAlterarTags}
        />
        <CriarBotModal
          isOpen={isCriarBotModalOpen}
          onClose={() => setIsCriarBotModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          onConfirm={handleCriarBot}
          onSuccess={() => { setIsCriarBotModalOpen(false); refreshBots(); openTab('/bots-midia') }}
        />
        <CriarApiAutomaticaModal
          isOpen={isCriarApiModalOpen}
          onClose={() => setIsCriarApiModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          onSuccess={() => setIsCriarApiModalOpen(false)}
        />
        <VerificarMembrosModal
          isOpen={isVerificarMembrosModalOpen}
          onClose={() => setIsVerificarMembrosModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
        />
        <GerenciarBotsModal
          isOpen={isGerenciarBotsModalOpen}
          onClose={() => setIsGerenciarBotsModalOpen(false)}
          onSuccess={refreshBots}
        />
        <TransferirEntreOpsModal
          isOpen={isTransferirEntreOpsModalOpen}
          onClose={() => setIsTransferirEntreOpsModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          operacaoAtual={operacaoAtual}
          operacoes={operacoes}
          onConfirm={async (accountNumeros, operacaoDestinoPath) => {
            const result = await (window as any).electron?.telegram?.transferirContasEntreOps?.(accountNumeros, operacaoDestinoPath)
            if (!result?.success) {
              throw new Error(result?.error || result?.erros?.join('\n') || 'Erro ao transferir contas.')
            }
            refreshContas()
            setSelectedContas(new Set())
            setIsTransferirEntreOpsModalOpen(false)
          }}
        />
        <ApagarGruposModal
          isOpen={isApagarGruposModalOpen}
          onClose={() => setIsApagarGruposModalOpen(false)}
          selectedContas={contasSelecionadasParaAcoes}
          onConfirm={handleConfirmApagarGrupos}
          isProcessing={isApagarGruposProcessing}
        />
        <AdicionarContasModal
          isOpen={isAdicionarContasModalOpen}
          onClose={() => setIsAdicionarContasModalOpen(false)}
          onSuccess={loadContas}
        />
        <ImportarContasModal
          isOpen={isImportarContasModalOpen}
          onClose={() => setIsImportarContasModalOpen(false)}
          contasEncontradas={contasEncontradasImportacao}
          onConfirm={handleConfirmarImportacao}
          isLoading={importandoContas}
        />
        <VerificacaoResumoModal
          isOpen={showVerificacaoResumo}
          onClose={() => { setShowVerificacaoResumo(false); setVerificacaoResumo(null) }}
          resumo={verificacaoResumo}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen -m-6 bg-[#0b0e14]">
      <div className="p-6 space-y-6">
        {/* CARD 1: Ações Rápidas */}
        <FiltrosCard
        wallpaper={contasWallpaper}
        filtrosTags={filtrosTags}
        onTagChange={(tag: FiltroTag) => {
          setFiltrosTags((prev) => {
            const newSet = new Set(prev)
            if (tag === 'Todas') {
              // Se clicar em "Todas", limpar todos os outros filtros
              return new Set(['Todas'])
            }
            // Remover "Todas" se estiver selecionada e adicionar outra tag
            if (newSet.has('Todas')) {
              newSet.delete('Todas')
            }
            // Toggle: se já está selecionada, remove; se não, adiciona
            if (newSet.has(tag)) {
              newSet.delete(tag)
              // Se não sobrou nenhuma tag, voltar para "Todas"
              if (newSet.size === 0) {
                return new Set(['Todas'])
              }
            } else {
              // Remover tags mutuamente exclusivas antes de adicionar a nova
              // Com grupos e Sem grupos são mutuamente exclusivos
              if (tag === 'Com grupos') {
                newSet.delete('Sem grupos')
              } else if (tag === 'Sem grupos') {
                newSet.delete('Com grupos')
              }
              
              // Se "Sem tags" for selecionada, remover todas as outras tags de status
              // pois não faz sentido filtrar por status se não tem tags
              if (tag === 'Sem tags') {
                newSet.delete('Com grupos')
                newSet.delete('Sem grupos')
                newSet.delete('Grupos sem membros')
                newSet.delete('Sem lista')
                newSet.delete('Com bots')
              }
              
              newSet.add(tag)
            }
            return newSet
          })
        }}
        onLimparFiltros={() => {
          setFiltrosTags(new Set(['Todas']))
        }}
        categoriaFiltro={categoriaFiltro}
        onCategoriaFiltroChange={setCategoriaFiltro}
        categorias={categorias}
        onGerenciarTags={() => setIsGerenciarTagsModalOpen(true)}
        onCriarGrupos={handleCriarGrupos}
        onAdicionarListas={handleAdicionarListas}
        onVerificarContas={handleVerificarContas}
        onEncherGrupos={handleEncherGrupos}
        onTrocarBots={handleTrocarBots}
        onGerenciarBots={() => setIsGerenciarBotsModalOpen(true)}
        onCriarBot={() => {
          if (selectedContas.size === 0) {
            alert('Por favor, selecione pelo menos uma conta para criar o bot')
            return
          }
          setIsCriarBotModalOpen(true)
        }}
        onCriarApi={() => {
          if (selectedContas.size === 0) {
            alert('Por favor, selecione pelo menos uma conta para criar a API')
            return
          }
          setIsCriarApiModalOpen(true)
        }}
        onAdicionarContas={handleAdicionarContas}
      />

      {/* Ações em Massa - Aparecem quando há contas selecionadas */}
      {selectedContas.size > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">
                Ações em Massa ({selectedContas.size} {selectedContas.size === 1 ? 'conta selecionada' : 'contas selecionadas'})
              </h3>
              <p className="text-xs text-slate-500">Altere categorias e tags para todas as contas selecionadas</p>
            </div>
            <button
              onClick={handleAlterarCategoria}
              className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
                color: currentTheme.colors.primaryLight,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
              }}
            >
              <FolderTree className="w-4 h-4" />
              Alterar Categoria
            </button>
            <button
              onClick={handleAlterarTags}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Alterar Tags
            </button>
            <button
              onClick={handleApagarGrupos}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Apagar Grupos
            </button>
            <button
              onClick={() => {
                if (selectedContas.size === 0) {
                  alert('Por favor, selecione pelo menos uma conta para verificar membros')
                  return
                }
                setIsVerificarMembrosModalOpen(true)
              }}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Verificar Membros
            </button>
            <button
              onClick={handleExcluirContas}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
            <button
              onClick={() => setIsTransferirEntreOpsModalOpen(true)}
              className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: `${currentTheme.colors.primary}30`,
                borderColor: `${currentTheme.colors.primary}50`,
                color: currentTheme.colors.primaryLight,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}30`
              }}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transferir para outra op
            </button>
          </div>
        </div>
      )}

      {/* CARD 2: Lista em formato planilha */}
      <ContasTable
        contas={contasFiltradas}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedContas={selectedContas}
        onToggleSelect={handleToggleSelect}
        onDeselectAll={handleDeselectAll}
        onExecutarTelegram={handleExecutarTelegram}
        onExcluirNumero={handleExcluirNumero}
        onAdicionarContas={handleAdicionarContas}
        onExcluirContas={handleExcluirContas}
        onExecutarTelegramContas={handleExecutarTelegramContas}
        onEditarTags={(conta) => {
          setContaParaEditarTags(conta)
          setIsEditarTagsContaModalOpen(true)
        }}
        onAlterarCategoria={handleAlterarCategoria}
        onAlterarTags={handleAlterarTags}
        categorias={categorias}
        filtrosTags={filtrosTags}
        categoriaFiltro={categoriaFiltro}
        onCategoriaFiltroChange={setCategoriaFiltro}
        onAbrirFiltros={() => setIsFiltrosModalOpen(true)}
        onGerenciarTags={() => setIsGerenciarTagsModalOpen(true)}
        abrirDetalhesNumero={abrirDetalhesNumero}
        onDetalhesAberto={() => setAbrirDetalhesNumero(null)}
      />
      </div>

      {/* Modal Criar Grupos */}
      <CriarGruposModal
        isOpen={isCriarGruposModalOpen}
        onClose={() => setIsCriarGruposModalOpen(false)}
        onSave={handleSaveCriarGrupos}
        selectedContas={contasSelecionadasParaAcoes}
      />

      {/* Modal Verificar Contas */}
      <VerificarContasModal
        isOpen={isVerificarContasModalOpen}
        onClose={() => setIsVerificarContasModalOpen(false)}
        onConfirm={handleConfirmVerificarContas}
        selectedContas={contasSelecionadasParaAcoes}
        isVerifying={false}
        progress={undefined}
      />

      {/* Modal Adicionar Listas */}
      <AdicionarListasModal
        isOpen={isAdicionarListasModalOpen}
        onClose={() => setIsAdicionarListasModalOpen(false)}
        onConfirm={handleConfirmAdicionarListas}
        selectedContas={contasSelecionadasParaAcoes}
        listasBots={listasBots}
      />

      {/* Modal Encher Grupos */}
      <EncherGruposModal
        isOpen={isEncherGruposModalOpen}
        onClose={() => setIsEncherGruposModalOpen(false)}
        onConfirm={handleConfirmEncherGrupos}
        selectedContas={contasSelecionadasParaAcoes}
      />
      
      <FiltrosModal
        isOpen={isFiltrosModalOpen}
        onClose={() => setIsFiltrosModalOpen(false)}
        filtrosTags={filtrosTags}
        onTagChange={(tag: FiltroTag) => {
          setFiltrosTags((prev) => {
            const newSet = new Set(prev)
            if (tag === 'Todas') {
              return new Set(['Todas'])
            }
            newSet.delete('Todas')
            if (newSet.has(tag)) {
              newSet.delete(tag)
            } else {
              // Se "Sem tags" for selecionada, remover todas as outras tags de status
              if (tag === 'Sem tags') {
                newSet.delete('Com grupos')
                newSet.delete('Sem grupos')
                newSet.delete('Grupos sem membros')
                newSet.delete('Sem lista')
                newSet.delete('Com bots')
              }
              newSet.add(tag)
            }
            return newSet
          })
        }}
        onLimparFiltros={() => {
          setFiltrosTags(new Set(['Todas']))
        }}
        categoriaFiltro={categoriaFiltro}
        onCategoriaFiltroChange={setCategoriaFiltro}
        categorias={categorias}
        onGerenciarTags={() => setIsGerenciarTagsModalOpen(true)}
      />
      
      <GerenciarTagsModal
        isOpen={isGerenciarTagsModalOpen}
        onClose={() => setIsGerenciarTagsModalOpen(false)}
        onTagChange={() => {
          loadContas()
        }}
      />
      
      {contaParaEditarTags && (
        <EditarTagsContaModal
          isOpen={isEditarTagsContaModalOpen}
          onClose={() => {
            setIsEditarTagsContaModalOpen(false)
            setContaParaEditarTags(null)
          }}
          numeroConta={contaParaEditarTags.numero}
          tagsAtuais={contaParaEditarTags.tags || []}
          onTagsChange={() => {
            loadContas()
          }}
        />
      )}

      {/* Modal Trocar Bots */}
      <TrocarBotModal
        isOpen={isTrocarBotModalOpen}
        onClose={() => setIsTrocarBotModalOpen(false)}
        onConfirm={handleConfirmTrocarBots}
        selectedContas={contasSelecionadasParaAcoes}
        botsMidia={botsMidia}
      />

      {/* Modal Alterar Categoria em Massa */}
      <AlterarCategoriaEmMassaModal
        isOpen={isAlterarCategoriaModalOpen}
        onClose={() => setIsAlterarCategoriaModalOpen(false)}
        onConfirm={handleConfirmAlterarCategoria}
        selectedContas={contasSelecionadasParaAcoes}
        categorias={categorias}
        onCategoriaCriada={loadCategorias}
      />

      {/* Modal Alterar Tags em Massa */}
      <AlterarTagsEmMassaModal
        isOpen={isAlterarTagsModalOpen}
        onClose={() => setIsAlterarTagsModalOpen(false)}
        onConfirm={handleConfirmAlterarTags}
        selectedContas={contasSelecionadasParaAcoes}
      />

      {/* Modal Apagar Grupos */}
      <ApagarGruposModal
        isOpen={isApagarGruposModalOpen}
        onClose={() => !isApagarGruposProcessing && setIsApagarGruposModalOpen(false)}
        onConfirm={handleConfirmApagarGrupos}
        selectedContas={contasSelecionadasParaAcoes}
        isProcessing={isApagarGruposProcessing}
      />

      {/* Modal Importar Contas (Legado) */}
      <ImportarContasModal
        isOpen={isImportarContasModalOpen}
        onClose={() => {
          setIsImportarContasModalOpen(false)
          setContasEncontradasImportacao([])
        }}
        onConfirm={handleConfirmarImportacao}
        contasEncontradas={contasEncontradasImportacao}
        isLoading={importandoContas}
      />

      {/* Modal Adicionar Contas (Novo) */}
      <AdicionarContasModal
        isOpen={isAdicionarContasModalOpen}
        onClose={() => setIsAdicionarContasModalOpen(false)}
        onSuccess={loadContas}
      />

      {/* Modal Criar Bot */}
      <CriarBotModal
        isOpen={isCriarBotModalOpen}
        onClose={() => setIsCriarBotModalOpen(false)}
        onConfirm={handleCriarBot}
        selectedContas={contasSelecionadasParaAcoes}
        onSuccess={() => {
          // Atualizar DataContext para a aba Bots mostrar o novo bot na hora
          refreshBots()
          refreshContas()
          loadBotsMidia()
          openTab('/bots-midia')
        }}
      />

      <VerificacaoResumoModal
        isOpen={showVerificacaoResumo}
        onClose={() => setShowVerificacaoResumo(false)}
        resumo={verificacaoResumo}
      />

      {/* Modal Criar API Automaticamente */}
      <CriarApiAutomaticaModal
        isOpen={isCriarApiModalOpen}
        onClose={() => setIsCriarApiModalOpen(false)}
        selectedAccountIds={Array.from(selectedContas).map(id => {
          const conta = contas.find(c => c.id === id)
          return conta?.numero?.toString() || conta?.id?.toString() || ''
        }).filter(Boolean)}
      />

      {/* Modal Verificar Membros dos Grupos */}
      <VerificarMembrosModal
        isOpen={isVerificarMembrosModalOpen}
        onClose={() => setIsVerificarMembrosModalOpen(false)}
        onSuccess={() => refreshContas()}
        onAbrirDetalhesConta={(numero) => setAbrirDetalhesNumero(numero)}
        selectedAccountIds={Array.from(selectedContas).map(id => {
          const conta = contas.find(c => c.id === id)
          return conta?.numero?.toString() || conta?.id?.toString() || ''
        }).filter(Boolean)}
      />

      <GerenciarBotsModal
        isOpen={isGerenciarBotsModalOpen}
        onClose={() => setIsGerenciarBotsModalOpen(false)}
      />

      {/* Modal Transferir contas para outra operação */}
      <TransferirEntreOpsModal
        isOpen={isTransferirEntreOpsModalOpen}
        onClose={() => setIsTransferirEntreOpsModalOpen(false)}
        selectedContas={contasSelecionadasParaAcoes}
        operacaoAtual={operacaoAtual}
        operacoes={operacoes}
        onConfirm={async (accountNumeros, operacaoDestinoPath) => {
          const result = await (window as any).electron?.telegram?.transferirContasEntreOps?.(accountNumeros, operacaoDestinoPath)
          if (!result?.success) {
            throw new Error(result?.error || result?.erros?.join('\n') || 'Erro ao transferir contas.')
          }
          refreshContas()
          setSelectedContas(new Set())
          setIsTransferirEntreOpsModalOpen(false)
        }}
      />
    </div>
  )
}
