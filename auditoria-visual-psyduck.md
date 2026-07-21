# Auditoria: por que o Psyduck ainda "parece feito por IA"

> Cole isso no Claude Code como prompt de auditoria. Não peça "deixa menos IA" —
> peça pra ele checar `style.css` linha por linha contra esta lista e reportar
> cada violação antes de mudar qualquer coisa.

## Por que "parece IA" mesmo depois dos ajustes na cena

A cena (`mascot.js`) já é pixel art de verdade — `<rect>` puro, sem curva,
`crispEdges`. O problema não é mais a cena. É o **resto da UI ao redor dela**
(botões, inputs, ícones, cards de coluna) que provavelmente ainda fala uma
língua visual diferente: web moderno genérico, não jogo retro. Um pé em cada
mundo é o que dá a sensação de "IA colou uma imagem bonita num dashboard
qualquer".

## Checklist de auditoria (rodar contra style.css)

### 1\. Tipografia

* \[ ] Existe alguma fonte pixel/bitmap real carregada (ex: "Press Start 2P",
"Silkscreen", "04b03", "Pixelify Sans")? Se o CSS usa `system-ui`,
`-apple-system`, `Segoe UI`, `Roboto` ou qualquer sans-serif padrão do
SO — **essa é a causa nº 1**. Jogo pixel-art precisa de fonte bitmap
pelo menos nos títulos/labels; corpo de texto longo pode ser uma
mono-espaçada retro, mas nunca fonte de sistema neutra.

### 2\. Cor e sombra

* \[ ] Alguma sombra usa `box-shadow` com `blur` (ex: `0 4px 12px rgba(...,0.15)`)?
Pixel art não tem sombra difusa — sombra de jogo retro é **sólida,
deslocada, sem blur** (`box-shadow: 4px 4px 0 #000` ou um `<rect>`
escuro atrás, nunca `blur > 0`).
* \[ ] Algum `background` usa `linear-gradient` suave (céu, botão, painel)?
Gradiente suave de muitas paradas de cor é tell clássico de IA. Pixel
art usa **faixas de cor sólida em degradê discreto** (2–4 tons banded,
não gradiente contínuo) — é assim que o céu da cena já deve estar
feito; conferir se botões/painéis quebraram essa regra.
* \[ ] Quantas cores distintas existem no arquivo de variáveis (`--scene-\*`,
`--bg`, etc)? Se passar de \~16 cores correndo soltas, a paleta não tá
disciplinada como paleta de jogo 16-bit.

### 3\. Cantos e bordas

* \[ ] Algum elemento (que não seja o modal de Ajustes) tem `border-radius`
maior que 2–3px? Cantos arredondados generosos (8px, 12px, 16px — o
padrão Bootstrap/Tailwind) são o tell mais óbvio de "card de SaaS".
Painel de cortiça/madeira = cantos retos ou quase retos.
* \[ ] As bordas dos painéis/botões são finas (`1px solid #ccc`, cinza clarinho)
ou grossas e propositais (2–4px, cor que contrasta de propósito, tipo
contorno de sprite)? Borda fina cinza é tell de UI genérica.

### 4\. Ícones

* \[ ] Tem emoji nativo sendo usado como ícone de UI (⚙️, 🦆, ✅, etc)? Emoji do
sistema operacional **não combina com pixel art desenhada à mão** —
é outro estilo visual dentro do mesmo app. Ou vira sprite pixelado
(mesma técnica do `mascot.js`, `<rect>`/`shape-rendering: crispEdges`)
ou vira glifo de uma fonte de ícones pixel-art — nunca emoji cru.

### 5\. Interação/estado

* \[ ] Hover/click tem `transition` suave (ease-in-out, 0.2s–0.3s) tipo
site institucional? Jogo retro usa **mudança de estado abrupta**: cor
inverte, botão "afunda" com `transform: translate(1px,1px)` sem
transição, ou troca de frame (`steps(1, jump-end)`, que vocês já usam
no pato — aplicar a mesma lógica em botões/toggles).
* \[ ] Algum spinner/loading usa animação suave rotativa? Trocar por algo que
pareça sprite de jogo (frames discretos, não CSS spinner genérico).

### 6\. Grid e espaçamento

* \[ ] As 7 colunas do dashboard têm `gap`/`padding` uniforme e "limpo" tipo
grid de Figma, ou têm a leve irregularidade proposital que already
existe nos painéis-de-cortiça (rotação alternada, pino)? Conferir se
**todos** os elementos internos (não só o container do painel) seguem
essa língua, ou se formulário/input voltou pro padrão neutro
cinza-e-retangular por baixo.

