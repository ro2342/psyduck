// mascot.js — o pato Psyduck (mascote principal) e os patinhos
// colecionáveis da fazenda. Tudo SVG desenhado à mão, com cor
// parametrizável por variante (não filtro CSS) pra cada Psyduck da
// família parecer de verdade um bichinho diferente, tipo Pokémon.

function moodFor({ overdueCount, streak, justLeveledUp }) {
  if (justLeveledUp) return "proud";
  if (overdueCount > 0) return "worried";
  if (streak >= 3) return "happy";
  return "confused"; // humor padrão — o "clássico" do pato
}

const MOOD_LABELS = {
  confused: "Meio perdido, mas pronto pra começar.",
  worried: "Tem coisa atrasada te esperando.",
  happy: "Sequência firme — respeito.",
  proud: "Subiu de nível! Poderoso.",
};

const FACE_BY_MOOD = {
  confused: `
    <circle cx="214" cy="168" r="15" fill="#3a2a1a"/>
    <circle cx="298" cy="168" r="15" fill="#3a2a1a"/>
    <path d="M196 146 q18 20 36 0" stroke="#3a2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M280 150 q18 -18 36 2" stroke="#3a2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M120 90 q20 -30 10 -55" stroke="#f2861f" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M392 90 q-20 -30 -10 -55" stroke="#f2861f" stroke-width="9" fill="none" stroke-linecap="round"/>
  `,
  worried: `
    <circle cx="214" cy="172" r="14" fill="#3a2a1a"/>
    <circle cx="298" cy="172" r="14" fill="#3a2a1a"/>
    <path d="M198 152 q16 12 34 2" stroke="#3a2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M282 154 q16 -12 34 -2" stroke="#3a2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M226 250 q30 -18 60 0" stroke="#3a2a1a" stroke-width="6" fill="none" stroke-linecap="round"/>
  `,
  happy: `
    <path d="M196 168 q18 18 36 0" stroke="#3a2a1a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M280 168 q18 18 36 0" stroke="#3a2a1a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M214 240 q42 36 84 0" stroke="#3a2a1a" stroke-width="8" fill="none" stroke-linecap="round"/>
  `,
  proud: `
    <path d="M196 168 q18 18 36 0" stroke="#3a2a1a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M280 168 q18 18 36 0" stroke="#3a2a1a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M210 236 q46 40 92 0" stroke="#3a2a1a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M256 40 l10 22 24 3 -18 16 5 24 -21 -12 -21 12 5 -24 -18 -16 24 -3 z" fill="#ffd23f" stroke="#f2861f" stroke-width="2"/>
  `,
  content: `
    <path d="M196 168 q18 14 36 0" stroke="#3a2a1a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M280 168 q18 14 36 0" stroke="#3a2a1a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M226 238 q30 20 60 0" stroke="#3a2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
  `,
};

const ACCESSORY_MARKUP = {
  flower: `<circle cx="150" cy="120" r="14" fill="#f3a8c4" stroke="#ec86ac" stroke-width="3"/><circle cx="150" cy="120" r="5" fill="#ffd23f"/>`,
  crown: `<path d="M206 66 l14 26 20 -22 6 30 20 -22 6 34 -112 0 6 -34 20 22 6 -30 z" fill="#ffd23f" stroke="#c9660a" stroke-width="3"/>`,
  stars: `<path d="M150 90 l6 14 15 2 -11 10 3 15 -13 -8 -13 8 3 -15 -11 -10 15 -2 z" fill="#fff" opacity="0.9"/><path d="M340 110 l4 10 11 1 -8 7 2 11 -9 -6 -9 6 2 -11 -8 -7 11 -1 z" fill="#fff" opacity="0.8"/>`,
};

// Corpo do pato em si, parametrizado por cor. Retorna o miolo do SVG
// (sem a tag <svg> externa) pra poder ser reusado em tamanhos diferentes.
function duckBodyMarkup({ bodyColor, bellyColor, beakColor, face, accessory }) {
  return `
    <ellipse cx="256" cy="270" rx="150" ry="90" fill="${bellyColor}"/>
    <circle cx="256" cy="150" r="110" fill="${bodyColor}"/>
    <path d="M180 150 Q160 112 130 117 Q150 145 168 165 Z" fill="${beakColor}" opacity="0.55"/>
    <path d="M332 150 Q352 112 382 117 Q362 145 344 165 Z" fill="${beakColor}" opacity="0.55"/>
    <ellipse cx="256" cy="182" rx="42" ry="27" fill="${beakColor}"/>
    ${face}
    ${accessory ? ACCESSORY_MARKUP[accessory] || "" : ""}
  `;
}

function renderMascotSvg(mood) {
  const markup = duckBodyMarkup({
    bodyColor: "#fbd669",
    bellyColor: "#f6c445",
    beakColor: "#f2861f",
    face: FACE_BY_MOOD[mood],
  });
  return `
  <svg viewBox="0 0 512 320" class="mascot-svg mascot-${mood}" role="img" aria-label="Mascote Psyduck: ${MOOD_LABELS[mood]}">
    ${markup}
  </svg>`;
}

function duckVariant(variantId) {
  return window.PsyduckData.DUCK_VARIANTS.find((v) => v.id === variantId) || window.PsyduckData.DUCK_VARIANTS[0];
}

// Um patinho da fazenda, do tamanho de um ícone — usado no cenário do
// lago e em qualquer lista/miniatura.
function renderDuckIcon(variantId, { size = 72 } = {}) {
  const v = duckVariant(variantId);
  const markup = duckBodyMarkup({
    bodyColor: v.bodyColor,
    bellyColor: v.bellyColor,
    beakColor: v.beakColor,
    face: FACE_BY_MOOD.content,
    accessory: v.accessory,
  });
  return `<svg viewBox="0 0 512 320" width="${size}" height="${size * 0.625}" class="duck-icon duck-${v.id}" role="img" aria-label="${v.label}">${markup}</svg>`;
}

// Cena de fundo do lago/fazenda (céu, colinas, lago, celeiro) — os
// patinhos são posicionados por cima via CSS, não fazem parte do SVG
// de fundo, pra cada um poder ter sua própria posição/animação.
function renderFarmBackgroundSvg() {
  return `
  <svg viewBox="0 0 800 400" class="farm-bg" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--scene-sky-top)"/>
        <stop offset="100%" stop-color="var(--scene-sky-bottom)"/>
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#skyGrad)"/>
    <circle cx="660" cy="70" r="46" fill="var(--scene-sun)"/>
    <path d="M0 220 Q140 170 280 220 T560 220 T800 200 V400 H0 Z" fill="var(--scene-hill-far)"/>
    <path d="M0 260 Q200 210 400 260 T800 250 V400 H0 Z" fill="var(--scene-hill-near)"/>
    <rect x="80" y="150" width="70" height="60" fill="var(--scene-barn)" rx="4"/>
    <path d="M72 150 L115 110 L158 150 Z" fill="var(--scene-barn-roof)"/>
    <rect x="105" y="175" width="20" height="35" fill="var(--scene-barn-door)"/>
    <ellipse cx="430" cy="345" rx="300" ry="60" fill="var(--scene-lake)"/>
    <ellipse cx="430" cy="345" rx="300" ry="60" fill="none" stroke="var(--scene-lake-edge)" stroke-width="3" opacity="0.5"/>
    <path d="M120 330 q6 -24 0 -46" stroke="var(--scene-reed)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M136 336 q6 -30 -2 -54" stroke="var(--scene-reed)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M700 330 q-6 -24 0 -46" stroke="var(--scene-reed)" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

window.PsyduckMascot = {
  moodFor,
  renderMascotSvg,
  renderDuckIcon,
  renderFarmBackgroundSvg,
  duckVariant,
  MOOD_LABELS,
};
