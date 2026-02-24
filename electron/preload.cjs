const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  telegram: {
    getContas: () => ipcRenderer.invoke('get-telegram-contas'),
    executarTelegram: (pastaPath) => ipcRenderer.invoke('executar-telegram', pastaPath),
    excluirNumero: (numero) => ipcRenderer.invoke('excluir-numero', numero),
    adicionarContas: () => ipcRenderer.invoke('adicionar-contas'),
    buscarContasParaImportar: () => ipcRenderer.invoke('buscar-contas-para-importar'),
    importarContas: (contasParaImportar, tagSelecionada) => ipcRenderer.invoke('importar-contas', contasParaImportar, tagSelecionada),
    transferirContasEntreOps: (accountNumeros, operacaoDestinoPath) => ipcRenderer.invoke('transferir-contas-entre-ops', accountNumeros, operacaoDestinoPath),
    buscarSessoesRecursivamente: (pastaOrigem) => ipcRenderer.invoke('buscar-sessoes-recursivamente', pastaOrigem),
    importarSessoes: (sessionPaths, tagSelecionada) => ipcRenderer.invoke('importar-sessoes', sessionPaths, tagSelecionada),
    importarPastaPortatil: (pastaOrigem, tagSelecionada) => ipcRenderer.invoke('importar-pasta-portatil', pastaOrigem, tagSelecionada),
    baixarLinksMega: (payload) => ipcRenderer.invoke('baixar-links-mega', payload),
    verificarContas: (accountIds, tipo, sessoesParalelas, proxyId, criarApiAposVerificacao) => ipcRenderer.invoke('verificar-contas', accountIds, tipo, sessoesParalelas, proxyId, criarApiAposVerificacao),
    onVerificarContasProgress: (callback) => {
      ipcRenderer.on('verificar-contas-progress', (event, data) => callback(data))
    },
    removeVerificarContasProgress: () => {
      ipcRenderer.removeAllListeners('verificar-contas-progress')
    },
    getDetalhesConta: (numero) => ipcRenderer.invoke('get-detalhes-conta', numero),
    adicionarListas: (payload) => ipcRenderer.invoke('adicionar-listas', payload),
    onProgresso: (callback) => {
      ipcRenderer.on('automacao-progresso', (event, data) => callback(data))
    },
    removeProgresso: () => {
      ipcRenderer.removeAllListeners('automacao-progresso')
    },
    alterarCategoriaEmMassa: (accountIds, categoriaId) => ipcRenderer.invoke('alterar-categoria-em-massa', accountIds, categoriaId),
    alterarTagsEmMassa: (accountIds, tagsParaAdicionar, tagsParaRemover) => ipcRenderer.invoke('alterar-tags-em-massa', accountIds, tagsParaAdicionar, tagsParaRemover),
    criarBot: (accountId, botName, botUsername, fotoBase64) => ipcRenderer.invoke('criar-bot-telegram', accountId, botName, botUsername, fotoBase64),
    verificarGruposOnline: (accountIds) => ipcRenderer.invoke('verificar-grupos-online', accountIds),
    verificarGruposPorBot: (botToken, botUsername) => ipcRenderer.invoke('verificar-grupos-por-bot', botToken, botUsername),
    getEstatisticasBotsListas: () => ipcRenderer.invoke('get-estatisticas-bots-listas'),
    removerBotTodosGrupos: (botUsername) => ipcRenderer.invoke('remover-bot-todos-grupos', botUsername),
    removerBotTodosGruposFisico: (options) => ipcRenderer.invoke('remover-bot-todos-grupos-fisico', options),
    // Login manual de contas Telegram
    loginSendCode: (phoneNumber) => ipcRenderer.invoke('telegram-login-send-code', phoneNumber),
    loginVerifyCode: (loginId, phoneCode) => ipcRenderer.invoke('telegram-login-verify-code', loginId, phoneCode),
    loginPassword: (loginId, password) => ipcRenderer.invoke('telegram-login-password', loginId, password),
    loginCancel: (loginId) => ipcRenderer.invoke('telegram-login-cancel', loginId),
    loginAddTag: (accountNumber, tagName) => ipcRenderer.invoke('telegram-login-add-tag', accountNumber, tagName),
  },
  descricoes: {
    carregar: () => ipcRenderer.invoke('carregar-descricoes'),
    criar: (nome) => ipcRenderer.invoke('criar-descricao', nome),
    atualizar: (id, nome) => ipcRenderer.invoke('atualizar-descricao', id, nome),
    deletar: (id) => ipcRenderer.invoke('deletar-descricao', id),
    carregarConteudo: (id) => ipcRenderer.invoke('carregar-conteudo-descricao', id),
    salvarConteudo: (id, conteudo) => ipcRenderer.invoke('salvar-conteudo-descricao', id, conteudo),
  },
  criador: {
    // Grupos de nomes (novo sistema: vários grupos, cada um com sua lista de nomes)
    listarGruposNomes: () => ipcRenderer.invoke('listar-grupos-nomes'),
    criarGrupoNomes: (nome) => ipcRenderer.invoke('criar-grupo-nomes', nome),
    atualizarGrupoNomes: (grupoId, novoNome) => ipcRenderer.invoke('atualizar-grupo-nomes', grupoId, novoNome),
    excluirGrupoNomes: (grupoId) => ipcRenderer.invoke('excluir-grupo-nomes', grupoId),
    carregarNomesDoGrupo: (grupoId) => ipcRenderer.invoke('carregar-nomes-do-grupo', grupoId),
    adicionarNomesAoGrupo: (grupoId, nomes) => ipcRenderer.invoke('adicionar-nomes-ao-grupo', grupoId, nomes),
    atualizarNomeNoGrupo: (grupoId, nomeId, novoNome) => ipcRenderer.invoke('atualizar-nome-no-grupo', grupoId, nomeId, novoNome),
    excluirNomesDoGrupo: (grupoId, nomeIds) => ipcRenderer.invoke('excluir-nomes-do-grupo', grupoId, nomeIds),
    // Handlers de nomes individuais (compatibilidade: operam no grupo Geral)
    adicionarNomesGrupos: (nomes) => ipcRenderer.invoke('adicionar-nomes-grupos', nomes),
    carregarNomesGrupos: () => ipcRenderer.invoke('carregar-nomes-grupos'),
    atualizarNomeGrupo: (nomeId, novoNome) => ipcRenderer.invoke('atualizar-nome-grupo', nomeId, novoNome),
    excluirNomesGrupos: (nomeIds) => ipcRenderer.invoke('excluir-nomes-grupos', nomeIds),
    // Handlers antigos (deprecated - mantidos para compatibilidade)
    carregarNichos: () => ipcRenderer.invoke('carregar-nichos'),
    criarPastaNicho: (nomeNicho) => ipcRenderer.invoke('criar-pasta-nicho', nomeNicho),
    excluirPastaNicho: (nomeNicho) => ipcRenderer.invoke('excluir-pasta-nicho', nomeNicho),
    salvarNomesGrupos: (nomeNicho, packName, nomes) => ipcRenderer.invoke('salvar-nomes-grupos', nomeNicho, packName, nomes),
    carregarNomesGruposAntigo: (nomeNicho) => ipcRenderer.invoke('carregar-nomes-grupos', nomeNicho),
    carregarTodosPacksNomes: () => ipcRenderer.invoke('carregar-todos-packs-nomes'),
    excluirPackNomes: (nomeNicho, packId) => ipcRenderer.invoke('excluir-pack-nomes', nomeNicho, packId),
    salvarListaBots: (listName, bots, prioritaria) => ipcRenderer.invoke('salvar-lista-bots', listName, bots, prioritaria),
    carregarTodasListas: () => ipcRenderer.invoke('carregar-todas-listas'),
    excluirListaBots: (listName) => ipcRenderer.invoke('excluir-lista-bots', listName),
    atualizarListaBots: (listNameAntigo, listNameNovo, bots, prioritaria) => ipcRenderer.invoke('atualizar-lista-bots', listNameAntigo, listNameNovo, bots, prioritaria),
    salvarConfigListasPrioritarias: (quantidade) => ipcRenderer.invoke('salvar-config-listas-prioritarias', quantidade),
    carregarConfigListasPrioritarias: () => ipcRenderer.invoke('carregar-config-listas-prioritarias'),
    carregarCategorias: () => ipcRenderer.invoke('carregar-categorias'),
    criarCategoria: (nome, descricao) => ipcRenderer.invoke('criar-categoria', nome, descricao),
    verificarGruposSemListas: (minBotsLista) => ipcRenderer.invoke('verificar-grupos-sem-listas', minBotsLista),
    deletarCategoria: (categoriaId) => ipcRenderer.invoke('deletar-categoria', categoriaId),
    atualizarCategoria: (categoriaId, updates) => ipcRenderer.invoke('atualizar-categoria', categoriaId, updates),
    carregarNomesCategoria: (categoriaId) => ipcRenderer.invoke('carregar-nomes-categoria', categoriaId),
    salvarNomesCategoria: (categoriaId, nomeArquivo, nomes) => ipcRenderer.invoke('salvar-nomes-categoria', categoriaId, nomeArquivo, nomes),
    carregarBotsCategoria: (categoriaId) => ipcRenderer.invoke('carregar-bots-categoria', categoriaId),
    carregarGruposCategoria: (categoriaId) => ipcRenderer.invoke('carregar-grupos-categoria', categoriaId),
    sincronizarGruposCategoria: (categoriaId) => ipcRenderer.invoke('sincronizar-grupos-categoria', categoriaId),
    sincronizarTudoCategoria: (categoriaId) => ipcRenderer.invoke('sincronizar-tudo-categoria', categoriaId),
    baixarNotasCategoria: (categoriaId) => ipcRenderer.invoke('baixar-notas-categoria', categoriaId),
    limparDuplicatasGrupos: (tipo) => ipcRenderer.invoke('limpar-duplicatas-grupos', tipo),
    salvarBotCategoriaManual: (categoriaId, botData) => ipcRenderer.invoke('salvar-bot-categoria-manual', categoriaId, botData),
    deletarBotCategoria: (categoriaId, botIndex) => ipcRenderer.invoke('deletar-bot-categoria', categoriaId, botIndex),
    salvarGrupoCategoriaManual: (categoriaId, grupoData) => ipcRenderer.invoke('salvar-grupo-categoria-manual', categoriaId, grupoData),
    deletarGrupoCategoria: (categoriaId, grupoIndex) => ipcRenderer.invoke('deletar-grupo-categoria', categoriaId, grupoIndex),
    analisarCategoriasRelatorio: (customPaths) => ipcRenderer.invoke('analisar-categorias-relatorio', customPaths || {}),
    deletarCategoriasEmMassa: (categoriaIds) => ipcRenderer.invoke('deletar-categorias-em-massa', categoriaIds),
    reutilizarBotsCategoria: (categorias) => ipcRenderer.invoke('reutilizar-bots-categoria', categorias),
    carregarBotsReutilizados: () => ipcRenderer.invoke('carregar-bots-reutilizados'),
    removerBotReutilizado: (botId) => ipcRenderer.invoke('remover-bot-reutilizado', botId),
    atualizarBotReutilizado: (botId, data) => ipcRenderer.invoke('atualizar-bot-reutilizado', botId, data),
    vincularBotReutilizadoCategoria: (botId, categoriaId) => ipcRenderer.invoke('vincular-bot-reutilizado-categoria', botId, categoriaId),
    exportarDadosCategorias: (options) => ipcRenderer.invoke('exportar-dados-categorias', options),
    obterLinksFornecedorCategorias: (options) => ipcRenderer.invoke('obter-links-fornecedor-categorias', options),
    onAnalisarCategoriasProgress: (callback) => {
      ipcRenderer.on('analisar-categorias-progress', (event, data) => callback(data))
    },
    removeAnalisarCategoriasProgress: () => {
      ipcRenderer.removeAllListeners('analisar-categorias-progress')
    },
  },
  utils: {
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
    saveSmmApiKey: (provider, apiKey) => ipcRenderer.invoke('save-smm-api-key', provider, apiKey),
    getSmmApiKey: (provider) => ipcRenderer.invoke('get-smm-api-key', provider),
    selecionarPasta: () => ipcRenderer.invoke('selecionar-pasta'),
    selecionarArquivo: (extensions) => ipcRenderer.invoke('selecionar-arquivo', extensions || ['exe']),
    selecionarArquivoJson: () => ipcRenderer.invoke('selecionar-arquivo-json'),
    obterFotoAleatoria: (pastaFotos) => ipcRenderer.invoke('obter-foto-aleatoria', pastaFotos),
    listarFotosPasta: (pastaFotos) => ipcRenderer.invoke('listar-fotos-pasta', pastaFotos),
    obterFotoEspecifica: (pastaFotos, nomeArquivo) => ipcRenderer.invoke('obter-foto-especifica', pastaFotos, nomeArquivo),
  },
  configuracoes: {
    salvar: (config) => ipcRenderer.invoke('salvar-configuracoes-gerais', config),
    carregar: () => ipcRenderer.invoke('carregar-configuracoes-gerais'),
  },
  apiTelegram: {
    salvar: (apiId, apiHash) => ipcRenderer.invoke('salvar-api-telegram', apiId, apiHash),
    carregarTodas: () => ipcRenderer.invoke('carregar-apis-telegram'),
    excluir: (apiId) => ipcRenderer.invoke('excluir-api-telegram', apiId),
  },
  apiAutoCreator: {
    criarApiAutomatica: (accountId, appName) => ipcRenderer.invoke('criar-api-automatica', accountId, appName),
    criarApisEmLote: (options) => ipcRenderer.invoke('criar-apis-em-lote', options),
    verificarProgresso: () => ipcRenderer.invoke('verificar-progresso'),
    cancelarCriacao: () => ipcRenderer.invoke('cancelar-criacao'),
  },
  verificarMembros: {
    verificarGrupos: (accountIds) => ipcRenderer.invoke('verificar-membros-grupos', accountIds),
    contarGrupos: (accountIds) => ipcRenderer.invoke('verificar-membros-contar-grupos', accountIds),
    verificarTodosGrupos: () => ipcRenderer.invoke('verificar-membros-todos-grupos'),
    contarTodosGrupos: () => ipcRenderer.invoke('verificar-membros-contar-todos-grupos'),
    getVerificacaoDiariaConfig: () => ipcRenderer.invoke('verificar-membros-diaria-get-config'),
    setVerificacaoDiariaEnabled: (enabled) => ipcRenderer.invoke('verificar-membros-diaria-set-enabled', enabled),
    iniciarVerificacao: () => ipcRenderer.invoke('verificar-membros-iniciar'),
    onVerificacaoProgress: (callback) => {
      ipcRenderer.on('verificacao-membros-progress', (event, data) => callback(data))
    },
    removeVerificacaoProgress: () => {
      ipcRenderer.removeAllListeners('verificacao-membros-progress')
    },
    onVerificacaoBotLogOffline: (callback) => {
      ipcRenderer.on('verificacao-bot-log-offline', (event, data) => callback(data))
    },
    removeVerificacaoBotLogOffline: () => {
      ipcRenderer.removeAllListeners('verificacao-bot-log-offline')
    },
  },
  fixador: {
    listarMensagens: () => ipcRenderer.invoke('fixador-listar-mensagens'),
    listarFormatacoes: () => ipcRenderer.invoke('fixador-listar-formatacoes'),
    prepararPreviewHtml: (texto) => ipcRenderer.invoke('fixador-preparar-preview-html', texto),
    listarVariaveisTexto: () => ipcRenderer.invoke('fixador-listar-variaveis-texto'),
    criarMensagem: (data) => ipcRenderer.invoke('fixador-criar-mensagem', data),
    atualizarMensagem: (id, updates) => ipcRenderer.invoke('fixador-atualizar-mensagem', id, updates),
    removerMensagem: (id) => ipcRenderer.invoke('fixador-remover-mensagem', id),
    selecionarFoto: () => ipcRenderer.invoke('fixador-selecionar-foto'),
    listarBots: () => ipcRenderer.invoke('fixador-listar-bots'),
    criarBot: (data) => ipcRenderer.invoke('fixador-criar-bot', data),
    atualizarBot: (id, updates) => ipcRenderer.invoke('fixador-atualizar-bot', id, updates),
    removerBot: (id) => ipcRenderer.invoke('fixador-remover-bot', id),
    adicionarGrupo: (botId, grupo) => ipcRenderer.invoke('fixador-adicionar-grupo', botId, grupo),
    removerGrupo: (botId, groupId, topicId) => ipcRenderer.invoke('fixador-remover-grupo', botId, groupId, topicId),
    atualizarGrupo: (botId, groupId, updates) => ipcRenderer.invoke('fixador-atualizar-grupo', botId, groupId, updates),
    atualizarTopicosGrupo: (botId, groupId, topicId) => ipcRenderer.invoke('fixador-atualizar-topicos-grupo', botId, groupId, topicId),
    disparar: () => ipcRenderer.invoke('fixador-disparar'),
    dispararSelecionado: (botIds, mensagemId) => ipcRenderer.invoke('fixador-disparar-selecionado', botIds, mensagemId),
    verificarTopicosGrupo: (accountId, groupLink) => ipcRenderer.invoke('fixador-verificar-topicos-grupo', accountId, groupLink),
    getStatus: () => ipcRenderer.invoke('fixador-get-status'),
    ativar: () => ipcRenderer.invoke('fixador-ativar'),
    desativar: () => ipcRenderer.invoke('fixador-desativar'),
    iniciarCicloGrupo: (botId, groupId, topicId) => ipcRenderer.invoke('fixador-iniciar-ciclo-grupo', botId, groupId, topicId),
  },
  verificadorDisparo: {
    verificarDisparoSessao: (accountId) => ipcRenderer.invoke('verificar-disparo-sessao', accountId),
    verificarDisparoSessaoCategoria: (accountId, categoriaId, botUsername) => ipcRenderer.invoke('verificar-disparo-sessao-categoria', accountId, categoriaId, botUsername),
    onVerificacaoDisparoProgress: (callback) => {
      ipcRenderer.on('verificacao-disparo-progress', (event, data) => callback(data))
    },
    removeVerificacaoDisparoProgress: () => {
      ipcRenderer.removeAllListeners('verificacao-disparo-progress')
    },
    onVerificacaoDisparoResultadoCategoria: (callback) => {
      ipcRenderer.on('verificacao-disparo-resultado-categoria', (event, resultado) => callback(resultado))
    },
    removeVerificacaoDisparoResultadoCategoria: () => {
      ipcRenderer.removeAllListeners('verificacao-disparo-resultado-categoria')
    },
  },
  reels: {
    selecionarYtDlp: () => ipcRenderer.invoke('reels-selecionar-ytdlp'),
    checkYtDlp: (ytDlpPath) => ipcRenderer.invoke('reels-check-ytdlp', ytDlpPath),
    downloadReels: (payload) => ipcRenderer.invoke('download-reels', payload),
    extractLinksInsta3: (payload) => ipcRenderer.invoke('reels-extract-links-insta3', payload),
    analyzeReelsStats: (payload) => ipcRenderer.invoke('reels-analyze-stats', payload),
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-reels-progress', (event, data) => callback(data))
    },
    removeDownloadProgress: () => {
      ipcRenderer.removeAllListeners('download-reels-progress')
    },
    onReelsInsta3Log: (callback) => {
      ipcRenderer.on('reels-insta3-log', (event, data) => callback(data))
    },
    removeReelsInsta3Log: () => {
      ipcRenderer.removeAllListeners('reels-insta3-log')
    },
  },
  botMidia: {
    salvar: (botNome, botToken, nichoId, categoriaId) => ipcRenderer.invoke('salvar-bot-midia', botNome, botToken, nichoId, categoriaId),
    salvarBotsVerificacao: (botsEncontrados) => ipcRenderer.invoke('salvar-bots-verificacao', botsEncontrados),
    carregarTodos: () => ipcRenderer.invoke('carregar-bots-midia'),
    atualizar: (arquivoPath, botNome, botToken, botUsername) => ipcRenderer.invoke('atualizar-bot-midia', arquivoPath, botNome, botToken, botUsername),
    atualizarTipoBot: (arquivoPath, tipoBot) => ipcRenderer.invoke('atualizar-tipo-bot', arquivoPath, tipoBot),
    vincularCategorias: (arquivoPath, categoriasIds) => ipcRenderer.invoke('vincular-categorias-bot', arquivoPath, categoriasIds),
    atualizarCompleto: (arquivoPath, dados) => ipcRenderer.invoke('atualizar-bot-completo', arquivoPath, dados),
    excluir: (arquivoPath) => ipcRenderer.invoke('excluir-bot-midia', arquivoPath),
    verificar: () => ipcRenderer.invoke('verificar-bots-midia'),
    verificarIndividual: (botId, token) => ipcRenderer.invoke('verificar-bot-individual', botId, token),
    verificarDiario: (force) => ipcRenderer.invoke('verificar-bots-diario', force),
    sincronizar: () => ipcRenderer.invoke('sincronizar-bots-categorias-grupos'),
    onBotOffline: (callback) => {
      ipcRenderer.on('bot-offline-notification', (event, data) => callback(data))
    },
    removeBotOffline: () => {
      ipcRenderer.removeAllListeners('bot-offline-notification')
    },
  },
  botVerificacao: {
    criar: (accountId, botName) => ipcRenderer.invoke('criar-bot-verificacao', accountId, botName),
    listar: () => ipcRenderer.invoke('listar-bots-verificacao'),
    adicionarGrupo: (grupoData) => ipcRenderer.invoke('adicionar-grupo-verificacao', grupoData),
    verificarGrupo: (chatId, botToken) => ipcRenderer.invoke('verificar-grupo-manual', chatId, botToken),
    obterStatusGrupos: (chatIds) => ipcRenderer.invoke('obter-status-grupos', chatIds),
    controlarProcessamento: (iniciar) => ipcRenderer.invoke('controlar-processamento-verificacao', iniciar),
  },
  smm: {
    verificarPaineis: () => ipcRenderer.invoke('verificar-paineis-smm'),
    obterApiTelegramAtiva: () => ipcRenderer.invoke('obter-api-telegram-ativa'),
  },
  grupos: {
    criar: (payload) => ipcRenderer.invoke('criar-grupos', payload),
    encherGrupos: (payload) => ipcRenderer.invoke('encher-grupos', payload),
    onProgresso: (callback) => {
      ipcRenderer.on('automacao-progresso', (event, data) => callback(data))
    },
    removeProgresso: () => {
      ipcRenderer.removeAllListeners('automacao-progresso')
    },
    onEncherGruposProgresso: (callback) => {
      ipcRenderer.on('encher-grupos-progresso', (event, data) => callback(data))
    },
    removeEncherGruposProgresso: () => {
      ipcRenderer.removeAllListeners('encher-grupos-progresso')
    },
    trocarBots: {
      escanear: (accountIds) => ipcRenderer.invoke('trocar-bots-escanear', accountIds),
      executar: (payload) => ipcRenderer.invoke('trocar-bots-executar', payload),
      limparBanidos: (payload) => ipcRenderer.invoke('limpar-bots-banidos', payload),
    },
  },
  dashboard: {
    salvarProfile: (profile) => ipcRenderer.invoke('salvar-dashboard-profile', profile),
    carregarProfile: () => ipcRenderer.invoke('carregar-dashboard-profile'),
  },
  craftpay: {
    getEstatisticas: (forceRefresh) => ipcRenderer.invoke('craftpay-get-estatisticas', !!forceRefresh),
    salvarCredenciais: (payload) => ipcRenderer.invoke('craftpay-salvar-credenciais', payload),
    carregarConfig: () => ipcRenderer.invoke('craftpay-carregar-config'),
    listarFunis: () => ipcRenderer.invoke('craftpay-listar-funis'),
    carregarFunisCache: () => ipcRenderer.invoke('craftpay-carregar-funis-cache'),
    adicionarBotsAoFunil: (payload) => ipcRenderer.invoke('craftpay-adicionar-bots-funil', payload),
    adicionarBotsAoFunilBackground: (payload) => ipcRenderer.invoke('craftpay-adicionar-bots-funil-bg', payload),
    consultarJobFunil: (jobId) => ipcRenderer.invoke('craftpay-consultar-job-funil', jobId),
    getHistorico: () => ipcRenderer.invoke('craftpay-get-historico'),
  },
  proxy: {
    carregarTodos: () => ipcRenderer.invoke('carregar-proxies'),
    criar: (data) => ipcRenderer.invoke('criar-proxy', data),
    atualizar: (id, data) => ipcRenderer.invoke('atualizar-proxy', id, data),
    excluir: (id) => ipcRenderer.invoke('excluir-proxy', id),
    verificar: (id) => ipcRenderer.invoke('verificar-proxy', id),
    definirPadrao: (id) => ipcRenderer.invoke('definir-proxy-padrao', id),
  },
  operacoes: {
    listar: () => ipcRenderer.invoke('listar-operacoes'),
    criar: (nome) => ipcRenderer.invoke('criar-operacao', nome),
    setAtual: (operacao) => ipcRenderer.invoke('set-operacao-atual', operacao),
  },
  contingencia: {
    listarSessoes: (searchDir) => ipcRenderer.invoke('contingencia-listar-sessoes', searchDir),
    obterTag: (sessionPath) => ipcRenderer.invoke('contingencia-obter-tag', sessionPath),
    definirTag: (sessionPath, tag) => ipcRenderer.invoke('contingencia-definir-tag', sessionPath, tag),
    clonarVIP: (payload) => ipcRenderer.invoke('contingencia-clonar-vip', payload),
    verificarVIP: (sessionPath) => ipcRenderer.invoke('contingencia-verificar-vip', sessionPath),
    verificarVIPsLote: (sessionPaths) => ipcRenderer.invoke('contingencia-verificar-vips-lote', sessionPaths),
    listarSessoesComGrupoBase: () => ipcRenderer.invoke('contingencia-listar-sessoes-com-grupo-base'),
    listarGruposVip: () => ipcRenderer.invoke('contingencia-listar-grupos-vip'),
    atualizarGrupoVip: (payload) => ipcRenderer.invoke('contingencia-atualizar-grupo-vip', payload),
    removerGrupoVip: (grupoId) => ipcRenderer.invoke('contingencia-remover-grupo-vip', grupoId),
    editarGrupoVip: (payload) => ipcRenderer.invoke('contingencia-editar-grupo-vip', payload),
    transferirPosseVip: (payload) => ipcRenderer.invoke('contingencia-transferir-posse-vip', payload),
    adicionarBotsAoGrupoBase: (payload) => ipcRenderer.invoke('contingencia-adicionar-bots-ao-grupo-base', payload),
    obterLinksMensagens: (sessionPath) => ipcRenderer.invoke('contingencia-obter-links-mensagens', sessionPath),
    listarTodosGrupos: () => ipcRenderer.invoke('contingencia-listar-todos-grupos'),
    buscarGruposPorNomes: (nomesGrupos) => ipcRenderer.invoke('contingencia-buscar-grupos-por-nomes', nomesGrupos),
    sincronizarCategoriasGrupos: () => ipcRenderer.invoke('contingencia-sincronizar-categorias-grupos'),
    cadastrarGrupoBase: (payload) => ipcRenderer.invoke('contingencia-cadastrar-grupo-base', payload),
    deletarGrupoBase: (sessionPath) => ipcRenderer.invoke('contingencia-deletar-grupo-base', sessionPath),
    apagarGruposContas: (accountIds, sessoesParalelas) => ipcRenderer.invoke('contingencia-apagar-grupos-contas', accountIds, sessoesParalelas),
    // Clonador VIP Avançado
    analisarGrupo: (payload) => ipcRenderer.invoke('contingencia-analisar-grupo', payload),
    clonarVIPAvancado: (payload) => ipcRenderer.invoke('contingencia-clonar-vip-avancado', payload),
    adicionarMidiasVip: (payload) => ipcRenderer.invoke('contingencia-adicionar-midias-vip', payload),
    verificarGrupoDestinoVip: (payload) => ipcRenderer.invoke('contingencia-verificar-grupo-destino-vip', payload),
    clonarVIPMultiSessao: (payload) => ipcRenderer.invoke('contingencia-clonar-vip-multi-sessao', payload),
    verificarCheckpoint: (payload) => ipcRenderer.invoke('contingencia-verificar-checkpoint', payload),
    removerCheckpoint: (payload) => ipcRenderer.invoke('contingencia-remover-checkpoint', payload),
    adicionarAdmins: (payload) => ipcRenderer.invoke('contingencia-adicionar-admins', payload),
    onAnaliseGrupoProgress: (callback) => {
      ipcRenderer.on('analise-grupo-progress', (event, data) => callback(data))
    },
    onAnaliseGrupoLog: (callback) => {
      ipcRenderer.on('analise-grupo-log', (event, data) => callback(data))
    },
    onClonagemVIPAvancadaProgress: (callback) => {
      ipcRenderer.on('clonagem-vip-avancada-progress', (event, data) => callback(data))
    },
    onClonagemVIPAvancadaLog: (callback) => {
      ipcRenderer.on('clonagem-vip-avancada-log', (event, data) => callback(data))
    },
    // Novos eventos para clonagens simultâneas
    onClonagemVIPAvancadaComplete: (callback) => {
      ipcRenderer.on('clonagem-vip-avancada-complete', (event, data) => callback(data))
    },
    onClonagemVIPAvancadaError: (callback) => {
      ipcRenderer.on('clonagem-vip-avancada-error', (event, data) => callback(data))
    },
    onMultiSessaoProgress: (callback) => {
      ipcRenderer.on('multi-sessao-progress', (event, data) => callback(data))
    },
    // Multi-sessão por tópicos
    onClonagemMultiSessaoProgress: (callback) => {
      ipcRenderer.on('clonagem-multi-sessao-progress', (event, data) => callback(data))
    },
    onClonagemMultiSessaoLog: (callback) => {
      ipcRenderer.on('clonagem-multi-sessao-log', (event, data) => callback(data))
    },
    removeAnaliseGrupoListeners: () => {
      ipcRenderer.removeAllListeners('analise-grupo-progress')
      ipcRenderer.removeAllListeners('analise-grupo-log')
    },
    removeClonagemVIPAvancadaListeners: () => {
      ipcRenderer.removeAllListeners('clonagem-vip-avancada-progress')
      ipcRenderer.removeAllListeners('clonagem-vip-avancada-log')
      ipcRenderer.removeAllListeners('clonagem-vip-avancada-complete')
      ipcRenderer.removeAllListeners('clonagem-vip-avancada-error')
      ipcRenderer.removeAllListeners('multi-sessao-progress')
    },
    removeClonagemMultiSessaoListeners: () => {
      ipcRenderer.removeAllListeners('clonagem-multi-sessao-progress')
      ipcRenderer.removeAllListeners('clonagem-multi-sessao-log')
    },
  },
  tags: {
    carregarTodas: () => ipcRenderer.invoke('tags-carregar-todas'),
    criar: (tagData) => ipcRenderer.invoke('tags-criar', tagData),
    atualizar: (tagId, updates) => ipcRenderer.invoke('tags-atualizar', tagId, updates),
    deletar: (tagId) => ipcRenderer.invoke('tags-deletar', tagId),
    adicionarConta: (numeroConta, tagId) => ipcRenderer.invoke('tags-adicionar-conta', numeroConta, tagId),
    removerConta: (numeroConta, tagId) => ipcRenderer.invoke('tags-remover-conta', numeroConta, tagId),
  },
  botTags: {
    carregar: () => ipcRenderer.invoke('bot-tags-carregar'),
    criar: (tagData) => ipcRenderer.invoke('bot-tags-criar', tagData),
    deletar: (tagId) => ipcRenderer.invoke('bot-tags-deletar', tagId),
    adicionarBot: (botId, tagId) => ipcRenderer.invoke('bot-tags-adicionar-bot', botId, tagId),
    removerBot: (botId, tagId) => ipcRenderer.invoke('bot-tags-remover-bot', botId, tagId),
    doBot: (botId) => ipcRenderer.invoke('bot-tags-do-bot', botId),
    mapa: () => ipcRenderer.invoke('bot-tags-mapa'),
    adicionarMassa: (botIds, tagId) => ipcRenderer.invoke('bot-tags-adicionar-massa', botIds, tagId),
    removerMassa: (botIds, tagId) => ipcRenderer.invoke('bot-tags-remover-massa', botIds, tagId),
  },
  sessionMonitor: {
    verificarEAdicionarListas: (payload) => ipcRenderer.invoke('session-monitor-verificar-adicionar-listas', payload),
  },
  desktop: {
    minimize: () => ipcRenderer.invoke('desktop-minimize'),
    toggleMaximize: () => ipcRenderer.invoke('desktop-toggle-maximize'),
    close: () => ipcRenderer.invoke('desktop-close'),
    isMaximized: () => ipcRenderer.invoke('desktop-is-maximized'),
    onMaximizedChanged: (callback) => {
      ipcRenderer.on('desktop-maximized-changed', (event, maximized) => callback(maximized))
    },
    removeMaximizedChanged: () => {
      ipcRenderer.removeAllListeners('desktop-maximized-changed')
    },
  },
  database: {
    getTodayStats: () => ipcRenderer.invoke('database:get-today-stats'),
    incrementGrupos: (count) => ipcRenderer.invoke('database:increment-grupos', count),
    incrementAutomacoes: (count) => ipcRenderer.invoke('database:increment-automacoes', count),
    getStatsLastDays: (days) => ipcRenderer.invoke('database:get-stats-last-days', days),
    saveConfig: (key, value) => ipcRenderer.invoke('database:save-config', key, value),
    getConfig: (key, defaultValue) => ipcRenderer.invoke('database:get-config', key, defaultValue),
    getAllConfig: () => ipcRenderer.invoke('database:get-all-config'),
    saveAccountStats: (contasOnline, contasCaidas) => ipcRenderer.invoke('database:save-account-stats', contasOnline, contasCaidas),
    saveGruposStats: (gruposOnline, gruposCriadosHoje, gruposCaidosHoje) => ipcRenderer.invoke('database:save-grupos-stats', gruposOnline, gruposCriadosHoje, gruposCaidosHoje),
    saveWallpaper: (target, wallpaperData) => ipcRenderer.invoke('database:save-wallpaper', target, wallpaperData),
    getWallpaper: (target, defaultValue) => ipcRenderer.invoke('database:get-wallpaper', target, defaultValue),
    removeWallpaper: (target) => ipcRenderer.invoke('database:remove-wallpaper', target),
    salvarVerificacaoDiariaDisparo: (resultados) => ipcRenderer.invoke('database:salvar-verificacao-diaria-disparo', resultados),
    salvarVerificacaoDiariaMembros: (lastProgress) => ipcRenderer.invoke('database:salvar-verificacao-diaria-membros', lastProgress),
    carregarVerificacaoDiaria: () => ipcRenderer.invoke('database:carregar-verificacao-diaria'),
  },
  orderBumpLibrary: {
    load: () => ipcRenderer.invoke('orderbump-library:load'),
    save: (orderBumps) => ipcRenderer.invoke('orderbump-library:save', orderBumps),
    add: (orderBump) => ipcRenderer.invoke('orderbump-library:add', orderBump),
    update: (orderBump) => ipcRenderer.invoke('orderbump-library:update', orderBump),
    delete: (id) => ipcRenderer.invoke('orderbump-library:delete', id),
  },
  upsellLibrary: {
    load: () => ipcRenderer.invoke('upsell-library:load'),
    save: (upsells) => ipcRenderer.invoke('upsell-library:save', upsells),
    add: (upsell) => ipcRenderer.invoke('upsell-library:add', upsell),
    update: (upsell) => ipcRenderer.invoke('upsell-library:update', upsell),
    delete: (id) => ipcRenderer.invoke('upsell-library:delete', id),
  },
  blastsend: {
    scan: (credentials) => ipcRenderer.invoke('blastsend-scan', credentials),
    replace: (data) => ipcRenderer.invoke('blastsend-replace', data),
    onLog: (callback) => {
      const handler = (event, data) => callback(data)
      ipcRenderer.on('blastsend-log', handler)
      return () => ipcRenderer.removeListener('blastsend-log', handler)
    },
    removeLogListener: () => ipcRenderer.removeAllListeners('blastsend-log')
  },
  blastsendApi: {
    saveConfig: (config) => ipcRenderer.invoke('blastsend-api:saveConfig', config),
    loadConfig: () => ipcRenderer.invoke('blastsend-api:loadConfig'),
    testConnection: (config) => ipcRenderer.invoke('blastsend-api:testConnection', config),
    enviarCategorias: (payload) => ipcRenderer.invoke('blastsend-api:enviarCategorias', payload)
  },
  blastsendCampanhas: {
    salvarCampanhaNova: (campaignJson) => ipcRenderer.invoke('salvar-campanha-nova', campaignJson),
    processarNovas: () => ipcRenderer.invoke('campanhas-blastsend:processarNovas'),
    contarNovas: () => ipcRenderer.invoke('campanhas-blastsend:contarNovas'),
    listarNovas: () => ipcRenderer.invoke('campanhas-blastsend:listarNovas'),
    excluirNovas: (fileNames) => ipcRenderer.invoke('campanhas-blastsend:excluirNovas', fileNames)
  },
  sendergram: {
    carregarConfig: () => ipcRenderer.invoke('sendergram:carregar-config'),
    salvarConfig: (config) => ipcRenderer.invoke('sendergram:salvar-config', config),
    testConnection: (config) => ipcRenderer.invoke('sendergram:test-connection', config),
    sendCampaign: (campaignData) => ipcRenderer.invoke('sendergram:send-campaign', campaignData)
  }
})

