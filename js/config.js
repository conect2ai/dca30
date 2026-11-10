// Conteúdo editável do jogo. Mude textos, personagens e falas aqui, sem tocar no motor.

export const CONFIG = {
  titulo: 'DCA 30 ANOS',
  subtitulo: 'Grande Tour da Automação',
  evento: 'III SAS · 12 e 13 de novembro de 2026 · DCA/CT/UFRN',
  totalChips: 30,
  // Opcional. Coloque aqui arquivos de áudio (mp3 ou ogg) para trocar as vozes sintetizadas por gravações.
  // Exemplo: bode: 'assets/sons/bode.mp3'. Com o campo vazio, o jogo usa o som gerado por código.
  sons: { bode: '', gato: '' },
};

// Personagens jogáveis. estilo: curto | longo | coque | grisalho | robo
export const PERSONAGENS = [
  { id: 'caloura',   nome: 'Caloura',    papel: 'Primeiro período, mochila cheia',     pele: '#b9794a', cabelo: '#24160f', camisa: '#1f9d8a', calca: '#2f4a7a', sapato: '#f2f2f2', estilo: 'longo',    mochila: '#e0572f' },
  { id: 'veterano',  nome: 'Veterano',   papel: 'Conhece cada tomada do prédio',       pele: '#7a4a2b', cabelo: '#111111', camisa: '#e08a1e', calca: '#2b2f36', sapato: '#3a3a3a', estilo: 'curto',    mochila: '#30343b' },
  { id: 'professora', nome: 'Professora', papel: 'Prova surpresa a qualquer momento',  pele: '#e8b88a', cabelo: '#5a3320', camisa: '#1f3f73', calca: '#3b3f47', sapato: '#2a2020', estilo: 'coque',    oculos: true },
  { id: 'professor', nome: 'Professor',  papel: 'Trinta anos de quadro branco',        pele: '#d9a273', cabelo: '#c9c9c9', camisa: '#f1efe8', calca: '#56606b', sapato: '#3b2a1e', estilo: 'grisalho', oculos: true },
  { id: 'tecnica',   nome: 'Técnica',    papel: 'Guardiã das bancadas e dos cabos',    pele: '#8f5a36', cabelo: '#1a1410', camisa: '#3f86c9', calca: '#2c3440', sapato: '#1e1e1e', estilo: 'curto',    jaleco: true },
  { id: 'robo',      nome: 'ROB-30',     papel: 'Projeto de TCC que ganhou vida',      pele: '#c9d2d8', cabelo: '#f4b63a', camisa: '#8e9aa3', calca: '#5c6870', sapato: '#2b3238', estilo: 'robo' },
  { id: 'bode',      nome: 'Bode',       papel: 'Visitante ilustre do campus',           especie: 'bode', pelo: '#ece5d3', pelo2: '#8a6a4a', cam: { h: 0.95, d: 3.0 }, thumb: 1.7 },
  { id: 'gato',      nome: 'Gato',       papel: 'Dono do prédio',          especie: 'gato', pelo: '#d98a2b', pelo2: '#a85f17', cam: { h: 0.6, d: 2.3 }, thumb: 3.3 },
];

// Os bichos que circulam pelo cenário, mesmo quando o jogador escolhe outro personagem.
export const BICHOS = {
  bode: { nome: 'Bode', especie: 'bode', pelo: '#d9c9a8', pelo2: '#5a4632' },
  gato: { nome: 'Gato', especie: 'gato', pelo: '#3a3a40', pelo2: '#1f1f24' },
};

// Texto que aparece quando o personagem usa a voz (barra de espaço). Os sons são sintetizados em js/main.js.
export const VOZES = {
  bode: ['Bééé!'],
  gato: ['Miau!'],
  robo: ['Bip. Bop. Trinta anos detectados.'],
  humano: ['Fiu-fiu!'],
};

// O que as pessoas respondem quando ouvem a voz do jogador por perto.
export const REACOES = {
  bode: ['Tem um bode no DCA?!', 'Alguém matriculou um bode em Sistemas de Controle.', 'Esse bode entende mais de realimentação do que eu.'],
  gato: ['Olha o gato do DCA!', 'Esse gato assiste mais aula do que muita gente.', 'Miau para você também.'],
  robo: ['Esse robô já defendeu o TCC?', 'Bip bop para você também.'],
  humano: ['Assobiando no corredor? Tem aula rolando!', 'Opa! Tudo certo por aí?'],
};

// Falas dos personagens que circulam pelo prédio.
export const FALAS = {
  corredor1: ['Bem-vindo ao DCA! Já achou os 30 chips? Tem um monte neste corredor.', 'Se a porta está fechada, é porque tem aula. Ou reunião. Ou os dois.'],
  corredor2: ['O LABGRAD fica na Sala 15, pertinho do foyer. Tem um computador ligado lá dentro.', 'III SAS, dias 12 e 13 de novembro. A gente se vê nas palestras!'],
  jardim:    ['Trinta anos de Engenharia de Computação. Passa rápido, né?', 'Lá atrás, no estacionamento, dizem que tem um carro destrancado...'],
  estacionamento: ['Aquele carro com a placa DCA 30? Pode pegar, é do projeto. Aperte E pertinho dele.', 'Só não vale entrar com o carro no corredor. Eu acho.'],
  lab:       ['Hoje a aula é prática. Pegue um computador livre e mãos à obra.', 'Quem achar os 30 chips ganha... o respeito eterno da turma.'],
  hall:      ['O mural ali na parede tem a programação do simpósio.', 'Café? Na copa, no bloco dos professores, passando o foyer.'],
};

export const PORTAS_TRANCADAS = [
  'Trancada. Deve ter aula rolando aí dentro.',
  'Ninguém responde. Tente a Sala 15, o LABGRAD costuma ficar aberto.',
  'Você ouve o barulho de um ar-condicionado e de alguém digitando muito rápido.',
  'Um aviso na porta diz que a defesa começa em cinco minutos.',
];

export const GALERIA = [
  'Fotos de turmas, projetos e conquistas. Cada quadro deste corredor guarda um pedaço da história do DCA.',
  'Trinta anos de Engenharia de Computação cabem em um corredor? Este aqui tenta.',
  'Dica de explorador. Os chips gostam de se esconder perto dos quadros.',
];

// Fotos reais do prédio, tiradas dos vídeos usados para modelar o cenário. y é a altura do piso (3.25 no 2º pavimento).
export const FOTOS = [
  { id: 'fachada',        x: 32.2,   z: -15.2, arquivo: 'assets/fotos/fachada.jpg',        legenda: 'Entrada principal, vista do jardim' },
  { id: 'hall',           x: 31.6,   z: -3.4,  arquivo: 'assets/fotos/hall.jpg',           legenda: 'Hall de entrada' },
  { id: 'corredor',       x: 22.0,   z: 0.0,   arquivo: 'assets/fotos/corredor.jpg',       legenda: 'Galeria de quadros' },
  { id: 'labgrad',        x: 11.4,   z: 3.4,   arquivo: 'assets/fotos/labgrad.jpg',        legenda: 'LABGRAD, Sala 15' },
  { id: 'saida',          x: -2.0,   z: 0.7,   arquivo: 'assets/fotos/saida.jpg',          legenda: 'Foyer e a porta de saída' },
  { id: 'fundos',         x: -1.4,   z: 6.4,   arquivo: 'assets/fotos/fundos.jpg',         legenda: 'A saída, vista de fora' },
  { id: 'estacionamento', x: -6.0,   z: 14.5,  arquivo: 'assets/fotos/estacionamento.jpg', legenda: 'Estacionamento e as serras ao fundo' },
  { id: 'escada',         x: -4.0,   z: 1.65,  arquivo: 'assets/fotos/escada.jpg',         legenda: 'Escada para o 2º pavimento' },
  { id: 'copa',           x: -9.95,  z: -5.3,  arquivo: 'assets/fotos/copa.jpg',           legenda: 'Copa' },
  { id: 'professores',    x: -11.95, z: 3.45,  arquivo: 'assets/fotos/professores.jpg',    legenda: 'Circulação das salas dos professores' },
  { id: 'andar2',         x: -15.95, z: -3.75, y: 3.25, arquivo: 'assets/fotos/andar2.jpg', legenda: 'Circulação do 2º pavimento, sobre o poço de ventilação' },
  { id: 'cobogo',         x: -23.85, z: 0.95,  y: 3.25, arquivo: 'assets/fotos/cobogo.jpg', legenda: 'Parede de cobogó' },
];

// Posições dos 30 chips (x, z, altura do piso). Altura 0 é o térreo, 1.625 o patamar da escada e 3.25 o 2º pavimento.
export const CHIPS = [
  [5, 0], [15, -0.3], [24, 0.3], [36, -0.3],                                  // galeria
  [11.4, 6.6], [13.8, 5.0], [17.8, 7.9], [20.3, 4.5],                         // LABGRAD
  [28.2, -7.4], [32.2, -6.2], [28.6, -11.2],                                  // hall de entrada e varanda
  [32.2, -19], [32.2, -31], [19, -24],                                        // jardim
  [8, 13.5], [-12, 13.5], [-36, 5],                                           // estacionamento
  [-1.1, -0.5], [-1.5, 5.5],                                                   // foyer e saída
  [-8.55, -7.85], [-9.95, -6.45], [-18.95, -3.75], [-23.85, -0.15], [-14.95, 3.45], [-4.95, 5.65],   // térreo do bloco
  [-8.55, 0.75, 1.625],                                                       // patamar da escada
  [-3.85, -0.15, 3.25], [-12.95, -3.75, 3.25], [-25.35, -3.75, 3.25], [-10.95, 3.45, 3.25],          // 2º pavimento
];
