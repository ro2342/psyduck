# Catálogo de funcionalidades — Psyduck

Lista de tudo que foi discutido pro app, organizada por tema. ⭐ marca o
que já está construído na v0.1.0. Sem estrela = decidido, mas ainda não
implementado (tem uma versão-alvo no roadmap do `CLAUDE.md`) ou ainda
em aberto.

## Como ler este documento

Cada item tem:
- **O que é**: de onde a ideia vem (pedido original do usuário, ou um
  dos 10 métodos clássicos de produtividade).
- **Onde entra no app**: tela ou mecanismo concreto.

**Atualização v0.1.9**: o app virou um dashboard de tela única (sem
páginas/bottom-nav — ver `CLAUDE.md`). Vários métodos que tinham tela
própria (Kanban, Eisenhower, Pomodoro, Time-Boxing, Auditoria de Tempo)
viraram controles em miniatura dentro das colunas — as entradas abaixo
descrevem a versão original em tela cheia; onde isso mudou, o texto
"Onde entra no app" foi atualizado, mas o histórico da tela cheia fica
registrado no `CLAUDE.md`.

## 1. Os 10 métodos de produtividade (todos ⭐ na v0.1.0)

### ⭐ Time Blocking
**O que é**: reservar blocos fixos de horário pra tarefas/tipos de
atividade. **Onde entra**: campo `dueAt` da tarefa + a ideia de reservar
horário — sem tela própria, vive dentro de Tarefas.

### ⭐ Técnica Pomodoro
**O que é**: ciclos de foco + pausa cronometrados. **Onde entra**: tela
`#/pomodoro`, `PomodoroTimer` em `methods.js`, XP ao completar um ciclo.

### ⭐ Regra dos 2 Minutos
**O que é**: se leva menos de 2 minutos, faça agora. **Onde entra**:
checkbox `isTwoMinuteTask` na tarefa + filtro em `#/tasks?filter=twoMinute`.

### ⭐ Matriz de Eisenhower
**O que é**: 4 quadrantes por urgência × importância. **Onde entra**:
tela `#/eisenhower`, campo `eisenhowerQuadrant`.

### ⭐ Sistema ABCD–Z
**O que é**: letra de prioridade/dificuldade por tarefa. **Onde entra**:
campo `priorityLetter`, ordenação em `#/tasks?sort=priority`.

### ⭐ Auditoria de Tempo
**O que é**: registrar como o tempo foi gasto, revisar depois de 1-2
semanas. **Onde entra**: tela `#/time-audit`, store `timeAuditLog`.

### ⭐ Método Kanban
**O que é**: quadro A Fazer/Fazendo/Feito com limite de WIP. **Onde
entra**: tela `#/kanban`, campo `kanbanColumn` + `kanbanWipLimit`
configurável em Ajustes.

### ⭐ Time-Boxing
**O que é**: tempo fixo pra uma tarefa chata, para quando acabar.
**Onde entra**: tela `#/timeboxing`, `TimeboxTimer` em `methods.js`.

### ⭐ Regra 1-3-5
**O que é**: 1 tarefa grande + 3 médias + 5 pequenas por dia. **Onde
entra**: tela `#/one-three-five`, campos `oneThreeFiveSlot`/`oneThreeFiveDate`.

### ⭐ Regra 80/20 (Pareto)
**O que é**: focar nos 20% de tarefas que geram 80% do resultado.
**Onde entra**: checkbox `paretoHighImpact`, filtro em `#/tasks?filter=highImpact`.

## 2. Gamificação

### ⭐ XP e nível
**O que é**: pedido do usuário, pra tornar concluir tarefa
recompensador. **Onde entra**: `gamification.js`, XP por tarefa
(pesado por prioridade) e por Pomodoro completo, curva de nível em
`XP_LEVEL_STEP`.

### ⭐ Sequência (streak)
**O que é**: dias seguidos com pelo menos uma conclusão. **Onde
entra**: `updateStreak()` em `gamification.js`, mostrado na Home.

### ⭐ Badges
**O que é**: marcos de progresso (primeira tarefa, 7 dias seguidos,
etc.). **Onde entra**: `BADGE_CONFIGS` em `data.js`, checados a cada
conclusão.

### Mascote com humor reativo
**O que é**: em vez de emoji genérico, um pato desenhado à mão cujo
humor muda com o estado (confuso por padrão, preocupado com tarefa
atrasada, feliz com sequência boa, orgulhoso ao subir de nível). **Onde
entra**: ⭐ `mascot.js`, SVG próprio (evita "cara de app feito por IA").

### ⭐ Família de Psyducks na fazenda (v0.1.1)
**O que é**: pedido do usuário — colecionar patinhos tipo Pokémon,
morando numa fazenda com lago. **Onde entra**: `STORES.ducks`,
`DUCK_VARIANTS`/`DUCK_NAME_POOL` em `data.js`, sorteio ponderado por
raridade em `gamification.js` (20% de chance por tarefa concluída,
garantido em level-up/badge novo), tela `#/farm` com cena do lago
(`renderFarmBackgroundSvg`) e os patos espalhados
(`renderDuckIcon`), modal de celebração ao ganhar um novo.

### Level-up com celebração visual
**O que é**: microanimação/confete ao subir de nível. **Onde entra**:
⭐ versão simples via toast (`flashToast`) na v0.1.0; confete/partícula
mais elaborada fica como polimento de v0.7+.

## 3. Lembretes e contagem regressiva

### ⭐ Contagem regressiva por tarefa
**O que é**: pedido explícito do usuário. **Onde entra**:
`formatCountdown()` em `methods.js`, mostrado em cada linha de tarefa
com `dueAt`.

### ⭐ Lembrete best-effort (Notification API)
**O que é**: aviso na hora marcada (`remindAt`). **Onde entra**:
`notifications.js` — **limitação conhecida**: só dispara com o app
aberto/em foco (documentado no README). Lembrete de verdade (funciona
com o app fechado) é o motivador principal da v0.3 (app UWP nativo).

## 4. Sincronização e nuvem (v0.2+, não implementado ainda)

### Sync com Firestore + login Google
**O que é**: pedido do usuário ("sincronizar absolutamente tudo",
"click to sync"). **Onde entra**: v0.2.0, clonando o padrão REST direto
do theartistsway (`sync.js`/`SyncService.cs`), com tombstone real de
exclusão (diferença necessária vs. o theartistsway).

### App nativo Windows 10 Mobile + Windows 11
**O que é**: pedido explícito do usuário. **Onde entra**: v0.3.0,
`uwp/PsyduckUWP/`, um único binário UWP pros dois sistemas (decidido
com o usuário — não dois apps separados).

## 5. Integrações externas (v0.4+, não implementado ainda)

### Google Tasks
**O que é**: pedido do usuário. **Onde entra**: v0.4.0, scope `tasks`,
sync bidirecional tarefa ↔ Google Tasks.

### Google Calendar (API de verdade)
**O que é**: pedido do usuário — vai além do deep-link que o
theartistsway usa. **Onde entra**: v0.5.0, scope `calendar.events`.

### Bring!
**O que é**: pedido do usuário. **Onde entra**: v0.6.0, via API
não-oficial da comunidade — risco assumido de quebrar sem aviso
(decidido com o usuário).

### ~~Google Keep~~ — fora de escopo
**Por quê**: não existe API pública do Keep pra conta pessoal (só pra
Google Workspace/empresa). Decidido com o usuário: deixar de fora por
enquanto. Se o Google abrir uma API de consumidor no futuro, revisitar.

### ⭐ Obsidian (desktop only) — v0.1.7
**O que é**: pedido do usuário — ler/escrever tarefas (`- [ ]`/`- [x]`)
direto num arquivo `.md` do cofre local. **Onde entra**: seção
"Obsidian" em Ajustes, `www/js/obsidian.js` (File System Access API).
**Limitação real**: só funciona em Chrome/Edge de desktop — sem suporte
em navegador mobile nem no futuro app UWP. Tarefas importadas viram
tarefas normais do Psyduck (aparecem em Tarefas/Kanban/etc. também).

### ⭐ Clima — v0.1.7
**O que é**: pedido do usuário. **Onde entra**: coluna "Clima" no
Início, `www/js/weather.js` — geolocalização do navegador + Open-Meteo
(sem chave de API), sparkline das próximas 12h.

### ⭐ Livros (rastreador de leitura) — v0.1.7
**O que é**: pedido do usuário (reintroduzido depois de ter sido
substituído por "Fazenda" na v0.1.3 — agora as duas colunas coexistem).
**Onde entra**: coluna "Livros" no Início, `STORES.books`, capa buscada
automática via Open Library (sem chave). Hardcover (API mencionada pelo
usuário) fica de fora por enquanto — exige chave/GraphQL.

## 6. Ideias futuras (backlog, sem versão-alvo ainda)

- Relatório visual da Auditoria de Tempo (gráfico de onde o tempo foi,
  via skill `dataviz`).
- Mais badges/marcos de gamificação.
- Live Tile no Windows (`TileService`-like, mesmo padrão que ficou como
  código morto no theartistsway — aqui a ideia é realmente ligar).
- Projetos/categorias com cor própria (o campo `projectId`/`Projects`
  já existe no modelo de dados, mas a tela de gerenciar projetos ainda
  não foi construída).
- Som opcional nas celebrações de conclusão/level-up.
