// db.js — IndexedDB local. Mesmo desenho do theartistsway (db.js): um
// objectStore por "store", timestamp `updatedAt` em cada gravação, e um
// gancho de sync (`window.PsyduckSync`) chamado depois de cada escrita —
// hoje é um no-op (não existe sync na v0.1.0), mas o formato dos dados já
// nasce pronto pra quando o Firestore entrar na v0.2.

const DB_NAME = "psyduck";
const DB_VERSION = 2; // v2: adiciona STORES.ducks (família da fazenda)

const STORES = {
  tasks: "tasks", // { id, title, notes, projectId, dueAt, remindAt, priorityLetter, eisenhowerQuadrant, kanbanColumn, oneThreeFiveSlot, oneThreeFiveDate, isTwoMinuteTask, paretoHighImpact, timeboxMinutes, pomodoroSessionsLogged, xpValue, done, doneAt, deleted, updatedAt }
  projects: "projects", // { id, name, color, updatedAt }
  timeAuditLog: "timeAuditLog", // { id, activity, minutes, loggedAt, updatedAt }
  profile: "profile", // { key, value } — settings key/value, como no theartistsway
  gamification: "gamification", // { key: 'state', xp, level, streak, lastActiveDate, tasksCompleted, pomodorosCompleted, badges: [], updatedAt }
  ducks: "ducks", // { id, variantId, name, obtainedAt, sourceLabel, updatedAt } — a família de Psyducks da fazenda
};

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.tasks)) db.createObjectStore(STORES.tasks, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.projects)) db.createObjectStore(STORES.projects, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.timeAuditLog)) db.createObjectStore(STORES.timeAuditLog, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.profile)) db.createObjectStore(STORES.profile, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORES.gamification)) db.createObjectStore(STORES.gamification, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORES.ducks)) db.createObjectStore(STORES.ducks, { keyPath: "id" });
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function notifyChange() {
  if (window.PsyduckSync) window.PsyduckSync.scheduleSync();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- tarefas ----------

async function listTasks() {
  const rows = await dbGetAll(STORES.tasks);
  return rows.filter((t) => !t.deleted);
}

async function saveTask(task) {
  const now = new Date().toISOString();
  const full = Object.assign(
    {
      id: uid(),
      title: "",
      notes: "",
      projectId: null,
      dueAt: null,
      remindAt: null,
      priorityLetter: null,
      eisenhowerQuadrant: null,
      kanbanColumn: "todo",
      oneThreeFiveSlot: null,
      oneThreeFiveDate: null,
      isTwoMinuteTask: false,
      paretoHighImpact: false,
      timeboxMinutes: null,
      pomodoroSessionsLogged: [],
      xpValue: 10,
      done: false,
      doneAt: null,
      deleted: false,
    },
    task,
    { updatedAt: now }
  );
  await dbPut(STORES.tasks, full);
  notifyChange();
  return full;
}

async function deleteTask(id) {
  const task = await dbGet(STORES.tasks, id);
  if (!task) return;
  // Tombstone real (não apaga a linha) — necessário pra sync propagar a
  // exclusão entre aparelhos a partir da v0.2 (ver plano de sync).
  task.deleted = true;
  task.updatedAt = new Date().toISOString();
  await dbPut(STORES.tasks, task);
  notifyChange();
}

async function toggleTaskDone(id) {
  const task = await dbGet(STORES.tasks, id);
  if (!task) return null;
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  task.updatedAt = new Date().toISOString();
  await dbPut(STORES.tasks, task);
  notifyChange();
  return task;
}

// ---------- projetos ----------

async function listProjects() {
  return dbGetAll(STORES.projects);
}

async function saveProject(project) {
  const full = Object.assign({ id: uid(), name: "", color: "#f6a821" }, project, {
    updatedAt: new Date().toISOString(),
  });
  await dbPut(STORES.projects, full);
  notifyChange();
  return full;
}

// ---------- auditoria de tempo ----------

async function listTimeAuditLog() {
  const rows = await dbGetAll(STORES.timeAuditLog);
  return rows.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
}

async function addTimeAuditEntry(activity, minutes) {
  const entry = {
    id: uid(),
    activity,
    minutes,
    loggedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbPut(STORES.timeAuditLog, entry);
  notifyChange();
  return entry;
}

// ---------- perfil (settings key/value) ----------

async function getSetting(key, fallback) {
  const row = await dbGet(STORES.profile, key);
  return row ? row.value : fallback;
}

async function setSetting(key, value) {
  await dbPut(STORES.profile, { key, value, updatedAt: new Date().toISOString() });
  notifyChange();
}

// ---------- gamificação ----------

async function getGamificationState() {
  const row = await dbGet(STORES.gamification, "state");
  return (
    row || {
      key: "state",
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      tasksCompleted: 0,
      pomodorosCompleted: 0,
      badges: [],
    }
  );
}

async function saveGamificationState(state) {
  state.key = "state";
  state.updatedAt = new Date().toISOString();
  await dbPut(STORES.gamification, state);
  notifyChange();
  return state;
}

// ---------- família de Psyducks (fazenda) ----------

async function listDucks() {
  const rows = await dbGetAll(STORES.ducks);
  return rows.sort((a, b) => new Date(a.obtainedAt) - new Date(b.obtainedAt));
}

async function addDuck(variantId, name, sourceLabel) {
  const duck = {
    id: uid(),
    variantId,
    name,
    sourceLabel,
    obtainedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbPut(STORES.ducks, duck);
  notifyChange();
  return duck;
}

window.PsyduckDB = {
  STORES,
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
  uid,
  listTasks,
  saveTask,
  deleteTask,
  toggleTaskDone,
  listProjects,
  saveProject,
  listTimeAuditLog,
  addTimeAuditEntry,
  getSetting,
  setSetting,
  getGamificationState,
  saveGamificationState,
  listDucks,
  addDuck,
};
