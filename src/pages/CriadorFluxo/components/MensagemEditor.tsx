/**
 * Modal para editar uma mensagem - Estilo Minimalista
 */

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Save,
  Plus,
  Trash2,
  Clock,
  Video,
  FileText,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Link,
  Copy,
  Check,
} from 'lucide-react'
import { Mensagem, Plano, HORARIOS_PREDEFINIDOS, VipGroup } from '../types/Fluxo'
import { formatarNomePlano, extrairNomeBase, extrairDesconto } from '../utils/formatadorPlanos'

// Mapeamento de caracteres para formatação Unicode
const UNICODE_MAPS = {
  sansSerifBoldItalic: {
    upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
    lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
    digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    label: '𝘼',
    name: 'Sans Bold Italic',
  },
  sansSerifBold: {
    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
    digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    label: '𝗔',
    name: 'Sans Bold',
  },
  sansSerifItalic: {
    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
    digits: '0123456789',
    label: '𝘈',
    name: 'Sans Italic',
  },
  boldItalic: {
    upper: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁',
    lower: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛',
    digits: '0123456789',
    label: '𝑨',
    name: 'Bold Italic',
  },
  bold: {
    upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
    lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
    digits: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
    label: '𝐀',
    name: 'Bold',
  },
  italic: {
    upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
    lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
    digits: '0123456789',
    label: '𝐴',
    name: 'Italic',
  },
}

type UnicodeStyle = keyof typeof UNICODE_MAPS

function convertToUnicode(text: string, style: UnicodeStyle): string {
  const map = UNICODE_MAPS[style]
  let result = ''
  
  for (const char of text) {
    const upperIndex = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(char)
    const lowerIndex = 'abcdefghijklmnopqrstuvwxyz'.indexOf(char)
    const digitIndex = '0123456789'.indexOf(char)
    
    if (upperIndex !== -1) {
      result += [...map.upper][upperIndex]
    } else if (lowerIndex !== -1) {
      result += [...map.lower][lowerIndex]
    } else if (digitIndex !== -1) {
      result += [...map.digits][digitIndex]
    } else {
      result += char
    }
  }
  
  return result
}

interface MensagemEditorProps {
  isOpen: boolean
  mensagem: Mensagem | null
  onClose: () => void
  onSave: (mensagem: Mensagem) => void
}

export function MensagemEditor({
  isOpen,
  mensagem,
  onClose,
  onSave,
}: MensagemEditorProps) {
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState('')
  const [delayType, setDelayType] = useState<'relative' | 'absolute'>('relative')
  const [delayMinutos, setDelayMinutos] = useState(0)
  const [delaySegundos, setDelaySegundos] = useState(0)
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduleDays, setScheduleDays] = useState(0)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [copied, setCopied] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    if (mensagem && isOpen) {
      setDescription(mensagem.description || '')
      setVideo(mensagem.video || '')
      setDelayType(mensagem.delayType)
      
      const totalSeconds = mensagem.delay || 0
      setDelayMinutos(Math.floor(totalSeconds / 60))
      setDelaySegundos(totalSeconds % 60)
      
      setScheduleTime(mensagem.scheduleTime || '')
      setScheduleDays(mensagem.scheduleDays || 0)
      setPlanos([...mensagem.planos])
    }
  }, [mensagem, isOpen])
  
  if (!isOpen || !mensagem) return null
  
  const handleSave = () => {
    const delay = delayType === 'relative'
      ? (delayMinutos * 60) + delaySegundos
      : 0
    
    const mensagemAtualizada: Mensagem = {
      ...mensagem,
      description,
      video: video || null,
      delayType,
      delay,
      scheduleTime: delayType === 'absolute' ? scheduleTime : '',
      scheduleDays: delayType === 'absolute' ? scheduleDays : 0,
      planos,
    }
    
    onSave(mensagemAtualizada)
    onClose()
  }
  
  const adicionarPlano = () => {
    setPlanos([...planos, {
      name: 'Novo Plano',
      value: 0,
      vipGroups: [],
    }])
  }
  
  const atualizarPlano = (index: number, updates: Partial<Plano>) => {
    setPlanos(planos.map((p, i) => {
      if (i !== index) return p
      
      const planoAtualizado = { ...p, ...updates }
      
      if (updates.name !== undefined || updates.value !== undefined) {
        const nomeBase = updates.name !== undefined ? updates.name : extrairNomeBase(p.name)
        const valor = updates.value !== undefined ? updates.value : p.value
        const descontoAtual = extrairDesconto(p.name)
        
        planoAtualizado.name = formatarNomePlano(nomeBase, valor, descontoAtual)
      }
      
      return planoAtualizado
    }))
  }
  
  const excluirPlano = (index: number) => {
    setPlanos(planos.filter((_, i) => i !== index))
  }
  
  const moverPlano = (index: number, direcao: 'up' | 'down') => {
    const newIndex = direcao === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= planos.length) return
    
    const newPlanos = [...planos]
    const temp = newPlanos[index]
    newPlanos[index] = newPlanos[newIndex]
    newPlanos[newIndex] = temp
    setPlanos(newPlanos)
  }
  
  const aplicarHorarioPredefinido = (segundos: number) => {
    setDelayMinutos(Math.floor(segundos / 60))
    setDelaySegundos(segundos % 60)
  }
  
  const aplicarFormatacao = (style: UnicodeStyle) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    if (start === end) return
    
    const selectedText = description.substring(start, end)
    const formattedText = convertToUnicode(selectedText, style)
    
    const newDescription = description.substring(0, start) + formattedText + description.substring(end)
    setDescription(newDescription)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + formattedText.length)
    }, 0)
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                Editar Mensagem #{mensagem.posicao + 1}
              </h2>
              <p className="text-xs text-gray-500">Configure a copy, planos e horário de disparo</p>
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
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Principal */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Copy / Descrição */}
            <div className="flex flex-col h-[350px]">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                Copy / Descrição
              </label>
              
              {/* Barra de Formatação */}
              <div className="flex items-center gap-2 mb-2 p-2 bg-[#0d1117] border border-gray-800 rounded-lg">
                <span className="text-xs text-gray-500 mr-2">Formatação:</span>
                
                {(Object.keys(UNICODE_MAPS) as UnicodeStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => aplicarFormatacao(style)}
                    title={UNICODE_MAPS[style].name}
                    className="w-7 h-7 flex items-center justify-center bg-[#21262d] border border-gray-700 rounded text-gray-300 hover:bg-[#30363d] hover:border-gray-600 transition-colors text-sm"
                  >
                    {UNICODE_MAPS[style].label}
                  </button>
                ))}
                
                <div className="flex-1" />
                
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    copied
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : 'bg-[#21262d] border border-gray-700 text-gray-300 hover:bg-[#30363d]'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm leading-relaxed focus:outline-none focus:border-gray-600 resize-none placeholder:text-gray-600"
                placeholder="Digite sua copy aqui..."
              />
              <p className="text-xs text-gray-600 mt-1.5">
                Selecione o texto e clique nos botões acima para aplicar formatação Unicode
              </p>
            </div>
            
            {/* Vídeo */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                URL do Vídeo (opcional)
              </label>
              <input
                type="text"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="https://exemplo.com/video.mp4"
                className="w-full px-3 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-gray-600 placeholder:text-gray-600"
              />
            </div>
            
            {/* Planos */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Planos ({planos.length})
                </label>
                <button
                  onClick={adicionarPlano}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
              
              {planos.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-6">
                  Nenhum plano configurado
                </p>
              ) : (
                <div className="space-y-2">
                  {planos.map((plano, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-[#161b22] border border-gray-800 rounded-lg"
                    >
                      {/* Mover */}
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          onClick={() => moverPlano(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 rounded transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moverPlano(index, 'down')}
                          disabled={index === planos.length - 1}
                          className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 rounded transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Campos */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Nome</label>
                            <input
                              type="text"
                              value={plano.name}
                              onChange={(e) => atualizarPlano(index, { name: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                            />
                          </div>
                          <div className="w-28">
                            <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={plano.value}
                              onChange={(e) => atualizarPlano(index, { value: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gray-600"
                            />
                          </div>
                        </div>
                        
                        {/* VIP Groups */}
                        {plano.vipGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {plano.vipGroups.map((vip, vipIndex) => (
                              <span
                                key={vipIndex}
                                className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-400"
                                title={vip.chatId}
                              >
                                {vip.durationDays}d
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Delete */}
                      <button
                        onClick={() => excluirPlano(index)}
                        className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar - Horário */}
          <div className="w-72 border-l border-gray-800 bg-[#0d1117] p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Horário de Disparo</h3>
            </div>
            
            {/* Tipo de Delay */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setDelayType('relative')}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  delayType === 'relative'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-[#161b22] border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                Relativo (Min/Seg)
              </button>
              <button
                onClick={() => setDelayType('absolute')}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  delayType === 'absolute'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-[#161b22] border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                Horário Fixo
              </button>
            </div>
            
            {delayType === 'relative' ? (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minutos</label>
                    <input
                      type="number"
                      min="0"
                      value={delayMinutos}
                      onChange={(e) => setDelayMinutos(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#161b22] border border-gray-800 rounded-lg text-gray-200 text-center focus:outline-none focus:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Segundos</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={delaySegundos}
                      onChange={(e) => setDelaySegundos(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#161b22] border border-gray-800 rounded-lg text-gray-200 text-center focus:outline-none focus:border-gray-600"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Horários Rápidos</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HORARIOS_PREDEFINIDOS.slice(0, 10).map((h) => (
                      <button
                        key={h.value}
                        onClick={() => aplicarHorarioPredefinido(h.value)}
                        className="px-2 py-1.5 bg-[#161b22] border border-gray-800 rounded text-xs text-gray-400 hover:bg-[#21262d] hover:border-gray-700 hover:text-gray-200 transition-colors"
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Horário (HH:MM)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161b22] border border-gray-800 rounded-lg text-gray-200 text-center focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dias Adicionais</label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleDays}
                    onChange={(e) => setScheduleDays(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#161b22] border border-gray-800 rounded-lg text-gray-200 text-center focus:outline-none focus:border-gray-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    0 = mesmo dia, 1 = dia seguinte
                  </p>
                </div>
              </div>
            )}
            
            {/* Preview */}
            <div className="mt-4 p-3 bg-[#161b22] border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Disparo em:</p>
              <p className="text-lg font-medium text-emerald-400">
                {delayType === 'relative' 
                  ? `${delayMinutos}m ${delaySegundos}s`
                  : `${scheduleTime || '00:00'}${scheduleDays > 0 ? ` +${scheduleDays}d` : ''}`
                }
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
