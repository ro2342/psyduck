// auth.js — login com Google no PWA, via Authorization Code + PKCE.
// Mesmo padrão validado no theartistsway (www/js/auth.js de lá):
// o PWA roda num navegador de verdade com origem HTTPS real (GitHub
// Pages), então usa o fluxo padrão de login de site (redireciona pro
// Google, volta com um "code", troca por tokens com PKCE). O Google
// exige client_secret mesmo em clientes "Web application" com PKCE —
// o secret nunca fica em texto puro aqui: o workflow do GitHub Actions
// substitui o placeholder abaixo pelo valor real (guardado como
// secret do repositório) só no artefato publicado no Pages. O arquivo
// commitado no git sempre mantém o placeholder.
//
// Precisa de contexto seguro (HTTPS ou http://localhost) porque usa
// crypto.subtle — funciona em ro2342.github.io/psyduck/, não funciona
// acessando por IP na rede local em HTTP puro.

const GOOGLE_WEB_CLIENT_ID = "600716955530-kalnpdricjemjisq8oscpc9br57kbbl3.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_SECRET = "__GOOGLE_OAUTH_WEB_CLIENT_SECRET__";
const FIREBASE_API_KEY = "AIzaSyALKwiaLBw6qOtAB8wi6u0M85jaNaQvp-Q";
const AUTH_REDIRECT_URI = window.location.origin + window.location.pathname;
const AUTH_STATE_KEY = "psyduck_oauth_state";
const AUTH_VERIFIER_KEY = "psyduck_oauth_verifier";

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return base64UrlEncode(new Uint8Array(digest));
}

async function startGoogleLogin() {
  const verifier = randomString(32);
  const state = randomString(16);
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(AUTH_VERIFIER_KEY, verifier);
  sessionStorage.setItem(AUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    redirect_uri: AUTH_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  window.location.href = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}

// Troca o id_token do Google pelo login do Firebase (Identity Toolkit
// signInWithIdp) — mesma chamada que o AuthService.cs do UWP vai usar
// quando a v0.3.0 chegar.
async function exchangeWithFirebase(token, tokenParamName) {
  const postBody = `${tokenParamName}=${encodeURIComponent(token)}&providerId=google.com`;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postBody, requestUri: AUTH_REDIRECT_URI, returnIdpCredential: true, returnSecureToken: true }),
    }
  );
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ? json.error.message : "Falha no login com o Firebase.");
  }
  return {
    uid: json.localId,
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    email: json.email || null,
    displayName: json.displayName || null,
    provider: "Google",
    idTokenExpiresAt: new Date(Date.now() + (parseInt(json.expiresIn, 10) || 3600) * 1000).toISOString(),
  };
}

// Se a URL atual tem ?code=...&state=..., completa o login em
// andamento. Chamado uma vez, ao carregar o app.
async function handleRedirectIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  const expectedState = sessionStorage.getItem(AUTH_STATE_KEY);
  const verifier = sessionStorage.getItem(AUTH_VERIFIER_KEY);
  const state = params.get("state");
  sessionStorage.removeItem(AUTH_STATE_KEY);
  sessionStorage.removeItem(AUTH_VERIFIER_KEY);

  // Limpa ?code=/?state= da barra de endereço antes de mais nada — um
  // F5 não deve tentar reusar o code (só vale uma vez).
  window.history.replaceState({}, "", window.location.pathname + window.location.hash);

  if (params.get("error")) {
    console.warn("Login com Google cancelado/erro:", params.get("error"));
    return;
  }
  if (!verifier || state !== expectedState) {
    console.warn("Login com Google: state inválido ou verifier perdido.");
    return;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_WEB_CLIENT_ID,
      client_secret: GOOGLE_WEB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      redirect_uri: AUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.warn("Falha ao trocar o code do Google:", tokenJson);
    return;
  }

  const token = tokenJson.id_token || tokenJson.access_token;
  const tokenParamName = tokenJson.id_token ? "id_token" : "access_token";
  const session = await exchangeWithFirebase(token, tokenParamName);
  await window.PsyduckDB.setSetting("session", session);
  if (window.PsyduckSync) window.PsyduckSync.syncAll();
}

async function getSession() {
  return window.PsyduckDB.getSetting("session", null);
}

async function signOut() {
  await window.PsyduckDB.setSetting("session", null);
}

// Renova o idToken via refresh token.
async function refreshIdToken(session) {
  try {
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken }),
    });
    const json = await response.json();
    if (!response.ok) return null;

    const updated = Object.assign({}, session, {
      idToken: json.id_token,
      idTokenExpiresAt: new Date(Date.now() + (parseInt(json.expires_in, 10) || 3600) * 1000).toISOString(),
    });
    await window.PsyduckDB.setSetting("session", updated);
    return updated;
  } catch (err) {
    return null;
  }
}

function needsRefresh(session) {
  return new Date(session.idTokenExpiresAt).getTime() - 60000 <= Date.now();
}

window.PsyduckAuth = {
  startGoogleLogin,
  handleRedirectIfNeeded,
  getSession,
  signOut,
  refreshIdToken,
  needsRefresh,
};

// Roda uma vez ao carregar o script — processa o retorno do redirect
// do Google (?code=...), se houver, sem precisar de nenhuma tela
// específica aberta.
handleRedirectIfNeeded().catch((err) => console.warn("Erro ao processar retorno do login com Google:", err));
