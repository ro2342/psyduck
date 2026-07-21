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

## Estado atual (v0.1.0)

Só existe o PWA (`www/`), rodando 100% local — **sem sync, sem app
nativo, sem integrações externas ainda**. Ver roadmap completo abaixo.

## Onde ficam as coisas

```
www/
├── index.html, manifest.json, service-worker.js
├── css/style.css      ← visual próprio (mascote, animações), sem lib externa
└── js/
    ├── app.js          ← roteador hash (`route("/...")`) + todas as telas + ações delegadas (data-action)
    ├── data.js         ← UI_STRINGS, METHOD_CONFIGS (os 10 métodos), BADGE_CONFIGS, APP_VERSION
    ├── db.js           ← IndexedDB. STORES: tasks, projects, timeAuditLog, profile, gamification
    ├── gamification.js ← cálculo de XP/nível/sequência, checagem de badge
    ├── mascot.js       ← humor do mascote (SVG desenhado à mão) a partir do estado do app
    ├── methods.js      ← PomodoroTimer, TimeboxTimer, formatCountdown — únicos métodos com estado próprio
    ├── notifications.js ← Notification API best-effort (limitação documentada no README)
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
