// app.js — Psyduck v0.2.0: dashboard de tela única, sem bottom-nav, sem
// páginas separadas. Tudo (tarefas, métodos, clima, livros, humor) vive
// dentro das colunas de madeira ao mesmo tempo. O único "modal de troca
// de tela" permitido é o de Ajustes (ícone de engrenagem no canto da
// cena). Kanban/Eisenhower/1-3-5/Pomodoro/Time-Boxing/Auditoria de
// Tempo, que antes eram telas próprias, agora são controles em
// miniatura dentro da linha de cada tarefa ou no rodapé de uma coluna —
// decisão explícita do usuário, aceitando que ficam mais limitados.

const root = document.getElementById("app");
let settingsOpen = false;
let methodsOpen = false;
let focusTimer = null; // TimeboxTimer ativo (rodapé da coluna Livros)

// Ícone de engrenagem em pixel art (retângulos, mesma técnica do
// mascot.js) — substitui o emoji nativo ⚙️, que quebrava a ilusão de
// pixel art desenhada à mão.
function pixelGearSvg(size = 20) {
  return `
  <svg viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="6" y="0" width="4" height="2" fill="var(--text-main)"/>
    <rect x="6" y="14" width="4" height="2" fill="var(--text-main)"/>
    <rect x="0" y="6" width="2" height="4" fill="var(--text-main)"/>
    <rect x="14" y="6" width="2" height="4" fill="var(--text-main)"/>
    <rect x="2" y="2" width="3" height="3" fill="var(--text-main)"/>
    <rect x="11" y="2" width="3" height="3" fill="var(--text-main)"/>
    <rect x="2" y="11" width="3" height="3" fill="var(--text-main)"/>
    <rect x="11" y="11" width="3" height="3" fill="var(--text-main)"/>
    <rect x="4" y="4" width="8" height="8" fill="var(--text-main)"/>
    <rect x="6" y="6" width="4" height="4" fill="var(--bg-column)"/>
  </svg>`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

async function celebrateCompletion(task) {
  const result = await window.PsyduckGamification.onTaskCompleted(task.xpValue, task.title);
  window.PsyduckNotifications.notifyNow("Boa!", `"${task.title}" concluída. +${task.xpValue} XP`);
  flashToast(
    result.leveledUp
      ? `Subiu pro nível ${result.state.level}!`
      : `+${task.xpValue} XP — sequência de ${result.state.streak} dia(s)`
  );
  if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
}

function showDuckModal(duck, { justHatched = false } = {}) {
  const variant = window.PsyduckMascot.duckVariant(duck.variantId);
  const overlay = document.createElement("div");
  overlay.className = "duck-modal-overlay";
  overlay.innerHTML = `
    <div class="duck-modal">
      ${justHatched ? `<p class="duck-modal-kicker">Chocou um novo patinho!</p>` : ""}
      <div class="duck-modal-art">${window.PsyduckMascot.renderDuckIcon(duck.variantId, { size: 140 })}</div>
      <h2>${escapeHtml(duck.name)}</h2>
      <p class="chip rarity-${variant.rarity}">${variant.label} · ${variant.rarity}</p>
      <p class="hint">Ganhou de ${escapeHtml(duck.sourceLabel || "uma conquista")}.</p>
      <button class="btn btn-primary" data-action="close-duck-modal">Fechar</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  // Esse modal fica fora de #app (document.body.appendChild), então o
  // clique dentro dele nunca borbulha até o listener delegado em
  // `root` — precisa do seu próprio listener aqui. Clicar no fundo
  // escurecido também fecha (fora do cartão = "cancelar").
  function closeThisModal() {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 250);
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest('[data-action="close-duck-modal"]')) {
      closeThisModal();
    }
  });
}

function hashPos(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { left: 6 + (h % 80), top: 46 + ((h >> 8) % 44), delay: (h % 30) / 10 };
}

// ---------- render principal ----------

// A cena de fundo (mascot.js) tem quase 800 elementos (céu/montanhas/
// cidade/clima) — pesado demais pra desenhar de novo a cada clique de
// tarefa. Ela é montada UMA VEZ (`sceneShellBuilt`) e só tem sua classe
// de tema/clima atualizada depois disso; só o resto (dashboard, patos,
// mascote, modais) é redesenhado a cada `render()`, que continua
// rodando toda hora que algo muda (mesmo padrão de sempre).
let sceneShellBuilt = false;

function updateSceneThemeClasses() {
  const bg = document.querySelector(".farm-bg");
  if (!bg) return;
  bg.classList.remove("theme-day", "theme-sunset", "theme-night", "theme-sunrise");
  bg.classList.remove("weather-active-clear", "weather-active-rain", "weather-active-storm", "weather-active-snow");
  bg.classList.add(window.PsyduckWeather.getSceneTimeClass());
  bg.classList.add(window.PsyduckWeather.getSceneWeatherClass());
}

async function render() {
  const db = window.PsyduckDB;
  const tasks = await db.listTasks();
  const pending = tasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const state = await db.getGamificationState();
  const ducks = await db.listDucks();
  const books = await db.listBooks();
  const today = todayKey();
  const featured = await pickFeaturedTask(tasks, today);
  const mood = window.PsyduckMascot.moodFor({ overdueCount: overdue.length, streak: state.streak, justLeveledUp: false });

  if (!sceneShellBuilt) {
    root.innerHTML = `
      <div class="app-shell">
        <section class="scene-container">
          ${window.PsyduckMascot.renderFarmBackgroundSvg()}
          <div class="scene-foreground" id="sceneForeground"></div>
          <button class="settings-btn" data-action="open-settings" aria-label="Ajustes">${pixelGearSvg(18)}</button>
          <button class="methods-btn" data-action="open-methods" aria-label="Métodos">?</button>
        </section>
        <div class="wooden-dashboard" id="woodenDashboard"></div>
      </div>
      <div id="modalRoot"></div>
    `;
    sceneShellBuilt = true;
    updateSceneThemeClasses();
    // Reavalia dia/noite/clima a cada minuto mesmo sem nenhuma
    // interação — senão a cena só mudaria de tema quando o usuário
    // clicasse em algo.
    setInterval(updateSceneThemeClasses, 60000);
  } else {
    updateSceneThemeClasses();
  }

  document.getElementById("sceneForeground").innerHTML = `
    <div class="mascot-wrap">${window.PsyduckMascot.renderMascotSvg(mood)}</div>
    ${ducks.map((d) => {
      const pos = hashPos(d.id);
      return `<button class="farm-duck" data-action="show-duck" data-id="${d.id}" style="left:${pos.left}%; top:${pos.top}%; animation-delay:${pos.delay}s;">${window.PsyduckMascot.renderDuckIcon(d.variantId, { size: 46 })}</button>`;
    }).join("")}
    <span class="scene-mood-badge">${window.PsyduckMascot.MOOD_LABELS[mood]}</span>
    ${ducks.length ? `<span class="scene-duck-count">${ducks.length} pato(s)</span>` : ""}
  `;

  document.getElementById("woodenDashboard").innerHTML = `
    ${await renderMoedasColumn(state)}
    ${renderLembretesColumn(pending)}
    ${renderTarefasColumn(pending, tasks.filter((t) => t.done))}
    ${renderFazendaColumn(ducks)}
    ${renderLivrosColumn(books)}
    ${await window.PsyduckWeather.renderWeatherColumn()}
    ${renderDestaqueColumn(featured)}
  `;

  document.getElementById("modalRoot").innerHTML = `
    ${settingsOpen ? await renderSettingsModal() : ""}
    ${methodsOpen ? renderMethodsModal() : ""}
  `;
}

// A tarefa "Destaque" fica fixada pro dia inteiro assim que escolhida
// (mesmo depois de concluída, pra dar tempo do usuário registrar o
// humor) — sem isso, marcar como feita faria o card sumir na hora.
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

// ---------- coluna: Moedas ----------

// Moeda em pixel art (só <rect>, sem <circle>) — octógono bloqueado
// pra sugerir "redondo" sem curva nenhuma, igual ao resto da cena.
function coinIconSvg() {
  return `<svg viewBox="0 0 16 16" class="coin-icon" shape-rendering="crispEdges">
    <rect x="4" y="1" width="8" height="1" fill="#8c5a32"/>
    <rect x="2" y="2" width="12" height="1" fill="#8c5a32"/>
    <rect x="1" y="3" width="14" height="10" fill="#8c5a32"/>
    <rect x="2" y="13" width="12" height="1" fill="#8c5a32"/>
    <rect x="4" y="14" width="8" height="1" fill="#8c5a32"/>
    <rect x="3" y="4" width="10" height="8" fill="#c98a4f"/>
    <rect x="5" y="6" width="6" height="4" fill="#e2a86e"/>
  </svg>`;
}

async function renderMoedasColumn(state) {
  const xpStep = window.PsyduckData.XP_LEVEL_STEP;
  const xpInLevel = window.PsyduckGamification.xpIntoCurrentLevel(state.xp);
  const coins = window.PsyduckGamification.coinCount(state.xp);
  const entries = await window.PsyduckDB.listTimeAuditLog();
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return `
    <section class="column col-moedas">
      <div class="column-header">Moedas</div>
      <div class="column-content">
        <p class="dash-level">Nível ${state.level}</p>
        <div class="xp-bar"><div class="xp-fill" style="width:${(xpInLevel / xpStep) * 100}%"></div></div>
        <div class="coin-grid">${coinIconSvg().repeat(Math.min(coins, 60))}</div>
        <p class="dash-streak">${state.streak} dia(s) seguidos</p>
      </div>
      <div class="column-footer">
        <div class="time-audit-mini">
          <form data-form="time-audit-entry" class="time-audit-mini" style="width:100%">
            <input name="activity" placeholder="atividade" required />
            <input name="minutes" type="number" min="1" placeholder="min" required />
            <button class="mini-pill" type="submit">+</button>
          </form>
        </div>
        <span>${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min registrados</span>
      </div>
    </section>
  `;
}

// ---------- coluna: Lembretes ----------

function renderLembretesColumn(pending) {
  const withReminders = pending
    .filter((t) => t.remindAt || t.dueAt)
    .sort((a, b) => new Date(a.remindAt || a.dueAt) - new Date(b.remindAt || b.dueAt))
    .slice(0, 8);
  const stars = { A: "★★★", B: "★★", C: "★", D: "★" };

  return `
    <section class="column col-lembretes">
      <div class="column-header">Lembretes</div>
      <div class="column-content">
        ${
          withReminders
            .map((t) => {
              const countdown = t.dueAt ? window.PsyduckMethods.formatCountdown(t.dueAt) : null;
              return `
            <div class="reminder-card">
              <span class="reminder-icon">${escapeHtml((t.title[0] || "?").toUpperCase())}</span>
              <span class="reminder-title">${escapeHtml(t.title)}${countdown ? ` <span class="hint">(${countdown.text})</span>` : ""}</span>
              <span class="reminder-stars">${stars[t.priorityLetter] || ""}</span>
            </div>`;
            })
            .join("") || `<p class="empty">Nada marcado.</p>`
        }
      </div>
      <div class="column-footer">prazo ou lembrete definido na tarefa</div>
    </section>
  `;
}

// ---------- coluna: Tarefas (TODOS + Obsidian + controles inline) ----------

const KANBAN_STATES = [
  ["todo", "A FAZER"],
  ["doing", "FAZENDO"],
  ["done", "FEITO"],
];
const EISENHOWER_STATES = [
  [null, "—"],
  ["urgent-important", "UI"],
  ["not-urgent-important", "II"],
  ["urgent-not-important", "UN"],
  ["neither", "N"],
];
const OTF_STATES = [
  [null, "—"],
  ["big", "1 GDE"],
  ["medium", "MÉDIA"],
  ["small", "PEQ"],
];
const PRIORITY_STATES = [null, "A", "B", "C", "D"];

function renderTarefasColumn(pending, done) {
  return `
    <section class="column col-tarefas">
      <div class="column-header">
        Todos
        <span class="info-icon" title="Regra dos 2 Minutos: se leva menos de 2min, marque a tag '2min' e faça agora.">ⓘ</span>
      </div>
      <div class="column-content">
        <div class="quick-add-row">
          <input type="text" placeholder="+ Adicionar tarefa..." onkeydown="if(event.key==='Enter') window.PsyduckApp.quickAddTask(this)" />
        </div>
        ${pending.map(renderTaskRowMini).join("") || `<p class="empty">Tudo em dia!</p>`}
        ${
          done.length
            ? `<details class="done-tasks-details">
                <summary>Concluídas (${done.length})</summary>
                ${done
                  .slice()
                  .reverse()
                  .map(renderTaskRowMini)
                  .join("")}
              </details>`
            : ""
        }
      </div>
      <div class="column-footer">+chance de pato a cada tarefa concluída ✓</div>
    </section>
  `;
}

function renderTaskRowMini(t) {
  const kanbanLabel = (KANBAN_STATES.find((s) => s[0] === (t.kanbanColumn || "todo")) || KANBAN_STATES[0])[1];
  const eisenhowerLabel = (EISENHOWER_STATES.find((s) => s[0] === t.eisenhowerQuadrant) || EISENHOWER_STATES[0])[1];
  const otfLabel = (OTF_STATES.find((s) => s[0] === t.oneThreeFiveSlot) || OTF_STATES[0])[1];
  return `
    <div class="task-row-mini ${t.done ? "done" : ""}">
      <div class="task-mini-top">
        <input type="checkbox" data-action="task-toggle" data-id="${t.id}" ${t.done ? "checked" : ""} />
        <span class="task-mini-title">${escapeHtml(t.title)}</span>
        <button class="mini-pill" data-action="task-delete" data-id="${t.id}" title="Excluir">🗑</button>
      </div>
      <div class="task-mini-controls">
        <button class="mini-pill" data-action="cycle-priority" data-id="${t.id}" title="Prioridade ABCD-Z">${t.priorityLetter || "—"}</button>
        <button class="mini-pill" data-action="cycle-kanban" data-id="${t.id}" title="Kanban">${kanbanLabel}</button>
        <button class="mini-pill" data-action="cycle-eisenhower" data-id="${t.id}" title="Matriz de Eisenhower">${eisenhowerLabel}</button>
        <button class="mini-pill" data-action="cycle-otf" data-id="${t.id}" title="Regra 1-3-5">${otfLabel}</button>
        <button class="mini-pill ${t.isTwoMinuteTask ? "active" : ""}" data-action="toggle-two-min" data-id="${t.id}" title="Regra dos 2 Minutos">2min</button>
        <button class="mini-pill ${t.paretoHighImpact ? "active" : ""}" data-action="toggle-pareto" data-id="${t.id}" title="Regra 80/20">80/20</button>
      </div>
    </div>
  `;
}

// ---------- coluna: Fazenda ----------

function renderFazendaColumn(ducks) {
  const preview = ducks.slice(-4);
  return `
    <section class="column col-fazenda">
      <div class="column-header">Fazenda</div>
      <div class="column-content">
        <div class="dash-farm-preview">${preview.map((d) => window.PsyduckMascot.renderDuckIcon(d.variantId, { size: 40 })).join("") || `<p class="empty">Sem patos</p>`}</div>
        <p class="dash-farm-count">${ducks.length} na família</p>
      </div>
      <div class="column-footer">toque num pato na cena acima pra ver quem é</div>
    </section>
  `;
}

// ---------- coluna: Livros (+ timer de foco embutido no rodapé) ----------

function renderLivrosColumn(books) {
  return `
    <section class="column col-livros">
      <div class="column-header">Livros</div>
      <div class="column-content">
        ${books
          .map(
            (b) => `
          <div class="book-card">
            ${b.coverUrl ? `<img class="book-cover" src="${b.coverUrl}" alt="" />` : `<div class="book-cover book-cover-placeholder">📕</div>`}
            <div class="book-info">
              <span class="book-title">${escapeHtml(b.title)}</span>
              <span class="hint">Cap. ${b.currentChapter || 0}</span>
              <button class="reward-btn" data-action="book-advance" data-id="${b.id}">CAPÍTULO +10</button>
            </div>
          </div>`
          )
          .join("") || `<p class="empty">Nenhum livro ainda.</p>`}
        <div class="quick-add-row">
          <input type="text" placeholder="+ livro (Enter)" onkeydown="if(event.key==='Enter') window.PsyduckApp.quickAddBook(this)" />
        </div>
      </div>
      <div class="column-footer">
        <div class="inline-method-bar">
          <span>FOCO</span>
          <button data-action="focus-timer-start" data-minutes="5">5</button>
          <button data-action="focus-timer-start" data-minutes="10">10</button>
          <button data-action="focus-timer-start" data-minutes="15">15</button>
          <button data-action="focus-timer-start" data-minutes="20">20</button>
          <span>min</span>
          ${focusTimer ? `<span class="timer-display-mini">${formatMs(focusTimer.remainingMs)}</span><button data-action="focus-timer-pause">⏸</button>` : ""}
        </div>
      </div>
    </section>
  `;
}

// ---------- coluna: Destaque (diário/humor) ----------

function renderDestaqueColumn(featured) {
  if (!featured) {
    return `
      <section class="column col-destaque">
        <div class="column-header">Destaque</div>
        <div class="column-content"><p class="empty">Marque uma tarefa como prioridade A ou escolha a "1 grande" do dia (controles na coluna Todos).</p></div>
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
    <section class="column col-destaque">
      <div class="column-header">Destaque</div>
      <div class="column-content">
        <div class="ui-card journal-card">
          <div class="journal-head">
            <span>❤️</span>
            <span class="featured-title">${escapeHtml(featured.title)}</span>
            <input type="checkbox" data-action="task-toggle" data-id="${featured.id}" ${featured.done ? "checked" : ""} />
          </div>
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
            <input type="text" class="reflection-note journal-input" placeholder="Como foi? (registro)" data-id="${featured.id}" onblur="window.PsyduckApp.saveReflectionNote(this)" value="${escapeHtml(featured.reflectionNote || "")}" />
          `
              : ""
          }
        </div>
      </div>
    </section>
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
  async "cycle-priority"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    const idx = PRIORITY_STATES.indexOf(task.priorityLetter || null);
    task.priorityLetter = PRIORITY_STATES[(idx + 1) % PRIORITY_STATES.length];
    task.xpValue = task.priorityLetter === "A" ? 20 : task.priorityLetter === "B" ? 15 : 10;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "cycle-kanban"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    const idx = KANBAN_STATES.findIndex((s) => s[0] === (task.kanbanColumn || "todo"));
    const nextState = KANBAN_STATES[(idx + 1) % KANBAN_STATES.length][0];
    if (nextState === "doing") {
      const all = await window.PsyduckDB.listTasks();
      const doingCount = all.filter((x) => x.kanbanColumn === "doing" && !x.done).length;
      const wip = Number((await window.PsyduckDB.getSetting("kanbanWipLimit", 3)) || 3);
      if (doingCount >= wip) {
        flashToast(`Limite de "Fazendo" é ${wip} — termine algo antes.`);
        return;
      }
    }
    task.kanbanColumn = nextState;
    if (nextState === "done" && !task.done) {
      task.done = true;
      task.doneAt = new Date().toISOString();
      await window.PsyduckDB.saveTask(task);
      await celebrateCompletion(task);
      render();
      return;
    }
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "cycle-eisenhower"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    const idx = EISENHOWER_STATES.findIndex((s) => s[0] === task.eisenhowerQuadrant);
    task.eisenhowerQuadrant = EISENHOWER_STATES[(idx + 1) % EISENHOWER_STATES.length][0];
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "cycle-otf"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    const idx = OTF_STATES.findIndex((s) => s[0] === task.oneThreeFiveSlot);
    const next = OTF_STATES[(idx + 1) % OTF_STATES.length][0];
    task.oneThreeFiveSlot = next;
    task.oneThreeFiveDate = next ? todayKey() : null;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "toggle-two-min"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.isTwoMinuteTask = !task.isTwoMinuteTask;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "toggle-pareto"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.paretoHighImpact = !task.paretoHighImpact;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  async "book-advance"(el) {
    const book = await window.PsyduckDB.advanceBookChapter(el.dataset.id);
    if (book) {
      const result = await window.PsyduckGamification.onTaskCompleted(10, "capítulo de " + book.title);
      flashToast(result.leveledUp ? `Subiu pro nível ${result.state.level}!` : `+10 XP — capítulo ${book.currentChapter}`);
      if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
    }
    render();
  },
  "focus-timer-start"(el) {
    const minutes = Number(el.dataset.minutes);
    focusTimer = new window.PsyduckMethods.TimeboxTimer({
      minutes,
      onTick: () => updateFocusTimerDisplay(),
      onComplete: async () => {
        window.PsyduckNotifications.notifyNow("Foco concluído!", `${minutes} minutos de foco.`);
        const result = await window.PsyduckGamification.onPomodoroCompleted();
        flashToast(result.leveledUp ? `Subiu pro nível ${result.state.level}!` : "+15 XP — foco concluído");
        if (result.newDuck) showDuckModal(result.newDuck, { justHatched: true });
        focusTimer = null;
        render();
      },
    });
    focusTimer.start();
    render();
  },
  "focus-timer-pause"() {
    if (focusTimer) focusTimer.pause();
    render();
  },
  async "show-duck"(el) {
    const duck = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.ducks, el.dataset.id);
    if (duck) showDuckModal(duck, { justHatched: false });
  },
  async "set-mood"(el) {
    const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, el.dataset.id);
    if (!task) return;
    task.reflectionMood = el.dataset.mood;
    await window.PsyduckDB.saveTask(task);
    render();
  },
  "open-settings"() {
    settingsOpen = true;
    render();
  },
  "close-settings"() {
    settingsOpen = false;
    render();
  },
  "open-methods"() {
    methodsOpen = true;
    render();
  },
  "close-methods"() {
    methodsOpen = false;
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
};

function updateFocusTimerDisplay() {
  const el = document.querySelector(".timer-display-mini");
  if (el && focusTimer) el.textContent = formatMs(focusTimer.remainingMs);
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
  async "time-audit-entry"(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.activity || !data.minutes) return;
    await window.PsyduckDB.addTimeAuditEntry(data.activity, Number(data.minutes));
    render();
  },
};

// ---------- funções globais (chamadas via atributo inline, fora do delegate) ----------

async function quickAddTask(input) {
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  await window.PsyduckDB.saveTask({ title, xpValue: 10 });
  await window.PsyduckNotifications.rescheduleAllFromTasks();
  const fileName = await window.PsyduckDB.getSetting("obsidianTaskFile", null);
  if (fileName) {
    window.PsyduckObsidian.appendTaskLine(fileName, title).catch((err) => console.warn("Falha ao gravar no Obsidian:", err));
  }
  render();
}

async function quickAddBook(input) {
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  let coverUrl = null;
  try {
    const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`);
    const json = await res.json();
    const coverId = json.docs && json.docs[0] && json.docs[0].cover_i;
    if (coverId) coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`;
  } catch (err) {
    console.warn("Busca de capa falhou:", err);
  }
  await window.PsyduckDB.saveBook({ title, coverUrl });
  render();
}

async function saveReflectionNote(input) {
  const task = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.tasks, input.dataset.id);
  if (!task) return;
  task.reflectionNote = input.value;
  await window.PsyduckDB.saveTask(task);
}

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

window.PsyduckApp = { quickAddTask, quickAddBook, saveReflectionNote, forceUpdate, chooseObsidianFile };

// ---------- modal de métodos (cheat sheet — voltou a pedido do usuário) ----------
// Os controles de verdade (Kanban/Eisenhower/1-3-5/ABCD-Z/2min/80-20)
// continuam sendo as pílulas inline em cada tarefa (coluna Todos), e o
// timer de foco fica no rodapé de Livros — este modal é só a
// explicação de cada método, pra não perder o "cheat sheet" que existia
// antes da v0.1.9.
function renderMethodsModal() {
  return `
    <div class="modal-overlay show">
      <div class="window-frame">
        <div class="window-title-bar">
          <span>Métodos</span>
          <button class="window-close-btn" data-action="close-methods">X</button>
        </div>
        <div class="window-body">
          <p class="hint">Nenhum precisa ser seguido à risca. Os controles de cada um ficam nas pílulas da coluna Todos ou no rodapé de Livros (timer de foco).</p>
          ${window.PsyduckData.METHOD_CONFIGS
            .map(
              (m) => `
            <section class="window-section">
              <h2>${m.name}</h2>
              <p class="method-short">${escapeHtml(m.short)}</p>
              <p class="hint">${escapeHtml(m.explanation)}</p>
            </section>`
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

// ---------- modal de ajustes (o único modal permitido) ----------

async function renderObsidianSection() {
  const supported = window.PsyduckObsidian.isSupported();
  if (!supported) {
    return `
      <section class="window-section">
        <h2>Obsidian</h2>
        <p class="hint">Só funciona no Chrome ou Edge de computador.</p>
      </section>
    `;
  }
  const handle = await window.PsyduckObsidian.getStoredHandle();
  if (!handle) {
    return `
      <section class="window-section">
        <h2>Obsidian</h2>
        <p class="hint">Conecte a pasta do cofre pra puxar tarefas de um .md.</p>
        <button class="btn btn-primary" data-action="obsidian-connect">Conectar cofre</button>
      </section>
    `;
  }
  const chosenFile = await window.PsyduckDB.getSetting("obsidianTaskFile", null);
  const files = await window.PsyduckObsidian.listMarkdownFiles(handle);
  return `
    <section class="window-section">
      <h2>Obsidian</h2>
      <p class="hint">Cofre conectado.</p>
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

async function renderSyncSection() {
  const session = await window.PsyduckAuth.getSession();
  if (!session) {
    return `
      <section class="window-section">
        <h2>Conta Google (sincronização)</h2>
        <p class="hint">Entre pra sincronizar tarefas, patos, livros e progresso entre aparelhos.</p>
        <button class="btn btn-primary" onclick="window.PsyduckAuth.startGoogleLogin()">Entrar com Google</button>
      </section>
    `;
  }
  return `
    <section class="window-section">
      <h2>Conta Google (sincronização)</h2>
      <p>Logado como <strong>${escapeHtml(session.email || session.displayName || session.uid)}</strong>.</p>
      <button class="btn btn-primary" onclick="window.PsyduckSync.syncAll().then((msg) => { window.flashToast(msg); render(); })">Sincronizar agora</button>
      <button class="btn" onclick="window.PsyduckAuth.signOut().then(() => render())">Sair</button>
    </section>
  `;
}

async function renderSettingsModal() {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  const wip = (await db.getSetting("kanbanWipLimit", 3)) || 3;
  const notifGranted = "Notification" in window && Notification.permission === "granted";
  const obsidianSection = await renderObsidianSection();
  const syncSection = await renderSyncSection();

  return `
    <div class="modal-overlay show">
      <div class="window-frame">
        <div class="window-title-bar">
          <span class="window-title-icon">${pixelGearSvg(16)}Ajustes</span>
          <button class="window-close-btn" data-action="close-settings">X</button>
        </div>
        <div class="window-body">
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
          ${syncSection}
          <section class="window-section">
            <h2>Lembretes</h2>
            <p>${notifGranted ? "Permissão concedida." : "Sem permissão ainda."}</p>
            <button class="btn btn-primary" onclick="window.PsyduckNotifications.requestPermission().then(() => render())">Pedir permissão</button>
          </section>
          <section class="window-section">
            <h2>Clima</h2>
            <button class="btn btn-primary" onclick="window.PsyduckWeather.requestLocation().then(() => render())">Usar minha localização</button>
          </section>
          <section class="window-section">
            <h2>Sobre</h2>
            <p class="dash-level">Psyduck v${window.PsyduckData.APP_VERSION}</p>
            <p class="hint">Se a tela não mudou depois de atualizar, force a atualização:</p>
            <button class="btn btn-block" onclick="window.PsyduckApp.forceUpdate()">Forçar atualização</button>
          </section>
        </div>
      </div>
    </div>
  `;
}

// ---------- boot ----------

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
