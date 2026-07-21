// mascot.js — o pato Psyduck (mascote principal), os patinhos
// colecionáveis da fazenda, e o cenário da fazenda em si. Estilo pixel
// art / cozy game (referência do usuário: Stardew Valley) — blocos
// retos (`<rect>`), sem curvas suaves, `shape-rendering: crispEdges`
// aplicado via CSS em toda .farm-bg/.duck-icon/.mascot-svg.

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

// Rosto em blocos (retângulos), não curvas — cada mood muda a
// sobrancelha (ângulo simulado por dois retinhos deslocados) e a boca.
const FACE_BY_MOOD = {
  confused: `
    <rect x="196" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="296" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="186" y="130" width="26" height="8" fill="#3a2a1a" transform="rotate(-8 199 134)"/>
    <rect x="298" y="126" width="26" height="8" fill="#3a2a1a" transform="rotate(8 311 130)"/>
    <rect x="222" y="216" width="10" height="10" fill="#3a2a1a"/>
    <rect x="280" y="216" width="10" height="10" fill="#3a2a1a"/>
  `,
  worried: `
    <rect x="198" y="154" width="18" height="18" fill="#3a2a1a"/>
    <rect x="296" y="154" width="18" height="18" fill="#3a2a1a"/>
    <rect x="190" y="138" width="24" height="7" fill="#3a2a1a" transform="rotate(10 202 141)"/>
    <rect x="298" y="134" width="24" height="7" fill="#3a2a1a" transform="rotate(-10 310 137)"/>
    <rect x="230" y="222" width="52" height="8" fill="#3a2a1a"/>
  `,
  happy: `
    <rect x="196" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="296" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="214" y="216" width="14" height="10" fill="#3a2a1a"/>
    <rect x="228" y="224" width="56" height="10" fill="#3a2a1a"/>
    <rect x="284" y="216" width="14" height="10" fill="#3a2a1a"/>
  `,
  proud: `
    <rect x="196" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="296" y="150" width="20" height="20" fill="#3a2a1a"/>
    <rect x="214" y="216" width="14" height="10" fill="#3a2a1a"/>
    <rect x="228" y="224" width="56" height="10" fill="#3a2a1a"/>
    <rect x="284" y="216" width="14" height="10" fill="#3a2a1a"/>
    <rect x="240" y="20" width="12" height="12" fill="#ffd23f"/>
    <rect x="260" y="12" width="12" height="12" fill="#ffd23f"/>
    <rect x="280" y="20" width="12" height="12" fill="#ffd23f"/>
  `,
  content: `
    <rect x="198" y="152" width="18" height="18" fill="#3a2a1a"/>
    <rect x="296" y="152" width="18" height="18" fill="#3a2a1a"/>
    <rect x="226" y="218" width="60" height="8" fill="#3a2a1a"/>
  `,
};

const ACCESSORY_MARKUP = {
  flower: `<rect x="150" y="60" width="24" height="24" fill="#f3a8c4"/><rect x="158" y="68" width="8" height="8" fill="#ffd23f"/>`,
  crown: `<rect x="200" y="8" width="16" height="20" fill="#ffd23f"/><rect x="224" y="0" width="16" height="28" fill="#ffd23f"/><rect x="248" y="8" width="16" height="20" fill="#ffd23f"/><rect x="196" y="26" width="72" height="10" fill="#c9660a"/>`,
  stars: `<rect x="140" y="40" width="14" height="14" fill="#fff" opacity="0.9"/><rect x="350" y="70" width="10" height="10" fill="#fff" opacity="0.8"/>`,
};

// Corpo do pato em blocos retos (pixel art), parametrizado por cor —
// mesma função serve o mascote grande e cada patinho da fazenda.
function duckBodyMarkup({ bodyColor, bellyColor, beakColor, face, accessory }) {
  return `
    <rect x="180" y="260" width="60" height="26" fill="${beakColor}"/>
    <rect x="272" y="260" width="60" height="26" fill="${beakColor}"/>
    <rect x="156" y="150" width="200" height="120" fill="${bodyColor}"/>
    <rect x="176" y="190" width="160" height="80" fill="${bellyColor}"/>
    <rect x="186" y="40" width="140" height="120" fill="${bodyColor}"/>
    <rect x="220" y="120" width="72" height="36" fill="${beakColor}"/>
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

// Uma vitória-régia (lily pad) — folha verde + florzinha, repetida no
// lago em posições fixas.
function lilyPad(cx, cy, scale = 1) {
  const s = 16 * scale;
  return `
    <rect x="${cx - s}" y="${cy - s * 0.6}" width="${s * 2}" height="${s * 1.2}" fill="var(--scene-lily)"/>
    <rect x="${cx - s * 0.3}" y="${cy - s * 0.9}" width="${s * 0.6}" height="${s * 0.6}" fill="var(--scene-lily-flower)"/>
  `;
}

// Pinheiro pixelado — tronco + 3 blocos verdes decrescentes (silhueta
// de escada, sem curva nenhuma).
function pineTree(x, y, scale = 1) {
  const w = 60 * scale;
  return `
    <rect x="${x + w * 0.42}" y="${y + w * 1.35}" width="${w * 0.16}" height="${w * 0.3}" fill="var(--scene-trunk)"/>
    <rect x="${x}" y="${y + w * 0.9}" width="${w}" height="${w * 0.45}" fill="var(--scene-pine)"/>
    <rect x="${x + w * 0.13}" y="${y + w * 0.45}" width="${w * 0.74}" height="${w * 0.45}" fill="var(--scene-pine)"/>
    <rect x="${x + w * 0.26}" y="${y}" width="${w * 0.48}" height="${w * 0.45}" fill="var(--scene-pine)"/>
  `;
}

// Árvore pequena e redonda (folhagem em bloco quadrado) perto da casa.
function roundTree(x, y, scale = 1) {
  const w = 46 * scale;
  return `
    <rect x="${x + w * 0.4}" y="${y + w * 0.7}" width="${w * 0.2}" height="${w * 0.5}" fill="var(--scene-trunk)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${w * 0.75}" fill="var(--scene-round-leaf)"/>
  `;
}

// Cena de fundo do lago/fazenda, estilo pixel art: céu, sol, colinas,
// casa de madeira, pinheiros, horta com vasos, cachorro, lago com 6
// vitórias-régias. Os patinhos colecionáveis entram por cima via CSS
// (não fazem parte deste SVG), pra cada um poder animar sozinho.
function renderFarmBackgroundSvg() {
  const lilies = [
    [560, 330, 1], [610, 355, 0.8], [660, 320, 0.9],
    [520, 360, 0.85], [700, 350, 1], [630, 300, 0.7],
  ]
    .map(([cx, cy, s]) => lilyPad(cx, cy, s))
    .join("");

  return `
  <svg viewBox="0 0 800 400" class="farm-bg" preserveAspectRatio="xMidYMax slice" aria-hidden="true" shape-rendering="crispEdges">
    <rect width="800" height="240" fill="var(--scene-sky-top)"/>
    <rect y="240" width="800" height="30" fill="var(--scene-sky-bottom)"/>
    <rect x="600" y="40" width="56" height="56" fill="var(--scene-sun)"/>
    <rect x="200" y="60" width="70" height="26" fill="var(--scene-cloud)"/>
    <rect x="216" y="46" width="40" height="20" fill="var(--scene-cloud)"/>

    <rect x="0" y="260" width="800" height="140" fill="var(--scene-hill-near)"/>
    <rect x="0" y="260" width="800" height="14" fill="var(--scene-hill-far)"/>

    <!-- casa -->
    <rect x="30" y="190" width="130" height="100" fill="var(--scene-barn)"/>
    <rect x="20" y="150" width="150" height="16" fill="var(--scene-barn-roof)"/>
    <rect x="40" y="166" width="130" height="16" fill="var(--scene-barn-roof)"/>
    <rect x="60" y="150" width="14" height="16" fill="var(--scene-barn-roof-dark)"/>
    <rect x="95" y="230" width="30" height="60" fill="var(--scene-barn-door)"/>
    <rect x="45" y="210" width="26" height="26" fill="var(--scene-window)"/>
    <rect x="56" y="210" width="4" height="26" fill="var(--scene-barn-roof-dark)"/>
    <rect x="45" y="221" width="26" height="4" fill="var(--scene-barn-roof-dark)"/>

    ${roundTree(170, 210, 1)}
    ${pineTree(400, 130, 1.4)}
    ${pineTree(460, 155, 1.1)}

    <!-- horta -->
    <rect x="220" y="280" width="90" height="34" fill="var(--scene-soil-frame)"/>
    <rect x="226" y="286" width="78" height="22" fill="var(--scene-soil)"/>
    <rect x="232" y="278" width="6" height="14" fill="var(--scene-round-leaf)"/>
    <rect x="252" y="274" width="6" height="18" fill="var(--scene-round-leaf)"/>
    <rect x="272" y="278" width="6" height="14" fill="var(--scene-round-leaf)"/>
    <rect x="290" y="276" width="6" height="16" fill="var(--scene-round-leaf)"/>
    <rect x="150" y="300" width="20" height="18" fill="var(--scene-pot)"/>
    <rect x="176" y="304" width="18" height="14" fill="var(--scene-pot)"/>
    <rect x="155" y="292" width="10" height="10" fill="var(--scene-round-leaf)"/>
    <rect x="180" y="296" width="10" height="10" fill="var(--scene-round-leaf)"/>

    <!-- cachorro -->
    <rect x="320" y="316" width="34" height="18" fill="var(--scene-dog)"/>
    <rect x="346" y="308" width="16" height="16" fill="var(--scene-dog)"/>
    <rect x="316" y="330" width="6" height="10" fill="var(--scene-dog)"/>
    <rect x="346" y="330" width="6" height="10" fill="var(--scene-dog-dark)"/>

    <!-- lago -->
    <rect x="480" y="290" width="260" height="90" fill="var(--scene-lake)"/>
    <rect x="480" y="288" width="260" height="6" fill="var(--scene-lake-edge)"/>
    ${lilies}
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
