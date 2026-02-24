export interface Grupo {
  nome: string
  membros: number
  id?: number | string
  link_convite?: string
  bot_midia_admin?: string
  bots_midia_admin?: string[]
  bots_lista_admin?: string[]
}

export interface Conta {
  id: number
  numero: string // Número do Telegram
  grupos: number // Quantidade de grupos online (exclui caídos)
  tags: string[]
  pastaPath: string // Caminho da pasta do número
  botsMidiaAdmin?: string[] // Lista de bots de mídia que são admin nos grupos desta conta
  gruposDetalhes?: Grupo[] // Array opcional com detalhes dos grupos (incluindo membros)
  categoriaId?: string // ID da categoria associada à conta
  sessaoCompleta?: boolean // true se tem tdata (sessão completa), false se tem apenas .session
  ultimoUso?: string // Data/hora do último uso da sessão (ISO string)
  sessaoAlerta?: boolean // true quando todos os grupos caíram (0 online) - possivel sessão caiu
}

export interface Bot {
  id: number | string
  name: string
}

export type FiltroTipo = 'Todas' | 'Bots' | 'Grupos' | 'Membros'
export type FiltroTag =
  | 'Todas'
  | 'Com grupos'
  | 'Sem grupos'
  | 'Grupos sem membros'
  | 'Grupos com erro'
  | 'Sem lista'
  | 'SEM LISTA-URGENTE'
  | 'Usuário restrito'
  | 'Congeladas'
  | 'Sem tags'
  | 'Banidas'
  | 'Com bots'
  | 'Sem membros suficientes'
  | 'Pronta para uso'
  | 'Bots Criados'
  | 'Verificador disparo'
  | 'Verificador Bots'

