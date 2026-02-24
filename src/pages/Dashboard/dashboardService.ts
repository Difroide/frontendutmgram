import { contaService } from '@/pages/Contas/contaService'
import { botMidiaService } from '@/pages/BotsMidia/botMidiaService'
import { automacaoService } from '@/services/automacaoService'
import { logService } from '@/services/logService'
import { databaseService } from '@/services/databaseService'

export interface DashboardStats {
  totalContas: number
  botsAtivos: number
  tarefasHoje: number
  proxiesAtivos: number
  totalGrupos: number
  automacoesEmAndamento: number
  automacoesConcluidasHoje: number
  automacoesComErro: number
  logsTotal: number
  logsErros: number
  gruposCriadosHoje: number
  automacoesExecutadasHoje: number
  contasOnline: number
  contasCaidas: number
  contasSemGrupos: number
  gruposSemMembros: number
  gruposSemListas: number
}

export interface PieChartData {
  name: string
  value: number
  color?: string
}

export interface DashboardPieData {
  porNicho: PieChartData[]
  semNicho: number
  porCategoria: PieChartData[]
  semCategoria: number
  porTag: PieChartData[]
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      // Busca contas reais do sistema
      const contas = await contaService.getAll()
      const totalContas = contas.length

      // Bots ativos: contar bots reais cadastrados
      let botsAtivos = 0
      try {
        const bots = await botMidiaService.getAll()
        // Filtrar apenas bots ativos (se tiver status, senão contar todos)
        botsAtivos = bots.filter(bot => {
          // Se tiver status, contar apenas ativos
          if ('status' in bot && bot.status) {
            return bot.status === 'Ativo'
          }
          // Se não tiver status, contar todos
          return true
        }).length
      } catch (error) {
        console.error('Erro ao buscar bots para estatísticas:', error)
        // Se falhar, tentar contar pelos botsMidiaAdmin das contas
        const botsSet = new Set<string>()
        contas.forEach(conta => {
          if (conta.botsMidiaAdmin && conta.botsMidiaAdmin.length > 0) {
            conta.botsMidiaAdmin.forEach(bot => {
              const botNormalizado = bot.replace(/^@/, '').toLowerCase().trim()
              if (botNormalizado) {
                botsSet.add(botNormalizado)
              }
            })
          }
        })
        botsAtivos = botsSet.size
      }

      // Calcular total de grupos e grupos online
      let totalGrupos = 0
      let gruposOnline = 0
      let gruposOffline = 0

      contas.forEach(conta => {
        // Tentar obter grupos de diferentes formas
        let gruposConta = 0
        let gruposDetalhes: any[] = []

        // Se tem gruposDetalhes como array, usar ele
        if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
          gruposDetalhes = conta.gruposDetalhes
          gruposConta = gruposDetalhes.length
        }
        // Se grupos é um array, usar ele
        else if (Array.isArray(conta.grupos)) {
          gruposDetalhes = conta.grupos
          gruposConta = gruposDetalhes.length
        }
        // Se grupos é um número, usar ele
        else if (typeof conta.grupos === 'number') {
          gruposConta = conta.grupos
        }

        totalGrupos += gruposConta

        // Se tem gruposDetalhes como array, contar grupos online/offline
        if (gruposDetalhes.length > 0) {
          const gruposOnlineConta = gruposDetalhes.filter((grupo: any) => {
            // Grupo online se não tiver erro ou se status_online for true
            return grupo.status_online !== false && !grupo.erro_verificacao_online
          }).length
          const gruposOfflineConta = gruposDetalhes.length - gruposOnlineConta
          gruposOnline += gruposOnlineConta
          gruposOffline += gruposOfflineConta
        } else {
          // Se não tem detalhes, assumir que todos os grupos estão online (fallback)
          gruposOnline += gruposConta
        }
      })

      // Se não conseguiu calcular grupos online, usar total de grupos como base
      if (gruposOnline === 0 && totalGrupos > 0) {
        gruposOnline = totalGrupos
      }

      // Estatísticas de automações
      const automacoes = automacaoService.getAll()
      const automacoesEmAndamento = automacoes.filter(a => a.status === 'em-andamento' || a.status === 'pendente').length

      // Automações concluídas hoje
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const automacoesConcluidasHoje = automacoes.filter(a => {
        if (a.status !== 'concluida' || !a.dataFim) return false
        const dataFim = new Date(a.dataFim)
        dataFim.setHours(0, 0, 0, 0)
        return dataFim.getTime() === hoje.getTime()
      }).length

      const automacoesComErro = automacoes.filter(a => a.status === 'erro').length

      // Estatísticas de logs
      const logsStats = logService.getStats()
      const logsTotal = logsStats.total
      const logsErros = logsStats.byLevel.error

      // Calcular contas online e caídas
      // Contas caídas: banidas, congeladas, restritas
      const contasCaidas = contas.filter(conta => {
        if (!conta.tags || !Array.isArray(conta.tags)) return false
        return conta.tags.some(tag => {
          const tagLower = tag.toLowerCase()
          return tagLower.includes('banida') ||
            tagLower.includes('banned') ||
            tagLower.includes('congelada') ||
            tagLower.includes('frozen') ||
            tagLower.includes('usuário restrito') ||
            tagLower.includes('user restricted')
        })
      }).length

      const contasOnline = totalContas - contasCaidas

      // Calcular contas sem grupos (sem tag especial e sem grupos)
      const contasSemGrupos = contas.filter(conta => {
        const temTagEspecial = conta.tags?.some((tag: string) => {
          const tagLower = tag.toLowerCase()
          return tagLower.includes('congelada') ||
            tagLower.includes('banida') ||
            tagLower.includes('usuário restrito')
        }) || false
        return conta.grupos === 0 && !temTagEspecial
      }).length

      // Calcular grupos sem membros (grupos com 0 membros)
      let gruposSemMembros = 0
      contas.forEach(conta => {
        if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
          gruposSemMembros += conta.gruposDetalhes.filter((grupo: any) => {
            const membros = grupo.membros || 0
            return membros === 0
          }).length
        }
      })

      // Calcular grupos sem listas (grupos que não têm listas_adicionadas ou listas_adicionadas está vazio)
      // Um grupo tem lista se o campo listas_adicionadas existe e tem pelo menos um item
      let gruposSemListas = 0
      contas.forEach(conta => {
        if (conta.gruposDetalhes && Array.isArray(conta.gruposDetalhes)) {
          gruposSemListas += conta.gruposDetalhes.filter((grupo: any) => {
            // Verificar se o grupo tem listas adicionadas
            const listasAdicionadas = Array.isArray(grupo.listas_adicionadas) ? grupo.listas_adicionadas : []
            // Grupo sem lista se não tem listas_adicionadas ou está vazio
            return listasAdicionadas.length === 0
          }).length
        }
      })

      // Estatísticas do banco de dados (diárias)
      let gruposCriadosHoje = 0
      let automacoesExecutadasHoje = 0
      try {
        const todayStats = await databaseService.getTodayStats()
        gruposCriadosHoje = todayStats.gruposCriados || 0
        automacoesExecutadasHoje = todayStats.automacoesExecutadas || 0

        // Salvar estatísticas de contas no banco de dados (atualizar diariamente)
        await databaseService.saveAccountStats(contasOnline, contasCaidas)

        // Salvar estatísticas de grupos online
        // Obter estatísticas atuais do banco de dados
        const gruposOnlineAtual = todayStats.gruposOnline || 0

        // Calcular diferença apenas se houver mudança
        let gruposCriadosHojeDiff = todayStats.gruposCriadosHoje || 0
        let gruposCaidosHojeDiff = todayStats.gruposCaidosHoje || 0

        // Se não há valor salvo ainda ou o valor mudou, atualizar
        if (gruposOnlineAtual === 0 && gruposOnline > 0) {
          // Primeira vez salvando, usar o valor atual como base
          gruposCriadosHojeDiff = 0
          gruposCaidosHojeDiff = 0
        } else if (gruposOnline !== gruposOnlineAtual) {
          // Valor mudou, calcular diferença
          if (gruposOnline > gruposOnlineAtual) {
            // Mais grupos online hoje = grupos foram criados
            gruposCriadosHojeDiff = gruposOnline - gruposOnlineAtual
            gruposCaidosHojeDiff = 0
          } else {
            // Menos grupos online hoje = grupos caíram
            gruposCaidosHojeDiff = gruposOnlineAtual - gruposOnline
            gruposCriadosHojeDiff = 0
          }
        }

        // Sempre salvar o valor atual de grupos online (atualizar sempre)
        await databaseService.saveGruposStats(gruposOnline, gruposCriadosHojeDiff, gruposCaidosHojeDiff)

        console.log(`[dashboardService] Grupos online salvos: ${gruposOnline} (anterior: ${gruposOnlineAtual}, criados hoje: ${gruposCriadosHojeDiff}, caídos hoje: ${gruposCaidosHojeDiff})`)
      } catch (error) {
        console.error('Erro ao obter estatísticas diárias:', error)
      }

      return {
        totalContas,
        botsAtivos,
        tarefasHoje: automacoesConcluidasHoje,
        proxiesAtivos: 0,
        totalGrupos,
        automacoesEmAndamento,
        automacoesConcluidasHoje,
        automacoesComErro,
        logsTotal,
        logsErros,
        gruposCriadosHoje,
        automacoesExecutadasHoje,
        contasOnline,
        contasCaidas,
        contasSemGrupos,
        gruposSemMembros,
        gruposSemListas,
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      // Retorna valores padrão em caso de erro
      return {
        totalContas: 0,
        botsAtivos: 0,
        tarefasHoje: 0,
        proxiesAtivos: 0,
        totalGrupos: 0,
        automacoesEmAndamento: 0,
        automacoesConcluidasHoje: 0,
        automacoesComErro: 0,
        logsTotal: 0,
        logsErros: 0,
        gruposCriadosHoje: 0,
        automacoesExecutadasHoje: 0,
        contasOnline: 0,
        contasCaidas: 0,
        contasSemGrupos: 0,
        gruposSemMembros: 0,
        gruposSemListas: 0,
      }
    }
    // Quando a API estiver pronta:
    // return ApiService.get<DashboardStats>('/dashboard/stats')
  },

  async getPieChartData(): Promise<DashboardPieData> {
    try {
      const contas = await contaService.getAll()

      // Carregar categorias
      let categorias: Array<{ id: string; nome: string }> = []
      try {
        if (window.electron?.criador?.carregarCategorias) {
          categorias = await window.electron.criador.carregarCategorias()
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      }

      // Contagem de grupos por categoria
      const gruposPorCategoria: Record<string, { nome: string; grupos: number }> = {}
      let gruposSemCategoria = 0

      // Inicializar contadores por categoria
      categorias.forEach(categoria => {
        gruposPorCategoria[categoria.id] = { nome: categoria.nome, grupos: 0 }
      })

      // Contar grupos por categoria (baseado nas contas)
      contas.forEach(conta => {
        const grupos = conta.grupos || 0
        if (conta.categoriaId && gruposPorCategoria[conta.categoriaId]) {
          gruposPorCategoria[conta.categoriaId].grupos += grupos
        } else {
          gruposSemCategoria += grupos
        }
      })

      // Preparar dados do gráfico por categoria
      const porCategoria: PieChartData[] = Object.entries(gruposPorCategoria)
        .filter(([_, data]) => data.grupos > 0)
        .map(([_, data]) => ({
          name: data.nome,
          value: data.grupos,
        }))
        .sort((a, b) => b.value - a.value)

      // Adicionar "Sem Categoria" se houver
      if (gruposSemCategoria > 0) {
        porCategoria.push({
          name: 'Sem Categoria',
          value: gruposSemCategoria,
        })
      }

      // Contagem de contas por tags (distribuição de tags)
      const tagsCount: Record<string, number> = {}
      contas.forEach(conta => {
        if (conta.tags && Array.isArray(conta.tags)) {
          conta.tags.forEach(tag => {
            tagsCount[tag] = (tagsCount[tag] || 0) + 1
          })
        }
      })

      const porTag: PieChartData[] = Object.entries(tagsCount)
        .map(([tag, count]) => ({
          name: tag,
          value: count,
        }))
        .sort((a, b) => b.value - a.value)

      // Manter porNicho e semNicho para compatibilidade (mas não usado)
      return {
        porNicho: [],
        semNicho: 0,
        porCategoria,
        semCategoria: gruposSemCategoria,
        porTag,
      }
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error)
      return {
        porNicho: [],
        semNicho: 0,
        porCategoria: [],
        semCategoria: 0,
        porTag: [],
      }
    }
  },

  async getAccountHistory(days: number = 7): Promise<Array<{ date: string; contasOnline: number; contasCaidas: number }>> {
    try {
      const history = await databaseService.getStatsLastDays(days)
      return history.map(item => ({
        date: item.date,
        contasOnline: item.contasOnline || 0,
        contasCaidas: item.contasCaidas || 0,
      }))
    } catch (error) {
      console.error('Erro ao obter histórico de contas:', error)
      // Retornar array vazio em caso de erro (API não disponível ainda)
      return []
    }
  },

  async getGruposOnlineHistory(days: number = 7): Promise<Array<{ date: string; gruposOnline: number; gruposCriadosHoje: number; gruposCaidosHoje: number }>> {
    try {
      const history = await databaseService.getStatsLastDays(days)
      return history.map(item => ({
        date: item.date,
        gruposOnline: item.gruposOnline || 0,
        gruposCriadosHoje: item.gruposCriadosHoje || 0,
        gruposCaidosHoje: item.gruposCaidosHoje || 0,
      }))
    } catch (error) {
      console.error('Erro ao obter histórico de grupos online:', error)
      return []
    }
  },

  /**
   * Buscar histórico de grupos (últimos 7 dias) para o Line Chart
   * Usa os dados salvos pela verificação diária (banco de dados local)
   */
  async getHistoricalGroupData(): Promise<Array<{ date: string; online: number; offline: number }>> {
    try {
      // Tenta buscar do databaseService (stats salvos dia a dia)
      const stats = await databaseService.getStatsLastDays(7)
      if (stats && stats.length > 0) {
        return stats.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          online: item.gruposOnline || 0,
          offline: item.gruposCaidosHoje || 0,
        }))
      }
      // Sem dados históricos salvos ainda
      return []
    } catch (error) {
      console.warn('[dashboardService] Erro ao buscar histórico de grupos:', error)
      return []
    }
  }
}

