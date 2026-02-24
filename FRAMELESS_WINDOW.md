# Janela Frameless com Titlebar Customizada

Este documento explica a implementação da janela sem borda (frameless) com titlebar customizada em React.

## Estrutura de Arquivos

```
front/
├── electron/
│   ├── window/
│   │   └── windowManager.js       # Configuração do BrowserWindow (frame: false)
│   ├── handlers/
│   │   └── windowHandlers.js      # Handlers IPC para controle de janela
│   └── preload.cjs                # Exposição segura da API desktop via contextBridge
├── src/
│   ├── components/
│   │   └── Titlebar.tsx           # Componente React da titlebar customizada
│   ├── components/layout/
│   │   └── Layout.tsx             # Layout principal (integra a Titlebar)
│   └── types/
│       └── electron.d.ts          # Tipos TypeScript para a API desktop
└── src/
    └── index.css                  # Estilos CSS (drag/anti-drag regions)
```

## Configurações do Electron

### BrowserWindow (windowManager.js)

A janela é configurada como frameless:

```javascript
mainWindow = new BrowserWindow({
  frame: false,                    // Remove a borda padrão
  titleBarStyle: 'hidden',         // Esconde titlebar padrão (Mac/Linux)
  backgroundColor: '#0f172a',      // Cor de fundo escura
  // ... outras configurações
})
```

### Handlers IPC (windowHandlers.js)

Fornece métodos seguros para controlar a janela:

- `window-minimize`: Minimiza a janela
- `window-maximize`: Maximiza a janela
- `window-toggle-maximize`: Alterna entre maximizado/restaurado
- `window-close`: Fecha a janela
- `window-is-maximized`: Verifica se está maximizada

### Preload (preload.cjs)

Expõe a API via `contextBridge`:

```javascript
desktop: {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  toggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback) => { /* ... */ },
  removeMaximizedChanged: () => { /* ... */ },
}
```

## Componente Titlebar

### Estrutura

A titlebar possui:

1. **Área arrastável** (à esquerda): `-webkit-app-region: drag`
   - Permite arrastar a janela
   - Pode conter logo/título do app

2. **Botões de controle** (à direita): `-webkit-app-region: no-drag`
   - Minimizar: ícone `Minus`
   - Maximizar/Restaurar: ícone `Maximize2` / `Square` (quando maximizado)
   - Fechar: ícone `X` com hover vermelho

### Estado de Maximização

O componente:
- Verifica o estado inicial ao montar
- Escuta eventos `window-maximized-changed` do Electron
- Atualiza o ícone do botão maximize/restore dinamicamente

### Estilos

- Altura fixa: `h-10` (40px)
- Background: `bg-gray-800/95` com `backdrop-blur-md`
- Borda inferior: `border-b border-gray-700/50`
- Botões com hover states suaves

## Layout Integration

O `Layout.tsx` foi atualizado para:

1. Renderizar a `Titlebar` no topo (fixed position)
2. Adicionar `paddingTop: '40px'` no main content para não ficar por baixo da titlebar

```typescript
<Titlebar />
<main style={{ paddingTop: '40px' }}>
  {children}
</main>
```

## CSS Drag Regions

No `index.css`:

- **Body padrão**: `-webkit-app-region: no-drag`
- **Titlebar drag region**: `-webkit-app-region: drag` (aplicado via inline style)
- **Botões**: `-webkit-app-region: no-drag` (aplicado via inline style)

Regras importantes:
- Elementos com `drag` permitem arrastar a janela
- Elementos com `no-drag` permanecem clicáveis normalmente
- `user-select: none` na titlebar previne seleção de texto

## Compatibilidade

### Windows
- `frame: false` remove completamente a borda
- Maximize respeita a taskbar automaticamente
- Botões customizados funcionam perfeitamente

### macOS
- `titleBarStyle: 'hidden'` esconde a titlebar padrão
- Área de arrastar funciona normalmente
- Botões customizados aparecem no topo

### Linux
- `frame: false` remove a borda padrão do window manager
- Comportamento similar ao Windows

## Como Testar

1. **Iniciar o app em desenvolvimento**:
   ```bash
   cd front
   npm run dev        # Terminal 1: Vite dev server
   npm run electron   # Terminal 2: Electron
   ```

2. **Testar funcionalidades**:
   - Arrastar a janela pela titlebar
   - Clicar nos botões (minimizar, maximizar, fechar)
   - Verificar que o ícone do botão maximize muda quando maximizado
   - Verificar que o conteúdo não fica por baixo da titlebar

3. **Verificar comportamento**:
   - Maximize não deve cobrir a taskbar (Windows)
   - Resize deve funcionar normalmente
   - Botões devem ter feedback visual ao hover

## Troubleshooting

### Janela não arrasta
- Verificar se `-webkit-app-region: drag` está aplicado na área correta
- Verificar se botões têm `-webkit-app-region: no-drag`

### Botões não funcionam
- Verificar se `window.electron?.desktop` está disponível no console
- Verificar se handlers IPC estão registrados no main.js
- Verificar console do Electron para erros

### Estado de maximização não atualiza
- Verificar se listeners estão configurados no windowManager.js
- Verificar se eventos `window-maximized-changed` estão sendo enviados

### Conteúdo por baixo da titlebar
- Verificar se `paddingTop: '40px'` está aplicado no main content
- Verificar se a titlebar tem `position: fixed` e `z-index` alto

## Segurança

A implementação segue as melhores práticas de segurança do Electron:

- ✅ `contextIsolation: true`
- ✅ `nodeIntegration: false`
- ✅ Uso de `contextBridge` para expor API limitada
- ✅ IPC handlers validam e sanitizam entradas
- ✅ Sem exposição direta de APIs do Node.js

## Próximos Passos (Opcional)

Possíveis melhorias futuras:

1. **Double-click para maximizar**: Detectar double-click na área arrastável
2. **Snap zones**: Implementar snap to sides (Windows 11 style)
3. **Título dinâmico**: Mostrar título da página atual
4. **Menu context**: Menu do sistema (File, Edit, View, etc)
5. **Animação de transição**: Animações suaves ao maximizar/restaurar

