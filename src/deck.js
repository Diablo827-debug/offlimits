// Talia: public/talia.json  { c: { "R-C001": [tekst, luki] }, b: { "R-B0001": tekst } }
let cache = null;
export function loadDeck() {
  if (!cache) cache = fetch('/talia.json').then((r) => r.json());
  return cache;
}

// Rodzinny: tylko R. Po 22:00: czarne N, białe N + R. Bez tabu: czarne X, białe X + N + R.
export function idsFor(deck, mode, kind) {
  let prefixes;
  if (mode === 'wszystkie') prefixes = ['R', 'N', 'X'];
  else if (mode === 'bez') prefixes = kind === 'c' ? ['X'] : ['X', 'N', 'R'];
  else if (kind === 'c') prefixes = mode === 'po22' ? ['N'] : ['R'];
  else prefixes = mode === 'po22' ? ['N', 'R'] : ['R'];
  return Object.keys(deck[kind]).filter((id) => prefixes.indexOf(id[0]) >= 0);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function stripEnd(t) { return t.replace(/[.!]+$/, ''); }

// Mała litera, gdy odpowiedź trafia do środka zdania (ale nie skróty typu „SMS”).
function inSentence(text, before) {
  const trimmed = before.replace(/\s+$/, '');
  const startsSentence = trimmed === '' || /[.?!]$/.test(trimmed);
  if (startsSentence) return text;
  const firstWord = text.split(/\s/)[0];
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Zwraca części zdania, żeby TV mógł wyróżnić wstawione odpowiedzi kolorem.
export function fillParts(black, answers) {
  const parts = [];
  if (black.indexOf('____') >= 0) {
    const chunks = black.split('____');
    chunks.forEach((chunk, i) => {
      if (chunk) parts.push({ t: chunk });
      if (i < chunks.length - 1) {
        const a = answers[i];
        if (a) {
          const before = chunks.slice(0, i + 1).join('');
          parts.push({ t: inSentence(stripEnd(a), before), a: true });
        } else parts.push({ t: '____', blank: true });
      }
    });
  } else {
    parts.push({ t: black + ' ' });
    answers.forEach((a, i) => parts.push({ t: (i ? ' ' : '') + a, a: true }));
  }
  return parts;
}

export function fillText(black, answers) {
  return fillParts(black, answers).map((p) => p.t).join('');
}
