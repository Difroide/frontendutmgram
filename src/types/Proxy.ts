export interface Proxy {
  id: number
  nome?: string
  endereco: string
  porta: number
  tipo: 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5'
  usuario?: string
  senha?: string
  status: 'Ativo' | 'Inativo' | 'Erro'
  padrao?: boolean // Se é a proxy padrão do sistema
  ultimaVerificacao?: string
  createdAt?: string
  updatedAt?: string
}

export type ProxyFormData = Omit<Proxy, 'id' | 'createdAt' | 'updatedAt' | 'ultimaVerificacao'>

