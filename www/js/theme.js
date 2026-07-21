// theme.js — tema claro/escuro/automático + cor de destaque. Puro
// CSS custom properties, sem dependência externa (diferente do
// theartistsway, que vendoriza Fluent UI — aqui não precisamos disso).

const DEFAULT_ACCENT = "#f6a821";

function applyTheme(profile) {
  const mode = (profile && profile.themeMode) || "auto";
  const accent = (profile && profile.accentColor) || DEFAULT_ACCENT;

  let resolved = mode;
  if (mode === "auto") {
    resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.setProperty("--accent-color", accent);
}

async function initTheme() {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  applyTheme(profile);

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async () => {
      const current = (await db.getSetting("profile", null)) || {};
      if ((current.themeMode || "auto") === "auto") applyTheme(current);
    });
  }
}

async function setThemeMode(mode) {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  profile.themeMode = mode;
  await db.setSetting("profile", profile);
  applyTheme(profile);
}

async function setAccentColor(color) {
  const db = window.PsyduckDB;
  const profile = (await db.getSetting("profile", null)) || {};
  profile.accentColor = color;
  await db.setSetting("profile", profile);
  applyTheme(profile);
}

window.PsyduckTheme = { initTheme, applyTheme, setThemeMode, setAccentColor, DEFAULT_ACCENT };
