// Talia: public/talia.json (polska)  { c: { "R-C001": [tekst, luki] }, b: { "R-B0001": tekst } }
// Tłumaczenia: public/talia-en.json, -es, -el (te same ID). Brak tłumaczenia karty = wersja polska.
const cache = {};
/* global __BUILD__ */
const V = typeof __BUILD__ !== 'undefined' ? __BUILD__ : '1';
function getJson(url) { return fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})); }
// fresh = pobierz talię od nowa (np. gdy w grze pojawiła się karta, której ta strona jeszcze nie zna).
export function loadDeck(lang, fresh) {
  const l = lang || 'pl';
  const v = fresh ? String(Date.now()) : V;
  if (fresh) { Object.keys(cache).forEach((k) => { delete cache[k]; }); }
  // Polska talia + odmiana odpowiedzi przez przypadki (odmiana.json: c = przypadki luk, f = formy kart).
  if (!cache.pl) {
    cache.pl = Promise.all([
      fetch('/talia.json?v=' + v, { cache: 'no-cache' }).then((r) => r.json()),
      getJson('/odmiana.json?v=' + v),
    ]).then(([d, o]) => Object.assign(d, { k: o.c || {}, f: o.f || {}, lang: 'pl' }));
  }
  if (l === 'pl') return cache.pl;
  if (!cache[l]) {
    cache[l] = Promise.all([cache.pl, getJson('/talia-' + l + '.json?v=' + v)]).then(([pl, t]) => {
      const c = {}; const b = {};
      const tc = t.c || {}; const tb = t.b || {};
      Object.keys(pl.c).forEach((id) => {
        const x = tc[id];
        c[id] = x && x[0] && x[0].split('____').length === pl.c[id][0].split('____').length ? [x[0], pl.c[id][1]] : pl.c[id];
      });
      Object.keys(pl.b).forEach((id) => { b[id] = tb[id] || pl.b[id]; });
      return { c, b, lang: l };
    });
  }
  return cache[l];
}

// Czy talia zna wszystkie karty używane w tej chwili w grze.
export function deckKnows(deck, room, hand) {
  if (!deck || !room) return true;
  if (room.black && !deck.c[room.black]) return false;
  const ids = (hand || []).slice();
  (room.reveal || []).forEach((e) => (e.cards || []).forEach((id) => ids.push(id)));
  return ids.every((id) => !!deck.b[id]);
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
  if (/^I(['’]|$)/.test(firstWord)) return text; // angielskie „I”
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Odpowiedzi do danej czarnej karty – w przypadku, którego wymaga luka
// („Co zabrałbym na wyspę?” → „Ośmiornicę z trzema nogami”).
export function answersFor(deck, blackId, ids) {
  const k = (deck.k && deck.k[blackId]) || '';
  return (ids || []).map((id, i) => {
    const c = k[i] || (k.length === 1 ? k : '');
    const f = c && c !== 'n' && deck.f && deck.f[id] && deck.f[id][c];
    return f || deck.b[id] || '';
  });
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
