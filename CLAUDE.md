# Psyduck — gerenciador de tarefas ADHD/autismo/afantasia

Gerenciador de tarefas pessoal do Rod, com foco em TDAH/autismo/
afantasia: os 10 métodos clássicos de produtividade (ver
`www/js/data.js` → `METHOD_CONFIGS`) como ferramentas funcionais, não
só texto explicativo, mais gamificação (XP/nível/sequência/badges) e
um mascote (o próprio Psyduck) que reage ao progresso.

**Arquitetura de referência**: este projeto segue o mesmo padrão já
validado em `C:\Users\Rod\Dev\theartistsway` (ver
`theartistsway/CLAUDE.md` e `theartistsway/sincronizacao-nuvem-setup.md`)
— PWA + app UWP nativo, Firestore REST direto (sem SDK), Google OAuth
por Device Authorization Grant (UWP/Win10 Mobile) e PKCE (PWA), versão
sempre bumped, push imediato após cada leva validada, Actions
acompanhado até o fim.

**Docs de referência soltos na raiz do repo** (não geram código sozinhos
— usar como checklist/contexto, não como spec pra copiar literalmente):
- `auditoria-visual-psyduck.md` — checklist de "por que ainda parece
  feito por IA" (tipografia, sombra, cantos, ícones, transições, grid).
  Boa parte já foi corrigida na v0.1.10 (ver abaixo); o que sobrou
  (transições suaves em hover/click, spinners) fica registrado lá.
- `SPEC.md` — descreve o app de referência ORIGINAL (vídeo) com muito
  mais detalhe: avatares humanos da família, ciclo dia/noite, horta que
  cresce com o progresso, cachorro andando sozinho, painel de chat
  "Sofá"/"Amanda" com check-ins conversacionais, stack sugerido
  Next.js+TypeScript+SQLite/Prisma. **Isso é referência, não backlog
  aprovado** — vários itens contradizem decisões já tomadas (avatares
  humanos foram recusados a favor só dos patos; nosso stack é vanilla
  JS sem build, não Next.js). Só implementar algo de lá se o usuário
  pedir explicitamente aquele item específico.

## Estado atual (v0.1.14)

PWA (`www/`) com a infraestrutura de sync na nuvem **construída e
com o fluxo de OAuth confirmado batendo no Google de verdade**, mas
**ainda não utilizável de ponta a ponta** — falta um passo manual no
Google Cloud Console (ver v0.1.14 abaixo). App nativo UWP continua no
roadmap. Ver roadmap completo abaixo.

## Arquitetura de tela única (desde a v0.1.9 — LEIA ANTES DE MEXER NA UI)

O app **não tem mais páginas/rotas separadas nem barra de navegação**.
Isso foi uma decisão explícita do usuário (regra "PROÍBO
terminantemente bottom-nav/páginas/paginação"), depois de eu ter
construído (e ele ter aprovado, e depois pedido pra desfazer) um
roteador hash com bottom-nav nas versões v0.1.1–v0.1.8. **Não
reintroduzir rotas/páginas sem o usuário pedir de novo** — isso já foi
tentado e revertido por instrução direta dele.

`www/js/app.js` hoje é uma função `render()` só, chamada de novo a
cada mutação, que desenha:
- `.scene-container` (topo, ~42vh) — cena da fazenda + mascote + todos
  os patos da família espalhados (sempre visíveis, não só numa tela
  "Fazenda" — não existe mais tela dedicada) + botão de engrenagem.
- `.wooden-dashboard` (resto da altura, `flex:1`) — 7 colunas lado a
  lado dentro de um frame de madeira único: **Moedas, Lembretes,
  Tarefas, Fazenda, Livros, Clima, Destaque**. `body` é
  `height:100vh; overflow:hidden` — **nunca** a página inteira rola,
  só o conteúdo de dentro de cada coluna (`.column-content { overflow-y:
  auto }`) e o próprio `.wooden-dashboard` na horizontal quando as
  colunas não cabem lado a lado (`overflow-x:auto` — isso vale também
  no celular, por pedido explícito do usuário: "vale pra tudo,
  inclusive celular", aceitando que fica mais apertado).
- O único modal permitido é o de **Ajustes** (`.modal-overlay` +
  `.window-frame`, aberto pelo botão `⚙️` no canto da cena). O modal de
  "novo pato conquistado" (`.duck-modal-overlay`) também existe, mas é
  uma celebração pontual, não uma "troca de tela".

**Kanban, Matriz de Eisenhower, Pomodoro, Time-Boxing e Auditoria de
Tempo perderam a tela própria** (decisão explícita do usuário, ciente
de que ficam mais limitados) e viraram:
- Kanban → botão-pílula `data-action="cycle-kanban"` em cada linha de
  tarefa (cicla A Fazer→Fazendo→Feito→A Fazer; ainda respeita
  `kanbanWipLimit`).
- Eisenhower → botão-pílula `cycle-eisenhower` (cicla os 4 quadrantes +
  vazio).
- Regra 1-3-5 → botão-pílula `cycle-otf` (cicla grande/média/pequena/
  vazio, carimba `oneThreeFiveDate` com o dia de hoje).
- ABCD-Z → botão-pílula `cycle-priority`.
- Regra dos 2 Minutos / 80/20 → chips `toggle-two-min`/`toggle-pareto`.
- Pomodoro + Time-Boxing → viraram **um timer de foco só** (rodapé da
  coluna Livros, botões 5/10/15/20 min, reaproveita
  `PsyduckMethods.TimeboxTimer`; a classe `PomodoroTimer` com ciclos
  trabalho/pausa foi **removida** de `methods.js` por ficar sem uso).
- Catálogo de Métodos (texto explicativo dos 10 métodos) → substituído
  por `title="..."` (tooltip) no ícone `ⓘ` do cabeçalho da coluna
  Tarefas — não existe mais tela dedicada de explicação.

Se o usuário pedir pra "voltar a ter uma tela de Kanban de verdade" ou
similar, é reintroduzir complexidade que foi removida por pedido
dele — perguntar antes de simplesmente devolver a versão antiga.

**v0.1.1 (feedback do usuário sobre a v0.1.0)**: o usuário apontou que o
visual ainda parecia "cara de app feito por IA" (referências mostradas:
Finch, Habitica, Koda — apps de bichinho/RPG com cena ilustrada, barra
de navegação inferior, sem menu-hambúrguer/dashboard genérico) e pediu
uma mecânica de colecionar uma família de Psyducks, tipo Pokémon,
ganhos ao completar tarefas. Mudanças:
- **Navegação**: hambúrguer + painel lateral → barra inferior fixa com
  5 destinos (Início/Tarefas/Fazenda/Métodos/Ajustes). Kanban/
  Eisenhower/1-3-5/Pomodoro/Time-Boxing/Auditoria não têm mais aba
  própria — acessados por link rápido em `/tasks` e pelo botão de cada
  card em `/methods`.
- **Cena ilustrada**: `renderFarmBackgroundSvg()` em `mascot.js` (céu
  com gradiente, colinas, celeiro, lago, juncos) substitui o antigo
  card branco do mascote na Home.
- **Coleção de patinhos** (`STORES.ducks`, `DB_VERSION` 1→2): cada
  conclusão de tarefa/Pomodoro tem 20% de chance de "chocar" um novo
  Psyduck (`maybeAwardDuck` em `gamification.js`), sorteado por peso de
  raridade entre `DUCK_VARIANTS` (`data.js`); level-up e badge novo
  **garantem** um pato (só do pool incomum+). Tela `/farm` mostra a
  cena do lago com os patos espalhados (posição pseudo-aleatória
  estável por hash do id, `hashPos()` em `app.js`) + lista da família.
  Ganhar um pato abre um modal de celebração (`showDuckModal`).

**Se for continuar mexendo no visual**: a referência que o usuário deu
foi apps tipo *Finch* (bichinho de estimação que cresce com
autocuidado) e *Habitica* (RPG com pets como recompensa) — cena
ilustrada ocupando espaço real, barra inferior, nada de grid de cards
cinza. Evitar voltar pro padrão "dashboard SaaS".

**v0.1.2 (feedback imediato sobre a v0.1.1)**: o usuário achou a cena
ainda "presa numa caixinha no meio da tela" e mandou uma referência
(vibecoded também) com a fazenda ocupando a largura inteira da tela,
de ponta a ponta, com painéis estilo quadro de avisos/cortiça embaixo.
Mudanças:
- **Cena de ponta a ponta**: `route()` agora pode devolver `{ scene,
  body }` em vez de só uma string — `render()`/`shell()` (`app.js`)
  colocam `scene` como irmã de `.content`, fora do container de
  largura máxima (720px), então ocupa 100% da tela. Só `/home` e
  `/farm` usam isso; as outras telas continuam devolvendo string pura
  (sem cena). `.scene-hero`/`.farm-scene-wrap` perderam
  border-radius/box-shadow/margem — viram viewport de ponta a ponta
  com uma borda clara embaixo simulando a margem do lago.
- **Painéis viram "notas de cortiça"**: `.panel` ganhou leve rotação
  alternada (ímpar/par) + um "pino" circular no topo (`::before`),
  em vez de card branco reto flutuando num fundo cinza. Fundo da
  página (`--bg`) mudou de creme liso pra um tom de madeira/cortiça,
  os painéis (`--bg-elevated`) continuam claros — o contraste entre
  os dois é o que dá a leitura de "nota pregada num quadro".
- Formulários dentro de `<details class="panel">` (o form de nova
  tarefa) **não** ganham pino/rotação — regra: só listas/conteúdo
  "vivo" parecem nota pregada, formulário continua neutro.

**v0.1.3 (referência detalhada: pixel art estilo Stardew Valley + dashboard
em colunas)**: usuário mandou uma descrição bem específica de outro app
(vibecoded, dele mesmo, com uma coluna "SOFIA" pra atividades da filha)
como referência de estilo. **Não copiado literalmente** — extraído o
padrão estrutural e adaptado pro domínio do psyduck:
- **Visual pixel art de verdade**: `mascot.js` reescrito do zero — pato
  e cenário (casa, pinheiros, árvore redonda, horta com vasos,
  cachorro, lago com 6 vitórias-régias) agora são só `<rect>` com
  `shape-rendering: crispEdges`, sem curva nenhuma (nada de
  `<circle>`/`<ellipse>`/`<path>` com Q/C). Animação de "respirar" do
  pato trocou de `ease-in-out` suave pra `steps(1, jump-end)` (pulo de
  2 quadros, tipo sprite de jogo).
- **Dashboard de 5 colunas no Início** (`.dash-board` em `app.js`):
  Moedas (XP como moedinhas + nível + streak), Lembretes (tarefas com
  prazo/lembrete, ícone de letra + estrelas de prioridade), Tarefas
  (checklist compacto), Fazenda (prévia dos últimos patos + link),
  Destaque (a tarefa mais importante do dia, expandida). Rolável na
  horizontal com scroll-snap em tela estreita, vira 5 colunas lado a
  lado em telas ≥720px (media query no fim de `style.css`).
- **Coluna Destaque = adaptação da coluna "SOFIA" da referência**: em
  vez de atividades de criança com humor pós-atividade, aqui é a
  tarefa prioridade A (ou a "1 grande" do 1-3-5 do dia) — ao marcar
  como concluída, aparece um seletor de humor de 4 opções
  (Ruim/Ok/Bom/Muito bom, `reflectionMood` no registro da tarefa) +
  campo de texto livre (`reflectionNote`), uma auto-reflexão leve sobre
  como foi a tarefa mais importante do dia. **Bug corrigido durante o
  build**: a tarefa "destaque" precisou virar um **pin persistente**
  (`profile.featuredTaskId`/`featuredTaskDate`, `pickFeaturedTask()` em
  `app.js`) — se a escolha fosse recalculada por filtro `!task.done` a
  cada render, marcar a tarefa como feita a fazia sumir do Destaque
  antes do usuário conseguir registrar o humor. Agora ela fica fixada
  o dia inteiro, mesmo depois de concluída.

**v0.1.4 (três correções seguidas, direto depois da v0.1.3)**:
1. **"Cara de dashboard de IA" de novo**: `.dash-col` ainda tinha
   `box-shadow` + `border-radius: 14px` + `gap` entre colunas —
   exatamente o card-flutuante-num-fundo-cinza rejeitado desde o
   início. Trocado por um frame de madeira único (`.dash-board`,
   `background: var(--scene-trunk)`) com colunas coladas, separadas só
   por uma linha fina (`border`), sem sombra, sem raio de canto.
2. **"O pato só aparece no Início/Fazenda, some nas outras telas"**: a
   cena vinha só de `/home`/`/farm` via `{scene, body}`. Virou
   persistente de verdade — `render()` agora sempre chama
   `renderTopScene(path)` (nova função em `app.js`), **independente da
   rota**: o mascote aparece em Tarefas, Kanban, Métodos, Ajustes,
   tudo. Só a Fazenda troca a versão compacta pela versão grande com
   os patos espalhados no lago (clicáveis), sem duplicar as duas.
3. **"Mobile precisa de layout próprio, não desktop espremido"**:
   `.dash-board` era `flex-direction: row` com scroll horizontal
   (`scroll-snap`) por padrão — no celular vira carrossel escondendo 4
   das 5 colunas até arrastar, ruim pra quem já tem dificuldade de
   atenção. Invertido: **mobile-first é pilha vertical** (cada coluna
   ocupa a largura toda, rolagem normal de página), só em telas
   ≥720px (`@media (min-width: 720px)`) vira lado a lado como na
   referência (que era captura de desktop). Isso corrige a descrição
   de "rolável na horizontal" que ficou desatualizada no item v0.1.3
   acima.

**v0.1.5 (bug real: cena ilegível no tema escuro + lago devia ser
oval)**: usuário mandou um diagnóstico longo (parcialmente gerado por
IA a partir de prints/vídeo) comparando o psyduck com a referência.
Boa parte do texto descrevia **outro app** (o vídeo de referência mais
maduro, com clima/Obsidian/rastreador de livro/avatares humanos) — não
escopo do psyduck, confirmado com o usuário que não entra nada disso
agora. Mas dois bugs reais estavam no meio:
- **Cena virava uma mancha verde/preta chapada**: as variáveis
  `--scene-*` eram redefinidas dentro de `:root[data-theme="dark"]`
  com tons muito escurecidos — sol, céu e colina ficavam quase da
  mesma cor escura, sem contraste nenhum. Removidas as redefinições de
  `--scene-*` no bloco dark: a cena da fazenda **sempre** usa a
  paleta clara de dia, independente do tema do app (mesma lógica de
  jogo cozy — o mundo não vira noite só porque a UI virou tema
  escuro). Só a UI ao redor (fundo de página, cards, texto) continua
  respeitando claro/escuro/automático normalmente.
- **Lago era um retângulo**: trocado por duas `<ellipse>` (borda +
  água), vitórias-régias reposicionadas pra caber dentro do oval.
  Pixel art não precisa ser só retângulo — curva faz sentido pra água.

Testado via CDP com `--force-dark-mode`: confirmado
`--scene-sky-top`/`--scene-hill-near` computados continuam nos tons
claros originais mesmo com `data-theme="dark"` ativo, e o SVG da cena
agora tem 2 elementos `<ellipse>` (lago).

**v0.1.6 (recorrência de "mudou nada")**: depois de várias levas de fix
visual sem o usuário conseguir confirmar se via a versão nova, ficou
claro que faltava um jeito de diagnosticar cache vs. bug real —
`service-worker.js` no GitHub Pages tem `Cache-Control: max-age=600`, e
o timing de quando o navegador nota/assume um Service Worker novo pode
não ser imediato numa aba já aberta. Adicionado: número da versão
visível em Ajustes ("Psyduck vX.X.X") e um botão **"Forçar
atualização"** (`forceUpdate()` em `app.js`) que desregistra o Service
Worker + apaga todo `caches.keys()` + recarrega, sem depender do timing
natural do navegador. Confirmado depois que era mesmo cache (aba
anônima já mostrava a v0.1.5 correta).

**v0.1.7 (reversão de escopo: Obsidian + clima + livros ENTRAM)**: o
usuário tinha mandado um diagnóstico pedindo integração com Obsidian,
card de clima e rastreador de livros com capa — eu tratei como "ideia
de outra IA sem contexto" e recusei (igual ao que decidimos pra
Keep/avatares humanos na v0.1.5). **Errado**: o usuário confirmou que
foi ele mesmo quem pediu pra outra IA escrever aquele texto, ou seja,
era pedido de verdade, não alucinação. Corrigido na mesma sessão,
depois de 3 decisões técnicas concretas com o usuário:
- **Obsidian**: só funciona em Chrome/Edge de **desktop** — a File
  System Access API (`showDirectoryPicker`) não existe em navegador
  mobile nem vai existir no WebView do futuro app UWP. Decidido:
  desktop-only por enquanto, documentado como limitação conhecida (não
  bloqueado até ter sync na nuvem). `www/js/obsidian.js` (novo):
  conecta a pasta do cofre (handle salvo em `STORES.obsidianHandle`,
  IndexedDB aceita `FileSystemHandle` nativamente), lista os `.md` da
  raiz, parseia linhas `- [ ]`/`- [x]` de um arquivo escolhido e faz
  upsert na store `tasks` normal (id estável = hash do texto, não da
  posição — sobrevive a linhas que se deslocam entre sincronizações).
  Marcar/desmarcar uma tarefa vinda de lá reescreve a linha de volta no
  arquivo (`writeTaskToggle`), reconfirmando a linha pelo texto antes
  de sobrescrever (o arquivo pode ter sido editado por fora).
- **Clima**: `www/js/weather.js` (novo) — geolocalização do navegador
  (`navigator.geolocation`) + Open-Meteo (API gratuita, sem chave),
  cache de 30min em `profile.weatherCache` pra não bater na API/pedir
  localização toda hora. Sparkline das próximas 12h em SVG puro
  (`<polyline>`, sem lib de gráfico).
- **Livros**: `STORES.books` novo — capa buscada automaticamente via
  Open Library (`openlibrary.org/search.json`, sem chave) pelo título;
  card com capa + "Cap. N" + botão "Completar +10" (avança capítulo +
  XP + chance de pato, mesmo fluxo de `gamification.js`). Hardcover
  (API mencionada pelo usuário) ficou de fora por enquanto — exige
  chave/GraphQL, mais complexo de configurar; Open Library cobre o
  caso de uso sem fricção nenhuma.
- Início ganhou 2 colunas novas no dashboard (Livros, Clima), total 7.
- Ajustes ganhou seção "Obsidian" (feature-detectada — mostra aviso se
  o navegador não suporta, sem quebrar nada).

**Lição**: quando um texto longo e "sonoro" chega descrevendo
funcionalidades que não foram pedidas na conversa, perguntar antes de
descartar — pode ser o usuário citando/reencaminhando algo que ele
mesmo pediu em outro lugar, não necessariamente ruído de terceiros.

**v0.1.8 (bug: `.content` limitava tudo a largura de celular)**:
`.content { max-width: 720px; margin: 0 auto; }` capava o app inteiro
numa coluna de celular mesmo em monitor grande — mesmo depois da v0.1.4
ter dado tratamento próprio pro dashboard em telas largas
(`@media (min-width: 720px)`), esse container pai continuava
estreitando tudo por baixo, incluindo a própria media query (nunca
tinha espaço de verdade pra usar). Removido o `max-width`/`margin:
0 auto` de `.content` — o conteúdo agora ocupa a tela inteira, sem cap
nenhum. Única exceção deliberada: `.window-frame` (janela de menu de
Ajustes/Métodos) ganhou seu próprio `max-width: 640px; margin: 0 auto;`
— isso é decisão de design **daquele componente específico** (menu
centralizado é mais legível que esticado em 1920px), não um limite
geral do app. Confirmado via CDP em viewport de 1440px: `.content`
passou de 720px pra 1424px (largura real da janela).

**v0.1.9 (reescrita arquitetural: dashboard de tela única)**: o usuário
mandou um prompt bem detalhado e explícito ("Atue como um Arquiteto de
Software...") proibindo bottom-nav/páginas/modais de troca de tela,
exigindo um dashboard `100vh` sem rolagem de página, com as 5+ colunas
sempre lado a lado (inclusive Obsidian/clima/livros que eu tinha
acabado de adicionar como colunas extras na v0.1.7). Antes de executar,
levantei os conflitos reais com decisões já tomadas na mesma conversa
(mobile precisava de layout próprio — regra da v0.1.4 — e as 5 telas
dedicadas de método iam encolher/perder função) e perguntei; o usuário
confirmou que queria valendo pra tudo, inclusive celular, e aceitou
encolher Kanban/Eisenhower/Pomodoro/Time-Boxing/Auditoria em widgets
miniatura. Ver seção "Arquitetura de tela única" no topo deste arquivo
pro estado resultante — é uma mudança grande o bastante pra merecer
seção própria, não só uma entrada de histórico.

Detalhe de implementação que valeu a pena registrar: `.wooden-dashboard`
usa `overflow-x: auto` em vez de tentar espremer 7 colunas em 390px de
largura de celular (o que ficaria ilegível) — ainda é "uma tela só,
sem página nova, sem bottom-nav", só que alcançada arrastando pro
lado em telas estreitas, em vez de rolagem vertical. Testado via CDP:
`document.documentElement.scrollHeight === clientHeight` (zero scroll
vertical de página) e `wooden-dashboard.scrollWidth > clientWidth` com
`overflow-x: auto` (scroll horizontal funcionando).

**Bug que eu mesmo introduzi e corrigi na mesma leva**: adicionei um
listener de `change` **além** do de `click` já existente pro checkbox
de tarefa, achando que precisava — só que isso disparava
`task-toggle` duas vezes por clique (XP em dobro, duas chances de
pato). O `click` sozinho já bastava (como sempre bastou nas versões
anteriores). Pego antes de subir, via teste comparando XP antes/depois
de um clique único (delta tinha que ser exatamente `xpValue`, não o
dobro).

**v0.1.10 (checklist de 7 itens, "auditoria visual anti-cara-de-IA")**:
usuário mandou 7 mudanças de CSS/JS numeradas, pedindo confirmação
visual (screenshot) uma por uma antes de seguir pra próxima; depois de
confirmar os 2 primeiros itens, disse pra fazer o resto tudo e só
avisar no final. Aplicado:
1. **Dashboard sempre claro no tema escuro**: removidas as 11
   variáveis (`--bg`, `--bg-elevated`, `--bg-column`, `--card-bg`,
   `--text`, `--text-main`, `--text-soft`, `--border`, `--warn-bg`,
   `--warn-text`, `--shadow`) de dentro de `:root[data-theme="dark"]`
   — mesma regra que já existia pra `--scene-*` ("a fazenda é sempre
   de dia"), agora estendida pro dashboard inteiro. Confirmado com
   screenshot em `--force-dark-mode`.
2. **Fonte pixel**: "Press Start 2P" (cabeçalhos/botões/nível) +
   "Silkscreen" (resto do texto) via Google Fonts — única dependência
   externa do projeto além das APIs de dados (Open-Meteo/Open Library),
   com fallback `monospace` se ficar offline (nunca cacheada pelo
   service worker, por ser cross-origin).
3. **Border-radius ≤2px em tudo, sem exceção**: incluindo
   `.reminder-icon` (era círculo, virou quadrado com borda de 2px) e
   `.settings-btn` (idem). Auditado via CDP depois: nenhum elemento da
   página passa de 2.5px de `border-radius`.
4. **Sombra sólida, sem blur**: `--shadow` virou
   `3px 3px 0 rgba(60,40,15,0.35)`; `.window-frame` virou
   `5px 5px 0 rgba(0,0,0,0.4)` (era duas sombras, uma com blur de
   24px). `.ui-card` já estava correto (`0 3px 0`, sem blur), não
   mexido. **Não coberto** (fora da lista de 7 itens): `filter:
   drop-shadow(...)` do mascote/patinhos ainda tem blur — não mexido
   por não estar na lista explícita, mas é o mesmo problema.
5. **Emoji nativo → texto ou ícone pixelado**: dos 6 pedidos
   (⚙️🦆🔥🎉🐣✕), a engrenagem virou `pixelGearSvg()` (retângulos,
   reusada no botão de Ajustes e no título do modal); os outros 5
   viraram só texto (removido o emoji, mantida a frase). Emoji **não
   pedidos** (✓❤️😞😐🙂🤩📕🗑⏸) foram deixados como estavam —
   escopo é só os 6 nomeados.
6. **Gradiente removido**: `.chip.rarity-raro` virou cor sólida
   `#ffc93f` + borda, sem `linear-gradient`.
7. **Ícone de moeda sem `<circle>`**: `coinIconSvg()` reescrito como
   octógono bloqueado (só `<rect>`), confirmado via CDP
   (`querySelectorAll('.coin-icon circle').length === 0`).

Itens do `auditoria-visual-psyduck.md` **não cobertos** por essa leva
(ficam de fora até o usuário pedir): transições suaves em hover/click
(`transition: transform 0.12s ease` em `.btn` ainda existe), scrollbar
com radius residual de estilo suave. `SPEC.md` não foi tocado — ver
nota no topo do arquivo sobre tratá-lo como referência, não backlog.

**v0.1.11 (5 correções depois do usuário usar de verdade)**:
1. **Formulário de Auditoria de Tempo cortado** no rodapé da coluna
   Moedas: `.time-audit-mini` era uma linha (`display:flex` horizontal)
   com atividade+minutos+botão, e numa coluna estreita o segundo input
   saía pra fora sem aparecer. Virou empilhado (`flex-direction: column`),
   cada campo na sua própria linha — funciona em qualquer largura de
   coluna.
2. **Gráfico de clima ("próximas horas") não funcionava**: bug real em
   `weather.js` — `forecast_days=1` só devolve as horas de "hoje", e
   perto do fim do dia sobravam poucas (ou quase nenhuma) horas
   futuras pra desenhar o gráfico de 12h. Trocado pra `forecast_days=2`
   e a busca do índice inicial passou a localizar a hora atual de
   verdade no array de timestamps devolvido (que vem no fuso LOCAL da
   coordenada, `timezone=auto`) usando getters locais do `Date`, em vez
   de supor que o array começa à meia-noite de hoje.
3. **Bug real, achado pelo usuário**: clicar em "Fechar" no modal de um
   pato **não fechava** — `showDuckModal` insere o overlay via
   `document.body.appendChild`, fora da árvore do `#app`, então o
   clique nunca borbulhava até o listener delegado em `root`. Corrigido
   com um `addEventListener` próprio direto no `overlay` (também fecha
   clicando no fundo escurecido, de brinde).
4. **Modal de Métodos de volta** (`renderMethodsModal` em `app.js`,
   botão `.methods-btn` — "?" — embaixo do de Ajustes na cena): a
   v0.1.9 tinha reduzido a explicação dos 10 métodos a um tooltip
   `title="..."` sozinho; usuário pediu de volta um jeito de "continuar
   acessando eles". Os controles de verdade continuam sendo as pílulas
   inline (não voltou pra tela cheia) — o modal é só a explicação/cheat
   sheet, reaproveitando `.window-frame`.
5. **Mascote principal trocado**: o usuário desenhou/forneceu um SVG
   pixel art original (240x260, contorno + sombreado + piscar via
   CSS) e pediu pra usar no lugar do design anterior (mais simples,
   flat). `renderMascotSvg()` em `mascot.js` agora usa essa arte fixa
   — não parametriza mais cor por `mood` (o humor comunica só pelo
   texto do badge agora, não pela expressão do rosto). Os patinhos
   colecionáveis da fazenda **continuam** com o design antigo simples
   (recolorável por variante) — recolorir esse novo desenho detalhado
   por raridade seria trabalho grande demais pra esta leva.
   **Rejeitado nesta mesma leva**: o usuário também ofereceu um arquivo
   `www/icons/pngaaa.com-296569.svg` (13MB, um `<rect>` por pixel —
   provavelmente um trace do sprite oficial do Pokémon) como
   alternativa. Não usado por dois motivos independentes: (a) tamanho
   tornaria o app visivelmente lento; (b) é um repositório/site
   **público**, e uma reprodução pixel-a-pixel de personagem
   registrado da Nintendo carrega risco real de direito autoral mesmo
   sendo projeto pessoal não-comercial — "não vou vender" não muda o
   fato de a arte ficar publicamente distribuída. O arquivo continua
   em `www/icons/` mas não é referenciado em lugar nenhum do código.

Testado via CDP: modal do pato confirmado fechando por botão E por
clique no fundo; modal de Métodos abre com os 10 métodos e fecha;
clima confirmado com 12 pontos no gráfico (era 4, dependendo da hora);
checkbox de tarefa sem regressão de XP duplicado; mascote novo
renderizando com os elementos de piscar no DOM.

**v0.1.12 (cena dia/noite/clima real + mascote menor + concluídas
visíveis)**:
1. **Mascote reduzido**: `.mascot-wrap` de `width:22%/max-width:200px`
   pra `13%/120px` — usuário achou grande demais depois de ver de
   verdade.
2. **Tarefas concluídas voltaram a aparecer**: a coluna Todos só
   mostrava `pending` (uma decisão de v0.1.9 que nunca foi
   questionada até o usuário notar que TDAH se beneficia de ver o que
   já foi feito — reforço visual de progresso). Adicionado
   `<details class="done-tasks-details">Concluídas (N)</details>`
   recolhível no fim da coluna, reaproveitando `renderTaskRowMini`
   (já tinha estilo `.done` riscado, só não era chamado pra tarefas
   concluídas).
3. **Cena de fundo trocada pela arte do usuário**
   (`cenario_pixel_art_16bit-v2.html`, um arquivo local que ele
   forneceu): céu com 4 fases reais de horário (dia/pôr-do-sol/noite/
   nascer-do-sol, via `getSceneTimeClass()` em `weather.js`, checando
   `new Date().getHours()`) e 4 estados de clima real (limpo/chuva/
   tempestade/neve, via `getSceneWeatherClass()`, mapeando o código
   WMO que o Open-Meteo já devolvia mas que eu não usava — `weathercode`
   dentro de `current_weather`). Isso troca a cena inteira de céu/
   montanhas por uma bem mais rica (~800 elementos, incluindo uma
   "cidadezinha" ao fundo com janelas que acendem à noite) — a
   casa/horta/cachorro/lago do Psyduck (meus, versões compactas
   `smallHouse`/`smallGarden`/`smallDog`/`smallLake` em `mascot.js`)
   entram por cima, reposicionados pro novo viewBox `0 0 400 225`
   (a cena original era `0 0 800 400`).
   - **Corrigido um bug real no próprio arquivo original do usuário**:
     um valor de cor inválido (`#72bffff`, 7 dígitos hex) virou
     `#72bfff`.
   - **Corrigido outro bug meu, achado antes de subir**: colei o
     comentário de atribuição em `style.css` sem fechar o `/* */` antes
     do CSS de verdade começar — isso teria comentado TODAS as regras
     de tema/clima, deixando elas mortas silenciosamente. Pego
     conferindo o arquivo depois de colar, corrigido antes de testar.
   - **Refatoração de performance necessária**: a cena nova tem ~800
     elementos SVG — meu `render()` reconstruía o `#app` inteiro do
     zero a cada clique (tarefa concluída, pílula clicada, etc.), o
     que teria redesenhado a cena pesada centenas de vezes por sessão.
     `render()` agora só monta a cena UMA VEZ (`sceneShellBuilt`) e
     depois só atualiza a classe de tema/clima nela
     (`updateSceneThemeClasses()`, chamada a cada render + um
     `setInterval` de 60s pra continuar avançando o relógio mesmo sem
     interação) — o resto (mascote/patos dentro da cena, dashboard,
     modais) continua sendo redesenhado normalmente a cada mudança,
     em containers (`#sceneForeground`/`#woodenDashboard`/`#modalRoot`)
     que ficam dentro do `#app` fixo.

**Ainda pendente** (usuário pediu, não coube nesta leva): acesso
funcional de verdade aos métodos (um Kanban de verdade, matriz de
Eisenhower de verdade, etc. — não só a explicação em texto do modal de
Métodos da v0.1.11). Próximo passo natural.

Testado via CDP: `.farm-bg` confirmado com a MESMA referência de
elemento DOM antes/depois de uma interação normal (prova de que a cena
não é redesenhada); classe de tema real batendo com o horário do
sistema (`theme-night` no teste, rodado à noite); tarefas concluídas
aparecendo dentro do `<details>`; modal do pato fechando (com espera
maior — o teste anterior deu falso negativo por timing, não por bug).

**v0.1.13 (correção rápida de enquadramento da cena)**: usuário reportou
que a ilustração da fazenda cortava casa/lago nas bordas em celular
estreito. Fix interino: `aspect-ratio: 16/9` em `.scene-container` +
`preserveAspectRatio="xMidYMid meet"` no SVG — parou de cortar, mas
"encolheu" a cena (barras vazias em cima/embaixo em telas fora do
16:9). Substituído no v0.1.14 abaixo por uma solução melhor.

**v0.1.14 (cena de ponta a ponta + infraestrutura de sync com Google)**:
1. **Cena com "borda infinita" de céu/grama**: em vez de encolher a
   ilustração pra caber sem cortar (v0.1.13), o viewBox do SVG em
   `renderFarmBackgroundSvg()` (`mascot.js`) foi estendido de `0 0 400
   225` pra `-150 -50 700 325`, com faixas extras de céu (`sky-band-*`)
   e grama (`grass-main`) preenchendo essa borda nova, usando as MESMAS
   classes de tema/clima da cena principal (blend automático de cor).
   `.scene-container` voltou a ser `height: 40vh` fixo (sem
   `aspect-ratio`) com `preserveAspectRatio="xMidYMid slice"` (cover).
   Resultado: a cena preenche o container de ponta a ponta em qualquer
   proporção de tela, e um corte agora só come a borda estendida de cor
   sólida — casa/horta/cachorro/lago (o conteúdo detalhado, no centro
   do viewBox original) nunca são cortados. Confirmado por screenshot
   em viewport de celular (390×844).
2. **Infraestrutura de login Google + sync Firestore (v0.2.0 adiantada
   parcialmente)**: `www/js/auth.js` (novo) — PKCE Authorization Code
   flow, mesmo padrão do `theartistsway/www/js/auth.js`. `www/js/sync.js`
   (novo) — sync REST direto com Firestore (sem SDK), `mergePerRecord`
   pra `tasks/projects/timeAuditLog/ducks/books` e `mergeWholeBlob` pra
   `profile/gamification`, debounce de 5s + sync ao focar a aba/logar.
   `db.js` ganhou `getSettingRaw`/`setSettingRaw` (expõe `updatedAt` cru,
   necessário pro merge de blob inteiro). Seção "Conta Google" nova em
   Ajustes (entrar/sincronizar agora/sair). Client Secret do Google
   nunca commitado em texto puro — fica como placeholder
   `__GOOGLE_OAUTH_WEB_CLIENT_SECRET__` em `auth.js`, substituído só no
   artefato publicado pelo `deploy-pages.yml` via secret do repositório
   (`GOOGLE_OAUTH_WEB_CLIENT_SECRET`, já configurado no GitHub).
   Projeto Firebase: `psyduck-42`.
   - **Testado via CDP o que dava pra testar sem login real**: os dois
     namespaces (`PsyduckAuth`/`PsyduckSync`) carregam sem erro de
     console, o botão "Entrar com Google" aparece em Ajustes quando
     deslogado, e clicar nele de fato monta e navega pra uma URL válida
     de consentimento do Google (`accounts.google.com/o/oauth2/v2/auth`)
     com o `client_id` certo, PKCE `code_challenge` e `state` corretos.
   - **Achado real do teste**: o Google recusou com
     `redirect_uri_mismatch` — **o redirect URI usado pelo app
     (`https://ro2342.github.io/psyduck/`, e qualquer outro que for
     testado, como `http://localhost:PORTA/index.html`) precisa ser
     cadastrado manualmente em "Authorized redirect URIs" do OAuth
     client no Google Cloud Console antes do login funcionar de
     ponta a ponta.** Isso é passo do usuário, não dá pra automatizar.
   - **Não testável via automação**: o resto do fluxo (troca de code
     por token, `signInWithIdp` no Firebase, merge de verdade contra
     Firestore) só é verificável com uma conta Google real completando
     o consentimento — pendente de teste manual do usuário.
   - **Ainda pendente antes de considerar v0.2.0 "pronta"**: travar as
     regras de segurança do Firestore (hoje em "modo de teste", aberto)
     pra regra por-`uid` de verdade — ver `setup-google-cloud.md`.

**Ainda pendente** (de sessões anteriores, não fez parte desta leva):
acesso funcional de verdade aos métodos (Kanban de verdade, matriz de
Eisenhower de verdade, não só pílulas/modal explicativo).

## Onde ficam as coisas

```
www/
├── index.html, manifest.json, service-worker.js
├── css/style.css      ← visual próprio (mascote, animações, janela de pergaminho), sem lib externa
└── js/
    ├── app.js          ← dashboard de tela única — 1 função `render()`, sem rotas; colunas + modal de Ajustes + ações delegadas (data-action)
    ├── data.js         ← UI_STRINGS, METHOD_CONFIGS (os 10 métodos), BADGE_CONFIGS, APP_VERSION
    ├── db.js           ← IndexedDB. STORES: tasks, projects, timeAuditLog, profile, gamification, ducks, books, obsidianHandle
    ├── gamification.js ← cálculo de XP/nível/sequência/moedas, checagem de badge
    ├── mascot.js       ← mascote/patinhos/cena da fazenda (SVG pixel art desenhado à mão)
    ├── methods.js      ← TimeboxTimer (timer de foco embutido), formatCountdown
    ├── notifications.js ← Notification API best-effort (limitação documentada no README)
    ├── weather.js      ← card de clima (geolocalização + Open-Meteo, cache 30min)
    ├── obsidian.js     ← ponte com cofre local via File System Access API (só desktop Chrome/Edge)
    ├── auth.js         ← login Google via PKCE + troca de token com o Firebase (Identity Toolkit)
    ├── sync.js         ← sync REST direto com Firestore (mergePerRecord/mergeWholeBlob), sem SDK
    └── theme.js        ← tema claro/escuro/automático + accent color via CSS custom properties
```

## Modelo de dados — tarefa (`STORES.tasks`)

Uma tarefa carrega os campos de **todos** os métodos ao mesmo tempo
(pode estar em várias visões simultaneamente — não são modos
exclusivos):

```
{ id, title, notes, projectId, dueAt, remindAt,
  priorityLetter,          // A/B/C/D (ABCD-Z)
  eisenhowerQuadrant,       // urgent-important | not-urgent-important | urgent-not-important | neither
  kanbanColumn,             // todo | doing | done
  oneThreeFiveSlot,         // big | medium | small | null
  oneThreeFiveDate,         // YYYY-MM-DD do dia em que foi escolhida (reseta diariamente)
  isTwoMinuteTask, paretoHighImpact,  // tags booleanas (Regra dos 2 min, 80/20)
  timeboxMinutes, pomodoroSessionsLogged,
  xpValue, done, doneAt,
  deleted,                  // tombstone real — necessário pra sync propagar exclusão (v0.2+)
  updatedAt }
```

`kanbanWipLimit` fica em `profile` settings (chave solta, não no blob
de perfil) — configurável em Ajustes.

## Modelo de dados — patinho (`STORES.ducks`)

```
{ id, variantId,   // referencia DUCK_VARIANTS em data.js (cor/raridade/acessório)
  name,            // sorteado de DUCK_NAME_POOL
  sourceLabel,     // texto livre: de onde veio ("concluindo \"X\"", "conquistando \"Y\"")
  obtainedAt, updatedAt }
```

Raridade não é um campo próprio — vem sempre de `duckVariant(variantId).rarity`
(`comum`/`incomum`/`raro`), pra não duplicar dado que já está em `data.js`.

## Convenções já em uso (manter)

- **Sem framework, sem build.** JS puro carregado via `document.write`
  com cache-buster `?v=timestamp` em `index.html` (mesmo truque do
  theartistsway) — qualquer arquivo novo em `js/` precisa entrar na
  lista `scripts` em `index.html` **e** na lista `ASSETS` do
  `service-worker.js`, senão fica sem cache-bust ou sem funcionar
  offline.
- **Namespace global por arquivo** (`window.PsyduckDB`,
  `window.PsyduckGamification`, etc.) — sem imports/exports ES module
  (só `theme.js` do theartistsway era module por causa do Fluent UI
  vendorizado; aqui não vendorizamos nada, então nem isso).
- **Toda tarefa carrega `updatedAt`** mesmo sem sync ainda — é o que
  vai permitir o merge por-registro (`mergePerRecord`) funcionar sem
  precisar re-tocar em todo o modelo de dados quando a v0.2 chegar.
- **`deleted` é tombstone, nunca soft-delete escondido do usuário** —
  a UI já filtra `deleted` em `listTasks()`; quando o sync entrar, o
  merge vai precisar comparar esse campo também (diferente do
  theartistsway, que não tem exclusão real em nenhum store).
- **Ação delegada única** (`root.addEventListener("click", ...)` em
  `app.js`) lendo `data-action` — nova tela com botão/link que dispara
  side-effect deve registrar a ação no objeto `actions` (ou `forms`
  pra `<form data-form="...">`), não adicionar listener solto.

## Roadmap (não implementado ainda, na ordem)

- **v0.2.0** — Firestore sync + login Google: **código escrito na
  v0.1.14** (`auth.js`/`sync.js`), fluxo PKCE confirmado batendo no
  Google de verdade via CDP. Falta: (1) cadastrar o redirect URI real
  em "Authorized redirect URIs" no Google Cloud Console (bloqueia o
  login completar — ver entrada v0.1.14 acima), (2) teste manual do
  usuário completando o consentimento de verdade, (3) travar as regras
  de segurança do Firestore (hoje em modo de teste). `mergePerRecord`
  já compara `deleted` além de `updatedAt` (diferença em relação ao
  theartistsway, que não tem exclusão real em nenhum store).
- **v0.3.0** — App UWP nativo (`uwp/PsyduckUWP/`) pra Windows 10 Mobile
  + Windows 11, clonando 1:1 o padrão de `theartistsway/uwp/ArtistWayUWP`:
  `LocalDataStore`, `SyncService`, `AuthService` (Device Grant +
  WebAuthenticationBroker), `NotificationService`
  (`ScheduledToastNotification`), pipeline de CI (`01-generate-cert.yml`
  + workflow de build/publish em `app/`).
- **v0.4.0** — Google Tasks API (scope `tasks`), sync bidirecional.
- **v0.5.0** — Google Calendar API de verdade (scope `calendar.events`,
  não só deep-link como o theartistsway faz).
- **v0.6.0** — Bring! via API não-oficial da comunidade (risco assumido
  — pode quebrar sem aviso).
- **v0.7.0+** — polimento: relatório de Time Auditing com gráfico
  (skill `dataviz`), mais badges, Live Tile no UWP.

**Fora de escopo, decidido com o usuário**: Google Keep (sem API
pública pra conta pessoal).

## Fluxo de push/CI (igual ao combinado no theartistsway)

Depois de cada leva de mudanças validada localmente: commit + push pro
`main` na hora (sem esperar ser cobrado), acompanhar o Actions até o
fim (`gh run list` / `gh run watch`), se falhar ler o log e corrigir
sozinho, e só reportar a versão como "publicada" depois de conferir a
URL do GitHub Pages de verdade.

**Nenhum dado pessoal real (tarefas, rotina, hábitos) entra no
repositório** — isso vive só em IndexedDB local e, a partir da v0.2,
no Firestore por-usuário. Commits e docs de progresso descrevem só o
desenvolvimento do app.
