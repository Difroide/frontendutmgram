# ⚠️ IMPORTANTE: Como Reiniciar o App Corretamente

Se você ainda vê a barra de título padrão do Windows após as mudanças, siga estes passos:

## 1. Fechar Completamente o App

1. **Fechar todas as janelas do Electron**
   - Certifique-se de que TODAS as janelas do app estão fechadas
   - Verifique na Taskbar se não há processos do Electron rodando

2. **Fechar processos no Gerenciador de Tarefas** (se necessário)
   - Pressione `Ctrl + Shift + Esc` para abrir o Gerenciador de Tarefas
   - Procure por processos "Electron" ou o nome do seu app
   - Finalize todos os processos relacionados

## 2. Limpar Cache (Opcional mas Recomendado)

Se o problema persistir, pode ser cache:

```bash
cd front
# Remover node_modules/.cache se existir
rm -rf node_modules/.cache

# No Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

## 3. Reiniciar o App

```bash
cd front

# Terminal 1: Iniciar Vite dev server
npm run dev

# Terminal 2: Iniciar Electron (AGORA)
npm run electron
```

## 4. Verificar no Console do Electron

Abra o DevTools do Electron (já deve abrir automaticamente em dev) e verifique:

1. No console, procure por: `✅ Janela frameless configurada para Windows`
2. Se essa mensagem aparecer, a configuração está correta
3. Se não aparecer, pode haver algum problema na inicialização

## 5. Verificar se Funcionou

Após reiniciar, você deve ver:
- ✅ **SEM** barra de título padrão do Windows
- ✅ Titlebar customizada no topo (40px de altura, fundo escuro)
- ✅ Botões customizados (minimizar, maximizar, fechar) à direita
- ✅ Pode arrastar a janela pela área da titlebar

## Troubleshooting

### Ainda aparece a barra de título padrão?

1. **Verifique se o código foi salvo corretamente**
   - Abra `front/electron/window/windowManager.js`
   - Certifique-se de que a linha tem `frame: false`

2. **Verifique se não há múltiplas janelas**
   - O problema pode ser que há uma janela antiga ainda aberta
   - Feche TODAS as janelas e reinicie

3. **Verifique a versão do Electron**
   ```bash
   cd front
   npm list electron
   ```
   - Versões muito antigas podem ter problemas com `frame: false`
   - Recomendado: Electron 20+ ou superior

4. **Teste criando uma janela simples**
   - Se nada funcionar, pode ser um problema específico do sistema
   - Teste em outro computador Windows se possível

## Comando Rápido (Windows PowerShell)

```powershell
# Parar todos os processos Electron
Get-Process | Where-Object {$_.ProcessName -like "*electron*"} | Stop-Process -Force

# Depois, reiniciar o app normalmente
cd front
npm run dev  # Terminal 1
npm run electron  # Terminal 2
```

