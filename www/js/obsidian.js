// obsidian.js — ponte com um cofre local do Obsidian via File System
// Access API. SÓ FUNCIONA em Chrome/Edge de desktop — a API não existe
// em navegadores mobile (Android/iOS) nem no WebView do futuro app
// UWP. `isSupported()` deixa a tela decidir o que mostrar.
//
// Tarefas lidas de um arquivo .md viram tarefas normais do Psyduck
// (mesma store `tasks`), só que com `obsidianFile`/`obsidianLineIndex`
// preenchidos — ao marcar/desmarcar no Psyduck, a linha correspondente
// do arquivo é reescrita (`- [ ]` <-> `- [x]`). Identidade da tarefa é
// baseada num hash do texto (não da posição), pra sobreviver a edições
// que deslocem linhas no arquivo entre sincronizações.

function isSupported() {
  return "showDirectoryPicker" in window;
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return "obsidian-" + h.toString(36);
}

async function getStoredHandle() {
  const row = await window.PsyduckDB.dbGet(window.PsyduckDB.STORES.obsidianHandle, "vault");
  return row ? row.handle : null;
}

// Só pode ser chamado a partir de um clique de verdade (gesto do
// usuário) — é uma exigência de segurança da própria API do navegador.
async function connectVault() {
  const handle = await window.showDirectoryPicker();
  await window.PsyduckDB.dbPut(window.PsyduckDB.STORES.obsidianHandle, { key: "vault", handle });
  return handle;
}

async function ensurePermission(handle, mode = "readwrite") {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  // requestPermission só funciona chamado dentro de um gesto do usuário
  // (botão "Reconectar"), senão o navegador recusa silenciosamente.
  return (await handle.requestPermission(opts)) === "granted";
}

async function listMarkdownFiles(dirHandle) {
  const names = [];
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === "file" && name.toLowerCase().endsWith(".md")) names.push(name);
  }
  return names.sort();
}

function parseMarkdownTasks(text) {
  const lines = text.split("\n");
  const tasks = [];
  lines.forEach((line, index) => {
    const match = /^(\s*-\s*\[([ xX])\]\s*)(.+)$/.exec(line);
    if (match) {
      tasks.push({ lineIndex: index, done: match[2].toLowerCase() === "x", title: match[3].trim() });
    }
  });
  return tasks;
}

// Puxa o arquivo escolhido, transforma cada "- [ ]"/"- [x]" numa tarefa
// normal do Psyduck (upsert por id estável = hash do texto).
async function syncFromFile(fileName) {
  const handle = await getStoredHandle();
  if (!handle) throw new Error("Cofre não conectado.");
  if (!(await ensurePermission(handle, "read"))) throw new Error("Permissão negada.");

  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const text = await file.text();
  const parsed = parseMarkdownTasks(text);

  const db = window.PsyduckDB;
  for (const item of parsed) {
    const id = hashId(fileName + "::" + item.title);
    const existing = await db.dbGet(db.STORES.tasks, id);
    await db.saveTask(
      Object.assign({}, existing, {
        id,
        title: item.title,
        done: item.done,
        doneAt: item.done ? (existing && existing.doneAt) || new Date().toISOString() : null,
        obsidianFile: fileName,
        obsidianLineIndex: item.lineIndex,
      })
    );
  }
  return parsed.length;
}

// Reescreve a linha correspondente no arquivo quando uma tarefa vinda
// do Obsidian é marcada/desmarcada no Psyduck. Reconfirma a linha pelo
// texto antes de sobrescrever (o arquivo pode ter sido editado por
// fora entre uma sincronização e outra); se não achar na posição
// esperada, procura a linha pelo título em qualquer lugar do arquivo.
async function writeTaskToggle(task) {
  if (!task.obsidianFile) return;
  const handle = await getStoredHandle();
  if (!handle) return;
  if (!(await ensurePermission(handle, "readwrite"))) return;

  const fileHandle = await handle.getFileHandle(task.obsidianFile);
  const file = await fileHandle.getFile();
  const lines = (await file.text()).split("\n");

  const checkbox = task.done ? "[x]" : "[ ]";
  const matchesTitle = (line) => line.includes(task.title);

  let targetIndex = task.obsidianLineIndex;
  if (targetIndex == null || targetIndex >= lines.length || !matchesTitle(lines[targetIndex])) {
    targetIndex = lines.findIndex(matchesTitle);
  }
  if (targetIndex === -1 || targetIndex == null) return;

  lines[targetIndex] = lines[targetIndex].replace(/\[( |x|X)\]/, checkbox);

  const writable = await fileHandle.createWritable();
  await writable.write(lines.join("\n"));
  await writable.close();
}

window.PsyduckObsidian = {
  isSupported,
  getStoredHandle,
  connectVault,
  ensurePermission,
  listMarkdownFiles,
  syncFromFile,
  writeTaskToggle,
};
