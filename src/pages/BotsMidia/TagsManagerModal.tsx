import { useState } from 'react'
import { Plus, Tag, Trash2, X } from 'lucide-react'
import { BotTagData } from './botMidiaService'

interface TagsManagerModalProps {
    isOpen: boolean
    onClose: () => void
    tags: BotTagData[]
    onCreateTag: (nome: string, cor: string) => void
    onDeleteTag: (tagId: string) => void
    // Future: onEditTag
}

const TAG_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
    '#84cc16', '#d946ef', '#e11d48', '#0ea5e9', '#f43f5e'
]

export const TagsManagerModal = ({
    isOpen,
    onClose,
    tags,
    onCreateTag,
    onDeleteTag,
}: TagsManagerModalProps) => {
    const [novaTagNome, setNovaTagNome] = useState('')
    const [novaTagCor, setNovaTagCor] = useState(TAG_COLORS[0])
    const [searchTerm, setSearchTerm] = useState('')

    if (!isOpen) return null

    const handleCreate = () => {
        if (!novaTagNome.trim()) return
        onCreateTag(novaTagNome.trim(), novaTagCor)
        setNovaTagNome('')
        setNovaTagCor(TAG_COLORS[0])
    }

    const filteredTags = tags.filter(t =>
        t.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-[#111722] shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
                            <Tag className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-100">Gerenciar Tags</h2>
                            <p className="text-xs text-gray-500">Crie e gerencie as etiquetas dos bots.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-all hover:bg-[#21262d] hover:text-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    {/* Criar Nova Tag */}
                    <div className="mb-6 rounded-xl border border-gray-800 bg-[#0d1117] p-4">
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Nova Tag</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={novaTagNome}
                                onChange={(e) => setNovaTagNome(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                placeholder="Nome da tag..."
                                className="w-full rounded-lg border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
                            />

                            <div className="flex flex-wrap gap-2">
                                {TAG_COLORS.map((cor) => (
                                    <button
                                        key={cor}
                                        onClick={() => setNovaTagCor(cor)}
                                        className={`h-6 w-6 rounded-full transition-all ${novaTagCor === cor ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1117] scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                        style={{ backgroundColor: cor }}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={!novaTagNome.trim()}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
                            >
                                <Plus className="h-4 w-4" />
                                Criar Tag
                            </button>
                        </div>
                    </div>

                    {/* Lista de Tags */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Tags Existentes ({tags.length})</label>
                            {tags.length > 5 && (
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-24 rounded border border-gray-800 bg-transparent px-1 py-0.5 text-[10px] text-gray-400 outline-none focus:border-gray-600"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            )}
                        </div>

                        <div className="max-h-[240px] space-y-1 overflow-y-auto pr-1">
                            {filteredTags.length === 0 ? (
                                <p className="py-4 text-center text-xs text-gray-600">Nenhuma tag encontrada.</p>
                            ) : (
                                filteredTags.map((tag) => (
                                    <div key={tag.id} className="group flex items-center justify-between rounded-lg border border-transparent bg-[#0d1117] px-3 py-2 transition-all hover:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: tag.cor }} />
                                            <span className="text-sm font-medium text-gray-300">{tag.nome}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Excluir a tag "${tag.nome}"? Ela será removida de todos os bots.`)) {
                                                    onDeleteTag(tag.id)
                                                }
                                            }}
                                            className="rounded p-1.5 text-gray-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                            title="Excluir tag"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 bg-[#0d1117] px-5 py-3 text-right">
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
