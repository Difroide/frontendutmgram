import { FiltroTag } from '@/types/Conta'
import { Users, ListPlus, ShieldCheck, UsersRound, ArrowLeftRight, Bot, UserPlus, Zap, Settings } from 'lucide-react'
import { useState } from 'react'
import { FiltrosModal } from './components/FiltrosModal'
import { useTheme } from '@/contexts/ThemeContext'

interface Categoria {
  id: string
  nome: string
  rodando?: boolean
}

interface FiltrosCardProps {
  filtrosTags: Set<FiltroTag>
  onTagChange: (tag: FiltroTag) => void
  onLimparFiltros?: () => void
  onCriarGrupos: () => void
  onAdicionarListas: () => void
  onVerificarContas: () => void
  onEncherGrupos: () => void
  onTrocarBots: () => void
  onCriarBot: () => void
  onCriarApi?: () => void
  onAdicionarContas?: () => void
  onGerenciarBots?: () => void
  categoriaFiltro: string
  onCategoriaFiltroChange: (categoriaId: string) => void
  categorias: Categoria[]
  onGerenciarTags?: () => void
  wallpaper?: string | null
}

export const FiltrosCard = ({
  filtrosTags,
  onTagChange,
  onLimparFiltros,
  onCriarGrupos,
  onAdicionarListas,
  onVerificarContas,
  onEncherGrupos,
  onTrocarBots,
  onCriarBot,
  onCriarApi,
  onAdicionarContas,
  onGerenciarBots,
  categoriaFiltro,
  onCategoriaFiltroChange,
  categorias,
  onGerenciarTags,
}: FiltrosCardProps) => {
  const [isFiltrosModalOpen, setIsFiltrosModalOpen] = useState(false)
  const { currentTheme } = useTheme()

  // Usar a cor primária do tema para os ícones
  const iconColor = currentTheme.colors.primary

  return (
    <>
      {/* Modal de Filtros */}
      <FiltrosModal
        isOpen={isFiltrosModalOpen}
        onClose={() => setIsFiltrosModalOpen(false)}
        filtrosTags={filtrosTags}
        onTagChange={onTagChange}
        onLimparFiltros={onLimparFiltros}
        categoriaFiltro={categoriaFiltro}
        onCategoriaFiltroChange={onCategoriaFiltroChange}
        categorias={categorias}
        onGerenciarTags={onGerenciarTags}
      />

      {/* Seção de Ações Rápidas - Minimalista */}
      <div className="w-full mb-6 bg-[#161b22] rounded-lg border border-gray-800 p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {onAdicionarContas && (
            <button
              onClick={onAdicionarContas}
              className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
            >
              <div 
                className="mb-2 group-hover:scale-110 transition-transform"
                style={{ color: iconColor }}
              >
                <UserPlus size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
              </div>
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Adicionar Contas</span>
            </button>
          )}
          
          <button
            onClick={onCriarGrupos}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <Users size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Criar Grupos</span>
          </button>
          
          <button
            onClick={onAdicionarListas}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <ListPlus size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Adicionar Listas</span>
          </button>
          
          <button
            onClick={onVerificarContas}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <ShieldCheck size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Verificar Contas</span>
          </button>
          
          <button
            onClick={onEncherGrupos}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <UsersRound size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Encher Grupos</span>
          </button>
          
          <button
            onClick={onTrocarBots}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <ArrowLeftRight size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Trocar Bots</span>
          </button>
          
          <button
            onClick={onCriarBot}
            className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
          >
            <div 
              className="mb-2 group-hover:scale-110 transition-transform"
              style={{ color: iconColor }}
            >
              <Bot size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Criar Bot</span>
          </button>
          
          {onCriarApi && (
            <button
              onClick={onCriarApi}
              className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
            >
              <div 
                className="mb-2 group-hover:scale-110 transition-transform"
                style={{ color: iconColor }}
              >
                <Zap size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
              </div>
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Criar API</span>
            </button>
          )}
          
          {onGerenciarBots && (
            <button
              onClick={onGerenciarBots}
              className="group flex flex-col items-center justify-center h-24 bg-[#0d1117] border border-gray-800 rounded-lg transition-all hover:bg-[#21262d] hover:border-gray-700"
            >
              <div 
                className="mb-2 group-hover:scale-110 transition-transform"
                style={{ color: iconColor }}
              >
                <Settings size={24} strokeWidth={1.5} className="group-hover:opacity-80" style={{ color: 'inherit' }} />
              </div>
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 text-center px-1">Gerenciar Bots</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
