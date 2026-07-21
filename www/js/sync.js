// sync.js — motor de sincronização com o Firestore. Mesmo padrão
// validado no theartistsway (www/js/sync.js de lá): pra cada "store",
// puxa a versão da nuvem, mescla com a local e sobe de volta — sempre
// nos dois sentidos, sempre idempotente, sem listener em tempo real
// (só request/response HTTP curto).
//
// Diferença importante em relação ao theartistsway: lá os stores eram
// só aditivos (nunca tinham exclusão de verdade). Aqui, tarefas podem
// ser excluídas — por isso o merge por-registro compara `updatedAt`
// olhando o registro inteiro (incluindo o campo `deleted`), então uma
// exclusão nova (updatedAt mais recente, deleted:true) vence uma
// versão antiga não-excluída, e a exclusão propaga entre aparelhos
// (tombstone real, não vira zumbi voltando toda hora).

const FIRESTORE_PROJECT_ID = "psyduck-42";

// Stores tipo coleção (muitos registros, merge por-registro).
const COLLECTION_STORES = ["tasks", "projects", "timeAuditLog", "ducks", "books"];
const SYNC_DEBOUNCE_MS = 5000;

let syncDebounceTimer = null;

function scheduleSync() {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    syncAll().catch((err) => console.warn("Sincronização falhou:", err));
  }, SYNC_DEBOUNCE_MS);
}

async function syncAll() {
  const session = await window.PsyduckAuth.getSession();
  if (!session) return "Não logado — nada pra sincronizar.";

  let activeSession = session;
  if (window.PsyduckAuth.needsRefresh(activeSession)) {
    activeSession = await window.PsyduckAuth.refreshIdToken(activeSession);
    if (!activeSession) return "Sessão expirada — entre de novo.";
  }

  try {
    for (const storeName of COLLECTION_STORES) {
      await syncCollectionStore(activeSession, storeName);
    }
    await syncProfile(activeSession);
    await syncGamification(activeSession);
    return "Sincronizado às " + new Date().toTimeString().slice(0, 5);
  } catch (err) {
    return "Falha ao sincronizar (tentará de novo mais tarde): " + err.message;
  }
}

// Apaga os dados da nuvem sem mexer no login (reset "Apagar meus
// dados" mantém o aparelho logado).
async function clearCloudData() {
  const session = await window.PsyduckAuth.getSession();
  if (!session) return true;

  let activeSession = session;
  if (window.PsyduckAuth.needsRefresh(activeSession)) {
    activeSession = await window.PsyduckAuth.refreshIdToken(activeSession);
    if (!activeSession) return false;
  }

  try {
    const allDocs = [...COLLECTION_STORES, "profile", "gamification"];
    for (const storeName of allDocs) {
      const response = await fetch(docUrl(activeSession.uid, storeName), {
        method: "DELETE",
        headers: { Authorization: "Bearer " + activeSession.idToken },
      });
      if (!response.ok && response.status !== 404) return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

// ---------- stores tipo coleção (mergePerRecord) ----------

async function syncCollectionStore(session, storeName) {
  const db = window.PsyduckDB;
  const storeKey = db.STORES[storeName];
  const localRows = await db.dbGetAll(storeKey);
  const localBlob = {};
  localRows.forEach((r) => {
    localBlob[r.id] = r;
  });

  const remoteBlob = await getRemoteDoc(session, storeName);
  const merged = mergePerRecord(localBlob, remoteBlob, "updatedAt");

  for (const id of Object.keys(merged)) {
    await db.dbPut(storeKey, merged[id]);
  }
  await putRemoteDoc(session, storeName, merged);
}

function mergePerRecord(local, remote, tsField) {
  const merged = {};
  const keys = new Set(Object.keys(local).concat(Object.keys(remote)));
  keys.forEach((key) => {
    const hasLocal = Object.prototype.hasOwnProperty.call(local, key);
    const hasRemote = Object.prototype.hasOwnProperty.call(remote, key);
    if (hasLocal && hasRemote) {
      const localTs = Date.parse(local[key][tsField] || 0) || 0;
      const remoteTs = Date.parse(remote[key][tsField] || 0) || 0;
      merged[key] = remoteTs > localTs ? remote[key] : local[key];
    } else if (hasLocal) {
      merged[key] = local[key];
    } else {
      merged[key] = remote[key];
    }
  });
  return merged;
}

// ---------- perfil (blob inteiro — tema/cor de destaque) ----------

async function syncProfile(session) {
  const db = window.PsyduckDB;
  const localRaw = await db.getSettingRaw("profile");
  const local = localRaw ? Object.assign({}, localRaw.value, { _updatedAt: localRaw.updatedAt }) : {};
  const remote = await getRemoteDoc(session, "profile");
  const merged = mergeWholeBlob(local, remote);

  if (Object.keys(merged).length) {
    const { _updatedAt, ...profileValue } = merged;
    await db.setSettingRaw("profile", profileValue, _updatedAt);
    if (window.PsyduckTheme) window.PsyduckTheme.applyTheme(profileValue);
  }
  await putRemoteDoc(session, "profile", merged);
}

// ---------- gamificação (blob inteiro — xp/nível/streak/badges) ----------

async function syncGamification(session) {
  const db = window.PsyduckDB;
  const local = await db.getGamificationState();
  const localWithTs = Object.assign({}, local, { _updatedAt: local.updatedAt || null });
  const remote = await getRemoteDoc(session, "gamification");
  const merged = mergeWholeBlob(localWithTs, remote);

  if (Object.keys(merged).length) {
    await db.saveGamificationState(merged);
  }
  await putRemoteDoc(session, "gamification", merged);
}

function mergeWholeBlob(local, remote) {
  const hasRemote = Object.keys(remote).length > 0;
  const hasLocal = Object.keys(local).length > 0;
  if (!hasRemote) return local;
  if (!hasLocal) return remote;
  const localTs = Date.parse(local._updatedAt || 0) || 0;
  const remoteTs = Date.parse(remote._updatedAt || 0) || 0;
  return remoteTs > localTs ? remote : local;
}

// ---------- Firestore REST ----------
// Cada store vira um documento com um único campo "data" (o JSON
// inteiro do store, como string) — evita traduzir pro formato de
// tipos nativos do Firestore.

function docUrl(uid, storeName) {
  return `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/users/${uid}/stores/${storeName}`;
}

async function getRemoteDoc(session, storeName) {
  const response = await fetch(docUrl(session.uid, storeName), {
    headers: { Authorization: "Bearer " + session.idToken },
  });
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`Firestore GET ${storeName}: ${response.status}`);
  const doc = await response.json();
  if (!doc.fields || !doc.fields.data) return {};
  return JSON.parse(doc.fields.data.stringValue);
}

async function putRemoteDoc(session, storeName, data) {
  const body = {
    fields: {
      data: { stringValue: JSON.stringify(data) },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
  const response = await fetch(docUrl(session.uid, storeName), {
    method: "PATCH",
    headers: { Authorization: "Bearer " + session.idToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore PATCH ${storeName}: ${response.status} ${text}`);
  }
}

// ---------- gatilhos ----------
// Sem polling nem conexão persistente — só ao voltar pra aba/janela
// (pega o que mudou em outro aparelho) e no debounce (scheduleSync,
// chamado por db.js depois de qualquer escrita).

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncAll().catch((err) => console.warn("Sincronização falhou:", err));
  }
});
window.addEventListener("focus", () => {
  syncAll().catch((err) => console.warn("Sincronização falhou:", err));
});

window.PsyduckSync = { scheduleSync, syncAll, clearCloudData };

// Sincroniza uma vez ao carregar o app, se já tiver login guardado.
window.PsyduckAuth.getSession().then((session) => {
  if (session) syncAll().catch((err) => console.warn("Sincronização falhou:", err));
});
