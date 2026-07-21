// mascot.js — o pato Psyduck reage ao seu estado (streak, atrasos, nível).
// SVG desenhado à mão (sem lib/emoji), pra não ter cara de template
// genérico. `moodFor()` decide o humor; `renderMascotSvg()` desenha.

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

function renderMascotSvg(mood) {
  const face = {
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
  };

  return `
  <svg viewBox="0 0 512 320" class="mascot-svg mascot-${mood}" role="img" aria-label="Mascote Psyduck: ${MOOD_LABELS[mood]}">
    <ellipse cx="256" cy="270" rx="150" ry="90" fill="#f6c445"/>
    <circle cx="256" cy="150" r="110" fill="#fbd669"/>
    <path d="M180 150 Q160 112 130 117 Q150 145 168 165 Z" fill="#f6a821"/>
    <path d="M332 150 Q352 112 382 117 Q362 145 344 165 Z" fill="#f6a821"/>
    <ellipse cx="256" cy="182" rx="42" ry="27" fill="#f2861f"/>
    ${face[mood]}
  </svg>`;
}

window.PsyduckMascot = { moodFor, renderMascotSvg, MOOD_LABELS };
