import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '../config/paths.js';

// Função para obter o diretório de descrições
function getDescricoesDir() {
  try {
    const bancoDir = PATHS.BANCO_DIR;
    if (!bancoDir) {
      throw new Error('BANCO_DIR não está definido');
    }
    const descricoesDir = path.join(bancoDir, 'descricoes');
    return descricoesDir;
  } catch (error) {
    console.error('[getDescricoesDir] Erro ao obter diretório:', error.message);
    throw error;
  }
}

// Carregar todas as descrições
function carregarDescricoes() {
  try {
    const descricoesDir = getDescricoesDir();
    
    if (!fs.existsSync(descricoesDir)) {
      fs.mkdirSync(descricoesDir, { recursive: true });
      return [];
    }
    
    const arquivos = fs.readdirSync(descricoesDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.txt'))
      .map(dirent => {
        const filePath = path.join(descricoesDir, dirent.name);
        const conteudo = fs.readFileSync(filePath, 'utf-8');
        const linhas = conteudo.split('\n').filter(linha => linha.trim().length > 0);
        
        return {
          id: dirent.name.replace('.txt', ''),
          nome: dirent.name.replace('.txt', ''),
          descricoes: linhas,
          quantidade: linhas.length,
        };
      });
    
    return arquivos;
  } catch (error) {
    console.error('[carregarDescricoes] Erro:', error.message);
    throw error;
  }
}

// Criar novo arquivo de descrições
function criarDescricao(nome) {
  try {
    const descricoesDir = getDescricoesDir();
    
    if (!fs.existsSync(descricoesDir)) {
      fs.mkdirSync(descricoesDir, { recursive: true });
    }
    
    // Validar nome
    const nomeLimpo = nome.trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
    
    if (!nomeLimpo || nomeLimpo.length === 0) {
      throw new Error('Nome inválido');
    }
    
    const filePath = path.join(descricoesDir, `${nomeLimpo}.txt`);
    
    if (fs.existsSync(filePath)) {
      throw new Error('Arquivo de descrições já existe');
    }
    
    // Criar arquivo vazio
    fs.writeFileSync(filePath, '', 'utf-8');
    
    return {
      success: true,
      id: nomeLimpo,
      nome: nomeLimpo,
      quantidade: 0,
    };
  } catch (error) {
    console.error('[criarDescricao] Erro:', error.message);
    return { success: false, error: error.message };
  }
}

// Atualizar nome do arquivo de descrições
function atualizarDescricao(id, nome) {
  try {
    const descricoesDir = getDescricoesDir();
    const filePath = path.join(descricoesDir, `${id}.txt`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo de descrições não encontrado' };
    }
    
    // Se o nome mudou, renomear o arquivo
    const nomeLimpo = nome.trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
    
    if (nomeLimpo !== id) {
      const novoFilePath = path.join(descricoesDir, `${nomeLimpo}.txt`);
      if (fs.existsSync(novoFilePath)) {
        return { success: false, error: 'Já existe um arquivo com esse nome' };
      }
      fs.moveSync(filePath, novoFilePath);
    }
    
    return {
      success: true,
      id: nomeLimpo,
      nome: nomeLimpo,
    };
  } catch (error) {
    console.error('[atualizarDescricao] Erro:', error.message);
    return { success: false, error: error.message };
  }
}

// Carregar conteúdo de um arquivo de descrições
function carregarConteudoDescricao(id) {
  try {
    const descricoesDir = getDescricoesDir();
    const filePath = path.join(descricoesDir, `${id}.txt`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo de descrições não encontrado' };
    }
    
    const conteudo = fs.readFileSync(filePath, 'utf-8');
    
    return {
      success: true,
      conteudo: conteudo,
    };
  } catch (error) {
    console.error('[carregarConteudoDescricao] Erro:', error.message);
    return { success: false, error: error.message };
  }
}

// Salvar conteúdo de um arquivo de descrições
function salvarConteudoDescricao(id, conteudo) {
  try {
    const descricoesDir = getDescricoesDir();
    const filePath = path.join(descricoesDir, `${id}.txt`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo de descrições não encontrado' };
    }
    
    fs.writeFileSync(filePath, conteudo, 'utf-8');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('[salvarConteudoDescricao] Erro:', error.message);
    return { success: false, error: error.message };
  }
}

// Deletar arquivo de descrições
function deletarDescricao(id) {
  try {
    const descricoesDir = getDescricoesDir();
    const filePath = path.join(descricoesDir, `${id}.txt`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Arquivo de descrições não encontrado' };
    }
    
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('[deletarDescricao] Erro:', error.message);
    return { success: false, error: error.message };
  }
}

import { ipcMain } from 'electron';

export function registerDescricoesHandlers() {
  ipcMain.handle('carregar-descricoes', async () => {
    try {
      return carregarDescricoes();
    } catch (error) {
      console.error('[Handler] Erro ao carregar descrições:', error.message);
      return [];
    }
  });

  ipcMain.handle('criar-descricao', async (event, nome) => {
    try {
      return criarDescricao(nome);
    } catch (error) {
      console.error('[Handler] Erro ao criar descrição:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('atualizar-descricao', async (event, id, nome) => {
    try {
      return atualizarDescricao(id, nome);
    } catch (error) {
      console.error('[Handler] Erro ao atualizar descrição:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deletar-descricao', async (event, id) => {
    try {
      return deletarDescricao(id);
    } catch (error) {
      console.error('[Handler] Erro ao deletar descrição:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('carregar-conteudo-descricao', async (event, id) => {
    try {
      return carregarConteudoDescricao(id);
    } catch (error) {
      console.error('[Handler] Erro ao carregar conteúdo da descrição:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('salvar-conteudo-descricao', async (event, id, conteudo) => {
    try {
      return salvarConteudoDescricao(id, conteudo);
    } catch (error) {
      console.error('[Handler] Erro ao salvar conteúdo da descrição:', error.message);
      return { success: false, error: error.message };
    }
  });
}


