// gamification.js — XP, nível, streak e badges. Chamado sempre que uma
// tarefa é concluída (ou um Pomodoro termina). Toda a lógica fica aqui
// pra ficar fácil de testar/ajustar sem mexer nas telas.

function levelForXp(xp) {
  const step = window.PsyduckData.XP_LEVEL_STEP;
  return Math.floor(xp / step) + 1;
}

function xpIntoCurrentLevel(xp) {
  const step = window.PsyduckData.XP_LEVEL_STEP;
  return xp % step;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isYesterday(dateKey, today = todayKey()) {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return dateKey === todayKey(d);
}

// Atualiza streak: se a última atividade foi ontem, soma 1; se foi hoje,
// mantém; se foi antes de ontem (ou nunca), reinicia em 1.
function updateStreak(state) {
  const today = todayKey();
  if (state.lastActiveDate === today) {
    // já contou hoje, não mexe
  } else if (state.lastActiveDate && isYesterday(state.lastActiveDate, today)) {
    state.streak += 1;
    state.lastActiveDate = today;
  } else {
    state.streak = 1;
    state.lastActiveDate = today;
  }
  return state;
}

function checkNewBadges(state) {
  const already = new Set(state.badges || []);
  const newlyEarned = [];
  for (const badge of window.PsyduckData.BADGE_CONFIGS) {
    if (!already.has(badge.id) && badge.check(state)) {
      already.add(badge.id);
      newlyEarned.push(badge);
    }
  }
  state.badges = Array.from(already);
  return newlyEarned;
}

// Chamado quando uma tarefa é concluída. Retorna { state, leveledUp, newBadges }
// pra tela poder disparar as animações certas.
async function onTaskCompleted(xpValue) {
  const db = window.PsyduckDB;
  let state = await db.getGamificationState();
  const levelBefore = levelForXp(state.xp);

  state.xp += xpValue || 10;
  state.tasksCompleted += 1;
  updateStreak(state);

  const levelAfter = levelForXp(state.xp);
  state.level = levelAfter;
  const newBadges = checkNewBadges(state);

  await db.saveGamificationState(state);
  return { state, leveledUp: levelAfter > levelBefore, newBadges };
}

async function onPomodoroCompleted() {
  const db = window.PsyduckDB;
  let state = await db.getGamificationState();
  const levelBefore = levelForXp(state.xp);

  state.xp += 15;
  state.pomodorosCompleted += 1;
  updateStreak(state);

  const levelAfter = levelForXp(state.xp);
  state.level = levelAfter;
  const newBadges = checkNewBadges(state);

  await db.saveGamificationState(state);
  return { state, leveledUp: levelAfter > levelBefore, newBadges };
}

window.PsyduckGamification = {
  levelForXp,
  xpIntoCurrentLevel,
  onTaskCompleted,
  onPomodoroCompleted,
};
