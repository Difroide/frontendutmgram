import React, { useState, useRef, useEffect } from 'react'
import { Copy, Upload, Link2, X, Check } from 'lucide-react'
import { CampaignCardsGrid } from './components/CampaignCardsGrid'
import { CampaignForm } from './components/CampaignForm'
import { ExportarDadosSection } from './components/ExportarDadosSection'
import { CampanhasNovasSection } from './components/CampanhasNovasSection'
import { PreviewDrawer } from './components/PreviewDrawer'
import { SendergramModal } from './components/SendergramModal'
import { sendergramService } from '../../services/sendergramService'
import type { CampaignCardCategoria } from './components/CampaignCard'

interface ButtonConfig { text: string; url: string }
interface MessageConfig { forwardLink: string; text: string; buttons: ButtonConfig[]; expanded: boolean }
type MessageMode = 'individual' | 'batch'

export default function CriadorCampanha() {
  const [activeTab, setActiveTab] = useState<'criar' | 'exportar' | 'campanhasNovas'>('criar')
  const [campaignName, setCampaignName] = useState('')
  const [botName, setBotName] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [botToken, setBotToken] = useState('')
  const [groupsInput, setGroupsInput] = useState('')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(new Set())
  const [categoriasData, setCategoriasData] = useState<Record<string, { campaignName: string; botName: string; botUsername: string; botToken: string; groupsInput: string }>>({})
  const [categorias, setCategorias] = useState<CampaignCardCategoria[]>([])
  const [carregandoCategorias, setCarregandoCategorias] = useState<Set<string>>(new Set())

  const [messageMode, setMessageMode] = useState<MessageMode>('individual')

  // Para modo individual
  const [messages, setMessages] = useState<MessageConfig[]>([])

  const [batchMessageLinks, setBatchMessageLinks] = useState('')
  const [batchText, setBatchText] = useState('')
  const [batchButtons, setBatchButtons] = useState<ButtonConfig[]>([{ text: '', url: '' }])

  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Estados para modal de reformatar para fornecedor
  const [isReformatarModalOpen, setIsReformatarModalOpen] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [memberCount, setMemberCount] = useState('')
  const [formattedLinks, setFormattedLinks] = useState('')
  const [copiedFormatted, setCopiedFormatted] = useState(false)

  // SenderGRAM Modal
  const [isSendergramModalOpen, setIsSendergramModalOpen] = useState(false)

  const batchTextRef = useRef<HTMLTextAreaElement>(null)

  // Carregar categorias ao montar o componente
  // OTIMIZADO: Carregamento otimizado com tratamento de erros
  useEffect(() => {
    let mounted = true

    const loadCategorias = async () => {
      try {
        if ((window as any).electron?.criador?.carregarCategorias) {
          const data = await (window as any).electron.criador.carregarCategorias()
          if (mounted) {
            const raw = (data || []).filter((cat: any) => !cat.rodando)
            const mapped: CampaignCardCategoria[] = raw.map((cat: any) => ({
              id: cat.id,
              nome: cat.nome,
              descricao: cat.descricao,
              rodando: cat.rodando,
              quantidadeBots: cat.quantidadeBots ?? cat.quantidade_bots ?? 0,
              quantidadeGrupos: cat.quantidadeGrupos ?? cat.quantidade_grupos ?? 0,
            }))
            const sorted = [...mapped].sort((a, b) =>
              a.rodando === b.rodando ? 0 : a.rodando ? 1 : -1
            )
            setCategorias(sorted)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      }
    }

    loadCategorias()

    return () => {
      mounted = false
    }
  }, [])

  const loadCategoriaData = async (categoriaId: string) => {
    const categoria = categorias.find((c) => c.id === categoriaId)
    const [botsResult, gruposResult] = await Promise.allSettled([
      (window as any).electron?.criador?.carregarBotsCategoria?.(categoriaId) ?? Promise.resolve([]),
      (window as any).electron?.criador?.carregarGruposCategoria?.(categoriaId) ?? Promise.resolve([]),
    ])
    let botToken = ''
    let botUsername = ''
    let groupsInput = ''
    if (botsResult.status === 'fulfilled' && botsResult.value?.length) {
      const botComToken = botsResult.value.find((b: any) => b.token || b.bot_token)
      botToken = botComToken?.token || botComToken?.bot_token || ''
      botUsername = botComToken?.username || botComToken?.bot_username || ''
    }
    if (gruposResult.status === 'fulfilled' && gruposResult.value?.length) {
      const catNome = categoria?.nome || ''
      groupsInput = gruposResult.value
        .map((g: any, i: number) => `${catNome} ${i + 1};${g.id || ''};${g.link_convite || g.link || ''}`)
        .join('\n')
    }
    return {
      campaignName: categoria?.nome || categoriaId,
      botName: categoria?.nome || categoriaId,
      botUsername,
      botToken,
      groupsInput,
    }
  }

  const handleCategoriaToggle = (categoriaId: string) => {
    const isRemoving = categoriasSelecionadas.has(categoriaId)
    if (isRemoving) {
      const next = new Set(categoriasSelecionadas)
      next.delete(categoriaId)
      setCategoriasSelecionadas(next)
      setCategoriasData((d) => {
        const n = { ...d }
        delete n[categoriaId]
        return n
      })
      if (next.size === 1) {
        const [singleId] = Array.from(next)
        const data = categoriasData[singleId]
        if (data) {
          setCampaignName(data.campaignName)
          setBotName(data.botName)
          setBotUsername(data.botUsername || '')
          setBotToken(data.botToken)
          setGroupsInput(data.groupsInput)
        }
      } else if (next.size === 0) {
        setCampaignName('')
        setBotName('')
        setBotUsername('')
        setBotToken('')
        setGroupsInput('')
      }
    } else {
      const next = new Set(categoriasSelecionadas).add(categoriaId)
      setCategoriasSelecionadas(next)
      setCarregandoCategorias((c) => new Set(c).add(categoriaId))
      loadCategoriaData(categoriaId).then((data) => {
        setCategoriasData((d) => ({ ...d, [categoriaId]: data }))
        setCarregandoCategorias((c) => {
          const n = new Set(c)
          n.delete(categoriaId)
          return n
        })
        if (next.size === 1) {
          setCampaignName(data.campaignName)
          setBotName(data.botName)
          setBotUsername(data.botUsername || '')
          setBotToken(data.botToken)
          setGroupsInput(data.groupsInput)
        }
      })
    }
  }

  const isMultiCampanha = categoriasSelecionadas.size > 1
  const temSelecao = categoriasSelecionadas.size >= 1

  useEffect(() => {
    if (categoriasSelecionadas.size === 1) {
      const [id] = Array.from(categoriasSelecionadas)
      const data = categoriasData[id]
      if (data) {
        setCampaignName(data.campaignName)
        setBotName(data.botName)
        setBotUsername(data.botUsername || '')
        setBotToken(data.botToken)
        setGroupsInput(data.groupsInput)
      }
    }
  }, [categoriasSelecionadas, categoriasData])

  const importFullCampaign = async () => {
    try {
      if (!(window as any).electron?.utils?.selecionarArquivoJson) {
        alert('Funcionalidade de selecionar arquivo não disponível')
        return
      }

      const result = await (window as any).electron.utils.selecionarArquivoJson()
      if (!result || !result.content) {
        return // Usuário cancelou ou não selecionou arquivo
      }

      try {
        const json = JSON.parse(result.content)

        // Importar informações básicas da campanha
        if (json.campaign?.name) setCampaignName(json.campaign.name)
        if (json.campaign?.senderName) setBotName(json.campaign.senderName)
        if (json.botUsername) setBotUsername(String(json.botUsername).replace(/^@+/, ''))
        if (json.botToken) setBotToken(json.botToken)

        // Importar grupos - priorizar exportedGroups, depois groupIds
        let groupsText = ''
        const campaignNameFromJson = json.campaign?.name || ''

        if (json.exportedGroups && Array.isArray(json.exportedGroups) && json.exportedGroups.length > 0) {
          // Formato preferido: exportedGroups com name, filePath (ID) e link
          groupsText = json.exportedGroups
            .map((group: any) => {
              const name = group.name || campaignNameFromJson || 'Grupo'
              const id = group.filePath || group.id || ''
              const link = group.link || ''
              return `${name};${id};${link}`
            })
            .join('\n')
        } else if (json.campaign?.groupIds && typeof json.campaign.groupIds === 'string') {
          // Fallback: groupIds como string separada por vírgula
          // Neste caso, precisamos dos links dos exportedGroups ou não temos links
          const groupIdsArray = json.campaign.groupIds.split(',').map((id: string) => id.trim())
          const exportedGroupsMap = new Map()

          if (json.exportedGroups && Array.isArray(json.exportedGroups)) {
            json.exportedGroups.forEach((group: any) => {
              const id = group.filePath || group.id || ''
              exportedGroupsMap.set(id, group)
            })
          }

          groupsText = groupIdsArray
            .map((id: string, index: number) => {
              const group = exportedGroupsMap.get(id)
              const name = group?.name || (campaignNameFromJson ? `${campaignNameFromJson} ${index + 1}` : `Grupo ${index + 1}`)
              const link = group?.link || ''
              return `${name};${id};${link}`
            })
            .join('\n')
        }

        if (groupsText) {
          console.log('[Importar] Grupos importados:', groupsText.split('\n').length)
          setGroupsInput(groupsText)
        } else {
          console.warn('[Importar] Nenhum grupo encontrado no JSON')
        }

        // Importar mensagens
        const importedMessages: MessageConfig[] = []
        if (json.copySets && Array.isArray(json.copySets)) {
          json.copySets.forEach((copySet: any) => {
            if (copySet.messages && Array.isArray(copySet.messages)) {
              copySet.messages.forEach((message: any) => {
                // Filtrar botões vazios
                const buttons = (message.buttons || []).filter((btn: any) => btn.text && btn.url)

                importedMessages.push({
                  forwardLink: message.forwardLink || '',
                  text: message.text || '',
                  buttons: buttons.length > 0 ? buttons : [{ text: '', url: '' }],
                  expanded: false,
                })
              })
            }
          })
        }

        if (importedMessages.length > 0) {
          const allTextsEqual = importedMessages.every((msg) => msg.text === importedMessages[0].text)
          const allButtonsEqual = importedMessages.every(
            (msg) => JSON.stringify(msg.buttons) === JSON.stringify(importedMessages[0].buttons),
          )

          if (allTextsEqual && allButtonsEqual && importedMessages.length > 1) {
            // Modo batch: todas as mensagens têm o mesmo texto e botões, apenas forwardLink diferente
            setMessageMode('batch')
            // Normalizar e remover duplicatas preservando ordem, depois embaralhar
            const normalizedLinks = importedMessages
              .map((m) => String(m.forwardLink || '').trim())
              .filter((link) => link.length > 0)
            const seen = new Set<string>()
            const uniqueLinks: string[] = []
            for (const link of normalizedLinks) {
              if (!seen.has(link)) {
                seen.add(link)
                uniqueLinks.push(link)
              }
            }
            const shuffledLinks = shuffleArray(uniqueLinks)
            setBatchMessageLinks(shuffledLinks.join('\n'))
            setBatchText(importedMessages[0].text)
            setBatchButtons(
              importedMessages[0].buttons.length > 0 && importedMessages[0].buttons[0].text
                ? importedMessages[0].buttons
                : [{ text: '', url: '' }],
            )
          } else {
            // Modo individual: mensagens diferentes
            setMessageMode('individual')
            // Embaralhar mensagens ao importar
            const shuffledMessages = shuffleArray(importedMessages)
            setMessages(shuffledMessages)
          }
        }

        alert('Campanha importada com sucesso! Você pode editar todos os campos.')
      } catch (error) {
        alert('Erro ao ler o arquivo JSON. Verifique o formato do arquivo.')
        console.error('Erro ao importar campanha:', error)
      }
    } catch (error) {
      alert('Erro ao importar campanha. Verifique o formato do arquivo.')
      console.error('Erro ao importar campanha:', error)
    }
  }

  const importMessageLinks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const messageLinks: string[] = []

        if (json.copySets && Array.isArray(json.copySets)) {
          json.copySets.forEach((copySet: any) => {
            if (copySet.messages && Array.isArray(copySet.messages)) {
              copySet.messages.forEach((message: any) => {
                if (message.forwardLink) messageLinks.push(message.forwardLink)
              })
            }
          })
        }

        if (messageLinks.length > 0) {
          // Normalizar links (trim) e remover duplicatas preservando ordem
          const normalizedLinks = messageLinks.map((link) => String(link).trim()).filter((link) => link.length > 0)
          const seen = new Set<string>()
          const uniqueLinks: string[] = []
          for (const link of normalizedLinks) {
            if (!seen.has(link)) {
              seen.add(link)
              uniqueLinks.push(link)
            }
          }
          // Embaralhar os links automaticamente ao importar
          const shuffledLinks = shuffleArray(uniqueLinks)

          if (messageMode === 'individual') {
            const newMessages = shuffledLinks.map((link) => ({
              forwardLink: link,
              text: '',
              buttons: [{ text: '', url: '' }],
              expanded: true,
            }))
            setMessages(newMessages)
          } else {
            setBatchMessageLinks(shuffledLinks.join('\n'))
          }
          alert(`${shuffledLinks.length} mensagens importadas e embaralhadas!`)
        }
      } catch (error) {
        alert('Erro ao ler o arquivo JSON.')
        console.error(error)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const addMessage = () => {
    setMessages([
      ...messages,
      {
        forwardLink: '',
        text: '',
        buttons: [{ text: '', url: '' }],
        expanded: true,
      },
    ])
  }

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  const updateMessage = (index: number, field: keyof MessageConfig, value: any) => {
    const newMessages = [...messages]
    newMessages[index] = { ...newMessages[index], [field]: value }
    setMessages(newMessages)
  }

  const addButtonToMessage = (messageIndex: number) => {
    const newMessages = [...messages]
    newMessages[messageIndex].buttons.push({ text: '', url: '' })
    setMessages(newMessages)
  }

  const removeButtonFromMessage = (messageIndex: number, buttonIndex: number) => {
    const newMessages = [...messages]
    newMessages[messageIndex].buttons = newMessages[messageIndex].buttons.filter((_, i) => i !== buttonIndex)
    setMessages(newMessages)
  }

  const updateMessageButton = (messageIndex: number, buttonIndex: number, field: 'text' | 'url', value: string) => {
    const newMessages = [...messages]
    newMessages[messageIndex].buttons[buttonIndex][field] = value
    setMessages(newMessages)
  }

  const toggleMessage = (index: number) => {
    const newMessages = [...messages]
    newMessages[index].expanded = !newMessages[index].expanded
    setMessages(newMessages)
  }

  const addBatchButton = () => {
    setBatchButtons([...batchButtons, { text: '', url: '' }])
  }

  const removeBatchButton = (index: number) => {
    setBatchButtons(batchButtons.filter((_, i) => i !== index))
  }

  const updateBatchButton = (index: number, field: 'text' | 'url', value: string) => {
    const newButtons = [...batchButtons]
    newButtons[index][field] = value
    setBatchButtons(newButtons)
  }

  const buildCampaignFromData = (
    catData: { campaignName: string; botName: string; botUsername?: string; botToken: string; groupsInput: string },
    formattedMessages: any[],
  ) => {
    const { campaignName: name, botName: bName, botUsername: bUsername = '', botToken: token, groupsInput: gInput } = catData
    const groupLines = gInput.trim().split('\n').filter((l) => l.trim())
    const groups: any[] = []
    const groupIds: string[] = []
    const linkRegex = /https?:\/\/t\.me\/\+?[a-zA-Z0-9_-]+/
    const idRegex = /(-?\d{10,})/

    groupLines.forEach((line, index) => {
      let grpName = ''
      let id = ''
      let link = ''
      const cleanLine = line.replace(/\|/g, ';').replace(/^\.*|\.*$/g, '').trim()
      if (cleanLine.includes(';')) {
        const parts = cleanLine.split(';').map((p) => p.trim())
        if (parts.length >= 3) {
          grpName = parts[0]
          id = parts[1]
          link = parts[2]
          if (!link.startsWith('http')) link = 'https://' + link
        } else if (parts.length === 2) {
          const p1 = parts[0]
          const p2 = parts[1]
          const p1L = p1.match(linkRegex)
          const p2L = p2.match(linkRegex)
          if (p1L) {
            link = p1.startsWith('http') ? p1 : 'https://' + p1
            id = p2
          } else if (p2L) {
            link = p2.startsWith('http') ? p2 : 'https://' + p2
            id = p1
          }
          grpName = `${name} ${index + 1}`
        }
      } else {
        const linkM = cleanLine.match(linkRegex)
        const idM = cleanLine.match(/ID:\s*(-?\d+)/) || cleanLine.match(idRegex)
        if (linkM && idM) {
          link = linkM[0]
          id = idM[1]
          grpName = `${name} ${index + 1}`
        }
      }
      if (id) {
        id = id.replace(/^-/, '')
        id = id.startsWith('100') ? '-' + id : '-100' + id
      }
      if (id && link) {
        if (!grpName) grpName = `${name} ${index + 1}`
        groupIds.push(id)
        groups.push({ name: grpName, filePath: id, link })
      }
    })

    return {
      campaign: {
        name,
        type: 'bot',
        senderName: bName,
        groupIds: groupIds.join(','),
        randomOrder: false,
        needsReview: false,
        active: true,
        fixedEnabled: true,
        fixedIntervalSec: 360,
        autoSwapEnabled: false,
        pinLastMessageEnabled: false,
        lastTimeBasedCheckAt: null,
        lastFixedSentAt: null,
        lastSentMessageId: null,
        lastFixedIdx: 0,
        lastPinnedMessageIds: null,
        trackedMessages: [],
      },
      copySets: [{
        name: 'Conjunto Principal',
        description: 'Mensagens da campanha',
        isActive: true,
        isDefault: true,
        isPool: false,
        poolType: 'standard',
        poolConfig: { rotationType: 'sequential', groupsPerRotation: 5, currentPoolIndex: 0, lastGroupCount: 0 },
        messages: formattedMessages,
      }],
      exportedGroups: groups,
      botToken: token,
      botUsername: (bUsername || '').replace(/^@+/, '') || undefined,
      version: '2.1',
    }
  }

  const getFormattedMessages = () => {
    if (messageMode === 'individual') {
      return messages.map((msg) => ({
        text: msg.text,
        mediaUrl: null,
        buttons: msg.buttons.filter((b) => b.text && b.url).map((b) => ({ text: b.text, url: b.url })),
        forwardLink: msg.forwardLink.trim(),
        daysOfWeek: '',
        timesOfDay: '',
        active: true,
        order: 0,
      }))
    }
    const links = batchMessageLinks.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    const seen = new Set<string>()
    const uniqueLinks: string[] = []
    for (const link of links) {
      if (!seen.has(link)) { seen.add(link); uniqueLinks.push(link) }
    }
    return uniqueLinks.map((link) => ({
      text: batchText,
      mediaUrl: null,
      buttons: batchButtons.filter((b) => b.text && b.url).map((b) => ({ text: b.text, url: b.url })),
      forwardLink: link,
      daysOfWeek: '',
      timesOfDay: '',
      active: true,
      order: 0,
    }))
  }

  const generateCampaign = () => {
    let formattedMessages = getFormattedMessages()
    if (formattedMessages.length === 0) {
      alert('Adicione pelo menos uma mensagem ou link')
      return
    }

    if (isMultiCampanha) {
      // Sempre embaralhar links de mensagens na multi campanha para não ficar tudo na mesma ordem
      formattedMessages = shuffleArray(formattedMessages)
      const ids = Array.from(categoriasSelecionadas).filter((id) => categoriasData[id])
      if (ids.length === 0 || ids.length < categoriasSelecionadas.size) {
        alert('Aguarde o carregamento de todas as categorias selecionadas')
        return
      }
      ids.forEach((catId) => {
        const data = categoriasData[catId]
        const campaign = buildCampaignFromData(data, formattedMessages)
        ;(window as any).electron?.blastsendCampanhas?.salvarCampanhaNova?.(campaign)?.catch?.(() => {})
      })
      alert(`${ids.length} campanha(s) gerada(s) e salva(s) em Campanhas-novas!`)
      return
    }

    const catData = { campaignName, botName, botUsername, botToken, groupsInput }
    const campaign = buildCampaignFromData(catData, formattedMessages)
    ;(window as any).electron?.blastsendCampanhas?.salvarCampanhaNova?.(campaign)?.catch?.(() => {})
    alert('Campanha gerada e salva em Campanhas-novas!')
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadJSON = () => {
    const blob = new Blob([result], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign_${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasMessages = messageMode === 'individual' ? messages.length > 0 : batchMessageLinks.trim().length > 0

  const addHyperlinkToBatchText = () => {
    const textarea = batchTextRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = batchText.substring(start, end)

    if (!selectedText) {
      alert('Selecione um texto primeiro para transformar em link!')
      return
    }

    const url = prompt('Digite o link (URL):', 'https://')
    if (!url) return

    const beforeText = batchText.substring(0, start)
    const afterText = batchText.substring(end)
    const newText = `${beforeText}[${selectedText}](${url})${afterText}`

    setBatchText(newText)

    setTimeout(() => {
      const newPosition = start + selectedText.length + url.length + 4
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  // Função para embaralhar array usando Fisher-Yates shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Embaralhar mensagens no modo individual
  const shuffleIndividualMessages = () => {
    if (messages.length === 0) {
      alert('Não há mensagens para embaralhar')
      return
    }
    const shuffled = shuffleArray(messages)
    setMessages(shuffled)
  }

  // Embaralhar links no modo batch
  const shuffleBatchLinks = () => {
    if (!batchMessageLinks.trim()) {
      alert('Não há links para embaralhar')
      return
    }
    const lines = batchMessageLinks
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      alert('Não há links para embaralhar')
      return
    }

    const shuffled = shuffleArray(lines)
    setBatchMessageLinks(shuffled.join('\n'))
  }

  // Extrair links dos grupos da campanha
  const extractGroupLinks = (): string[] => {
    if (!groupsInput.trim()) {
      return []
    }

    const lines = groupsInput
      .trim()
      .split('\n')
      .filter((line) => line.trim())

    const links: string[] = []
    const linkRegex = /https?:\/\/t\.me\/\+?[a-zA-Z0-9_-]+/

    lines.forEach((line) => {
      const cleanLine = line
        .replace(/^\.*|\.*$/g, '')
        .replace(/\|/g, ';')
        .trim()

      // Primeiro, tentar encontrar link diretamente na linha
      const directMatch = cleanLine.match(linkRegex)
      if (directMatch) {
        links.push(directMatch[0])
        return
      }

      // Se não encontrou, tentar formatos com separadores
      if (cleanLine.includes(';')) {
        // Formato: NOME;ID;LINK
        const parts = cleanLine.split(';').map((p) => p.trim())

        if (parts.length >= 3) {
          // Procurar link na terceira parte ou além
          for (let i = 2; i < parts.length; i++) {
            const linkMatch = parts[i].match(linkRegex)
            if (linkMatch) {
              links.push(linkMatch[0])
              return
            }
            // Se não tem http, pode ser só o caminho
            if (parts[i].includes('t.me/')) {
              const fullLink = parts[i].startsWith('http') ? parts[i] : 'https://' + parts[i]
              links.push(fullLink)
              return
            }
          }
        } else if (parts.length === 2) {
          // Pode ser ID;LINK ou LINK;ID
          const part1Link = parts[0].match(linkRegex)
          const part2Link = parts[1].match(linkRegex)

          if (part1Link) {
            links.push(parts[0].startsWith('http') ? parts[0] : 'https://' + parts[0])
            return
          } else if (part2Link) {
            links.push(parts[1].startsWith('http') ? parts[1] : 'https://' + parts[1])
            return
          }
        }
      }

      // Tentar formato: "https://t.me/XXXXX - ID: -100XXXXXXX"
      const idPatternMatch = cleanLine.match(/ID:\s*(-?\d+)/)
      if (idPatternMatch) {
        const linkMatch = cleanLine.match(linkRegex)
        if (linkMatch) {
          links.push(linkMatch[0])
        }
      }
    })

    // Remover duplicatas mantendo ordem
    const uniqueLinks: string[] = []
    const seen = new Set<string>()
    for (const link of links) {
      if (!seen.has(link)) {
        seen.add(link)
        uniqueLinks.push(link)
      }
    }

    return uniqueLinks
  }

  // Abrir modal de reformatar para fornecedor
  const handleAbrirReformatarModal = () => {
    const links = extractGroupLinks()

    if (links.length === 0) {
      alert('Nenhum link encontrado nos grupos da campanha')
      return
    }

    // Limpar apenas serviceId; manter memberCount padrão para copiar rápido
    setServiceId('')
    setMemberCount('600')
    setFormattedLinks('')
    setIsReformatarModalOpen(true)
  }

  // Copiar links formatados
  const copyFormattedLinks = async () => {
    if (formattedLinks) {
      await navigator.clipboard.writeText(formattedLinks)
      setCopiedFormatted(true)
      setTimeout(() => setCopiedFormatted(false), 2000)
    }
  }

  // Ao clicar "Enviar para API": se já tem token salvo, envia direto. Senão abre modal
  const handleEnviarParaApiClick = async () => {
    try {
      const config = await sendergramService.loadConfig()
      if (config?.apiKey?.trim()) {
        await handleSendToApi(config.apiKey.trim())
      } else {
        setIsSendergramModalOpen(true)
      }
    } catch {
      setIsSendergramModalOpen(true)
    }
  }

  const handleSendToApi = async (token: string) => {
    try {
      // 1. Gerar dados da campanha (similar ao generateCampaign mas sem download)
      let formattedMessages = getFormattedMessages()
      if (formattedMessages.length === 0) {
        alert('Adicione pelo menos uma mensagem ou link')
        return
      }

      const campaignDataList: any[] = []

      if (isMultiCampanha) {
        formattedMessages = shuffleArray(formattedMessages)
        const ids = Array.from(categoriasSelecionadas).filter((id) => categoriasData[id])
        if (ids.length === 0 || ids.length < categoriasSelecionadas.size) {
          alert('Aguarde o carregamento de todas as categorias')
          return
        }
        ids.forEach((catId) => {
          campaignDataList.push(buildCampaignFromData(categoriasData[catId], formattedMessages))
        })
      } else {
        const catData = { campaignName, botName, botUsername, botToken, groupsInput }
        campaignDataList.push(buildCampaignFromData(catData, formattedMessages))
      }

      // 2. Configurar serviço
      sendergramService.configure({ apiKey: token })

      // 3. Enviar cada campanha
      let successCount = 0
      for (const campaignData of campaignDataList) {
        const result = await sendergramService.sendCampaign(campaignData)
        if (result.success) successCount++
        else console.error('Erro ao enviar campanha:', result.error)
      }

      if (successCount === campaignDataList.length) {
        alert('✅ Sucesso! Todas as campanhas foram enviadas para a API.')
      } else {
        alert(`⚠️ Parcial: ${successCount} de ${campaignDataList.length} campanhas enviadas. Verifique o console.`)
      }

    } catch (error) {
      console.error('Erro geral ao enviar para API:', error)
      alert('Erro ao processar envio para API')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 -m-6 p-6">
      {/* Hero Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Criador de Campanha</h1>
            <p className="text-slate-400 mt-1">Reformatação e criação de arquivos JSON para campanhas</p>
          </div>
          <button
            type="button"
            onClick={importFullCampaign}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Importar Campanha JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900/60 rounded-xl p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('criar')}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'criar' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Criar Campanha
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exportar')}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'exportar' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Exportar Dados
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('campanhasNovas')}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'campanhasNovas' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Campanhas novas
        </button>
      </div>

      {activeTab === 'criar' && (
        <div className="space-y-6">
          {/* Cards de Categorias */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Selecionar Categoria
              {isMultiCampanha && (
                <span className="ml-2 text-sm font-normal text-cyan-400">
                  — Modo multi campanha ({categoriasSelecionadas.size} selecionadas)
                </span>
              )}
            </h2>
            <CampaignCardsGrid
              categorias={categorias}
              selectedId={null}
              multiSelect
              selectedIds={categoriasSelecionadas}
              onToggle={handleCategoriaToggle}
              loadingIds={carregandoCategorias}
            />
          </div>

          {/* Formulário (quando há seleção) */}
          {temSelecao && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
              <CampaignForm
                multiCampanha={isMultiCampanha}
                campaignName={campaignName}
                setCampaignName={setCampaignName}
                botName={botName}
                setBotName={setBotName}
                botToken={botToken}
                setBotToken={setBotToken}
                groupsInput={groupsInput}
                setGroupsInput={setGroupsInput}
                messageMode={messageMode}
                setMessageMode={setMessageMode}
                messages={messages}
                setMessages={setMessages}
                batchMessageLinks={batchMessageLinks}
                setBatchMessageLinks={setBatchMessageLinks}
                batchText={batchText}
                setBatchText={setBatchText}
                batchButtons={batchButtons}
                setBatchButtons={setBatchButtons}
                importMessageLinks={importMessageLinks}
                addMessage={addMessage}
                removeMessage={removeMessage}
                updateMessage={updateMessage}
                addButtonToMessage={addButtonToMessage}
                removeButtonFromMessage={removeButtonFromMessage}
                updateMessageButton={updateMessageButton}
                toggleMessage={toggleMessage}
                addBatchButton={addBatchButton}
                removeBatchButton={removeBatchButton}
                updateBatchButton={updateBatchButton}
                shuffleIndividualMessages={shuffleIndividualMessages}
                shuffleBatchLinks={shuffleBatchLinks}
                extractGroupLinks={extractGroupLinks}
                handleAbrirReformatarModal={handleAbrirReformatarModal}
                hasMessages={hasMessages}
                onGenerate={generateCampaign}
                onSendToApi={handleEnviarParaApiClick}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'exportar' && <ExportarDadosSection />}
      {activeTab === 'campanhasNovas' && <CampanhasNovasSection />}

      <PreviewDrawer
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        content={result}
        campaignName={campaignName}
        onCopy={copyToClipboard}
        onDownload={downloadJSON}
        copied={copied}
      />

      {/* Modal de Reformatar para Fornecedor */}
      {isReformatarModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setIsReformatarModalOpen(false)}
        >
          <div className="bg-[#161b22] rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-cyan-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">Reformatar para Fornecedor</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Formato: ID_SERVICO | LINK | QUANTIDADE_MEMBROS
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsReformatarModalOpen(false)
                  setServiceId('')
                  setMemberCount('')
                  setFormattedLinks('')
                }}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Campos de entrada */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                    ID do Serviço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2583"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Quantidade de Membros
                  </label>
                  <input
                    type="text"
                    placeholder="600"
                    value={memberCount}
                    onChange={(e) => setMemberCount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono"
                  />
                </div>
              </div>

              {/* Info sobre links detectados */}
              {groupsInput.trim() && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-400">
                    {extractGroupLinks().length} link(s) detectado(s) nos grupos da campanha
                  </p>
                </div>
              )}

              {/* Botão Copiar - formata e copia em um clique */}
              <button
                type="button"
                onClick={async () => {
                  if (!serviceId.trim() || !memberCount.trim()) {
                    alert('Preencha o ID do serviço e a quantidade de membros')
                    return
                  }
                  const links = extractGroupLinks()
                  if (links.length === 0) return
                  const formatted = links.map((l) => `${serviceId.trim()} | ${l} | ${memberCount.trim()}`).join('\n')
                  setFormattedLinks(formatted)
                  await navigator.clipboard.writeText(formatted)
                  setCopiedFormatted(true)
                  setTimeout(() => setCopiedFormatted(false), 2500)
                }}
                disabled={!serviceId.trim() || !memberCount.trim() || extractGroupLinks().length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                {copiedFormatted ? <span className="flex items-center justify-center gap-2"><Check className="h-4 w-4" /> Copiado!</span> : 'Gerar e Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SenderGRAM Modal */}
      <SendergramModal
        isOpen={isSendergramModalOpen}
        onClose={() => setIsSendergramModalOpen(false)}
        onConfirm={handleSendToApi}
      />
    </div >
  )
}

