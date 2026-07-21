// methods.js — contagem regressiva + o timer de foco embutido no
// rodapé da coluna Livros (v0.2.0: Pomodoro/Time-Boxing viraram um
// timer único simples, sem tela própria; Eisenhower/Kanban/1-3-5/
// ABCD-Z/80/20/Regra dos 2 Minutos são controles inline por tarefa,
// direto em app.js).

function formatCountdown(targetIso) {
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - Date.now();
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);

  let text;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}min`;
  else if (minutes > 0) text = `${minutes}min ${seconds}s`;
  else text = `${seconds}s`;

  return { text: overdue ? `atrasado há ${text}` : `faltam ${text}`, overdue };
}

// ---------- Time-Boxing / timer de foco (contagem regressiva de N minutos) ----------

class TimeboxTimer {
  constructor({ minutes, onTick, onComplete } = {}) {
    this.totalMs = minutes * 60000;
    this.remainingMs = this.totalMs;
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.interval = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._endAt = Date.now() + this.remainingMs;
    this.interval = setInterval(() => this._tick(), 250);
  }

  pause() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.remainingMs = Math.max(0, this._endAt - Date.now());
  }

  _tick() {
    this.remainingMs = this._endAt - Date.now();
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this.pause();
      this.onTick(0);
      this.onComplete();
      return;
    }
    this.onTick(this.remainingMs);
  }
}

window.PsyduckMethods = { formatCountdown, TimeboxTimer };
