// app.js — roteador hash + todas as telas. Sem framework/build, DOM via
// template strings + um único listener delegado em #app (data-action).

const routes = {};
function route(path, handler) {
  routes[path] = handler;
}

const root = document.getElementById("app");
let currentPomodoro = null;
let currentTimebox = null;

function parseHash() {
  const raw = window.location.hash.slice(1) || "/home";
  const [path, queryString] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryString || ""));
  return { path: path || "/home", query };
}

async function render() {
  const { path, query } = parseHash();
  const handler = routes[path] || routes["/home"];
  const body = await handler(query);
  // A cena (pato + fazenda) é fixa em TODA tela, não só Início/Fazenda —
  // é o "seu bichinho sempre visível", só o painel debaixo muda. Fica
  // fora de .content (largura máxima) pra ocupar a tela inteira.
  const scene = await renderTopScene(path);
  root.innerHTML = shell(path, body, scene);
  window.scrollTo(0, 0);
}

// Cena persistente: a versão compacta (mascote + contador de patos) em
// quase toda tela; na Fazenda mesmo, vira a versão grande com os patos
// espalhados no lago (clicáveis) — nunca as duas ao mesmo tempo.
async function renderTopScene(path) {
  const db = window.PsyduckDB;
  const ducks = await db.listDucks();

  if (path === "/farm") {
    return `
      <section class="farm-scene-wrap">
        ${window.PsyduckMascot.renderFarmBackgroundSvg()}
        <div class="farm-ducks">${renderFarmDuckButtons(ducks)}</div>
      </section>
    `;
  }

  const tasks = await db.listTasks();
  const overdue = tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt) < new Date());
  const state = await db.getGamificationState();
  const mood = window.PsyduckMascot.moodFor({ overdueCount: overdue.length, streak: state.streak, justLeveledUp: false });

  return `
    <section class="scene-hero">
      ${window.PsyduckMascot.renderFarmBackgroundSvg()}
      <div class="scene-foreground">
        <div class="mascot-wrap">${window.PsyduckMascot.renderMascotSvg(mood)}</div>
        <span class="scene-mood-badge">${window.PsyduckMascot.MOOD_LABELS[mood]}</span>
        ${ducks.length ? `<a href="#/farm" class="scene-duck-count">🦆 +${ducks.length}</a>` : ""}
      </div>
    </section>
  `;
}

function hashPos(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { left: 8 + (h % 84), top: 48 + ((h >> 8) % 42), delay: (h % 30) / 10 };
}

function renderFarmDuckButtons(ducks) {
  if (!ducks.length) return `<p class="farm-empty">Ainda sem patinhos — conclua tarefas pra começar a família.</p>`;
  return ducks
    .map((d) => {
      const pos = hashPos(d.id);
      return `<button class="farm-duck" data-action="show-duck" data-id="${d.id}" style="left:${pos.left}%; top:${pos.top}%; animation-delay:${pos.delay}s;">${window.PsyduckMascot.renderDuckIcon(d.variantId, { size: 64 })}</button>`;
    })
    .join("");
}

const BOTTOM_NAV_ICONS = { "/home": "🏠", "/tasks": "📋", "/farm": "🦆", "/methods": "🧭", "/settings": "⚙️" };

function shell(activePath, content, scene) {
  const S = window.PsyduckData.UI_STRINGS;
  const nav = [
    ["/home", S.nav.home],
    ["/tasks", S.nav.tasks],
    ["/farm", S.nav.farm],
    ["/methods", S.nav.methods],
    ["/settings", S.nav.settings],
  ];
  // Telas que não têm aba própria (Kanban, Eisenhower, Pomodoro, etc.)
  // continuam acessíveis por link a partir de Tarefas/Métodos — a barra
  // de baixo fica só com os 5 destinos principais, tipo apps de bichinho
  // (Finch/Habitica), não um menu-hambúrguer de dashboard.
  const bottomNavActive = nav.some(([path]) => path === activePath) ? activePath : null;

  return `
    <main class="page">
      ${scene || ""}
      <div class="content">${content}</div>
    </main>
    <nav class="bottom-nav">
      ${nav
        .map(
          ([path, label]) => `
        <a href="#${path}" class="bottom-nav-item ${bottomNavActive === path ? "active" : ""}">
          <span class="bottom-nav-icon">${BOTTOM_NAV_ICONS[path]}</span>
          <span class="bottom-nav-label">${label}</span>
        </a>`
        )
        .join("")}
    </nav>
  `;
}

// ---------- ações delegadas ----------

const actions = {
  async "task-toggle"(el) {
    const task = await window.PsyduckDB.toggleTaskDone(el.dataset.id);
    if (task && task.done) await celebrateCompletion(task);
    if (task && task.obsidianFile) {
      window.PsyduckObsidian.writeTaskToggle(task).catch((err) => console.warn("Falha ao escrever no Obsidian:", err));
    }
    render();
  },
  async "task-delete"(el) {
    if (!confirm("Excluir essa tarefa?")) return;
    await window.PsyduckDB.deleteTask(el.dataset.id);
    render();
  },
  async "kanban-move"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    if (el.dataset.to === "doing") {
      const all = await window.PsyduckDB.listTasks();
      const doingCount = all.filter((t) => t.kanbanColumn === "doing" && !t.done).length;
      const wip = Number((await window.PsyduckDB.getSetting("kanbanWipLimit", 3)) || 3);
      if (doingCount >= wip) {
        alert(`Limite de "Fazendo" é ${wip}. Termine algo antes de começar mais uma coisa.`);
        return;
      }
    }
    task.kanbanColumn = el.dataset.to;
    if (el.dataset.to === "done") {
      task.done = true;
      task.doneAt = new Date().toISOString();
    }
    await window.PsyduckDB.saveTask(task);
    if (el.dataset.to === "done") await celebrateCompletion(task);
    render();
  },
  async "book-advance"(el) {
    const book = await window.PsyduckDB.advanceBookChapter(el.dataset.id);
    if (book) {
      const result = await window.PsyduckGamification.onTaskCompleted(10, "capítulo de " + book.title);
      flashToast(result.leveledUp ? `Subiu pro nível ${result.state.level}! 🎉` : `+10 XP — capítulo ${book.currentChapter}`);
      if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
    }
    render();
  },
  async "obsidian-connect"() {
    try {
      await window.PsyduckObsidian.connectVault();
      flashToast("Cofre conectado! Escolha o arquivo de tarefas.");
    } catch (err) {
      flashToast("Conexão cancelada.");
    }
    render();
  },
  async "obsidian-sync-now"() {
    const fileName = await window.PsyduckDB.getSetting("obsidianTaskFile", null);
    if (!fileName) return;
    try {
      const count = await window.PsyduckObsidian.syncFromFile(fileName);
      flashToast(`${count} tarefa(s) sincronizada(s) do Obsidian.`);
    } catch (err) {
      flashToast("Falha ao sincronizar: " + err.message);
    }
    render();
  },
  async "eisenhower-set"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.eisenhowerQuadrant = el.dataset.quadrant;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "otf-set"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.oneThreeFiveSlot = el.dataset.slot || null;
    task.oneThreeFiveDate = el.dataset.slot ? todayKey() : null;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  "pomodoro-start": () => {
    currentPomodoro && currentPomodoro.start();
    render();
  },
  "pomodoro-pause": () => {
    currentPomodoro && currentPomodoro.pause();
    render();
  },
  "pomodoro-reset": () => {
    currentPomodoro && currentPomodoro.reset();
    render();
  },
  "timebox-start": () => currentTimebox && currentTimebox.start(),
  "timebox-pause": () => currentTimebox && currentTimebox.pause(),
  async "set-mood"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.reflectionMood = el.dataset.mood;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "show-duck"(el) {
    const duck = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.ducks, el.dataset.id);
    if (duck) showDuckModal(duck, { justHatched: false });
  },
  "close-duck-modal": (el) => {
    const overlay = el.closest(".duck-modal-overlay");
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 250);
    render();
  },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function celebrateCompletion(task) {
  const result = await window.PsyduckGamification.onTaskCompleted(task.xpValue, task.title);
  window.PsyduckNotifications.notifyNow("Boa!", `"${task.title}" concluída. +${task.xpValue} XP`);
  flashToast(
    result.leveledUp
      ? `Subiu pro nível ${result.state.level}! 🎉`
      : `+${task.xpValue} XP — sequência de ${result.state.streak} dia(s)`
  );
  if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
}

function flashToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function showDuckModal(duck, { justHatched = false } = {}) {
  const variant = window.PsyduckMascot.duckVariant(duck.variantId);
  const overlay = document.createElement("div");
  overlay.className = "duck-modal-overlay";
  overlay.innerHTML = `
    <div class="duck-modal">
      ${justHatched ? `<p class="duck-modal-kicker">Chocou um novo patinho! 🐣</p>` : ""}
      <div class="duck-modal-art">${window.PsyduckMascot.renderDuckIcon(duck.variantId, { size: 160 })}</div>
      <h2>${escapeHtml(duck.name)}</h2>
      <p class="chip rarity-${variant.rarity}">${variant.label} · ${variant.rarity}</p>
      <p class="hint">Ganhou de ${escapeHtml(duck.sourceLabel || "uma conquista")}.</p>
      <button class="btn btn-primary" data-action="close-duck-modal">Levar pra fazenda</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
}

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) handler(el);
});

root.addEventListener("submit", (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const handler = forms[form.dataset.form];
  if (handler) handler(form);
});

const forms = {
  async "new-task"(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.title || !data.title.trim()) return;
    await window.PsyduckDB.saveTask({
      title: data.title.trim(),
      notes: data.notes || "",
      dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : null,
      remindAt: data.remindAt ? new Date(data.remindAt).toISOString() : null,
      priorityLetter: data.priorityLetter || null,
      isTwoMinuteTask: data.isTwoMinuteTask === "on",
      paretoHighImpact: data.paretoHighImpact === "on",
      xpValue: data.priorityLetter === "A" ? 20 : data.priorityLetter === "B" ? 15 : 10,
    });
    await window.PsyduckNotifications.rescheduleAllFromTasks();
    window.location.hash = "#/tasks";
    render();
  },
  async "new-book"(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.title || !data.title.trim()) return;
    let coverUrl = null;
    try {
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(data.title)}&limit=1`;
      const res = await fetch(searchUrl);
      const json = await res.json();
      const coverId = json.docs && json.docs[0] && json.docs[0].cover_i;
      if (coverId) coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`;
    } catch (err) {
      console.warn("Busca de capa falhou (Open Library):", err);
    }
    await window.PsyduckDB.saveBook({ title: data.title.trim(), author: data.author || "", coverUrl });
    render();
  },
  async "time-audit-entry"(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.activity || !data.minutes) return;
    await window.PsyduckDB.addTimeAuditEntry(data.activity, Number(data.minutes));
    render();
  },
  async "timebox-setup"(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const minutes = Number(data.minutes) || 10;
    currentTimebox = new window.PsyduckMethods.TimeboxTimer({
      minutes,
      onTick: (ms) => updateTimeboxDisplay(ms),
      onComplete: () => {
        window.PsyduckNotifications.notifyNow("Tempo esgotado!", `Os ${minutes} minutos acabaram.`);
        flashToast("Time-box concluído — pausa ou próxima tarefa?");
      },
    });
    render();
  },
};

function updateTimeboxDisplay(ms) {
  const el = document.getElementById("timeboxDisplay");
  if (el) el.textContent = formatMs(ms);
}

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------- telas ----------

route("/home", async () => {
  const db = window.PsyduckDB;
  const tasks = await db.listTasks();
  const pending = tasks.filter((t) => !t.done);
  const state = await db.getGamificationState();
  const ducks = await db.listDucks();
  const books = await db.listBooks();
  const today = todayKey();
  const featured = await pickFeaturedTask(tasks, today);

  return `
    <div class="dash-board">
      ${renderCoinsColumn(state)}
      ${renderRemindersColumn(pending)}
      ${renderTarefasColumn(pending)}
      ${renderFazendaColumn(ducks)}
      ${renderLivrosColumn(books)}
      ${await window.PsyduckWeather.renderWeatherColumn()}
      ${renderDestaqueColumn(featured)}
    </div>
  `;
});

function renderLivrosColumn(books) {
  return `
    <section class="dash-col">
      <h3>Livros</h3>
      ${books
        .map(
          (b) => `
        <div class="book-card">
          ${b.coverUrl ? `<img class="book-cover" src="${b.coverUrl}" alt="" />` : `<div class="book-cover book-cover-placeholder">📕</div>`}
          <div class="book-info">
            <span class="book-title">${escapeHtml(b.title)}</span>
            <span class="hint">Cap. ${b.currentChapter || 0}</span>
            <button class="btn-mini" data-action="book-advance" data-id="${b.id}">Completar +10</button>
          </div>
        </div>`
        )
        .join("") || `<p class="empty">Nenhum livro ainda.</p>`}
      <details>
        <summary class="dash-see-all">+ adicionar livro</summary>
        <form data-form="new-book" class="stack">
          <input name="title" placeholder="Título do livro" required />
          <input name="author" placeholder="Autor (opcional)" />
          <button class="btn btn-primary" type="submit">Adicionar</button>
        </form>
      </details>
    </section>
  `;
}

// A tarefa "Destaque" fica fixada pro dia inteiro assim que escolhida
// (mesmo depois de concluída, pra dar tempo do usuário registrar o
// humor) — sem isso, marcar como feita faria o card sumir na hora,
// escondendo o check-in de humor antes de aparecer.
async function pickFeaturedTask(tasks, today) {
  const db = window.PsyduckDB;
  const pinnedId = await db.getSetting("featuredTaskId", null);
  const pinnedDate = await db.getSetting("featuredTaskDate", null);
  if (pinnedDate === today && pinnedId) {
    const pinned = tasks.find((t) => t.id === pinnedId);
    if (pinned) return pinned;
  }
  const candidate =
    tasks.find((t) => !t.done && t.oneThreeFiveSlot === "big" && t.oneThreeFiveDate === today) ||
    tasks.find((t) => !t.done && t.priorityLetter === "A") ||
    null;
  if (candidate) {
    await db.setSetting("featuredTaskId", candidate.id);
    await db.setSetting("featuredTaskDate", today);
  }
  return candidate;
}

function renderCoinsColumn(state) {
  const xpStep = window.PsyduckData.XP_LEVEL_STEP;
  const xpInLevel = window.PsyduckGamification.xpIntoCurrentLevel(state.xp);
  const coins = Math.floor(state.xp / 10);
  const coinRows = [];
  for (let i = 0; i < coins; i += 5) {
    coinRows.push(`<div class="coin-row">${"🟤".repeat(Math.min(5, coins - i))}</div>`);
  }
  return `
    <section class="dash-col dash-coins">
      <h3>Moedas</h3>
      <p class="dash-level">Nível ${state.level}</p>
      <div class="xp-bar"><div class="xp-fill" style="width:${(xpInLevel / xpStep) * 100}%"></div></div>
      <div class="coin-stack">${coinRows.join("") || `<p class="empty">Sem moedas ainda</p>`}</div>
      <p class="dash-streak">🔥 ${state.streak} dia(s)</p>
    </section>
  `;
}

function renderRemindersColumn(pending) {
  const withReminders = pending
    .filter((t) => t.remindAt || t.dueAt)
    .sort((a, b) => new Date(a.remindAt || a.dueAt) - new Date(b.remindAt || b.dueAt))
    .slice(0, 5);
  const stars = { A: "★★★", B: "★★", C: "★", D: "★" };
  return `
    <section class="dash-col">
      <h3>Lembretes</h3>
      ${
        withReminders
          .map(
            (t) => `
        <div class="mini-task-card">
          <span class="mini-icon">${escapeHtml((t.title[0] || "?").toUpperCase())}</span>
          <span class="mini-title">${escapeHtml(t.title)}</span>
          <span class="mini-stars">${stars[t.priorityLetter] || ""}</span>
        </div>`
          )
          .join("") || `<p class="empty">Nada marcado.</p>`
      }
    </section>
  `;
}

function renderTarefasColumn(pending) {
  const list = pending.slice(0, 8);
  return `
    <section class="dash-col">
      <h3>Tarefas</h3>
      ${
        list
          .map(
            (t) => `
        <label class="mini-check-row">
          <input type="checkbox" data-action="task-toggle" data-id="${t.id}" />
          <span>${escapeHtml(t.title)}</span>
        </label>`
          )
          .join("") || `<p class="empty">Tudo em dia!</p>`
      }
      <a href="#/tasks" class="dash-see-all">ver todas →</a>
    </section>
  `;
}

function renderFazendaColumn(ducks) {
  const preview = ducks.slice(-3);
  return `
    <section class="dash-col dash-farm">
      <h3>Fazenda</h3>
      <div class="dash-farm-preview">
        ${preview.map((d) => window.PsyduckMascot.renderDuckIcon(d.variantId, { size: 48 })).join("") || `<p class="empty">Sem patos ainda</p>`}
      </div>
      <p class="dash-farm-count">${ducks.length} na família</p>
      <a href="#/farm" class="dash-see-all">ver fazenda →</a>
    </section>
  `;
}

function renderDestaqueColumn(featured) {
  if (!featured) {
    return `
      <section class="dash-col dash-featured">
        <h3>Destaque</h3>
        <p class="empty">Nenhuma tarefa em destaque. Marque uma como prioridade A ou escolha a "1 grande" do dia.</p>
        <a href="#/one-three-five" class="dash-see-all">montar o dia →</a>
      </section>
    `;
  }

  const moods = [
    ["bad", "😞", "Ruim"],
    ["ok", "😐", "Ok"],
    ["good", "🙂", "Bom"],
    ["great", "🤩", "Muito bom"],
  ];

  return `
    <section class="dash-col dash-featured">
      <h3>Destaque</h3>
      <div class="featured-card">
        <label class="featured-check-row">
          <input type="checkbox" data-action="task-toggle" data-id="${featured.id}" ${featured.done ? "checked" : ""} />
          <span class="featured-title">${escapeHtml(featured.title)}</span>
        </label>
        ${featured.notes ? `<p class="featured-notes">${escapeHtml(featured.notes)}</p>` : ""}
        ${
          featured.done
            ? `
          <p class="hint">Como foi?</p>
          <div class="mood-picker">
            ${moods
              .map(
                ([id, icon, label]) => `
              <button class="mood-btn ${featured.reflectionMood === id ? "selected" : ""}" data-action="set-mood" data-id="${featured.id}" data-mood="${id}">
                <span>${icon}</span><span class="mood-label">${label}</span>
              </button>`
              )
              .join("")}
          </div>
          <textarea class="reflection-note" placeholder="Como foi? (opcional)" data-id="${featured.id}" onblur="window.PsyduckApp.saveReflectionNote(this)">${escapeHtml(featured.reflectionNote || "")}</textarea>
        `
            : ""
        }
      </div>
    </section>
  `;
}

function taskRow(t) {
  const countdown = t.dueAt ? window.PsyduckMethods.formatCountdown(t.dueAt) : null;
  return `
    <div class="task-row ${t.done ? "done" : ""}">
      <button class="check" data-action="task-toggle" data-id="${t.id}" aria-label="Concluir">${t.done ? "✓" : ""}</button>
      <div class="task-body">
        <span class="task-title">${escapeHtml(t.title)}</span>
        <span class="task-meta">
          ${t.priorityLetter ? `<span class="chip">${t.priorityLetter}</span>` : ""}
          ${countdown ? `<span class="chip ${countdown.overdue ? "chip-warn" : ""}">${countdown.text}</span>` : ""}
        </span>
      </div>
      <button class="icon-btn" data-action="task-delete" data-id="${t.id}" aria-label="Excluir">🗑</button>
    </div>`;
}

async function saveReflectionNote(textarea) {
  const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, textarea.dataset.id);
  if (!task) return;
  task.reflectionNote = textarea.value;
  await window.PsyduckDB.saveTask(task);
}

// Botão "Forçar atualização" em Ajustes — remove o Service Worker e
// todo o cache dele, depois recarrega. É o jeito garantido de sair de
// uma versão travada em cache (recarregar sozinho nem sempre basta,
// porque o navegador pode continuar sendo controlado pelo SW antigo).
async function forceUpdate() {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  window.location.reload();
}

async function chooseObsidianFile(fileName) {
  await window.PsyduckDB.setSetting("obsidianTaskFile", fileName || null);
  if (fileName) {
    try {
      const count = await window.PsyduckObsidian.syncFromFile(fileName);
      flashToast(`${count} tarefa(s) sincronizada(s) do Obsidian.`);
    } catch (err) {
      flashToast("Falha ao sincronizar: " + err.message);
    }
  }
  render();
}

window.PsyduckApp = { saveReflectionNote, forceUpdate, chooseObsidianFile };

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

route("/farm", async () => {
  const db = window.PsyduckDB;
  const ducks = await db.listDucks();

  return `
    <h1>Fazenda dos Psyducks</h1>
    <p class="hint">Cada tarefa concluída tem uma chance de chocar um novo Psyduck. Subir de nível garante um. Toque num pato lá em cima pra ver quem é.</p>
    <section class="panel">
      <h2>Família (${ducks.length})</h2>
      ${ducks
        .slice()
        .reverse()
        .map((d) => {
          const v = window.PsyduckMascot.duckVariant(d.variantId);
          return `<div class="task-row">
            ${window.PsyduckMascot.renderDuckIcon(d.variantId, { size: 40 })}
            <div class="task-body">
              <span class="task-title">${escapeHtml(d.name)}</span>
              <span class="task-meta"><span class="chip rarity-${v.rarity}">${v.label}</span></span>
            </div>
          </div>`;
        })
        .join("") || `<p class="empty">Vazio por enquanto.</p>`}
    </section>
  `;
});

route("/tasks", async (query) => {
  const db = window.PsyduckDB;
  let tasks = await db.listTasks();
  tasks = tasks.filter((t) => !t.done);

  if (query.filter === "twoMinute") tasks = tasks.filter((t) => t.isTwoMinuteTask);
  if (query.filter === "highImpact") tasks = tasks.filter((t) => t.paretoHighImpact);
  if (query.sort === "priority") {
    const order = { A: 0, B: 1, C: 2, D: 3 };
    tasks.sort((a, b) => (order[a.priorityLetter] ?? 9) - (order[b.priorityLetter] ?? 9));
  }

  return `
    <h1>Tarefas</h1>
    <div class="filter-row quick-tools">
      <a href="#/kanban" class="chip-link">🗂 Kanban</a>
      <a href="#/eisenhower" class="chip-link">🎯 Eisenhower</a>
      <a href="#/one-three-five" class="chip-link">📌 1-3-5</a>
      <a href="#/pomodoro" class="chip-link">⏱ Pomodoro</a>
      <a href="#/timeboxing" class="chip-link">⏳ Time-Boxing</a>
      <a href="#/time-audit" class="chip-link">📊 Auditoria</a>
    </div>
    <details class="panel" ${tasks.length === 0 ? "open" : ""}>
      <summary>+ Nova tarefa</summary>
      <form data-form="new-task" class="stack">
        <input name="title" placeholder="O que precisa ser feito?" required autofocus />
        <textarea name="notes" placeholder="Notas (opcional)"></textarea>
        <label class="field">Prazo <input type="datetime-local" name="dueAt" /></label>
        <label class="field">Lembrete <input type="datetime-local" name="remindAt" /></label>
        <label class="field">Prioridade (ABCD–Z)
          <select name="priorityLetter">
            <option value="">—</option>
            <option value="A">A — maior prioridade</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D — menor prioridade</option>
          </select>
        </label>
        <label class="checkbox"><input type="checkbox" name="isTwoMinuteTask" /> Leva menos de 2 minutos</label>
        <label class="checkbox"><input type="checkbox" name="paretoHighImpact" /> É um dos 20% que fazem a diferença (80/20)</label>
        <button class="btn btn-primary" type="submit">Adicionar</button>
      </form>
    </details>

    <div class="filter-row">
      <a href="#/tasks" class="chip-link ${!query.filter && !query.sort ? "active" : ""}">Todas</a>
      <a href="#/tasks?filter=twoMinute" class="chip-link ${query.filter === "twoMinute" ? "active" : ""}">2 minutos</a>
      <a href="#/tasks?filter=highImpact" class="chip-link ${query.filter === "highImpact" ? "active" : ""}">80/20</a>
      <a href="#/tasks?sort=priority" class="chip-link ${query.sort === "priority" ? "active" : ""}">Por prioridade</a>
    </div>

    <section class="panel">
      ${tasks.length ? tasks.map(taskRow).join("") : `<p class="empty">Nada por aqui. Boa!</p>`}
    </section>
  `;
});

route("/kanban", async () => {
  const db = window.PsyduckDB;
  const tasks = (await db.listTasks()).filter((t) => !t.done);
  const wip = Number((await db.getSetting("kanbanWipLimit", 3)) || 3);
  const columns = [
    ["todo", "A Fazer"],
    ["doing", "Fazendo"],
    ["done", "Feito"],
  ];
  const byColumn = (col) => tasks.filter((t) => (t.kanbanColumn || "todo") === col);

  return `
    <h1>Kanban</h1>
    <p class="hint">Limite de "Fazendo": ${wip} tarefa(s) por vez, pra não se sobrecarregar.</p>
    <div class="kanban-board">
      ${columns
        .map(
          ([col, label]) => `
        <div class="kanban-column">
          <h2>${label} <span class="count">${byColumn(col).length}</span></h2>
          ${byColumn(col)
            .map(
              (t) => `
            <div class="kanban-card">
              <span>${escapeHtml(t.title)}</span>
              <div class="kanban-actions">
                ${col !== "todo" ? `<button data-action="kanban-move" data-id="${t.id}" data-to="todo">←</button>` : ""}
                ${col !== "doing" ? `<button data-action="kanban-move" data-id="${t.id}" data-to="doing">${col === "todo" ? "→" : "←"}</button>` : ""}
                ${col !== "done" ? `<button data-action="kanban-move" data-id="${t.id}" data-to="done">→</button>` : ""}
              </div>
            </div>`
            )
            .join("") || `<p class="empty">Vazio</p>`}
        </div>`
        )
        .join("")}
    </div>
  `;
});

route("/eisenhower", async () => {
  const db = window.PsyduckDB;
  const tasks = (await db.listTasks()).filter((t) => !t.done);
  const quadrants = [
    ["urgent-important", "Urgente + Importante", "Faça agora"],
    ["not-urgent-important", "Importante, não urgente", "Decida quando fazer"],
    ["urgent-not-important", "Urgente, não importante", "Delegue"],
    ["neither", "Nem urgente, nem importante", "Faça depois"],
  ];
  const unassigned = tasks.filter((t) => !t.eisenhowerQuadrant);

  return `
    <h1>Matriz de Eisenhower</h1>
    ${unassigned.length ? `<section class="panel">
      <h2>Sem quadrante ainda</h2>
      ${unassigned
        .map(
          (t) => `<div class="task-row"><span class="task-title">${escapeHtml(t.title)}</span>
        <div class="quadrant-pick">
          ${quadrants.map(([id, label]) => `<button data-action="eisenhower-set" data-id="${t.id}" data-quadrant="${id}">${label}</button>`).join("")}
        </div>
      </div>`
        )
        .join("")}
    </section>` : ""}
    <div class="eisenhower-grid">
      ${quadrants
        .map(
          ([id, label, sub]) => `
        <div class="eisenhower-quadrant q-${id}">
          <h3>${label}</h3>
          <p class="hint">${sub}</p>
          ${tasks
            .filter((t) => t.eisenhowerQuadrant === id)
            .map((t) => `<div class="mini-card">${escapeHtml(t.title)}</div>`)
            .join("") || `<p class="empty">—</p>`}
        </div>`
        )
        .join("")}
    </div>
  `;
});

route("/one-three-five", async () => {
  const db = window.PsyduckDB;
  const today = todayKey();
  const tasks = (await db.listTasks()).filter((t) => !t.done);
  const slots = [
    ["big", "1 grande", 1],
    ["medium", "3 médias", 3],
    ["small", "5 pequenas", 5],
  ];
  const inSlot = (slot) => tasks.filter((t) => t.oneThreeFiveSlot === slot && t.oneThreeFiveDate === today);
  const unassigned = tasks.filter((t) => !(t.oneThreeFiveSlot && t.oneThreeFiveDate === today));

  return `
    <h1>Regra 1-3-5</h1>
    <p class="hint">Escolha 1 tarefa grande, 3 médias e 5 pequenas pra hoje. Só isso.</p>
    ${slots
      .map(
        ([slot, label, max]) => `
      <section class="panel">
        <h2>${label} <span class="count">${inSlot(slot).length}/${max}</span></h2>
        ${inSlot(slot)
          .map(
            (t) => `<div class="task-row"><span class="task-title">${escapeHtml(t.title)}</span>
          <button class="icon-btn" data-action="otf-set" data-id="${t.id}" data-slot="">✕</button></div>`
          )
          .join("") || `<p class="empty">Vazio</p>`}
      </section>`
      )
      .join("")}
    <section class="panel">
      <h2>Escolher de: tarefas sem slot hoje</h2>
      ${unassigned
        .map(
          (t) => `<div class="task-row"><span class="task-title">${escapeHtml(t.title)}</span>
        <div class="quadrant-pick">
          ${slots.map(([slot, label]) => `<button data-action="otf-set" data-id="${t.id}" data-slot="${slot}">${label}</button>`).join("")}
        </div></div>`
        )
        .join("") || `<p class="empty">Nada sobrando — ou crie uma tarefa nova.</p>`}
    </section>
  `;
});

route("/pomodoro", async () => {
  if (!currentPomodoro) {
    currentPomodoro = new window.PsyduckMethods.PomodoroTimer({
      onTick: () => render(),
      onPhaseComplete: async (finished) => {
        if (finished === "work") {
          const result = await window.PsyduckGamification.onPomodoroCompleted();
          window.PsyduckNotifications.notifyNow("Pomodoro concluído!", "Hora da pausa.");
          flashToast(result.leveledUp ? `Subiu pro nível ${result.state.level}! 🎉` : "+15 XP — pausa merecida");
          if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
        } else {
          window.PsyduckNotifications.notifyNow("Pausa acabou", "De volta ao trabalho, no seu ritmo.");
        }
      },
    });
  }
  const p = currentPomodoro;
  const phaseLabel = { work: "Foco", break: "Pausa", longBreak: "Pausa longa" }[p.phase];

  return `
    <h1>Pomodoro</h1>
    <section class="panel timer-panel">
      <span class="phase-label">${phaseLabel}</span>
      <span class="timer-display">${formatMs(p.remainingMs)}</span>
      <div class="timer-controls">
        ${p.running
          ? `<button class="btn" data-action="pomodoro-pause">Pausar</button>`
          : `<button class="btn btn-primary" data-action="pomodoro-start">Começar</button>`}
        <button class="btn" data-action="pomodoro-reset">Reiniciar</button>
      </div>
      <p class="hint">Ciclos completos: ${p.cycleCount}</p>
    </section>
  `;
});

route("/timeboxing", async () => {
  return `
    <h1>Time-Boxing</h1>
    <p class="hint">Dê um tempo fixo pra uma tarefa chata. Quando o tempo acabar, para — mesmo que não tenha terminado.</p>
    <section class="panel">
      <form data-form="timebox-setup" class="stack">
        <label class="field">Minutos <input type="number" name="minutes" value="10" min="1" max="120" /></label>
        <button class="btn btn-primary" type="submit">Definir</button>
      </form>
    </section>
    ${currentTimebox
      ? `<section class="panel timer-panel">
          <span class="timer-display" id="timeboxDisplay">${formatMs(currentTimebox.remainingMs)}</span>
          <div class="timer-controls">
            <button class="btn btn-primary" data-action="timebox-start">Começar</button>
            <button class="btn" data-action="timebox-pause">Pausar</button>
          </div>
        </section>`
      : ""}
  `;
});

route("/time-audit", async () => {
  const db = window.PsyduckDB;
  const entries = await db.listTimeAuditLog();
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return `
    <h1>Auditoria de Tempo</h1>
    <p class="hint">Registre como o tempo foi gasto. Depois de 1-2 semanas, revise pra reorganizar prioridades de verdade.</p>
    <section class="panel">
      <form data-form="time-audit-entry" class="stack">
        <input name="activity" placeholder="O que você fez?" required />
        <label class="field">Minutos <input type="number" name="minutes" min="1" required /></label>
        <button class="btn btn-primary" type="submit">Registrar</button>
      </form>
    </section>
    <section class="panel">
      <h2>Total registrado: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min</h2>
      ${entries
        .map(
          (e) => `<div class="task-row"><span class="task-title">${escapeHtml(e.activity)}</span>
        <span class="chip">${e.minutes}min</span>
        <span class="task-meta">${new Date(e.loggedAt).toLocaleString("pt-BR")}</span></div>`
        )
        .join("") || `<p class="empty">Nada registrado ainda.</p>`}
    </section>
  `;
});

route("/methods", async () => {
  return windowFrame(
    "🧭 Métodos",
    `
    <p class="hint">Nenhum desses precisa ser seguido à risca. Teste, use enquanto funcionar, troque quando parar de funcionar.</p>
    ${window.PsyduckData.METHOD_CONFIGS
      .map(
        (m) => `
      <section class="window-section">
        <h2>${m.name}</h2>
        <p class="method-short">${escapeHtml(m.short)}</p>
        <p>${escapeHtml(m.explanation)}</p>
        <a class="btn btn-primary" href="${m.route}">Usar essa ferramenta →</a>
      </section>`
      )
      .join("")}
  `
  );
});

// Ajustes e Métodos ficam dentro de uma "janela de menu" (moldura de
// madeira grossa + fundo pergaminho), pra parecer um menu de jogo em
// vez de página de configurações comum — o resto do app (Tarefas,
// Kanban etc.) continua com o visual de "nota pregada" normal.
function windowFrame(title, innerHtml) {
  return `
    <div class="window-frame">
      <div class="window-title-bar"><span>${title}</span></div>
      <div class="window-body">${innerHtml}</div>
    </div>
  `;
}

async function renderObsidianSection() {
  const supported = window.PsyduckObsidian.isSupported();
  if (!supported) {
    return `
      <section class="window-section">
        <h2>Obsidian</h2>
        <p class="hint">Só funciona no Chrome ou Edge de computador — o navegador do celular (e o futuro app Windows Mobile) não suporta acesso a pastas locais.</p>
      </section>
    `;
  }

  const handle = await window.PsyduckObsidian.getStoredHandle();
  if (!handle) {
    return `
      <section class="window-section">
        <h2>Obsidian</h2>
        <p class="hint">Conecte a pasta do seu cofre pra puxar as tarefas de um arquivo .md e marcar direto por aqui.</p>
        <button class="btn btn-primary" data-action="obsidian-connect">Conectar cofre</button>
      </section>
    `;
  }

  const chosenFile = await window.PsyduckDB.getSetting("obsidianTaskFile", null);
  const files = await window.PsyduckObsidian.listMarkdownFiles(handle);

  return `
    <section class="window-section">
      <h2>Obsidian</h2>
      <p class="hint">Cofre conectado. Escolha qual arquivo .md tem suas tarefas (linhas "- [ ] tarefa").</p>
      <label class="field">Arquivo de tarefas
        <select onchange="window.PsyduckApp.chooseObsidianFile(this.value)">
          <option value="">—</option>
          ${files.map((f) => `<option value="${f}" ${f === chosenFile ? "selected" : ""}>${f}</option>`).join("")}
        </select>
      </label>
      ${chosenFile ? `<button class="btn" data-action="obsidian-sync-now">Sincronizar agora</button>` : ""}
    </section>
  `;
}

route("/settings", async () => {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  const wip = (await db.getSetting("kanbanWipLimit", 3)) || 3;
  const notifGranted = "Notification" in window && Notification.permission === "granted";
  const obsidianSection = await renderObsidianSection();

  return windowFrame(
    "⚙️ Ajustes",
    `
    <section class="window-section">
      <h2>Aparência</h2>
      <label class="field">Tema
        <select onchange="window.PsyduckTheme.setThemeMode(this.value)">
          <option value="auto" ${(!profile.themeMode || profile.themeMode === "auto") ? "selected" : ""}>Automático</option>
          <option value="light" ${profile.themeMode === "light" ? "selected" : ""}>Claro</option>
          <option value="dark" ${profile.themeMode === "dark" ? "selected" : ""}>Escuro</option>
        </select>
      </label>
      <label class="field">Cor de destaque
        <input type="color" value="${profile.accentColor || window.PsyduckTheme.DEFAULT_ACCENT}" onchange="window.PsyduckTheme.setAccentColor(this.value)" />
      </label>
    </section>
    <section class="window-section">
      <h2>Kanban</h2>
      <label class="field">Limite de tarefas em "Fazendo"
        <input type="number" min="1" max="10" value="${wip}" onchange="window.PsyduckDB.setSetting('kanbanWipLimit', Number(this.value))" />
      </label>
    </section>
    ${obsidianSection}
    <section class="window-section">
      <h2>Lembretes</h2>
      <p>${notifGranted ? "Permissão concedida." : "Sem permissão ainda — lembretes não vão aparecer."}</p>
      <button class="btn btn-primary" onclick="window.PsyduckNotifications.requestPermission().then(() => render())">Pedir permissão</button>
    </section>
    <section class="window-section">
      <h2>Sincronização</h2>
      <p class="hint">Ainda não disponível — chega na v0.2 com login Google.</p>
    </section>
    <section class="window-section">
      <h2>Sobre</h2>
      <p class="dash-level">Psyduck v${window.PsyduckData.APP_VERSION}</p>
      <p class="hint">Se você acabou de atualizar o app e a tela não mudou nada, o
      navegador pode estar servindo uma cópia antiga guardada (cache do
      Service Worker). Toque no botão abaixo pra forçar buscar tudo de novo.</p>
      <button class="btn btn-block" onclick="window.PsyduckApp.forceUpdate()">Forçar atualização</button>
    </section>
    `
  );
});

// ---------- boot ----------

window.addEventListener("hashchange", render);

(async function boot() {
  await window.PsyduckTheme.initTheme();
  await render();
  await window.PsyduckNotifications.rescheduleAllFromTasks();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (err) {
      console.warn("Falha ao registrar o service worker:", err);
    }
  }
})();
