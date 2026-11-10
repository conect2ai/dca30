# DCA 30 Anos · Grande Tour da Automação

Prova de conceito de um jogo 3D em terceira pessoa que roda direto no navegador. O cenário é o prédio do DCA/UFRN, modelado a partir de vídeos gravados no local. Feito para o III SAS (12 e 13 de novembro de 2026), que celebra os 30 anos do curso de Engenharia de Computação.

## Como jogar

Abra a página do jogo, escolha um personagem e entre no DCA.

| Ação | Teclado e mouse | Celular |
| --- | --- | --- |
| Andar | W A S D ou setas | Alavanca à esquerda |
| Correr | Shift | Alavanca até o fim |
| Olhar | Arrastar o mouse, setas ← → | Arrastar a tela |
| Interagir, entrar e sair do carro | E | Botão E |
| Aproximar a câmera | Roda do mouse | |
| Menu | Esc | Botão Menu |
| Som | M | Botão Som |

A missão é encontrar os 30 chips dourados espalhados pelo prédio e arredores. O radar mostra os chips próximos, e o computador ligado do LABGRAD (Sala 15) diz onde está o chip mais perto. Os ícones azuis de câmera abrem fotos reais do prédio. No estacionamento dos fundos há um carro vermelho que pode ser dirigido.

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
- `PERSONAGENS` define os seis personagens jogáveis (nome, descrição, cores, estilo de cabelo).
- `FALAS` traz as falas dos figurantes.
- `CHIPS` lista as posições dos 30 chips em metros. O eixo x cresce dos fundos (x = 0) para a entrada (x perto de 54) e o eixo z cresce para o sul.
- `FOTOS` lista os pontos de foto. Para trocar uma imagem, substitua o arquivo em `assets/fotos/`.

As plaquinhas das portas usam números genéricos (Sala 10 a Sala 23). Para colocar os nomes reais, edite as listas `northDoors` e `southDoors` em `js/world.js`.

## O que é fiel ao prédio e o que é aproximação

A planta foi reconstruída à mão a partir de três vídeos curtos, sem medições. São fiéis ao que aparece nas gravações o corredor central com a galeria de quadros, a tubulação vermelha de incêndio, o piso de granilite, a saída dos fundos com o aviso do LAUT e do LAMP, o LABGRAD na Sala 15, o hall de entrada com a grade e as mesas redondas, a varanda com o letreiro da fachada, o jardim de terra vermelha e o estacionamento de paralelepípedo com as serras ao fundo. Comprimentos, número de salas e a posição exata de cada porta são estimativas.

## Créditos

Motor gráfico [Three.js](https://threejs.org/) (licença MIT). Texturas e sons gerados por código. Fotos e vídeos de referência do grupo Conect2ai.
