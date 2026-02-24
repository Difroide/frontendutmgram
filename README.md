# Interface Desktop

Interface desktop moderna construída com React.js + Vite + Tailwind CSS + Electron.

## 🚀 Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool rápida e moderna
- **Tailwind CSS** - Framework CSS utility-first
- **Electron** - Framework para aplicações desktop
- **React Router** - Roteamento para React

## 📁 Estrutura do Projeto

```
front/
├── electron/          # Arquivos do Electron
│   ├── main.js       # Processo principal
│   └── preload.js    # Script de preload
├── src/
│   ├── components/   # Componentes reutilizáveis
│   │   ├── layout/   # Componentes de layout
│   │   └── sidebar/  # Componente da sidebar
│   ├── pages/        # Páginas da aplicação
│   ├── App.jsx       # Componente principal
│   ├── main.jsx      # Ponto de entrada
│   └── index.css     # Estilos globais
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🛠️ Instalação

```bash
# Instalar dependências
npm install
```

## 🏃 Executar

### Modo Desenvolvimento (apenas React)
```bash
npm run dev
```

### Modo Desenvolvimento (com Electron)
```bash
npm run electron:dev
```

### Build para Produção
```bash
npm run build
```

### Executar Electron
```bash
npm run electron
```

### Build Electron
```bash
npm run build:electron
```

## 📱 Funcionalidades

- ✅ Dashboard com visão geral
- ✅ Gerenciamento de Contas
- ✅ Criador de Conteúdo
- ✅ Bots de Mídias Sociais
- ✅ Gerenciamento de Proxy
- ✅ Sistema de Tarefas

## 🎨 Design

- Sidebar azul escuro (#1e3a5f) com navegação
- Fundo branco para área de conteúdo
- Interface moderna e responsiva
- Componentes modulares e reutilizáveis

