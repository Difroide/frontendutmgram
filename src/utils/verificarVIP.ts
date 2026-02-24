import { Conta } from '@/types/Conta'

interface VipInfo {
  sessionPath: string
  sessionName: string
  groupLink: string
  grupoNome: string
  dataCriacao: string
}

interface VerificacaoVIP {
  temVIP: boolean
  sessoesVIP: Array<{ conta: Conta; info: VipInfo }>
}

/**
 * Verifica se as contas selecionadas têm grupos VIP
 */
export async function verificarSessoesVIP(
  contas: Conta[]
): Promise<VerificacaoVIP> {
  try {
    if (!window.electron?.contingencia?.verificarVIPsLote) {
      console.warn('[verificarVIP] API não disponível')
      return { temVIP: false, sessoesVIP: [] }
    }

    // Construir caminhos das sessões para cada conta
    const pathsParaVerificar: string[] = []
    const mapaContaPath = new Map<string, Conta[]>()

    for (const conta of contas) {
      // Tentar diferentes formatos de caminho
      const possiblePaths = []

      // Formato 1: pastaPath completo + numero.session
      if (conta.pastaPath) {
        possiblePaths.push(`${conta.pastaPath}/${conta.numero}.session`)
      }

      // Formato 2: contas telegram/{numero}/{numero}.session (formato padrão)
      possiblePaths.push(`contas telegram/${conta.numero}/${conta.numero}.session`)

      for (const path of possiblePaths) {
        if (!pathsParaVerificar.includes(path)) {
          pathsParaVerificar.push(path)
          if (!mapaContaPath.has(path)) {
            mapaContaPath.set(path, [])
          }
          mapaContaPath.get(path)!.push(conta)
        }
      }
    }

    if (pathsParaVerificar.length === 0) {
      return { temVIP: false, sessoesVIP: [] }
    }

    // Verificar todas as sessões de uma vez
    const resultados = await window.electron.contingencia.verificarVIPsLote(pathsParaVerificar)

    const sessoesVIP: Array<{ conta: Conta; info: VipInfo }> = []
    const contasProcessadas = new Set<string>()

    // Processar resultados (verificarVIPsLote retorna array de { path, isVIP })
    if (Array.isArray(resultados)) {
      for (const item of resultados) {
        if (item.isVIP) {
          const contasAssociadas = mapaContaPath.get(item.path) || []
          
          for (const conta of contasAssociadas) {
            const key = conta.numero
            if (!contasProcessadas.has(key)) {
              contasProcessadas.add(key)
              // Criar info básico se for VIP (dados completos podem ser obtidos depois se necessário)
              sessoesVIP.push({
                conta,
                info: {
                  sessionPath: item.path,
                  sessionName: item.path.split(/[/\\]/).pop() || conta.numero,
                  groupLink: '',
                  grupoNome: 'Grupo VIP',
                  dataCriacao: new Date().toISOString(),
                },
              })
            }
          }
        }
      }
    }

    return {
      temVIP: sessoesVIP.length > 0,
      sessoesVIP,
    }
  } catch (error) {
    console.error('[verificarVIP] Erro ao verificar VIP:', error)
    return { temVIP: false, sessoesVIP: [] }
  }
}

/**
 * Mostra um alerta se houver sessões com grupo VIP
 */
export function mostrarAlertaVIP(sessoesVIP: Array<{ conta: Conta; info: VipInfo }>): boolean {
  if (sessoesVIP.length === 0) {
    return false
  }

  const sessoesList = sessoesVIP
    .map(({ conta, info }) => {
      let linha = `• Número: ${conta.numero}`
      if (info.grupoNome) {
        linha += `\n  Grupo VIP: ${info.grupoNome}`
      }
      if (info.groupLink) {
        linha += `\n  Link: ${info.groupLink}`
      }
      if (info.dataCriacao) {
        const data = new Date(info.dataCriacao).toLocaleDateString('pt-BR')
        linha += `\n  Criado em: ${data}`
      }
      return linha
    })
    .join('\n\n')

  const mensagem = `⚠️ AVISO: Sessão(ões) com Grupo VIP detectada(s)!\n\n` +
    `As seguintes sessões foram usadas no Clonador VIP e são muito importantes.\n` +
    `Elas NÃO podem ser usadas para outras operações (criar grupos, adicionar listas, encher grupos).\n\n` +
    `${sessoesList}\n\n` +
    `Por favor, selecione outras sessões.`

  alert(mensagem)
  return true
}

