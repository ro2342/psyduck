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
  const content = await handler(query);
  root.innerHTML = shell(path, content);
  window.scrollTo(0, 0);
}

function shell(activePath, content) {
  const S = window.PsyduckData.UI_STRINGS;
  const nav = [
    ["/home", S.nav.home],
    ["/tasks", S.nav.tasks],
    ["/kanban", S.nav.kanban],
    ["/eisenhower", S.nav.eisenhower],
    ["/one-three-five", S.nav.oneThreeFive],
    ["/pomodoro", S.nav.pomodoro],
    ["/timeboxing", S.nav.timeboxing],
    ["/time-audit", S.nav.timeAudit],
    ["/methods", S.nav.methods],
    ["/settings", S.nav.settings],
  ];
  return `
    <header class="topbar">
      <button class="hamburger" data-action="toggle-menu" aria-label="Menu">☰</button>
      <span class="brand">🦆 ${S.appName}</span>
    </header>
    <nav class="side-nav" id="sideNav">
      ${nav
        .map(
          ([path, label]) =>
            `<a href="#${path}" class="nav-link ${activePath === path ? "active" : ""}" data-action="close-menu">${label}</a>`
        )
        .join("")}
    </nav>
    <div class="nav-overlay" data-action="close-menu"></div>
    <main class="content">${content}</main>
  `;
}

// ---------- ações delegadas ----------

const actions = {
  "toggle-menu": () => document.getElementById("sideNav").classList.toggle("open"),
  "close-menu": () => document.getElementById("sideNav").classList.remove("open"),

  async "task-toggle"(el) {
    const task = await window.PsyduckDB.toggleTaskDone(el.dataset.id);
    if (task && task.done) await celebrateCompletion(task);
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
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function celebrateCompletion(task) {
  const result = await window.PsyduckGamification.onTaskCompleted(task.xpValue);
  window.PsyduckNotifications.notifyNow("Boa!", `"${task.title}" concluída. +${task.xpValue} XP`);
  flashToast(
    result.leveledUp
      ? `Subiu pro nível ${result.state.level}! 🎉`
      : `+${task.xpValue} XP — sequência de ${result.state.streak} dia(s)`
  );
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
  const overdue = pending.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const state = await db.getGamificationState();
  const mood = window.PsyduckMascot.moodFor({ overdueCount: overdue.length, streak: state.streak, justLeveledUp: false });
  const xpStep = window.PsyduckData.XP_LEVEL_STEP;
  const xpInLevel = window.PsyduckGamification.xpIntoCurrentLevel(state.xp);
  const today = todayKey();
  const otfToday = tasks.filter((t) => t.oneThreeFiveDate === today);

  return `
    <section class="hero-card">
      <div class="mascot-wrap">${window.PsyduckMascot.renderMascotSvg(mood)}</div>
      <p class="mascot-caption">${window.PsyduckMascot.MOOD_LABELS[mood]}</p>
    </section>

    <section class="stat-row">
      <div class="stat-card">
        <span class="stat-value">Nível ${state.level}</span>
        <div class="xp-bar"><div class="xp-fill" style="width:${(xpInLevel / xpStep) * 100}%"></div></div>
        <span class="stat-sub">${xpInLevel}/${xpStep} XP</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">🔥 ${state.streak}</span>
        <span class="stat-sub">dias seguidos</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${pending.length}</span>
        <span class="stat-sub">tarefas pendentes</span>
      </div>
    </section>

    ${overdue.length ? `<section class="panel panel-warn">
      <h2>Atrasadas</h2>
      ${overdue.map(taskRow).join("")}
    </section>` : ""}

    <section class="panel">
      <h2>1-3-5 de hoje</h2>
      <p class="hint">1 grande, 3 médias, 5 pequenas. <a href="#/one-three-five">Montar o dia →</a></p>
      ${otfToday.length ? otfToday.map(taskRow).join("") : `<p class="empty">Nada escolhido ainda hoje.</p>`}
    </section>

    <section class="panel">
      <a class="btn btn-primary btn-block" href="#/tasks">+ Nova tarefa rápida</a>
    </section>
  `;
});

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

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
  return `
    <h1>Métodos</h1>
    <p class="hint">Nenhum desses precisa ser seguido à risca. Teste, use enquanto funcionar, troque quando parar de funcionar.</p>
    ${window.PsyduckData.METHOD_CONFIGS
      .map(
        (m) => `
      <section class="panel">
        <h2>${m.name}</h2>
        <p class="method-short">${escapeHtml(m.short)}</p>
        <p>${escapeHtml(m.explanation)}</p>
        <a class="btn btn-primary" href="${m.route}">Usar essa ferramenta →</a>
      </section>`
      )
      .join("")}
  `;
});

route("/settings", async () => {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  const wip = (await db.getSetting("kanbanWipLimit", 3)) || 3;
  const notifGranted = "Notification" in window && Notification.permission === "granted";

  return `
    <h1>Ajustes</h1>
    <section class="panel">
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
    <section class="panel">
      <h2>Kanban</h2>
      <label class="field">Limite de tarefas em "Fazendo"
        <input type="number" min="1" max="10" value="${wip}" onchange="window.PsyduckDB.setSetting('kanbanWipLimit', Number(this.value))" />
      </label>
    </section>
    <section class="panel">
      <h2>Lembretes</h2>
      <p>${notifGranted ? "Permissão concedida." : "Sem permissão ainda — lembretes não vão aparecer."}</p>
      <button class="btn btn-primary" onclick="window.PsyduckNotifications.requestPermission().then(() => render())">Pedir permissão</button>
    </section>
    <section class="panel">
      <h2>Sincronização</h2>
      <p class="hint">Ainda não disponível nesta versão (v${window.PsyduckData.APP_VERSION}) — chega na v0.2 com login Google.</p>
    </section>
  `;
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
