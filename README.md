# Psyduck 🦆

Gerenciador de tarefas pensado pra TDAH, autismo e afantasia. Nada de
lista genérica: os métodos clássicos de produtividade (Pomodoro,
Eisenhower, Kanban, 1-3-5, Time-Boxing, Regra dos 2 Minutos, ABCD–Z,
Auditoria de Tempo, Time Blocking, 80/20) são ferramentas de verdade
dentro do app, com gamificação (XP, nível, sequência, badges) e um
mascote que reage ao seu progresso.

## Estado atual: v0.1.0 — PWA local

Só o PWA existe por enquanto, rodando 100% local (IndexedDB, sem
nuvem). Sync com Google, app nativo pra Windows 10 Mobile/Windows 11 e
integrações (Google Tasks, Google Calendar, Bring!) estão no roadmap —
ver `CLAUDE.md` e `catalogo-funcionalidades.md`.

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
    ├── app.js            — roteador + todas as telas
    ├── data.js           — textos de interface + config dos 10 métodos + badges
    ├── db.js              — IndexedDB (tarefas, projetos, auditoria de tempo, perfil, gamificação)
    ├── gamification.js   — XP, nível, sequência, badges
    ├── mascot.js          — o pato reage ao seu estado
    ├── methods.js        — timers de Pomodoro e Time-Boxing, contagem regressiva
    ├── notifications.js  — lembretes via Notification API (best-effort — ver limitação abaixo)
    └── theme.js          — tema claro/escuro/automático + cor de destaque
```

## Por que os lembretes não são 100% confiáveis ainda

A Notification API do navegador só dispara enquanto o app está aberto
ou em foco — não existe "lembrete de verdade" (que funciona com o app
fechado) só com PWA puro. Isso é resolvido a partir da v0.3, quando o
app nativo Windows (UWP) entrar com notificação agendada de verdade.
Até lá, a contagem regressiva visual na tela é o reforço principal.
