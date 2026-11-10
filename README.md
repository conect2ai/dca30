# DCA 30 Anos · Grande Tour da Automação

Prova de conceito de um jogo 3D em terceira pessoa que roda direto no navegador. O cenário é o prédio do DCA/UFRN (LECA). O bloco dos professores e o foyer seguem a planta do projeto executivo de arquitetura, e a galeria foi modelada a partir de vídeos gravados no local. Feito para o III SAS (12 e 13 de novembro de 2026), que celebra os 30 anos do curso de Engenharia de Computação.

## Como jogar

Abra a página do jogo, escolha um personagem e entre no DCA.

| Ação | Teclado e mouse | Celular |
| --- | --- | --- |
| Andar | W A S D ou setas | Alavanca à esquerda |
| Correr | Shift | Alavanca até o fim |
| Olhar | Arrastar o mouse, setas ← → | Arrastar a tela |
| Interagir, entrar e sair do carro | E | Botão E |
| Voz do personagem | Espaço | Botão Voz |
| Aproximar a câmera | Roda do mouse | |
| Menu | Esc | Botão Menu |
| Som | M | Botão Som |

São oito personagens, entre eles um bode (bééé) e um gato (miau). A missão é encontrar os 30 chips dourados espalhados pelos dois andares do prédio e pelos arredores. O radar mostra os chips próximos, e o computador ligado do LABGRAD (Sala 15) diz onde está o chip mais perto. Os ícones azuis de câmera abrem fotos reais do prédio. No estacionamento dos fundos há um carro vermelho que pode ser dirigido. Na copa, um café deixa o personagem mais rápido por alguns segundos.

## Como publicar no GitHub Pages

1. Crie um repositório público e envie todos os arquivos desta pasta para a raiz dele.
2. No repositório, abra Settings, depois Pages.
3. Em Build and deployment, escolha Deploy from a branch, selecione a branch `main` e a pasta `/ (root)`.
4. Em um ou dois minutos o jogo estará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Não há etapa de build. O arquivo `.nojekyll` evita que o GitHub processe a pasta.

## Como rodar no seu computador

O navegador não carrega módulos JavaScript a partir de `file://`, então sirva a pasta com qualquer servidor estático.

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## Estrutura

```
index.html        página, HUD e estilos
js/config.js      textos, personagens, falas, posições dos chips e das fotos
js/world.js       o prédio e os arredores (paredes, salas, jardim, estacionamento)
js/textures.js    texturas desenhadas em canvas (piso, paralelepípedo, placas, quadros)
js/actors.js      personagens e carros
js/main.js        controles, câmera, colisão, radar, som e missão
vendor/three.min.js   Three.js r187 empacotado em um único arquivo
assets/fotos/     fotos reais extraídas dos vídeos
```

## Como personalizar

Quase tudo o que é conteúdo fica em `js/config.js`.

- `CONFIG` guarda o título, o subtítulo e a linha do evento.
- `PERSONAGENS` define os personagens jogáveis (nome, descrição, cores, estilo de cabelo) e `BICHOS` os animais que circulam pelo cenário.
- `VOZES` e `REACOES` trazem o texto da voz de cada personagem e o que as pessoas respondem.
- `CONFIG.sons` aceita arquivos de áudio (mp3 ou ogg) para substituir as vozes sintetizadas do bode e do gato. Com o campo vazio, o som é gerado por código.
- `FALAS` traz as falas dos figurantes.
- `CHIPS` lista as posições dos 30 chips em metros, com a altura do piso (0 no térreo, 1.625 no patamar da escada, 3.25 no 2º pavimento). A origem fica na porta entre a galeria e o foyer. O eixo x cresce ao longo da galeria, e o bloco dos professores fica em x negativo. O eixo z cresce para o lado do estacionamento (norte real).
- `FOTOS` lista os pontos de foto. Para trocar uma imagem, substitua o arquivo em `assets/fotos/`.

No bloco dos professores, as plaquinhas seguem a numeração da planta (Prof. 01 a Prof. 29, copa, sala de reuniões e banheiros). Na galeria os números são genéricos, com exceção da Sala 15. Para trocá-los, edite as listas `northDoors` e `southDoors` em `js/world.js`.

## O que é fiel ao prédio e o que é aproximação

**Bloco dos professores e foyer.** Seguem a prancha ARQ 01/03 do projeto executivo de reforma e ampliação do LECA (2016), na escala 1/50. Vieram da planta a malha de eixos (01 a 08 a cada 3,20 m, com um vão de 4,00 m, e A a H somando 17,00 m), as três faixas de salas, as duas circulações de 1,65 m, a ligação lateral, o poço de ventilação e iluminação, a escada em dois lances de dez degraus, o elevador, a copa, a sala de reuniões, os banheiros, a posição das portas, o desnível de 3,25 m entre os pavimentos e as paredes de cobogó. O foyer é térreo, com a porta de saída voltada para o LAUT e a porta dupla para a galeria.

**Galeria.** O corredor com os quadros, o LABGRAD (Sala 15), o hall de entrada, a varanda e o jardim não constam nas pranchas recebidas. Foram modelados a partir dos vídeos, e o comprimento de cerca de 44 m foi estimado pela planta de situação. A posição das portas e o número de salas nesse trecho são aproximações.

**Interiores e arredores.** Móveis, cores, vegetação, estacionamento e prédios vizinhos são interpretações livres do que aparece nos vídeos. Só a Sala de Professor 01, a copa e a sala de reuniões têm interior; as demais salas ficam fechadas.

**Orientação.** O radar aponta o norte real, de acordo com a planta de situação.

## Créditos

Motor gráfico [Three.js](https://threejs.org/) (licença MIT). Texturas e sons gerados por código. Fotos e vídeos de referência do grupo Conect2ai.
