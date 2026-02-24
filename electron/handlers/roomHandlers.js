// ==========================================
// HANDLERS IPC - SISTEMA DE GAMIFICAÇÃO
// ==========================================
// Persistência em room.json por operação

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

// Catálogo de itens (definição fixa) - Assets Habbo
const CATALOGO_ITENS = [
  // === SOFÁS ===
  {
    id: 'sofa-aftv',
    nome: 'Sofá AFTV',
    descricao: 'Sofá confortável para relaxar',
    zona: 'floor',
    sprite: 'ads_aftv_sofa_icon.png',
    spritePath: 'furniture/ads_aftv_sofa_icon.png',
    largura: 2,
    altura: 1,
    custo: 50,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'sofa-anna-1',
    nome: 'Sofá Anna Azul',
    descricao: 'Sofá elegante da coleção Anna',
    zona: 'floor',
    sprite: 'anna_sofa_1_icon.png',
    spritePath: 'furniture/anna_sofa_1_icon.png',
    largura: 2,
    altura: 1,
    custo: 80,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'sofa-anna-2',
    nome: 'Sofá Anna Verde',
    descricao: 'Sofá moderno da coleção Anna',
    zona: 'floor',
    sprite: 'anna_sofa_2_icon.png',
    spritePath: 'furniture/anna_sofa_2_icon.png',
    largura: 2,
    altura: 1,
    custo: 80,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'sofa-cl',
    nome: 'Sofá CL',
    descricao: 'Sofá premium',
    zona: 'floor',
    sprite: 'ads_cl_sofa_icon.png',
    spritePath: 'furniture/ads_cl_sofa_icon.png',
    largura: 2,
    altura: 1,
    custo: 100,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === CADEIRAS ===
  {
    id: 'chair-aftv',
    nome: 'Cadeira AFTV',
    descricao: 'Cadeira simples e funcional',
    zona: 'floor',
    sprite: 'ads_aftv_chair_icon.png',
    spritePath: 'furniture/ads_aftv_chair_icon.png',
    largura: 1,
    altura: 1,
    custo: 20,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'chair-calip',
    nome: 'Cadeira Calip',
    descricao: 'Cadeira estilosa',
    zona: 'floor',
    sprite: 'ads_calip_chair_icon.png',
    spritePath: 'furniture/ads_calip_chair_icon.png',
    largura: 1,
    altura: 1,
    custo: 25,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'chair-idol',
    nome: 'Cadeira Idol',
    descricao: 'Cadeira premium',
    zona: 'floor',
    sprite: 'ads_idol_ichair_icon.png',
    spritePath: 'furniture/ads_idol_ichair_icon.png',
    largura: 1,
    altura: 1,
    custo: 40,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'barchair-silo-2',
    nome: 'Banco de Bar Vermelho',
    descricao: 'Banco alto para bar',
    zona: 'floor',
    sprite: 'barchair_silo_2_icon.png',
    spritePath: 'furniture/barchair_silo_2_icon.png',
    largura: 1,
    altura: 1,
    custo: 35,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === MESAS ===
  {
    id: 'table-africa',
    nome: 'Mesa África',
    descricao: 'Mesa de madeira rústica',
    zona: 'floor',
    sprite: 'africa_c15_table_icon.png',
    spritePath: 'furniture/africa_c15_table_icon.png',
    largura: 2,
    altura: 1,
    custo: 45,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'table-twi',
    nome: 'Mesa Twilight',
    descricao: 'Mesa elegante',
    zona: 'floor',
    sprite: 'ads_twi_table_icon.png',
    spritePath: 'furniture/ads_twi_table_icon.png',
    largura: 2,
    altura: 1,
    custo: 60,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === CAMAS ===
  {
    id: 'bed-army',
    nome: 'Cama Militar',
    descricao: 'Cama robusta estilo exército',
    zona: 'floor',
    sprite: 'army_c15_bed_icon.png',
    spritePath: 'furniture/army_c15_bed_icon.png',
    largura: 2,
    altura: 2,
    custo: 120,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'bed-drsports',
    nome: 'Cama DrSports',
    descricao: 'Cama temática de futebol',
    zona: 'floor',
    sprite: 'ads_drsports_fball_bed_icon.png',
    spritePath: 'furniture/ads_drsports_fball_bed_icon.png',
    largura: 2,
    altura: 2,
    custo: 150,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 4,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'bed-armas',
    nome: 'Cama Armas',
    descricao: 'Cama confortável',
    zona: 'floor',
    sprite: 'bed_armas_one_icon.png',
    spritePath: 'furniture/bed_armas_one_icon.png',
    largura: 2,
    altura: 2,
    custo: 100,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === LUMINÁRIAS ===
  {
    id: 'lamp-anna',
    nome: 'Luminária Anna',
    descricao: 'Luminária moderna da coleção Anna',
    zona: 'floor',
    sprite: 'anna_lamp_1_icon.png',
    spritePath: 'furniture/anna_lamp_1_icon.png',
    largura: 1,
    altura: 1,
    custo: 30,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'lamp-idol',
    nome: 'Luminária Idol',
    descricao: 'Luminária elegante',
    zona: 'floor',
    sprite: 'ads_idol_lamp_icon.png',
    spritePath: 'furniture/ads_idol_lamp_icon.png',
    largura: 1,
    altura: 1,
    custo: 40,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'lamp-drsports',
    nome: 'Luminária DrSports',
    descricao: 'Luminária temática de futebol',
    zona: 'floor',
    sprite: 'ads_drsports_fball_lamp_icon.png',
    spritePath: 'furniture/ads_drsports_fball_lamp_icon.png',
    largura: 1,
    altura: 1,
    custo: 45,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'floorlight-aftv',
    nome: 'Luz de Chão AFTV',
    descricao: 'Iluminação ambiente moderna',
    zona: 'floor',
    sprite: 'ads_aftv_floorlight_icon.png',
    spritePath: 'furniture/ads_aftv_floorlight_icon.png',
    largura: 1,
    altura: 1,
    custo: 50,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === PLANTAS ===
  {
    id: 'plant-army',
    nome: 'Planta Militar',
    descricao: 'Planta decorativa resistente',
    zona: 'floor',
    sprite: 'army_c15_plant_icon.png',
    spritePath: 'furniture/army_c15_plant_icon.png',
    largura: 1,
    altura: 1,
    custo: 25,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'plant-art',
    nome: 'Planta Artística',
    descricao: 'Planta decorativa elegante',
    zona: 'floor',
    sprite: 'art_c20_plant_icon.png',
    spritePath: 'furniture/art_c20_plant_icon.png',
    largura: 1,
    altura: 1,
    custo: 30,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'plant-bling',
    nome: 'Planta Bling',
    descricao: 'Planta luxuosa',
    zona: 'floor',
    sprite: 'bling11_plant_icon.png',
    spritePath: 'furniture/bling11_plant_icon.png',
    largura: 1,
    altura: 1,
    custo: 40,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === TAPETES ===
  {
    id: 'rug-aftv',
    nome: 'Tapete AFTV',
    descricao: 'Tapete confortável',
    zona: 'floor',
    sprite: 'ads_aftv_rug_icon.png',
    spritePath: 'furniture/ads_aftv_rug_icon.png',
    largura: 2,
    altura: 2,
    custo: 50,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'carpet-durex',
    nome: 'Carpete Durex',
    descricao: 'Carpete premium',
    zona: 'floor',
    sprite: 'ads_durex_carpet_icon.png',
    spritePath: 'furniture/ads_durex_carpet_icon.png',
    largura: 2,
    altura: 2,
    custo: 60,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'carpet-idol',
    nome: 'Carpete Idol',
    descricao: 'Carpete elegante',
    zona: 'floor',
    sprite: 'ads_idol_carpet_icon.png',
    spritePath: 'furniture/ads_idol_carpet_icon.png',
    largura: 2,
    altura: 2,
    custo: 70,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'rug-drsports',
    nome: 'Tapete DrSports',
    descricao: 'Tapete temático de futebol',
    zona: 'floor',
    sprite: 'ads_drsports_fballrug_icon.png',
    spritePath: 'furniture/ads_drsports_fballrug_icon.png',
    largura: 2,
    altura: 2,
    custo: 80,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === TROFÉUS E DECORAÇÕES ===
  {
    id: 'trophy-aftv-1',
    nome: 'Troféu AFTV Bronze',
    descricao: 'Troféu de conquista',
    zona: 'floor',
    sprite: 'ads_aftv_trophy1_icon.png',
    spritePath: 'furniture/ads_aftv_trophy1_icon.png',
    largura: 1,
    altura: 1,
    custo: null,
    badgeRequerida: 'tarefas-50',
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'raro',
    origem: 'badge',
    anchorY: 1.0,
  },
  {
    id: 'trophy-aftv-2',
    nome: 'Troféu AFTV Prata',
    descricao: 'Troféu de conquista intermediária',
    zona: 'floor',
    sprite: 'ads_aftv_trophy2_icon.png',
    spritePath: 'furniture/ads_aftv_trophy2_icon.png',
    largura: 1,
    altura: 1,
    custo: null,
    badgeRequerida: 'tarefas-200',
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'epico',
    origem: 'badge',
    anchorY: 1.0,
  },
  {
    id: 'trophy-cp',
    nome: 'Troféu CP',
    descricao: 'Troféu especial',
    zona: 'floor',
    sprite: 'ads_cp_trophy_icon.png',
    spritePath: 'furniture/ads_cp_trophy_icon.png',
    largura: 1,
    altura: 1,
    custo: null,
    badgeRequerida: 'ranking-top3',
    eventoOrigem: null,
    levelMinimo: 5,
    raridade: 'lendario',
    origem: 'badge',
    anchorY: 1.0,
  },
  {
    id: 'duck-f1',
    nome: 'Pato F1',
    descricao: 'Pato decorativo de corrida',
    zona: 'floor',
    sprite: 'ads_ontrackgp_f1duck_icon.png',
    spritePath: 'furniture/ads_ontrackgp_f1duck_icon.png',
    largura: 1,
    altura: 1,
    custo: 35,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'duck-sports',
    nome: 'Pato Esportivo',
    descricao: 'Pato decorativo temático',
    zona: 'floor',
    sprite: 'ads_drsports_fanduck_icon.png',
    spritePath: 'furniture/ads_drsports_fanduck_icon.png',
    largura: 1,
    altura: 1,
    custo: 30,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === PAREDE (POSTERS E DECORAÇÕES) ===
  {
    id: 'poster-sports',
    nome: 'Poster Esportivo',
    descricao: 'Poster decorativo de esportes',
    zona: 'wall',
    sprite: 'ads_drsports_poster_icon.png',
    spritePath: 'furniture/ads_drsports_poster_icon.png',
    largura: 1,
    altura: 1,
    custo: 20,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'poster-volkswagen',
    nome: 'Poster Volkswagen',
    descricao: 'Poster automotivo',
    zona: 'wall',
    sprite: 'ads_volkswagen_poster_icon.png',
    spritePath: 'furniture/ads_volkswagen_poster_icon.png',
    largura: 1,
    altura: 1,
    custo: 25,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'poster-rainbow',
    nome: 'Poster Arco-Íris',
    descricao: 'Poster colorido decorativo',
    zona: 'wall',
    sprite: 'ads_teletubbies_rainbowposter_icon.png',
    spritePath: 'furniture/ads_teletubbies_rainbowposter_icon.png',
    largura: 1,
    altura: 1,
    custo: 30,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'raro',
    origem: 'loja',
  },
  
  // === ESTANTES E DIVISÓRIAS ===
  {
    id: 'shelf-aftv',
    nome: 'Estante AFTV',
    descricao: 'Estante funcional',
    zona: 'floor',
    sprite: 'ads_aftv_shelf_icon.png',
    spritePath: 'furniture/ads_aftv_shelf_icon.png',
    largura: 2,
    altura: 1,
    custo: 55,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'shelf-711',
    nome: 'Estante 711',
    descricao: 'Estante moderna',
    zona: 'floor',
    sprite: 'ads_711shelf_icon.png',
    spritePath: 'furniture/ads_711shelf_icon.png',
    largura: 2,
    altura: 1,
    custo: 60,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'bookshelf-army',
    nome: 'Estante Militar',
    descricao: 'Estante robusta para livros',
    zona: 'floor',
    sprite: 'army_c15_bookshelf_icon.png',
    spritePath: 'furniture/army_c15_bookshelf_icon.png',
    largura: 1,
    altura: 1,
    custo: 50,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'divider-anna-1',
    nome: 'Divisória Anna Azul',
    descricao: 'Divisória decorativa',
    zona: 'floor',
    sprite: 'anna_divider_1_icon.png',
    spritePath: 'furniture/anna_divider_1_icon.png',
    largura: 1,
    altura: 1,
    custo: 40,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'divider-sports',
    nome: 'Divisória Esportiva',
    descricao: 'Divisória temática',
    zona: 'floor',
    sprite: 'ads_drsports_divider_icon.png',
    spritePath: 'furniture/ads_drsports_divider_icon.png',
    largura: 1,
    altura: 1,
    custo: 45,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === TECNOLOGIA ===
  {
    id: 'computer-flatscreen',
    nome: 'Computador Tela Plana',
    descricao: 'PC moderno para trabalho',
    zona: 'floor',
    sprite: 'computer_flatscreen_icon.png',
    spritePath: 'furniture/computer_flatscreen_icon.png',
    largura: 1,
    altura: 1,
    custo: 150,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'laptop',
    nome: 'Laptop',
    descricao: 'Computador portátil',
    zona: 'floor',
    sprite: 'computer_laptop_icon.png',
    spritePath: 'furniture/computer_laptop_icon.png',
    largura: 1,
    altura: 1,
    custo: 120,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'computer-old',
    nome: 'Computador Antigo',
    descricao: 'PC vintage',
    zona: 'floor',
    sprite: 'computer_old_icon.png',
    spritePath: 'furniture/computer_old_icon.png',
    largura: 1,
    altura: 1,
    custo: 80,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'sound-machine-1',
    nome: 'Aparelho de Som 1',
    descricao: 'Sistema de som básico',
    zona: 'floor',
    sprite: 'sound_machine_1_icon.png',
    spritePath: 'furniture/sound_machine_1_icon.png',
    largura: 1,
    altura: 1,
    custo: 90,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 2,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'sound-machine-2',
    nome: 'Aparelho de Som 2',
    descricao: 'Sistema de som avançado',
    zona: 'floor',
    sprite: 'sound_machine_2_icon.png',
    spritePath: 'furniture/sound_machine_2_icon.png',
    largura: 1,
    altura: 1,
    custo: 110,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 3,
    raridade: 'raro',
    origem: 'loja',
    anchorY: 1.0,
  },
  
  // === ALMOFADAS E DECORAÇÕES PEQUENAS ===
  {
    id: 'pillow-art',
    nome: 'Almofada Artística',
    descricao: 'Almofada decorativa',
    zona: 'decoration',
    sprite: 'art_c20_pillow_icon.png',
    spritePath: 'furniture/art_c20_pillow_icon.png',
    largura: 1,
    altura: 1,
    custo: 15,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'pillow-ob',
    nome: 'Almofada OB',
    descricao: 'Almofada confortável',
    zona: 'decoration',
    sprite: 'ads_ob_pillow_icon.png',
    spritePath: 'furniture/ads_ob_pillow_icon.png',
    largura: 1,
    altura: 1,
    custo: 15,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'bag-aftv',
    nome: 'Bolsa AFTV',
    descricao: 'Bolsa decorativa',
    zona: 'decoration',
    sprite: 'ads_aftv_bag_icon.png',
    spritePath: 'furniture/ads_aftv_bag_icon.png',
    largura: 1,
    altura: 1,
    custo: 20,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 1,
    raridade: 'comum',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'footballtable-aftv',
    nome: 'Mesa de Pebolim',
    descricao: 'Mesa de jogos para diversão',
    zona: 'floor',
    sprite: 'ads_aftv_footballtable_icon.png',
    spritePath: 'furniture/ads_aftv_footballtable_icon.png',
    largura: 2,
    altura: 2,
    custo: 200,
    badgeRequerida: null,
    eventoOrigem: null,
    levelMinimo: 4,
    raridade: 'epico',
    origem: 'loja',
    anchorY: 1.0,
  },
  {
    id: 'rare-dtl-2',
    nome: 'Troféu Raro DTL',
    descricao: 'Item raro de colecionador',
    zona: 'floor',
    sprite: 'ads_dtlrare_2_icon.png',
    spritePath: 'furniture/ads_dtlrare_2_icon.png',
    largura: 1,
    altura: 1,
    custo: null,
    badgeRequerida: 'colecionador-mestre',
    eventoOrigem: null,
    levelMinimo: 10,
    raridade: 'lendario',
    origem: 'badge',
    anchorY: 1.0,
  },
  {
    id: 'rare-dtl-gold',
    nome: 'Troféu Dourado DTL',
    descricao: 'Item lendário de colecionador',
    zona: 'floor',
    sprite: 'ads_dtlrare_gold2_icon.png',
    spritePath: 'furniture/ads_dtlrare_gold2_icon.png',
    largura: 1,
    altura: 1,
    custo: null,
    badgeRequerida: 'ranking-top1',
    eventoOrigem: null,
    levelMinimo: 15,
    raridade: 'lendario',
    origem: 'badge',
    anchorY: 1.0,
  },
]

// Badges disponíveis
const BADGES = [
  {
    id: 'primeiro-grupo',
    nome: 'Primeiro Grupo',
    descricao: 'Criou seu primeiro grupo',
    icone: 'badge-primeiro-grupo.png',
    itemDesbloqueado: 'quadro-primeiro-grupo',
  },
  {
    id: 'tarefas-50',
    nome: 'Operador Funcional',
    descricao: 'Completou 50 tarefas',
    icone: 'badge-tarefas-50.png',
    itemDesbloqueado: 'terminal-basico',
  },
  {
    id: 'grupos-criados-100',
    nome: 'Criador Veterano',
    descricao: 'Criou 100 grupos com sucesso',
    icone: 'badge-grupos-100.png',
    itemDesbloqueado: null,
  },
  {
    id: 'eficiencia-90',
    nome: 'Alta Performance',
    descricao: '500 tarefas com 90%+ taxa de sucesso',
    icone: 'badge-eficiencia.png',
    itemDesbloqueado: 'terminal-elite',
  },
  {
    id: 'contas-ativas-500',
    nome: 'Escala Operacional',
    descricao: '500+ contas ativas simultaneamente',
    icone: 'badge-escala.png',
    itemDesbloqueado: 'rack-servidores',
  },
  {
    id: 'ranking-top3',
    nome: 'Top 3 Mensal',
    descricao: 'Ficou entre os 3 primeiros do mês',
    icone: 'badge-ranking.png',
    itemDesbloqueado: 'trofeu-mensal',
  },
]

// Estado inicial padrão
const ROOM_INITIAL_STATE = {
  items: [],
  avatar: {
    skin: 'default',
    roupa: null,
    acessorio: null,
    aura: null,
  },
  creditos: 100,
  xp: 0,
  level: 1,
  badges: [],
  itensDesbloqueados: ['sofa-simples', 'pet-basico'],
}

// Variável para armazenar o caminho da operação atual
let currentOperacaoPath = null

function getRoomFilePath() {
  if (!currentOperacaoPath) {
    console.warn('[Room] Operação não definida, usando caminho padrão')
    return null
  }
  return path.join(currentOperacaoPath, 'room.json')
}

function registerRoomHandlers() {
  console.log('📦 Registrando handlers de Room...')

  // Definir operação atual (chamado quando muda de operação)
  ipcMain.handle('room:set-operacao', async (event, operacaoPath) => {
    currentOperacaoPath = operacaoPath
    console.log('[Room] Operação definida:', operacaoPath)
    return { success: true }
  })

  // Carregar estado do quarto
  ipcMain.handle('room:load', async () => {
    try {
      const filePath = getRoomFilePath()
      
      if (!filePath) {
        return {
          success: true,
          data: {
            version: 1,
            state: ROOM_INITIAL_STATE,
            ultimoSave: new Date().toISOString(),
          }
        }
      }

      if (!fs.existsSync(filePath)) {
        // Criar arquivo inicial
        const initialData = {
          version: 1,
          state: ROOM_INITIAL_STATE,
          ultimoSave: new Date().toISOString(),
        }
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2))
        return { success: true, data: initialData }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      return { success: true, data }
    } catch (error) {
      console.error('[Room] Erro ao carregar:', error)
      return { success: false, error: error.message }
    }
  })

  // Salvar estado do quarto
  ipcMain.handle('room:save', async (event, state) => {
    try {
      const filePath = getRoomFilePath()
      
      if (!filePath) {
        return { success: false, error: 'Operação não definida' }
      }

      const data = {
        version: 1,
        state,
        ultimoSave: new Date().toISOString(),
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log('[Room] Estado salvo com sucesso')
      return { success: true }
    } catch (error) {
      console.error('[Room] Erro ao salvar:', error)
      return { success: false, error: error.message }
    }
  })

  // Obter catálogo de itens
  ipcMain.handle('room:get-catalogo', async () => {
    return { success: true, data: CATALOGO_ITENS }
  })

  // Obter badges disponíveis
  ipcMain.handle('room:get-badges', async () => {
    return { success: true, data: BADGES }
  })

  // Adicionar créditos (chamado quando tarefa é concluída)
  ipcMain.handle('room:add-creditos', async (event, { quantidade, multiplicador = 1 }) => {
    try {
      const filePath = getRoomFilePath()
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Quarto não encontrado' }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      const creditosGanhos = Math.floor(quantidade * multiplicador)
      data.state.creditos += creditosGanhos
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      
      return { success: true, creditosGanhos, total: data.state.creditos }
    } catch (error) {
      console.error('[Room] Erro ao adicionar créditos:', error)
      return { success: false, error: error.message }
    }
  })

  // Adicionar XP
  ipcMain.handle('room:add-xp', async (event, quantidade) => {
    try {
      const filePath = getRoomFilePath()
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Quarto não encontrado' }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      data.state.xp += quantidade
      
      // Verificar level up (1000 XP por nível)
      const XP_POR_LEVEL = 1000
      const novoLevel = Math.floor(data.state.xp / XP_POR_LEVEL) + 1
      const levelUp = novoLevel > data.state.level
      
      if (levelUp) {
        data.state.level = novoLevel
      }
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      
      return { 
        success: true, 
        xpGanho: quantidade, 
        xpTotal: data.state.xp,
        level: data.state.level,
        levelUp 
      }
    } catch (error) {
      console.error('[Room] Erro ao adicionar XP:', error)
      return { success: false, error: error.message }
    }
  })

  // Conquistar badge
  ipcMain.handle('room:conquistar-badge', async (event, badgeId) => {
    try {
      const filePath = getRoomFilePath()
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Quarto não encontrado' }
      }

      const badge = BADGES.find(b => b.id === badgeId)
      if (!badge) {
        return { success: false, error: 'Badge não encontrada' }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      // Verificar se já tem a badge
      if (data.state.badges.includes(badgeId)) {
        return { success: false, error: 'Badge já conquistada' }
      }
      
      data.state.badges.push(badgeId)
      
      // Desbloquear item associado
      if (badge.itemDesbloqueado && !data.state.itensDesbloqueados.includes(badge.itemDesbloqueado)) {
        data.state.itensDesbloqueados.push(badge.itemDesbloqueado)
      }
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      
      return { 
        success: true, 
        badge,
        itemDesbloqueado: badge.itemDesbloqueado 
      }
    } catch (error) {
      console.error('[Room] Erro ao conquistar badge:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('✅ Handlers de Room registrados')
}

export { registerRoomHandlers }

