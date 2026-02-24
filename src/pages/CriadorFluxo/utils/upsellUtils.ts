import { Mensagem, Plano, UpsellSalvo, VipGroup } from '../types/Fluxo'

const normalizarVipGroups = (vipGroups: VipGroup[] = []) => {
  return [...vipGroups]
    .map(vip => ({
      chatId: String(vip.chatId || '').trim(),
      durationDays: vip.durationDays || 0,
      name: String(vip.name || '').trim(),
    }))
    .sort((a, b) => {
      const keyA = `${a.chatId}-${a.durationDays}-${a.name}`.toLowerCase()
      const keyB = `${b.chatId}-${b.durationDays}-${b.name}`.toLowerCase()
      return keyA.localeCompare(keyB)
    })
}

const normalizarPlanos = (planos: Plano[] = []) => {
  return [...planos]
    .map(plano => ({
      name: String(plano.name || '').trim(),
      value: Number(plano.value || 0),
      vipGroups: normalizarVipGroups(plano.vipGroups || []),
    }))
    .sort((a, b) => {
      const keyA = `${a.name}-${a.value}`
      const keyB = `${b.name}-${b.value}`
      return keyA.localeCompare(keyB)
    })
}

export const criarAssinaturaUpsell = (mensagem: Omit<Mensagem, 'id' | 'posicao'> | Mensagem) => {
  const normalized = {
    description: String(mensagem.description || '').trim(),
    video: String(mensagem.video || '').trim(),
    delay: Number(mensagem.delay || 0),
    delayType: mensagem.delayType || 'relative',
    scheduleTime: mensagem.scheduleTime || '',
    scheduleDays: Number(mensagem.scheduleDays || 0),
    planos: normalizarPlanos(mensagem.planos || []),
  }
  return JSON.stringify(normalized)
}

export const criarNomeUpsell = (mensagem: Omit<Mensagem, 'id' | 'posicao'> | Mensagem) => {
  const texto = String(mensagem.description || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (texto.length === 0) return 'Upsell importado'
  return texto.length > 60 ? `${texto.substring(0, 60)}...` : texto
}

export const criarAssinaturaUpsellSalvo = (upsell: UpsellSalvo) => {
  return criarAssinaturaUpsell(upsell.mensagem)
}
