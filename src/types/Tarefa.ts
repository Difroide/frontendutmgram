export interface Tarefa {
  id: number
  titulo: string
  descricao?: string
  status: 'Pendente' | 'Em Andamento' | 'Concluída' | 'Cancelada'
  prioridade: 'Baixa' | 'Média' | 'Alta'
  tipo?: string
  dataAgendamento?: string
  dataConclusao?: string
  botId?: number
  contaId?: number
  createdAt?: string
  updatedAt?: string
}

export type TarefaFormData = Omit<Tarefa, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>

