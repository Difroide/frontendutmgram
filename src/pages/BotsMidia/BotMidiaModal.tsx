import { useEffect, useState } from 'react'
import { DollarSign, PlusCircle, Send, X } from 'lucide-react'
import { BotMidia, BotMidiaFormData } from '@/types/BotMidia'

interface Categoria {
  id: string
  nome: string
  rodando?: boolean
}

interface BotMidiaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BotMidiaFormData) => void
  bot?: BotMidia | null
}

export const BotMidiaModal = ({ isOpen, onClose, onSave, bot }: BotMidiaModalProps) => {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  const [tipoBot, setTipoBot] = useState<'vendas' | 'disparo'>('vendas')

  useEffect(() => {
    if (isOpen) {
      loadCategorias()
      setTipoBot(bot?.tipoBot || 'vendas')
    }
  }, [isOpen, bot])

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true)
      if (window.electron?.criador) {
        const categoriasCarregadas = await window.electron.criador.carregarCategorias()
        const categoriasFiltradas = (categoriasCarregadas || []).filter((cat: Categoria) => !cat.rodando)
        setCategorias(categoriasFiltradas)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoadingCategorias(false)
    }
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const categoriaId = formData.get('categoriaId') as string
    const categoriaSelecionada = categorias.find(c => c.id === categoriaId)

    const data: BotMidiaFormData = {
      nome: formData.get('nome') as string,
      token: formData.get('token') as string,
      username: bot?.username,
      categoriaId: categoriaId || undefined,
      categoriaNome: categoriaSelecionada?.nome,
      tipo: (formData.get('tipo') as BotMidia['tipo']) || 'Instagram',
      tipoBot,
      status: (formData.get('status') as BotMidia['status']) || 'Inativo',
    }
    onSave(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-800 bg-[#111722] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
              <PlusCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">{bot ? 'Editar bot' : 'Novo bot'}</h2>
              <p className="text-xs text-gray-500">Cadastro rapido para operacao diaria.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Nome</label>
              <input
                type="text"
                name="nome"
                defaultValue={bot?.nome}
                required
                className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-100 outline-none transition-all focus:border-gray-500"
                placeholder="Digite o nome do bot"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Token</label>
              <input
                type="text"
                name="token"
                defaultValue={bot?.token}
                required
                className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 font-mono text-xs text-gray-100 outline-none transition-all focus:border-gray-500"
                placeholder="Digite o token do bot"
              />
              <p className="text-xs text-gray-500">O username pode ser preenchido automaticamente na verificacao.</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Tipo de bot</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoBot('vendas')}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${tipoBot === 'vendas' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-[#0d1117] text-gray-400 hover:border-gray-600'}`}
                >
                  <DollarSign className="h-4 w-4" />
                  Vendas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoBot('disparo')}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${tipoBot === 'disparo' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-gray-700 bg-[#0d1117] text-gray-400 hover:border-gray-600'}`}
                >
                  <Send className="h-4 w-4" />
                  Disparo
                </button>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Categoria</label>
              <select
                name="categoriaId"
                defaultValue={bot?.categoriaId || ''}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2.5 text-sm text-gray-100 outline-none transition-all focus:border-gray-500"
                disabled={loadingCategorias}
              >
                <option value="">Nenhuma categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              {loadingCategorias && <p className="text-xs text-gray-500">Carregando categorias...</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-all hover:bg-[#21262d]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-500"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
