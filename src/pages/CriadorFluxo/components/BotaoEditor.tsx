/**
 * Modal para criar/editar Botões/Planos - Estilo Minimalista
 */

import { useState, useEffect } from 'react'
import {
  X,
  Save,
  Plus,
  Trash2,
  MousePointer,
  DollarSign,
  Link,
} from 'lucide-react'
import { BotaoSalvo, Plano, VipGroup } from '../types/Fluxo'

interface BotaoEditorProps {
  isOpen: boolean
  botao: BotaoSalvo | null
  onClose: () => void
  onSave: (botao: BotaoSalvo) => void
  onSaveMultiple?: (botoes: BotaoSalvo[]) => void
}

interface PlanoTemp {
  id: string
  nome: string
  valor: number
  chatId: string
  duracaoDias: number
}

export function BotaoEditor({
  isOpen,
  botao,
  onClose,
  onSave,
  onSaveMultiple,
}: BotaoEditorProps) {
  const [planos, setPlanos] = useState<PlanoTemp[]>([])
  
  useEffect(() => {
    if (isOpen) {
      if (botao) {
        setPlanos([{
          id: botao.id,
          nome: botao.plano.name,
          valor: botao.plano.value,
          chatId: botao.plano.vipGroups[0]?.chatId || '',
          duracaoDias: botao.plano.vipGroups[0]?.durationDays || 30,
        }])
      } else {
        setPlanos([
          { id: `temp-${Date.now()}-1`, nome: '', valor: 0, chatId: '', duracaoDias: 30 },
          { id: `temp-${Date.now()}-2`, nome: '', valor: 0, chatId: '', duracaoDias: 30 },
          { id: `temp-${Date.now()}-3`, nome: '', valor: 0, chatId: '', duracaoDias: 30 },
        ])
      }
    }
  }, [isOpen, botao])
  
  if (!isOpen) return null
  
  const handleAddPlano = () => {
    setPlanos([...planos, {
      id: `temp-${Date.now()}`,
      nome: '',
      valor: 0,
      chatId: '',
      duracaoDias: 30,
    }])
  }
  
  const handleRemovePlano = (id: string) => {
    if (planos.length <= 1) return
    setPlanos(planos.filter(p => p.id !== id))
  }
  
  const handleUpdatePlano = (id: string, field: keyof PlanoTemp, value: string | number) => {
    setPlanos(planos.map(p => {
      if (p.id !== id) return p
      return { ...p, [field]: value }
    }))
  }
  
  const handleSave = () => {
    const planosValidos = planos.filter(p => p.nome.trim() !== '')
    
    if (planosValidos.length === 0) {
      alert('Adicione pelo menos um plano com nome')
      return
    }
    
    if (botao) {
      const p = planosValidos[0]
      const vipGroups: VipGroup[] = p.chatId.trim() ? [{
        chatId: p.chatId.trim(),
        durationDays: p.duracaoDias,
        name: p.nome,
      }] : []
      
      onSave({
        id: botao.id,
        nome: p.nome,
        plano: {
          name: p.nome,
          value: p.valor,
          vipGroups,
        },
      })
    } else {
      const novosBotoes: BotaoSalvo[] = planosValidos.map((p, index) => {
        const vipGroups: VipGroup[] = p.chatId.trim() ? [{
          chatId: p.chatId.trim(),
          durationDays: p.duracaoDias,
          name: p.nome,
        }] : []
        
        return {
          id: `btn-${Date.now()}-${index}`,
          nome: p.nome,
          plano: {
            name: p.nome,
            value: p.valor,
            vipGroups,
          },
        }
      })
      
      if (onSaveMultiple) {
        onSaveMultiple(novosBotoes)
      } else {
        novosBotoes.forEach(b => onSave(b))
      }
    }
    
    onClose()
  }
  
  const isEditMode = !!botao
  
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <MousePointer className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEditMode ? 'Editar Botão' : 'Cadastrar Botões'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditMode ? 'Edite o plano' : 'Adicione múltiplos planos de uma vez'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_90px_1fr_55px_36px] gap-2 mb-2 px-3">
            <span className="text-xs text-gray-500 flex items-center gap-1 uppercase tracking-wide">
              <MousePointer className="w-3 h-3" /> Nome
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 uppercase tracking-wide">
              <DollarSign className="w-3 h-3" /> Valor
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 uppercase tracking-wide">
              <Link className="w-3 h-3" /> Chat ID
            </span>
            <span className="text-xs text-gray-500 text-center uppercase tracking-wide">Dias</span>
            <span></span>
          </div>
          
          {/* Lista de planos */}
          <div className="space-y-2">
            {planos.map((plano, index) => (
              <div
                key={plano.id}
                className="grid grid-cols-[1fr_90px_1fr_55px_36px] gap-2 p-3 bg-[#0d1117] border border-gray-800 rounded-lg"
              >
                <input
                  type="text"
                  value={plano.nome}
                  onChange={(e) => handleUpdatePlano(plano.id, 'nome', e.target.value)}
                  placeholder={`Plano ${index + 1}`}
                  className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plano.valor}
                  onChange={(e) => handleUpdatePlano(plano.id, 'valor', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                />
                <input
                  type="text"
                  value={plano.chatId}
                  onChange={(e) => handleUpdatePlano(plano.id, 'chatId', e.target.value)}
                  placeholder="-1001234567890"
                  className="px-2.5 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 font-mono text-xs focus:outline-none focus:border-gray-600"
                />
                <input
                  type="number"
                  min="1"
                  value={plano.duracaoDias}
                  onChange={(e) => handleUpdatePlano(plano.id, 'duracaoDias', parseInt(e.target.value) || 30)}
                  className="px-2 py-1.5 bg-[#161b22] border border-gray-700 rounded text-sm text-gray-200 text-center focus:outline-none focus:border-gray-600"
                />
                <button
                  onClick={() => handleRemovePlano(plano.id)}
                  disabled={planos.length <= 1}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Botão adicionar */}
          {!isEditMode && (
            <button
              onClick={handleAddPlano}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0d1117] border-2 border-dashed border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Mais Planos
            </button>
          )}
          
          {/* Info */}
          <div className="mt-4 p-3 bg-[#0d1117] border border-gray-800 rounded-lg">
            <p className="text-xs text-gray-500">
              Planos sem nome serão ignorados. O Chat ID é opcional.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-400">{planos.filter(p => p.nome.trim()).length}</span> plano(s) válido(s)
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {isEditMode ? 'Salvar' : 'Cadastrar Todos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
