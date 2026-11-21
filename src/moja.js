// „Moja talia” – prywatne karty gracza: zdjęcie → rozpoznany tekst → karty.
// Karty są zapisane na telefonie (i w kopii zapasowej, jeśli ją zrobisz). W grze telefon
// dokłada je do pokoju (rooms/{kod}/players/{uid}/talia), więc widzi je tylko ta gra – nie publiczna talia.

const KEY = 'ol_moja';
export const BLANK = '____';

export function loadMine() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { c: d.c || {}, b: d.b || {}, n: d.n || 0, v: d.v || 0 };
  } catch (e) { return { c: {}, b: {}, n: 0, v: 0 }; }
}
export function saveMine(d) {
  const out = Object.assign({}, d, { v: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(out));
  return out;
}
export function countMine(d) { return Object.keys(d.c).length + Object.keys(d.b).length; }

function uidTag() {
  let t = localStorage.getItem('ol_moja_tag');
  if (!t) { t = Math.random().toString(36).slice(2, 6).toUpperCase(); localStorage.setItem('ol_moja_tag', t); }
  return t;
}

// cards: [{ kind: 'c'|'b', text, luki }]
export function addCards(d, cards) {
  const out = { c: Object.assign({}, d.c), b: Object.assign({}, d.b), n: d.n };
  const tag = uidTag();
  cards.forEach((x) => {
    out.n += 1;
    const id = 'P-' + tag + '-' + (x.kind === 'c' ? 'C' : 'B') + String(out.n).padStart(4, '0');
    if (x.kind === 'c') out.c[id] = [x.text, x.luki || 1];
    else out.b[id] = x.text;
  });
  return saveMine(out);
}
export function removeCard(d, id) {
  const out = { c: Object.assign({}, d.c), b: Object.assign({}, d.b), n: d.n };
  delete out.c[id]; delete out.b[id];
  return saveMine(out);
}
export function editCard(d, id, text) {
  const out = { c: Object.assign({}, d.c), b: Object.assign({}, d.b), n: d.n };
  if (out.c[id]) out.c[id] = [normBlanks(text), Math.min(2, Math.max(1, countBlanks(text)))];
  else out.b[id] = text.trim();
  return saveMine(out);
}

// ---------- rozpoznawanie tekstu ze zdjęcia (Tesseract, polski, działa w telefonie)
let workerP = null;
let progressCb = null;
function getWorker(onProgress) {
  if (!workerP) {
    workerP = import('tesseract.js').then(({ createWorker }) => createWorker('pol', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/',
      langPath: '/ocr',
      logger: (m) => { if (progressCb && m.status === 'recognizing text') progressCb(m.progress); },
    }));
  }
  progressCb = onProgress;
  return workerP;
}

// ---------- znajdowanie kart na zdjęciu
// Szukamy prostokątów w kolorze karty (czarne albo białe), czytamy tekst TYLKO z ich wnętrza.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function findCards(img, kind) {
  const S = 240; // mała kopia do szukania kart
  const sc = S / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * sc)); const h = Math.max(1, Math.round(img.height * sc));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const p = g.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = p[i * 4]; const gg = p[i * 4 + 1]; const b = p[i * 4 + 2];
    const y = 0.299 * r + 0.587 * gg + 0.114 * b;
    const sat = Math.max(r, gg, b) - Math.min(r, gg, b);
    mask[i] = kind === 'c' ? (y < 70 && sat < 60 ? 1 : 0) : (y > 165 && sat < 55 ? 1 : 0);
  }
  // domknięcie: litery w środku karty nie mogą jej „dziurawić” – wypełniamy wiersze między brzegami
  const closed = new Uint8Array(mask);
  const R = 3;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (mask[yy * w + xx]) continue;
      let l = 0; let rr = 0; let u = 0; let d = 0;
      for (let k = 1; k <= R; k++) {
        if (xx - k >= 0 && mask[yy * w + xx - k]) l = 1;
        if (xx + k < w && mask[yy * w + xx + k]) rr = 1;
        if (yy - k >= 0 && mask[(yy - k) * w + xx]) u = 1;
        if (yy + k < h && mask[(yy + k) * w + xx]) d = 1;
      }
      if ((l && rr) || (u && d)) closed[yy * w + xx] = 1;
    }
  }
  const seen = new Uint8Array(w * h);
  const boxes = [];
  for (let i = 0; i < w * h; i++) {
    if (!closed[i] || seen[i]) continue;
    let x0 = w; let y0 = h; let x1 = 0; let y1 = 0; let n = 0;
    const st = [i]; seen[i] = 1;
    while (st.length) {
      const j = st.pop(); const x = j % w; const y = (j - x) / w; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [j - 1, j + 1, j - w, j + w];
      for (let q = 0; q < 4; q++) {
        const k = nb[q];
        if (k < 0 || k >= w * h || seen[k] || !closed[k]) continue;
        if ((q === 0 && x === 0) || (q === 1 && x === w - 1)) continue;
        seen[k] = 1; st.push(k);
      }
    }
    const bw = x1 - x0 + 1; const bh = y1 - y0 + 1;
    const fill = n / (bw * bh); const ar = bw / bh;
    if (bw * bh > w * h * 0.03 && fill > 0.6 && ar > 0.35 && ar < 2.8) boxes.push({ x0, y0, x1, y1 });
  }
  // brak wyraźnej karty (zdjęcie z bliska) – całe zdjęcie
  if (!boxes.length) return [{ x: 0, y: 0, w: img.width, h: img.height }];
  boxes.sort((a, b) => (Math.abs(a.y0 - b.y0) < h * 0.15 ? a.x0 - b.x0 : a.y0 - b.y0));
  // trochę do środka, żeby nie łapać krawędzi i tego, co obok karty
  return boxes.map((b) => {
    const ix = (b.x1 - b.x0) * 0.04; const iy = (b.y1 - b.y0) * 0.03;
    return { x: (b.x0 + ix) / sc, y: (b.y0 + iy) / sc, w: (b.x1 - b.x0 + 1 - 2 * ix) / sc, h: (b.y1 - b.y0 + 1 - 2 * iy) / sc };
  });
}

// Wycinek karty → szare, jasne tło, ciemny tekst (czarne karty odwracamy).
function prepareCrop(img, box) {
  const s = Math.min(2, 1600 / Math.max(box.w, box.h));
  const w = Math.round(box.w * s); const h = Math.round(box.h * s);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h); const p = d.data;
  let sum = 0;
  for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = y; sum += y; }
  const dark = sum / (p.length / 4) < 120;
  let lo = 255; let hi = 0;
  for (let i = 0; i < p.length; i += 4) { const y = dark ? 255 - p[i] : p[i]; p[i] = y; if (y < lo) lo = y; if (y > hi) hi = y; }
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < p.length; i += 4) { const y = (p[i] - lo) * k; p[i] = y; p[i + 1] = y; p[i + 2] = y; }
  g.putImageData(d, 0, 0);
  return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'));
}

function wordsOf(data) {
  const out = [];
  let li = 0;
  (data.blocks || []).forEach((bl) => (bl.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => { li++; (l.words || []).forEach((w) => {
    if (w.text && w.text.trim()) out.push({ li, t: w.text, c: w.confidence, lh: l.bbox.y1 - l.bbox.y0, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 });
  }); })));
  return out;
}

// Tylko tekst karty: bez drobnego druku (logo, nazwa gry na dole), bez śmieci o niskiej pewności.
function cardText(ws) {
  if (!ws.length) return '';
  // wysokość linii (nie słowa – „co”, „na” są niskie, a należą do tekstu)
  const hs = ws.map((x) => x.lh).sort((a, b) => a - b);
  const big = hs[Math.floor(hs.length * 0.75)] || hs[hs.length - 1];
  const keep = ws.filter((x) => x.c > 40 && x.lh > big * 0.6 && /[\p{L}\p{N}_?!.,…-]/u.test(x.t));
  // największa zwarta grupa słów = tekst karty; kolejność czytania zostawiamy taką, jak podał czytnik
  const groups = clusterWords(keep, true);
  if (!groups.length) return '';
  groups.sort((a, b) => b.length - a.length);
  const g = groups[0].slice().sort((a, b) => keep.indexOf(a) - keep.indexOf(b));
  const lines = [];
  g.forEach((w) => { const last = lines[lines.length - 1]; if (last && last.li === w.li) last.t.push(w.t); else lines.push({ li: w.li, t: [w.t] }); });
  return lines.map((l) => l.t.join(' ')).join('\n');
}

export async function readPhoto(file, kind, onProgress) {
  const worker = await getWorker(null);
  const img = await loadImage(file);
  const boxes = findCards(img, kind);
  const texts = [];
  for (let i = 0; i < boxes.length; i++) {
    progressCb = (p) => onProgress && onProgress((i + p) / boxes.length);
    const blob = await prepareCrop(img, boxes[i]);
    const { data } = await worker.recognize(blob, {}, { text: true, blocks: true });
    const t = cardText(wordsOf(data));
    if (t) texts.push(t);
  }
  URL.revokeObjectURL(img.src);
  return cleanOcr(texts.join('\n\n'));
}

// Kilka kart na jednym zdjęciu: słowa leżące blisko siebie łączymy w grupy – każda grupa to karta.
function clusterWords(ws, raw) {
  if (!ws.length) return [];
  const hs = ws.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const h = hs[Math.floor(hs.length / 2)] || 20;
  const parent = ws.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => { parent[find(a)] = find(b); };
  for (let i = 0; i < ws.length; i++) {
    for (let j = i + 1; j < ws.length; j++) {
      const a = ws[i]; const b = ws[j];
      const vGap = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
      const hGap = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
      const sameLine = vGap === 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > h * 0.4;
      if (sameLine ? hGap < h * 1.6 : (vGap < h * 1.3 && hGap < h * 0.8)) join(i, j);
    }
  }
  const groups = {};
  ws.forEach((w, i) => { const r = find(i); (groups[r] = groups[r] || []).push(w); });
  if (raw) return Object.values(groups);
  const list = Object.values(groups).map((g) => {
    g.sort((a, b) => (Math.abs(a.y0 - b.y0) < h * 0.5 ? a.x0 - b.x0 : a.y0 - b.y0));
    const lines = [];
    g.forEach((w) => {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - w.y0) < h * 0.5) last.t.push(w.t); else lines.push({ y: w.y0, t: [w.t] });
    });
    return { x: Math.min.apply(null, g.map((w) => w.x0)), y: Math.min.apply(null, g.map((w) => w.y0)), text: lines.map((l) => l.t.join(' ')).join('\n') };
  });
  list.sort((a, b) => (Math.abs(a.y - b.y) < h * 3 ? a.x - b.x : a.y - b.y));
  return list.map((c) => c.text);
}

// ---------- porządkowanie tekstu
function normBlanks(t) {
  return t.replace(/[_＿]{2,}|[—–-]{3,}|\.{4,}|…{2,}/g, BLANK).replace(/\s+/g, ' ').trim();
}
function countBlanks(t) { return (normBlanks(t).match(/____/g) || []).length; }

export function cleanOcr(t) {
  return t
    .replace(/\r/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2')       // przeniesienia wyrazów
    .replace(/[|]/g, 'I')
    .replace(/[ \t]+/g, ' ')
    .split('\n').map((l) => l.trim())
    // logo / napisy firmowe na karcie: krótkie linie WIELKIMI LITERAMI
    .filter((l) => !(l.length >= 4 && l === l.toUpperCase() && /[A-ZĄĆĘŁŃÓŚŹŻ]{4}/.test(l) && l.split(' ').length <= 3 && !/[?!.]$/.test(l)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Każdy akapit (oddzielony pustą linią) = osobna karta.
export function parseCards(text, kind) {
  return text.split(/\n\s*\n/).map((par) => {
    let t = par.replace(/\n/g, ' ');
    let luki = 1;
    if (/\b(weź|wez|pick|wybierz)\s*2\b|\b2\s*x\b|\bx\s*2\b/i.test(t)) { luki = 2; t = t.replace(/\b(weź|wez|pick|wybierz)\s*2\b|\b2\s*x\b|\bx\s*2\b/ig, ''); }
    t = normBlanks(t);
    if (!t || t.length < 2) return null;
    if (kind === 'c') {
      let n = countBlanks(t);
      // Czytnik często gubi linię luki: zdanie bez „?” i bez luki → luka na końcu.
      // „na stypie ?” – spacja przed znakiem na końcu to zgubiona luka
      if (!n && /\s[?!.]$/.test(t)) { t = t.replace(/\s+([?!.])$/, ' ' + BLANK + '$1'); n = 1; }
      if (!n && !/\?\s*$/.test(t)) { t = t.replace(/[.\s]+$/, '') + ' ' + BLANK + '.'; n = 1; }
      if (n) luki = Math.min(2, Math.max(luki, n));
      return { kind, text: t, luki };
    }
    return { kind, text: t.replace(/____/g, '').trim() };
  }).filter(Boolean);
}

// ---------- talia w grze: dokładamy prywatne karty wszystkich graczy w pokoju
export function privateSig(room) {
  const players = (room && room.players) || {};
  return Object.keys(players).map((u) => (players[u].talia && players[u].talia.v) || '').join('|');
}
export function withPrivate(deck, room) {
  if (!deck) return deck;
  const players = (room && room.players) || {};
  const extra = Object.keys(players).map((u) => players[u].talia).filter(Boolean);
  if (!extra.length) return deck;
  const out = Object.assign({}, deck, { c: Object.assign({}, deck.c), b: Object.assign({}, deck.b) });
  extra.forEach((x) => {
    Object.keys(x.c || {}).forEach((id) => { out.c[id] = x.c[id]; });
    Object.keys(x.b || {}).forEach((id) => { out.b[id] = x.b[id]; });
  });
  return out;
}

// Kopia zapasowa do pliku / z pliku.
export function exportMine(d) {
  const blob = new Blob([JSON.stringify({ c: d.c, b: d.b, n: d.n }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'offlimits-moja-talia.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function importMine(d, json) {
  const x = JSON.parse(json);
  const out = { c: Object.assign({}, d.c, x.c || {}), b: Object.assign({}, d.b, x.b || {}), n: Math.max(d.n, x.n || 0) };
  return saveMine(out);
}

// 1 kartę / 2 karty / 5 kart
export function kartPl(n) {
  const d = n % 10; const dd = n % 100;
  const w = n === 1 ? 'kartę' : (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) ? 'karty' : 'kart';
  return n + ' ' + w;
}
