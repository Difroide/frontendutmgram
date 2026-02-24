import { useState, useEffect } from 'react'
import { Plus, Zap } from 'lucide-react'
import { apiTelegramService } from '@/services/apiTelegramService'
import { ApiTelegramList } from './ApiTelegramList'
import { ApiTelegramModal } from './ApiTelegramModal'
import { CriarApiAutomaticaModal } from './CriarApiAutomaticaModal'

interface ApiTelegram {
  id: string
  api_id: string
  api_hash: string
  createdAt: string
  createdBy?: string | null // ID da sessão que criou a API
}

export const ApiTelegram = () => {
  const [apis, setApis] = useState<ApiTelegram[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCriarAutomaticaModalOpen, setIsCriarAutomaticaModalOpen] = useState(false)

  const loadApis = async () => {
    const data = await apiTelegramService.getAll()
    setApis(data)
  }

  useEffect(() => {
    loadApis()
  }, [])

  const handleSave = async (apiId: string, apiHash: string) => {
    setLoading(true)
    try {
      const result = await apiTelegramService.save(apiId, apiHash)
      if (result.success) {
        await loadApis()
        setIsModalOpen(false)
        alert('API salva com sucesso!')
      } else {
        alert(`Erro ao salvar: ${result.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao salvar API:', error)
      alert('Erro ao salvar API')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await apiTelegramService.delete(id)
    if (result.success) {
      await loadApis()
    } else {
      alert(`Erro ao excluir: ${result.error || 'Erro desconhecido'}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setIsCriarAutomaticaModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600/30 backdrop-blur-md border border-yellow-400/30 text-white rounded-lg hover:bg-yellow-600/40 hover:border-yellow-400/50 transition-all shadow-lg"
          title="Criar APIs automaticamente usando sessões existentes"
        >
          <Zap className="w-5 h-5" />
          Criar Automaticamente
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 text-white rounded-lg hover:bg-blue-600/40 hover:border-blue-400/50 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Adicionar API
        </button>
      </div>

      <ApiTelegramList apis={apis} onDelete={handleDelete} />

      <ApiTelegramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        loading={loading}
      />

      <CriarApiAutomaticaModal
        isOpen={isCriarAutomaticaModalOpen}
        onClose={() => setIsCriarAutomaticaModalOpen(false)}
        onSuccess={() => {
          loadApis()
          setIsCriarAutomaticaModalOpen(false)
        }}
      />
    </div>
  )
}

