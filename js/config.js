// Conteúdo editável do jogo. Mude textos, personagens e falas aqui, sem tocar no motor.

export const CONFIG = {
  titulo: 'DCA 30 ANOS',
  subtitulo: 'Grande Tour da Automação',
  evento: 'III SAS · 12 e 13 de novembro de 2026 · DCA/CT/UFRN',
  totalChips: 30,
};

// Personagens jogáveis. estilo: curto | longo | coque | grisalho | robo
export const PERSONAGENS = [
  { id: 'caloura',   nome: 'Caloura',    papel: 'Primeiro período, mochila cheia',     pele: '#b9794a', cabelo: '#24160f', camisa: '#1f9d8a', calca: '#2f4a7a', sapato: '#f2f2f2', estilo: 'longo',    mochila: '#e0572f' },
  { id: 'veterano',  nome: 'Veterano',   papel: 'Conhece cada tomada do prédio',       pele: '#7a4a2b', cabelo: '#111111', camisa: '#e08a1e', calca: '#2b2f36', sapato: '#3a3a3a', estilo: 'curto',    mochila: '#30343b' },
  { id: 'professora', nome: 'Professora', papel: 'Prova surpresa a qualquer momento',  pele: '#e8b88a', cabelo: '#5a3320', camisa: '#1f3f73', calca: '#3b3f47', sapato: '#2a2020', estilo: 'coque',    oculos: true },
  { id: 'professor', nome: 'Professor',  papel: 'Trinta anos de quadro branco',        pele: '#d9a273', cabelo: '#c9c9c9', camisa: '#f1efe8', calca: '#56606b', sapato: '#3b2a1e', estilo: 'grisalho', oculos: true },
  { id: 'tecnica',   nome: 'Técnica',    papel: 'Guardiã das bancadas e dos cabos',    pele: '#8f5a36', cabelo: '#1a1410', camisa: '#3f86c9', calca: '#2c3440', sapato: '#1e1e1e', estilo: 'curto',    jaleco: true },
  { id: 'robo',      nome: 'ROB-30',     papel: 'Projeto de TCC que ganhou vida',      pele: '#c9d2d8', cabelo: '#f4b63a', camisa: '#8e9aa3', calca: '#5c6870', sapato: '#2b3238', estilo: 'robo' },
];

// Falas dos personagens que circulam pelo prédio.
export const FALAS = {
  corredor1: ['Bem-vindo ao DCA! Já achou os 30 chips? Tem um monte neste corredor.', 'Se a porta está fechada, é porque tem aula. Ou reunião. Ou os dois.'],
  corredor2: ['O LABGRAD fica na Sala 15, no meio do corredor. Tem um computador ligado lá dentro.', 'III SAS, dias 12 e 13 de novembro. A gente se vê nas palestras!'],
  jardim:    ['Trinta anos de Engenharia de Computação. Passa rápido, né?', 'Lá atrás, no estacionamento, dizem que tem um carro destrancado...'],
  estacionamento: ['Aquele carro com a placa DCA 30? Pode pegar, é do projeto. Aperte E pertinho dele.', 'Só não vale entrar com o carro no corredor. Eu acho.'],
  lab:       ['Hoje a aula é prática. Pegue um computador livre e mãos à obra.', 'Quem achar os 30 chips ganha... o respeito eterno da turma.'],
  hall:      ['O mural ali na parede tem a programação do simpósio.', 'Café? Só depois da última palestra.'],
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

// Fotos reais do prédio, tiradas dos vídeos usados para modelar o cenário.
export const FOTOS = [
  { id: 'fachada',        x: 54.2,  z: -15.2, arquivo: 'assets/fotos/fachada.jpg',        legenda: 'Entrada principal, vista do jardim' },
  { id: 'hall',           x: 53.6,  z: -3.4,  arquivo: 'assets/fotos/hall.jpg',           legenda: 'Hall de entrada' },
  { id: 'corredor',       x: 12.5,  z: 0.0,   arquivo: 'assets/fotos/corredor.jpg',       legenda: 'Corredor principal e sua galeria' },
  { id: 'labgrad',        x: 22.0,  z: 3.4,   arquivo: 'assets/fotos/labgrad.jpg',        legenda: 'LABGRAD, Sala 15' },
  { id: 'saida',          x: 2.6,   z: 1.9,   arquivo: 'assets/fotos/saida.jpg',          legenda: 'Saída dos fundos' },
  { id: 'fundos',         x: -5.0,  z: 1.6,   arquivo: 'assets/fotos/fundos.jpg',         legenda: 'A porta dos fundos, vista de fora' },
  { id: 'estacionamento', x: -19.0, z: -3.5,  arquivo: 'assets/fotos/estacionamento.jpg', legenda: 'Estacionamento e as serras ao fundo' },
];

// Posições dos 30 chips (x, z).
export const CHIPS = [
  [3, 0], [9, 0.5], [14, -0.5], [19, 0.4], [26, -0.4], [33, 0.5], [39, -0.5], [45, 0.4], [57, 0], [62.4, 0],
  [4.6, 3.9],
  [22.0, 6.6], [24.4, 5.0], [28.4, 7.9], [30.9, 4.5],
  [50.2, -7.4], [58.6, -2.6], [54.2, -6.2],
  [50.6, -11.2],
  [54.2, -19], [54.2, -31], [41, -24], [69, -24], [63, -16],
  [-7, 0], [-15, -11], [-31, 5], [-39, -20], [-22, 21],
  [30, 17],
];
