// weather.js — card de clima no dashboard do Início. Usa geolocalização
// do navegador + Open-Meteo (API gratuita, sem chave). Cacheia por 30
// minutos em profile.weatherCache pra não pedir localização/rede toda
// hora que o Início renderiza.

const CACHE_MINUTES = 30;

// Cache em memória (síncrono) do último código de clima visto — a cena
// (mascot.js) precisa ler isso de forma síncrona pra decidir qual
// classe de clima aplicar no SVG, sem esperar um fetch a cada
// renderização. Começa em "clear" até o primeiro fetch real terminar.
let lastWeatherCode = 0;

// Mapeia os códigos WMO do Open-Meteo pra uma das 4 classes visuais
// que a cena entende: clear | rain | storm | snow.
function weatherCodeToSceneClass(code) {
  if ([95, 96, 99].includes(code)) return "weather-active-storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather-active-snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "weather-active-rain";
  return "weather-active-clear";
}

// Chamada pela cena (mascot.js), de forma síncrona, sempre que ela
// precisa desenhar — reflete o último clima realmente buscado.
function getSceneWeatherClass() {
  return weatherCodeToSceneClass(lastWeatherCode);
}

// Dia (07-17h) / Pôr do sol (17-19h) / Noite (19-05h) / Nascer (05-07h)
// — mesma faixa de horário do cenário original do usuário.
function getSceneTimeClass() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "theme-sunrise";
  if (hour >= 7 && hour < 17) return "theme-day";
  if (hour >= 17 && hour < 19) return "theme-sunset";
  return "theme-night";
}

async function getStoredCoords() {
  return window.PsyduckDB.getSetting("weatherCoords", null);
}

// Pede permissão de localização (gesto do usuário) e guarda lat/lon.
async function requestLocation() {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        await window.PsyduckDB.setSetting("weatherCoords", coords);
        resolve(coords);
      },
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

// forecast_days=2 (não 1): perto do fim do dia, "hoje" sozinho só tem
// poucas horas restantes — o gráfico de "próximas 12h" ficava quase
// vazio à noite. Com 2 dias, sempre sobra hora suficiente pra frente.
async function fetchWeather(coords) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao buscar clima: " + res.status);
  return res.json();
}

// Retorna os dados prontos pra desenhar o card, usando cache de 30min.
async function getWeatherData() {
  const cached = await window.PsyduckDB.getSetting("weatherCache", null);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MINUTES * 60000) {
    return cached;
  }
  const coords = await getStoredCoords();
  if (!coords) return null;
  try {
    const data = await fetchWeather(coords);
    // Acha a hora atual de verdade dentro do array de timestamps
    // devolvido (timezone=auto -- os horários vêm no fuso LOCAL do
    // lugar, não UTC) em vez de supor que o array começa à meia-noite
    // de "hoje" — isso que causava o gráfico ficar vazio/curto demais
    // à noite. Usa getters locais do Date (não toISOString, que é UTC
    // e bateria errado com o fuso da localização).
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const nowLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
    const times = data.hourly.time || [];
    let startIndex = times.findIndex((t) => t.slice(0, 13) >= nowLocal);
    if (startIndex === -1) startIndex = 0;
    const hourlyTemps = (data.hourly.temperature_2m || []).slice(startIndex, startIndex + 12);
    const weatherCode = data.current_weather.weathercode;
    const cache = {
      currentTemp: data.current_weather.temperature,
      hourlyTemps,
      weatherCode,
      fetchedAt: new Date().toISOString(),
    };
    lastWeatherCode = weatherCode;
    await window.PsyduckDB.setSetting("weatherCache", cache);
    return cache;
  } catch (err) {
    console.warn("Clima indisponível:", err);
    return cached || null;
  }
}

// Roda uma vez ao carregar o script: se já existir clima cacheado de
// uma sessão anterior, usa ele pra cena não começar sempre em "clear"
// até o primeiro fetch novo terminar.
(async () => {
  const cached = await window.PsyduckDB.getSetting("weatherCache", null);
  if (cached && typeof cached.weatherCode === "number") lastWeatherCode = cached.weatherCode;
})();

function renderSparkline(temps) {
  if (!temps || temps.length < 2) return "";
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;
  const points = temps
    .map((t, i) => {
      const x = (i / (temps.length - 1)) * 100;
      const y = 32 - ((t - min) / range) * 28 - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return `<svg viewBox="0 0 100 32" class="weather-sparkline" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="var(--accent-color)" stroke-width="2.5"/></svg>`;
}

async function renderWeatherColumn() {
  const coords = await getStoredCoords();
  if (!coords) {
    return `
      <section class="column col-clima">
        <div class="column-header">Clima</div>
        <div class="column-content">
          <p class="empty">Sem localização ainda.</p>
          <button class="btn btn-primary" onclick="window.PsyduckWeather.requestLocation().then(() => render())">Usar localização</button>
        </div>
      </section>
    `;
  }
  const data = await getWeatherData();
  if (!data) {
    return `<section class="column col-clima"><div class="column-header">Clima</div><div class="column-content"><p class="empty">Não consegui buscar agora.</p></div></section>`;
  }
  return `
    <section class="column col-clima">
      <div class="column-header">Clima</div>
      <div class="column-content">
        <p class="dash-level">${Math.round(data.currentTemp)}°C</p>
        ${renderSparkline(data.hourlyTemps)}
        <p class="hint">Próximas horas</p>
      </div>
    </section>
  `;
}

window.PsyduckWeather = { requestLocation, getWeatherData, renderWeatherColumn, getSceneWeatherClass, getSceneTimeClass };
