// Service para gerenciamento de armazenamento local
// Pode usar localStorage, IndexedDB, ou comunicação com Electron

export class StorageService {
  private static prefix = 'app_'

  static setItem(key: string, value: unknown): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(`${this.prefix}${key}`, serialized)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`)
  }

  static clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    })
  }
}

