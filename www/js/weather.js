// weather.js — card de clima no dashboard do Início. Usa geolocalização
// do navegador + Open-Meteo (API gratuita, sem chave). Cacheia por 30
// minutos em profile.weatherCache pra não pedir localização/rede toda
// hora que o Início renderiza.

const CACHE_MINUTES = 30;

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

async function fetchWeather(coords) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m&forecast_days=1&timezone=auto`;
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
    const nowHour = new Date().getHours();
    const hourlyTemps = (data.hourly.temperature_2m || []).slice(nowHour, nowHour + 12);
    const cache = {
      currentTemp: data.current_weather.temperature,
      hourlyTemps,
      fetchedAt: new Date().toISOString(),
    };
    await window.PsyduckDB.setSetting("weatherCache", cache);
    return cache;
  } catch (err) {
    console.warn("Clima indisponível:", err);
    return cached || null;
  }
}

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
      <section class="dash-col">
        <h3>Clima</h3>
        <p class="empty">Sem localização ainda.</p>
        <button class="btn btn-primary" onclick="window.PsyduckWeather.requestLocation().then(() => render())">Usar minha localização</button>
      </section>
    `;
  }
  const data = await getWeatherData();
  if (!data) {
    return `<section class="dash-col"><h3>Clima</h3><p class="empty">Não consegui buscar agora.</p></section>`;
  }
  return `
    <section class="dash-col">
      <h3>Clima</h3>
      <p class="dash-level">${Math.round(data.currentTemp)}°C</p>
      ${renderSparkline(data.hourlyTemps)}
      <p class="hint">Próximas horas</p>
    </section>
  `;
}

window.PsyduckWeather = { requestLocation, getWeatherData, renderWeatherColumn };
