# Psyduck 🦆

Gerenciador de tarefas pensado pra TDAH, autismo e afantasia. Nada de
lista genérica: os métodos clássicos de produtividade (Pomodoro,
Eisenhower, Kanban, 1-3-5, Time-Boxing, Regra dos 2 Minutos, ABCD–Z,
Auditoria de Tempo, Time Blocking, 80/20) são ferramentas de verdade
dentro do app, com gamificação (XP, nível, sequência, badges), uma
fazenda de Psyducks colecionáveis, rastreador de livros, card de clima
e (no desktop) sincronização com tarefas do Obsidian.

## Estado atual: v0.1.9 — PWA local, dashboard de tela única

Só o PWA existe por enquanto, rodando 100% local (IndexedDB, sem
nuvem). Sync com Google, app nativo pra Windows 10 Mobile/Windows 11 e
integrações (Google Tasks, Google Calendar, Bring!) estão no roadmap —
ver `CLAUDE.md` e `catalogo-funcionalidades.md`.

**A interface é uma tela única, sem menu inferior nem páginas** — cena
da fazenda no topo, e um dashboard de 7 colunas de madeira embaixo
(Moedas, Lembretes, Tarefas, Fazenda, Livros, Clima, Destaque) sempre
visíveis ao mesmo tempo. Kanban/Eisenhower/Pomodoro/Time-Boxing/
Auditoria de Tempo viram controles em miniatura dentro das colunas, não
telas próprias. Único modal é o de Ajustes (ícone ⚙️ na cena). Ver
"Arquitetura de tela única" em `CLAUDE.md` pro detalhe completo.

**Obsidian só funciona no Chrome/Edge de computador** — o navegador do
celular (e o futuro app Windows Mobile) não suportam acesso a pastas
locais (File System Access API).

## Rodar localmente

```
npx serve www
```

Abra o endereço que aparecer (geralmente `http://localhost:3000`).

## Estrutura

```
www/
├── index.html, manifest.json, service-worker.js
├── css/style.css
└── js/
    ├── app.js            — dashboard de tela única (sem rotas): cena + 7 colunas + modal de Ajustes
    ├── data.js           — textos de interface + config dos 10 métodos + badges
    ├── db.js              — IndexedDB (tarefas, projetos, auditoria de tempo, perfil, gamificação, patos, livros)
    ├── gamification.js   — XP, nível, sequência, moedas, badges
    ├── mascot.js          — cena da fazenda + mascote + patos (sempre visíveis, não uma tela à parte)
    ├── methods.js        — timer de foco embutido (5/10/15/20min), contagem regressiva
    ├── notifications.js  — lembretes via Notification API (best-effort — ver limitação abaixo)
    ├── weather.js        — card de clima (geolocalização + Open-Meteo)
    ├── obsidian.js       — sync com cofre local do Obsidian (só desktop Chrome/Edge)
    └── theme.js          — tema claro/escuro/automático + cor de destaque
```

## Por que os lembretes não são 100% confiáveis ainda

A Notification API do navegador só dispara enquanto o app está aberto
ou em foco — não existe "lembrete de verdade" (que funciona com o app
fechado) só com PWA puro. Isso é resolvido a partir da v0.3, quando o
app nativo Windows (UWP) entrar com notificação agendada de verdade.
Até lá, a contagem regressiva visual na tela é o reforço principal.
