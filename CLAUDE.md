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

## Estado atual (v0.1.8)

Só existe o PWA (`www/`), rodando 100% local — **sem sync, sem app
nativo, sem integrações externas ainda**. Ver roadmap completo abaixo.

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

## Onde ficam as coisas

```
www/
├── index.html, manifest.json, service-worker.js
├── css/style.css      ← visual próprio (mascote, animações, janela de pergaminho), sem lib externa
└── js/
    ├── app.js          ← roteador hash (`route("/...")`) + todas as telas + ações delegadas (data-action)
    ├── data.js         ← UI_STRINGS, METHOD_CONFIGS (os 10 métodos), BADGE_CONFIGS, APP_VERSION
    ├── db.js           ← IndexedDB. STORES: tasks, projects, timeAuditLog, profile, gamification, ducks, books, obsidianHandle
    ├── gamification.js ← cálculo de XP/nível/sequência, checagem de badge
    ├── mascot.js       ← mascote/patinhos/cena da fazenda (SVG pixel art desenhado à mão)
    ├── methods.js      ← PomodoroTimer, TimeboxTimer, formatCountdown — únicos métodos com estado próprio
    ├── notifications.js ← Notification API best-effort (limitação documentada no README)
    ├── weather.js      ← card de clima (geolocalização + Open-Meteo, cache 30min)
    ├── obsidian.js     ← ponte com cofre local via File System Access API (só desktop Chrome/Edge)
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

- **v0.2.0** — Firestore sync + login Google (PKCE no PWA — igual
  `theartistsway/www/js/auth.js`/`sync.js`, adaptado pros stores daqui).
  Precisa de projeto GCP/Firebase **próprio do psyduck** (não reusa o
  do theartistsway) — checklist a escrever em `setup-google-cloud.md`
  quando chegar a vez, no mesmo formato de
  `theartistsway/sincronizacao-nuvem-setup.md`. `mergePerRecord`
  precisa comparar `deleted` além de `updatedAt` (diferença importante
  em relação ao theartistsway).
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
