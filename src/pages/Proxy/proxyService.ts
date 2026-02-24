import { Proxy as ProxyType, ProxyFormData } from '@/types/Proxy'

export const proxyService = {
  async getAll(): Promise<ProxyType[]> {
    try {
      if (!window.electron?.proxy) {
        console.warn('[proxyService] Electron API não disponível')
        return []
      }

      const proxies = await window.electron.proxy.carregarTodos()
      return proxies.map((proxy: any) => ({
        id: proxy.id,
        nome: proxy.nome,
        endereco: proxy.endereco,
        porta: proxy.porta,
        tipo: proxy.tipo as ProxyType['tipo'],
        usuario: proxy.usuario,
        senha: proxy.senha,
        status: proxy.status as ProxyType['status'],
        padrao: proxy.padrao || false,
        ultimaVerificacao: proxy.ultimaVerificacao,
        createdAt: proxy.createdAt,
        updatedAt: proxy.updatedAt,
      }))
    } catch (error) {
      console.error('[proxyService] Erro ao carregar proxies:', error)
      return []
    }
  },

  async getById(id: number): Promise<ProxyType> {
    const proxies = await this.getAll()
    const proxy = proxies.find((p) => p.id === id)
    if (!proxy) {
      throw new Error('Proxy não encontrado')
    }
    return proxy
  },

  async create(data: ProxyFormData): Promise<ProxyType> {
    try {
      if (!window.electron?.proxy) {
        throw new Error('Electron API não disponível')
      }

      const result = await (window as any).electron.proxy.criar({
        nome: data.nome,
        endereco: data.endereco,
        porta: data.porta,
        tipo: data.tipo,
        usuario: data.usuario,
        senha: data.senha,
        status: data.status || 'Inativo',
        padrao: data.padrao || false,
      })

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar proxy')
      }

      // Retornar o proxy criado (precisa buscar novamente para ter o ID)
      const proxies = await this.getAll()
      const novoProxy = proxies.find(
        (p) => p.endereco === data.endereco && p.porta === data.porta
      )
      if (!novoProxy) {
        throw new Error('Proxy criado mas não encontrado')
      }
      return novoProxy
    } catch (error) {
      console.error('[proxyService] Erro ao criar proxy:', error)
      throw error
    }
  },

  async update(id: number, data: Partial<ProxyFormData>): Promise<ProxyType> {
    try {
      if (!window.electron?.proxy) {
        throw new Error('Electron API não disponível')
      }

      const updateData: any = {}
      if (data.nome !== undefined) updateData.nome = data.nome
      if (data.endereco !== undefined) updateData.endereco = data.endereco
      if (data.porta !== undefined) updateData.porta = data.porta
      if (data.tipo !== undefined) updateData.tipo = data.tipo
      if (data.usuario !== undefined) updateData.usuario = data.usuario
      if (data.senha !== undefined) updateData.senha = data.senha
      if (data.status !== undefined) updateData.status = data.status
      if (data.padrao !== undefined) updateData.padrao = data.padrao

      const result = await window.electron.proxy.atualizar(id, updateData)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar proxy')
      }

      return await this.getById(id)
    } catch (error) {
      console.error('[proxyService] Erro ao atualizar proxy:', error)
      throw error
    }
  },

  async delete(id: number): Promise<void> {
    try {
      if (!window.electron?.proxy) {
        throw new Error('Electron API não disponível')
      }

      const result = await window.electron.proxy.excluir(id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir proxy')
      }
    } catch (error) {
      console.error('[proxyService] Erro ao excluir proxy:', error)
      throw error
    }
  },

  async verificar(id: number): Promise<boolean> {
    try {
      if (!window.electron?.proxy) {
        throw new Error('Electron API não disponível')
      }

      const result = await window.electron.proxy.verificar(id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao verificar proxy')
      }

      return result.status === 'Ativo'
    } catch (error) {
      console.error('[proxyService] Erro ao verificar proxy:', error)
      throw error
    }
  },

  async setDefault(id: number): Promise<void> {
    try {
      if (!window.electron?.proxy) {
        throw new Error('Electron API não disponível')
      }

      const result = await (window as any).electron.proxy.definirPadrao(id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao definir proxy padrão')
      }
    } catch (error) {
      console.error('[proxyService] Erro ao definir proxy padrão:', error)
      throw error
    }
  },
}

