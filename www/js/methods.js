// methods.js — lógica funcional dos métodos que precisam de estado
// próprio (Pomodoro, Time-Boxing, contagem regressiva). Os métodos que
// são só filtro/agrupamento de tarefas (Eisenhower, Kanban, 1-3-5,
// ABCD-Z, 80/20, Regra dos 2 Minutos) ficam direto no app.js, perto da
// tela que os desenha.

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

// ---------- Pomodoro ----------

class PomodoroTimer {
  constructor({ workMinutes = 25, breakMinutes = 5, longBreakMinutes = 15, cyclesBeforeLongBreak = 4, onTick, onPhaseComplete } = {}) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    this.longBreakMinutes = longBreakMinutes;
    this.cyclesBeforeLongBreak = cyclesBeforeLongBreak;
    this.onTick = onTick || (() => {});
    this.onPhaseComplete = onPhaseComplete || (() => {});
    this.phase = "work"; // work | break | longBreak
    this.cycleCount = 0;
    this.remainingMs = this.workMinutes * 60000;
    this.interval = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._tickEndAt = Date.now() + this.remainingMs;
    this.interval = setInterval(() => this._tick(), 250);
  }

  pause() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.remainingMs = Math.max(0, this._tickEndAt - Date.now());
  }

  reset() {
    this.pause();
    this.phase = "work";
    this.cycleCount = 0;
    this.remainingMs = this.workMinutes * 60000;
    this.onTick(this.remainingMs, this.phase);
  }

  _tick() {
    this.remainingMs = this._tickEndAt - Date.now();
    if (this.remainingMs <= 0) {
      this._advancePhase();
      return;
    }
    this.onTick(this.remainingMs, this.phase);
  }

  _advancePhase() {
    const finishedPhase = this.phase;
    if (finishedPhase === "work") {
      this.cycleCount += 1;
      this.phase = this.cycleCount % this.cyclesBeforeLongBreak === 0 ? "longBreak" : "break";
    } else {
      this.phase = "work";
    }
    this.remainingMs = (this.phase === "work" ? this.workMinutes : this.phase === "break" ? this.breakMinutes : this.longBreakMinutes) * 60000;
    this._tickEndAt = Date.now() + this.remainingMs;
    this.onPhaseComplete(finishedPhase, this.phase);
    this.onTick(this.remainingMs, this.phase);
  }
}

// ---------- Time-Boxing (contagem regressiva simples de N minutos) ----------

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

window.PsyduckMethods = { formatCountdown, PomodoroTimer, TimeboxTimer };
