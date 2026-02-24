import { useState, useEffect } from 'react'
import { Users, ExternalLink, RefreshCw, FileText, Search, CheckCircle } from 'lucide-react'
import { VerificarTodosGruposModal } from './VerificarTodosGruposModal'
import { useData } from '@/contexts/DataContext'

interface Grupo {
  id: string | number
  nome: string
  membros: number
  link: string
  contaId: string
  categoriaId?: string | null
  status?: 'on' | 'off'
}

interface Categoria {
  id: string
  nome: string
  rodando?: boolean
}

interface GrupoEncontrado extends Grupo {
  nomeBuscado?: string
}

export default function GruposList() {
  const { refreshContas } = useData()
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(false)
  const [isVerificarMembrosModalOpen, setIsVerificarMembrosModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'online' | 'offline' | 'logs'>('online')
  const [logText, setLogText] = useState('')
  const [gruposEncontrados, setGruposEncontrados] = useState<GrupoEncontrado[]>([])
  const [buscandoLogs, setBuscandoLogs] = useState(false)
  const [nomesExtraidosCount, setNomesExtraidosCount] = useState<number>(0)
  const [nomesNaoEncontrados, setNomesNaoEncontrados] = useState<string[]>([])
  const [buscaRealizada, setBuscaRealizada] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sincronizando, setSincronizando] = useState(false)
  const [verificandoSessao, setVerificandoSessao] = useState<string | null>(null)

  const loadCategorias = async () => {
    try {
      // Aguardar um pouco para garantir que a API está disponível
      await new Promise(resolve => setTimeout(resolve, 100))

      let tentativas = 0
      const maxTentativas = 5

      while (tentativas < maxTentativas) {
        if ((window as any).electron?.criador?.carregarCategorias) {
          try {
            const data = await (window as any).electron.criador.carregarCategorias()
            if (data && Array.isArray(data)) {
              // Carregar TODAS as categorias (sem filtrar por rodando)
              // Isso é necessário para exibir corretamente as categorias dos grupos,
              // independente de estarem rodando ou não
              setCategorias(data || [])
              return
            }
          } catch (error) {
            console.error(`[GruposList] Erro na tentativa ${tentativas + 1} ao carregar categorias:`, error)
          }
        }
        tentativas++
        if (tentativas < maxTentativas) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadGrupos = async () => {
    try {
      setLoading(true)
      // Aguardar um pouco para garantir que a API está disponível
      await new Promise(resolve => setTimeout(resolve, 100))

      let tentativas = 0
      const maxTentativas = 5

      while (tentativas < maxTentativas) {
        if ((window as any).electron?.contingencia?.listarTodosGrupos) {
          try {
            const gruposList = await (window as any).electron.contingencia.listarTodosGrupos()
            if (gruposList) {
              setGrupos(gruposList || [])
              return
            }
          } catch (error) {
            console.error(`[GruposList] Erro na tentativa ${tentativas + 1} ao carregar grupos:`, error)
          }
        }
        tentativas++
        if (tentativas < maxTentativas) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    } finally {
      setLoading(false)
    }
  }

  const sincronizarCategorias = async () => {
    try {
      setSincronizando(true)

      // Aguardar um pouco para garantir que a API está disponível
      await new Promise(resolve => setTimeout(resolve, 100))

      if ((window as any).electron?.contingencia?.sincronizarCategoriasGrupos) {
        const result = await (window as any).electron.contingencia.sincronizarCategoriasGrupos()

        if (result.success) {
          alert(`Sincronização concluída!\n\n- ${result.gruposAtualizados} grupo(s) atualizado(s)\n- ${result.contasAtualizadas} conta(s) atualizada(s)`)
          // Recarregar grupos após sincronização
          await loadGrupos()
        } else {
          alert(`Erro ao sincronizar: ${result.error || 'Erro desconhecido'}`)
        }
      } else {
        alert('Função de sincronização não disponível. Tente novamente em alguns segundos.')
      }
    } catch (error) {
      console.error('Erro ao sincronizar categorias:', error)
      alert('Erro ao sincronizar categorias: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setSincronizando(false)
    }
  }

  useEffect(() => {
    // Aguardar um pouco antes de carregar para garantir que a API está disponível
    const timer = setTimeout(() => {
      loadGrupos()
      loadCategorias()
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  // Recarregar grupos quando verificação de contas terminar (grupos são atualizados no JSON)
  useEffect(() => {
    const handler = () => {
      console.log('[GruposList] Verificação concluída, recarregando grupos...')
      loadGrupos()
    }
    window.addEventListener('verificacao-contas-completa', handler)
    return () => window.removeEventListener('verificacao-contas-completa', handler)
  }, [])

  // Recarregar grupos quando verificação de membros terminar
  useEffect(() => {
    const handler = () => {
      loadGrupos()
      refreshContas()
    }
    window.addEventListener('verificacao-membros-completa', handler)
    return () => window.removeEventListener('verificacao-membros-completa', handler)
  }, [refreshContas])

  const gruposFiltrados = grupos.filter(grupo => {
    // Filtrar por aba (status)
    const statusGrupo = grupo.status || 'on' // Default para 'on' se não vier do backend
    if (activeTab === 'online' && statusGrupo !== 'on') return false
    if (activeTab === 'offline' && statusGrupo !== 'off') return false

    // Filtrar por busca
    return (
      grupo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grupo.contaId.includes(searchTerm) ||
      (grupo.link && grupo.link.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const handleOpenLink = (link: string) => {
    if (link) {
      window.open(link, '_blank')
    }
  }

  const handleVerificarSessao = async (contaId: string) => {
    if (!contaId || verificandoSessao) {
      return
    }

    try {
      setVerificandoSessao(contaId)

      // Verificar se a API está disponível
      if (!(window as any).electron?.telegram?.verificarContas) {
        alert('Função de verificação não disponível. Tente novamente em alguns segundos.')
        return
      }

      // Mostrar confirmação
      const confirmar = confirm(
        `Deseja verificar a sessão da conta ${contaId}?\n\n` +
        `Isso irá realizar uma verificação COMPLETA da conta, incluindo:\n` +
        `• Verificação de FROZEN\n` +
        `• Verificação de SPAM\n` +
        `• Verificação de BotFather\n` +
        `• Status da sessão\n\n` +
        `Isso pode levar alguns segundos.`
      )

      if (!confirmar) {
        setVerificandoSessao(null)
        return
      }

      // Chamar verificação avançada (completa) para uma única conta
      const result = await (window as any).electron.telegram.verificarContas(
        [contaId], // Array com apenas a conta do grupo
        'advanced', // Verificação completa
        1, // Uma sessão por vez
        null // Sem proxy específico
      )

      // Verificar se houve erro geral
      if (!result || (result.success === false && !result.results)) {
        const errorMsg = result?.error || 'Erro desconhecido'
        console.error('[GruposList] Erro na verificação:', result)
        alert(`Erro ao verificar sessão: ${errorMsg}`)
        return
      }

      // Buscar resultado da conta (pode estar em results ou errors)
      const contaResultado = result.results?.find((r: any) => r.accountId === contaId) ||
        result.errors?.find((e: any) => e.accountId === contaId)

      if (contaResultado) {
        let mensagem = `✅ Verificação concluída!\n\n`
        mensagem += `Conta: ${contaId}\n`

        // Verificar status da conta
        if (contaResultado.banned) {
          mensagem += `⚠️ Status: BANIDA\n`
          mensagem += `\nA conta foi marcada como banida e seus grupos foram removidos da lista.`
        } else if (contaResultado.frozen) {
          mensagem += `⚠️ Status: CONGELADA\n`
          mensagem += `\nA conta foi marcada como congelada e seus grupos foram removidos da lista.`
        } else if (contaResultado.restricted) {
          mensagem += `⚠️ Status: RESTRITA\n`
        } else if (contaResultado.success === false) {
          mensagem += `❌ Status: ERRO\n`
          mensagem += `\nErro: ${contaResultado.error || 'Erro desconhecido'}`
        } else {
          mensagem += `✅ Status: ATIVA\n`
        }

        if (contaResultado.groupsProcessed !== undefined) {
          mensagem += `\nGrupos processados: ${contaResultado.groupsProcessed}`
        }

        if (contaResultado.groupsTotal !== undefined || contaResultado.groupsOnline !== undefined || contaResultado.groupsOffline !== undefined) {
          const gruposCriados = contaResultado.groupsTotal ?? contaResultado.groupsProcessed ?? 0
          const gruposOnline = contaResultado.groupsOnline ?? 0
          const gruposCaidos = contaResultado.groupsOffline ?? 0
          mensagem += `\nGrupos criados: ${gruposCriados}`
          mensagem += `\nGrupos online: ${gruposOnline}`
          mensagem += `\nGrupos caídos: ${gruposCaidos}`
        }

        if (contaResultado.status) {
          mensagem += `\nStatus detalhado: ${contaResultado.status}`
        }

        alert(mensagem)

        // Recarregar grupos para atualizar a lista (grupos de contas banidas/congeladas serão removidos)
        await loadGrupos()
      } else {
        // Se não encontrou resultado específico, verificar se há resultados gerais
        if (result.results && result.results.length > 0) {
          const primeiroResultado = result.results[0]
          let mensagem = `✅ Verificação concluída!\n\n`
          mensagem += `Conta: ${contaId}\n`

          if (primeiroResultado.banned) {
            mensagem += `⚠️ Status: BANIDA\n`
          } else if (primeiroResultado.frozen) {
            mensagem += `⚠️ Status: CONGELADA\n`
          } else {
            mensagem += `✅ Status: Verificado\n`
          }

          alert(mensagem)
          await loadGrupos()
        } else {
          console.warn('[GruposList] Resultado não encontrado:', result)
          alert('Verificação concluída, mas não foi possível obter o resultado detalhado da conta.')
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
      alert(`Erro ao verificar sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setVerificandoSessao(null)
    }
  }

  const getCategoriaNome = (categoriaId: string | null | undefined): string => {
    if (!categoriaId) return 'Sem categoria'
    const categoria = categorias.find(c => c.id === categoriaId)
    return categoria ? categoria.nome : 'Categoria não encontrada'
  }

  // Função para parsear logs e extrair nomes de grupos
  const parsearLogs = (texto: string): string[] => {
    const nomesGrupos: string[] = []
    const linhas = texto.split('\n')
    // Separadores: — (em-dash U+2014), - (hífen), – (en-dash U+2013)
    const regex = /Grupo:\s*([^—\-–]+?)(?:\s*[—\-–]|$)/i

    for (const linha of linhas) {
      const match = linha.match(regex)
      if (match && match[1]) {
        const nomeGrupo = match[1].trim()
        if (nomeGrupo && !nomesGrupos.includes(nomeGrupo)) {
          nomesGrupos.push(nomeGrupo)
        }
      }
    }

    return nomesGrupos
  }

  const buscarGruposPorLogs = async () => {
    if (!logText.trim()) {
      alert('Cole os logs primeiro')
      return
    }

    try {
      setBuscandoLogs(true)
      setBuscaRealizada(false)
      const nomesGrupos = parsearLogs(logText)

      if (nomesGrupos.length === 0) {
        alert('Nenhum grupo encontrado nos logs. Verifique o formato (ex.: "Grupo: Nome — Erro: ...").')
        return
      }

      setNomesExtraidosCount(nomesGrupos.length)

      if (!(window as any).electron?.contingencia?.buscarGruposPorNomes) {
        alert('Função de busca não disponível')
        return
      }

      const grupos = await (window as any).electron.contingencia.buscarGruposPorNomes(nomesGrupos) || []
      setGruposEncontrados(grupos)

      const encontradosSet = new Set(
        grupos.map((g: GrupoEncontrado) => (g.nomeBuscado ?? '').trim().normalize('NFC'))
      )
      const naoEncontrados = nomesGrupos.filter(
        (n) => !encontradosSet.has(n.trim().normalize('NFC'))
      )
      setNomesNaoEncontrados(naoEncontrados)
      setBuscaRealizada(true)
    } catch (error) {
      console.error('Erro ao buscar grupos:', error)
      alert('Erro ao buscar grupos: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setBuscandoLogs(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('online')}
          className={`px-4 py-2.5 font-medium transition-colors rounded-t-lg -mb-px ${activeTab === 'online'
              ? 'text-green-400 border-b-2 border-green-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Grupos Online
            <span className="bg-gray-700/50 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {grupos.filter(g => (g.status || 'on') === 'on').length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('offline')}
          className={`px-4 py-2.5 font-medium transition-colors rounded-t-lg -mb-px ${activeTab === 'offline'
              ? 'text-red-400 border-b-2 border-red-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Grupos Offline (Ignorados)
            <span className="bg-gray-700/50 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {grupos.filter(g => g.status === 'off').length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 font-medium transition-colors rounded-t-lg -mb-px ${activeTab === 'logs'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Buscar por Logs
          </div>
        </button>
      </div>

      {activeTab !== 'logs' ? (
        <>
          {/* Header com busca e refresh */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar por nome do grupo, conta ou link..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-600 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={sincronizarCategorias}
                disabled={sincronizando}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                title="Sincronizar categorias dos grupos existentes"
              >
                <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
                {sincronizando ? 'Sincronizando...' : 'Sincronizar Categorias'}
              </button>
              <button
                onClick={loadGrupos}
                disabled={loading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => setIsVerificarMembrosModalOpen(true)}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
                title="Verificar membros e status de todos os grupos da aba"
              >
                <Users className="w-4 h-4" />
                Verificar Membros
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-sm text-gray-400">
            {gruposFiltrados.length} de {grupos.length} grupos
          </div>

          {/* Lista de grupos */}
          {loading && grupos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              Carregando grupos...
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum grupo encontrado
            </div>
          ) : (
            <div className="bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nome do Grupo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Membros</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Conta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Categoria</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {gruposFiltrados.map((grupo, index) => (
                      <tr
                        key={`${grupo.contaId}-${grupo.id}-${index}`}
                        className={`hover:bg-gray-700/30 transition-colors ${index % 2 === 1 ? 'bg-gray-800/20' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-200 font-medium">{grupo.nome}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span>{grupo.membros.toLocaleString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{grupo.contaId}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs ${grupo.categoriaId
                              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                              : 'bg-gray-700/50 text-gray-400'
                            }`}>
                            {getCategoriaNome(grupo.categoriaId)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {grupo.link ? (
                              <button
                                onClick={() => handleOpenLink(grupo.link)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                title="Abrir grupo no Telegram"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Abrir
                              </button>
                            ) : (
                              <span className="text-gray-500 text-sm">Sem link</span>
                            )}
                            <button
                              onClick={() => handleVerificarSessao(grupo.contaId)}
                              disabled={verificandoSessao === grupo.contaId || !!verificandoSessao}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                              title="Verificar sessão da conta (verificação completa)"
                            >
                              {verificandoSessao === grupo.contaId ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Verificar
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Área do log */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cole o relatório de erros
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Ex.: &quot;Grupo: Nome — Erro: Channel_private&quot;. Apenas os nomes dos grupos serão usados para busca exata no sistema.
            </p>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder={'Grupo: 💀 ❌ 𝑽𝑨𝒁𝑨𝑫𝑶𝑺 𝑫𝑨𝑹𝑲 — Erro: Channel_private\nGrupo: Sussurros Escandalosos 🍑 — Erro: Channel_private\n...'}
              rows={12}
              className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y min-h-[180px]"
            />
          </div>

          {/* Ação */}
          <div className="flex items-center gap-4">
            <button
              onClick={buscarGruposPorLogs}
              disabled={buscandoLogs || !logText.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center gap-2 transition-colors font-medium"
            >
              <Search className={`w-4 h-4 ${buscandoLogs ? 'animate-spin' : ''}`} />
              {buscandoLogs ? 'Buscando...' : 'Buscar grupos'}
            </button>
          </div>

          {/* Resumo (após busca) */}
          {buscaRealizada && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
              <span className="text-sm text-gray-300">
                <strong className="text-gray-100">{nomesExtraidosCount}</strong> nome(s) extraído(s) do log
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-sm text-gray-300">
                <strong className="text-emerald-400">{gruposEncontrados.length}</strong> encontrado(s) no sistema
              </span>
              {nomesNaoEncontrados.length > 0 && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-sm text-amber-400/90">
                    <strong>{nomesNaoEncontrados.length}</strong> sem correspondência
                  </span>
                </>
              )}
            </div>
          )}

          {/* Estado vazio: nenhum encontrado */}
          {buscaRealizada && gruposEncontrados.length === 0 && (
            <div className="text-center py-12 px-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <p className="text-gray-400">
                Nenhum grupo cadastrado encontrado para os {nomesExtraidosCount} nome(s) extraído(s) do log.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                A busca é exata: o nome no log deve ser idêntico ao nome do grupo no sistema.
              </p>
            </div>
          )}

          {/* Tabela: apenas grupos encontrados */}
          {buscaRealizada && gruposEncontrados.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-gray-400">
                Mostrando apenas os grupos encontrados
              </div>
              <div className="bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome no log</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nome do grupo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Membros</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Conta</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Categoria</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {gruposEncontrados.map((grupo, index) => (
                        <tr
                          key={`${grupo.contaId}-${grupo.id}-${index}`}
                          className={`hover:bg-gray-700/30 transition-colors ${index % 2 === 1 ? 'bg-gray-800/20' : ''}`}
                        >
                          <td className="px-4 py-3 text-gray-400 text-sm font-mono truncate max-w-[200px]" title={grupo.nomeBuscado || '-'}>
                            {grupo.nomeBuscado || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-100 font-medium">{grupo.nome}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Users className="w-4 h-4 flex-shrink-0" />
                              <span>{grupo.membros.toLocaleString('pt-BR')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{grupo.contaId}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs ${grupo.categoriaId
                                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                : 'bg-gray-700/50 text-gray-400'
                              }`}>
                              {getCategoriaNome(grupo.categoriaId)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {grupo.link ? (
                                <button
                                  onClick={() => handleOpenLink(grupo.link)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                  title="Abrir grupo no Telegram"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Abrir
                                </button>
                              ) : (
                                <span className="text-gray-500 text-sm">Sem link</span>
                              )}
                              <button
                                onClick={() => handleVerificarSessao(grupo.contaId)}
                                disabled={verificandoSessao === grupo.contaId || !!verificandoSessao}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                title="Verificar sessão da conta"
                              >
                                {verificandoSessao === grupo.contaId ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                {verificandoSessao === grupo.contaId ? 'Verificando...' : 'Verificar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <VerificarTodosGruposModal
        isOpen={isVerificarMembrosModalOpen}
        onClose={() => setIsVerificarMembrosModalOpen(false)}
        onSuccess={() => {
          loadGrupos()
          refreshContas()
        }}
      />
    </div>
  )
}
