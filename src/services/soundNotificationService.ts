/**
 * Serviço de notificações sonoras
 * 
 * Reproduz sons para notificar eventos importantes:
 * - Sucesso: 2 bips rápidos
 * - Erro: 3 bips longos
 * - Concluído (Grupos Enchidos): 4 bips longos
 */

class SoundNotificationService {
  private enabled: boolean = true
  private audioContext: AudioContext | null = null

  // Inicializar AudioContext (criado sob demanda)
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  // Criar um tom (beep)
  private createBeep(frequency: number, duration: number, volume: number = 0.3): Promise<void> {
    return new Promise((resolve) => {
      const audioContext = this.getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)

      oscillator.onended = () => resolve()
    })
  }

  // Reproduzir notificação de sucesso (2 bips rápidos)
  async playSuccess(): Promise<void> {
    if (!this.enabled) return

    try {
      // Primeiro bip: 800Hz por 100ms
      await this.createBeep(800, 0.1, 0.3)
      
      // Pequena pausa: 50ms
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Segundo bip: 800Hz por 100ms
      await this.createBeep(800, 0.1, 0.3)
    } catch (error) {
      console.warn('[SoundNotification] Erro ao reproduzir som de sucesso:', error)
    }
  }

  // Reproduzir notificação de erro (3 bips longos)
  async playError(): Promise<void> {
    if (!this.enabled) return

    try {
      // Primeiro bip longo: 400Hz por 300ms
      await this.createBeep(400, 0.3, 0.4)
      
      // Pausa: 100ms
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Segundo bip longo: 400Hz por 300ms
      await this.createBeep(400, 0.3, 0.4)
      
      // Pausa: 100ms
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Terceiro bip longo: 400Hz por 300ms
      await this.createBeep(400, 0.3, 0.4)
    } catch (error) {
      console.warn('[SoundNotification] Erro ao reproduzir som de erro:', error)
    }
  }

  // Reproduzir notificação de conclusão de grupos enchidos (4 bips longos)
  async playGruposEnchidos(): Promise<void> {
    if (!this.enabled) return

    try {
      // Primeiro bip longo: 600Hz por 400ms
      await this.createBeep(600, 0.4, 0.5)
      
      // Pausa: 150ms
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Segundo bip longo: 600Hz por 400ms
      await this.createBeep(600, 0.4, 0.5)
      
      // Pausa: 150ms
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Terceiro bip longo: 600Hz por 400ms
      await this.createBeep(600, 0.4, 0.5)
      
      // Pausa: 150ms
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Quarto bip longo: 600Hz por 400ms
      await this.createBeep(600, 0.4, 0.5)
    } catch (error) {
      console.warn('[SoundNotification] Erro ao reproduzir som de grupos enchidos:', error)
    }
  }

  // Habilitar notificações sonoras
  enable(): void {
    this.enabled = true
    // Salvar preferência no localStorage
    localStorage.setItem('soundNotificationsEnabled', 'true')
  }

  // Desabilitar notificações sonoras
  disable(): void {
    this.enabled = false
    // Salvar preferência no localStorage
    localStorage.setItem('soundNotificationsEnabled', 'false')
  }

  // Verificar se está habilitado
  isEnabled(): boolean {
    return this.enabled
  }

  // Carregar preferência do localStorage
  loadPreference(): void {
    const saved = localStorage.getItem('soundNotificationsEnabled')
    if (saved !== null) {
      this.enabled = saved === 'true'
    }
  }
}

// Instância singleton
export const soundNotificationService = new SoundNotificationService()

// Reproduzir notificação quando grupos são enchidos (4 bips longos)
export const playGruposEnchidosNotification = () => {
  soundNotificationService.playGruposEnchidos()
}

// Carregar preferência ao inicializar
if (typeof window !== 'undefined') {
  soundNotificationService.loadPreference()
}

