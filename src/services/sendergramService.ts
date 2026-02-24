
// front/src/services/sendergramService.ts

interface SendergramConfig {
    apiUrl: string;
    apiKey?: string;
    enabled: boolean;
}

interface GroupDetectedData {
    name: string;
    chatId: string;
    inviteLink?: string;
    memberCount?: number;
    operation: 'BR' | 'GRINGA';
    botUsername?: string;
}

interface BotData {
    name: string;
    token: string;
    username?: string;
    operation?: 'BR' | 'GRINGA';
}

class SendergramService {
    private config: SendergramConfig = {
        apiUrl: 'https://nuebasendergram-production.up.railway.app',
        enabled: false
    };

    configure(config: Partial<SendergramConfig>) {
        this.config = { ...this.config, ...config };
    }

    async loadConfig() {
        try {
            // Using window.electron.sendergram as defined in preload.cjs
            if ((window as any).electron?.sendergram?.carregarConfig) {
                const config = await (window as any).electron.sendergram.carregarConfig();
                this.configure(config);
                return config;
            }
        } catch (error) {
            console.error('[SendergramService] Erro ao carregar config:', error);
        }
        return this.config;
    }

    async saveConfig(config: SendergramConfig) {
        try {
            if ((window as any).electron?.sendergram?.salvarConfig) {
                await (window as any).electron.sendergram.salvarConfig(config);
                this.configure(config);
                return true;
            }
        } catch (error) {
            console.error('[SendergramService] Erro ao salvar config:', error);
            throw error;
        }
        return false;
    }

    getConfig(): SendergramConfig {
        return { ...this.config };
    }

    async sendCampaign(campaignData: any): Promise<{ success: boolean; error?: string; campaignId?: string }> {
        // Use IPC to send campaign via backend (avoids CORS)
        if ((window as any).electron?.sendergram?.sendCampaign) {
            console.log('[SendergramService] Enviando via IPC...');
            return await (window as any).electron.sendergram.sendCampaign(campaignData);
        }

        // Fallback (should not be reached if preload is correct)
        return { success: false, error: 'IPC sendCampaign not available' };
    }

    async sendGroupDetected(group: GroupDetectedData): Promise<{ success: boolean; error?: string }> {
        // Not implemented in IPC yet, likely not used in this context
        if (!this.config.apiUrl) return { success: false, error: 'URL não configurada' };

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;

            const response = await fetch(`${this.config.apiUrl}/api/grupos/detectados`, {
                method: 'POST',
                headers,
                body: JSON.stringify(group)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
        }
    }

    // New method for testing connection via IPC
    async getDetectedGroups(): Promise<GroupDetectedData[]> {
        if ((window as any).electron?.sendergram?.testConnection) {
            console.log('[SendergramService] Testando conexão via IPC...');
            const result = await (window as any).electron.sendergram.testConnection(this.config);

            if (result.success) {
                return result.groups || [];
            } else {
                throw new Error(result.error);
            }
        }

        throw new Error('IPC testConnection not available');
    }
}

export const sendergramService = new SendergramService();
export type { SendergramConfig, GroupDetectedData, BotData };
