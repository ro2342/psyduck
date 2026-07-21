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

// Sorteio ponderado por raridade — mesma ideia de "puxar" um bichinho
// num gacha/RPG (Habitica premia pet, Pokémon captura bicho). Retorna
// a variante sorteada ou null se não sortear nada.
function rollDuckVariant(pool) {
  const totalWeight = pool.reduce((sum, v) => sum + v.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const variant of pool) {
    roll -= variant.weight;
    if (roll <= 0) return variant;
  }
  return pool[pool.length - 1];
}

function randomDuckName() {
  const pool = window.PsyduckData.DUCK_NAME_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Chance de ganhar um novo Psyduck pra fazenda ao concluir algo. Sorteio
// "comum" tem chance menor de acontecer; level-up e badge são sempre
// garantidos (evento grande merece recompensa garantida).
async function maybeAwardDuck({ dropChance, guaranteed, sourceLabel }) {
  const db = window.PsyduckDB;
  if (!guaranteed && Math.random() > dropChance) return null;
  // level-up e badge sorteiam só entre incomum+ (recompensa maior sente melhor)
  const pool = guaranteed
    ? window.PsyduckData.DUCK_VARIANTS.filter((v) => v.rarity !== "comum")
    : window.PsyduckData.DUCK_VARIANTS;
  const variant = rollDuckVariant(pool);
  const duck = await db.addDuck(variant.id, randomDuckName(), sourceLabel);
  return duck;
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

// Chamado quando uma tarefa é concluída. Retorna { state, leveledUp,
// newBadges, newDuck } pra tela poder disparar as animações certas.
async function onTaskCompleted(xpValue, taskTitle) {
  const db = window.PsyduckDB;
  let state = await db.getGamificationState();
  const levelBefore = levelForXp(state.xp);

  state.xp += xpValue || 10;
  state.tasksCompleted += 1;
  updateStreak(state);

  const levelAfter = levelForXp(state.xp);
  state.level = levelAfter;
  const leveledUp = levelAfter > levelBefore;
  const newBadges = checkNewBadges(state);

  await db.saveGamificationState(state);

  const newDuck =
    (await maybeAwardDuck({ dropChance: 0.2, guaranteed: leveledUp, sourceLabel: `concluindo "${taskTitle || "uma tarefa"}"` })) ||
    (newBadges.length ? await maybeAwardDuck({ guaranteed: true, sourceLabel: `conquistando "${newBadges[0].name}"` }) : null);

  return { state, leveledUp, newBadges, newDuck };
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
  const leveledUp = levelAfter > levelBefore;
  const newBadges = checkNewBadges(state);

  await db.saveGamificationState(state);

  const newDuck =
    (await maybeAwardDuck({ dropChance: 0.2, guaranteed: leveledUp, sourceLabel: "um ciclo de Pomodoro" })) ||
    (newBadges.length ? await maybeAwardDuck({ guaranteed: true, sourceLabel: `conquistando "${newBadges[0].name}"` }) : null);

  return { state, leveledUp, newBadges, newDuck };
}

window.PsyduckGamification = {
  levelForXp,
  xpIntoCurrentLevel,
  onTaskCompleted,
  onPomodoroCompleted,
};
