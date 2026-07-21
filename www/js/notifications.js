// notifications.js — lembretes best-effort via Notification API do
// navegador. Limitação real e documentada (igual ao theartistsway):
// só dispara enquanto o app está aberto/em foco. Lembrete de verdade
// (funciona com o app fechado) chega na v0.3 com o app UWP nativo
// (ScheduledToastNotification, sem essa limitação).

const scheduledTimers = new Map();

async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch (err) {
    return false;
  }
}

function notifyNow(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "./icons/icon.svg" });
  } catch (err) {
    // alguns navegadores exigem Service Worker registration.showNotification
    // em vez do construtor direto (ex.: Android Chrome) — tentamos o
    // fallback silenciosamente.
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: "./icons/icon.svg" }));
    }
  }
}

// Agenda um lembrete pra um horário futuro, só válido enquanto essa aba
// continuar aberta. `key` permite cancelar/substituir o mesmo lembrete.
function scheduleAt(key, whenIso, title, body) {
  cancelScheduled(key);
  const delay = new Date(whenIso).getTime() - Date.now();
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return; // só agenda dentro das próximas 24h
  const timer = setTimeout(() => {
    notifyNow(title, body);
    scheduledTimers.delete(key);
  }, delay);
  scheduledTimers.set(key, timer);
}

function cancelScheduled(key) {
  if (scheduledTimers.has(key)) {
    clearTimeout(scheduledTimers.get(key));
    scheduledTimers.delete(key);
  }
}

// Reagenda os lembretes de todas as tarefas com remindAt futuro. Chamado
// ao carregar o app e sempre que uma tarefa é salva.
async function rescheduleAllFromTasks() {
  const granted = await requestPermission();
  if (!granted) return;
  const tasks = await window.PsyduckDB.listTasks();
  tasks
    .filter((t) => !t.done && t.remindAt)
    .forEach((t) => scheduleAt("task-" + t.id, t.remindAt, "Psyduck: " + t.title, "Hora combinada — bora lá."));
}

window.PsyduckNotifications = { requestPermission, notifyNow, scheduleAt, cancelScheduled, rescheduleAllFromTasks };
