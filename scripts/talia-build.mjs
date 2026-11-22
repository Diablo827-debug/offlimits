// Buduje public/*.json z plików tekstowych w talia/ (jedna linijka = jedna karta).
// Uruchamiane przy każdym „npm run build”, więc zmiana w talia/*.txt po wgraniu trafia do gry.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PACKS, TARGETS } from './talia-files.mjs';

const pub = (f) => new URL('../public/' + f, import.meta.url);
const dir = new URL('../talia/', import.meta.url);
const hash = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 6).toUpperCase();

function readPack(lang, pack, kind) {
  // Pakiet = folder talia/<język>/<pakiet>/ z plikami off001-pytania.txt, off001-odpowiedzi.txt, off002-…
  const folder = new URL(`${lang}/${pack.file}/`, dir);
  if (!fs.existsSync(folder)) return null;
  const base = kind === 'c' ? 'pytania' : 'odpowiedzi';
  const files = fs.readdirSync(folder).filter((f) => f.endsWith(base + '.txt')).sort();
  if (!files.length) return null;
  const out = {};
  const text = files.map((f) => fs.readFileSync(new URL(f, folder), 'utf8')).join('\n');
  for (let line of text.replace(/\uFEFF/g, '').split(/\r?\n/)) {
    line = line.trim();
    if (!line || line[0] === '#' || line[0] === '-' || line[0] === '–') continue;
    let id, text;
    const m = line.match(/^([A-Z]-[CB][0-9A-Zh]+)\s*\|\s*(.*)$/);
    if (m) { id = m[1]; text = m[2].trim(); } else { text = line.replace(/^\|\s*/, ''); id = pack.prefix + '-' + (kind === 'c' ? 'C' : 'B') + 'h' + hash(text); }
    if (!text) continue;
    if (kind === 'c') {
      let luki = null;
      const l = text.match(/\s*\{(\d)\}\s*$/);
      if (l) { luki = +l[1]; text = text.slice(0, l.index).trim(); }
      out[id] = [text, luki || Math.max(1, (text.match(/____/g) || []).length)];
    } else out[id] = text;
  }
  return out;
}

let total = 0;
for (const [lang, targets] of Object.entries(TARGETS)) {
  for (const tg of targets) {
    const data = JSON.parse(fs.readFileSync(pub(tg.json), 'utf8'));
    const box = tg.key ? (data[tg.key] = data[tg.key] || { c: {}, b: {} }) : data;
    for (const kind of ['c', 'b']) {
      const merged = {};
      let any = false;
      for (const pack of PACKS.filter((p) => tg.prefixes.includes(p.prefix))) {
        const cards = readPack(lang, pack, kind);
        if (cards) { any = true; Object.assign(merged, cards); }
        else Object.entries(box[kind] || {}).forEach(([id, v]) => { if (id[0] === pack.prefix) merged[id] = v; });
      }
      if (any) { box[kind] = merged; total += Object.keys(merged).length; }
    }
    fs.writeFileSync(pub(tg.json), JSON.stringify(data));
  }
}

// Odmiana: jeśli tekst karty zmienił się od czasu wygenerowania form, stare formy wyrzucamy (zostaje mianownik).
const bazaP = new URL('../tools/odmiana/baza.json', import.meta.url);
if (fs.existsSync(bazaP)) {
  const baza = JSON.parse(fs.readFileSync(bazaP, 'utf8'));
  const o = JSON.parse(fs.readFileSync(pub('odmiana.json'), 'utf8'));
  const pl = {};
  for (const tg of TARGETS.pl) { const d = JSON.parse(fs.readFileSync(pub(tg.json), 'utf8')); const x = tg.key ? d[tg.key] : d; Object.assign(pl, x.c, x.b); }
  let dropped = 0;
  const txt = (v) => (Array.isArray(v) ? v[0] : v);
  for (const id of Object.keys(o.f || {})) if (pl[id] === undefined || txt(pl[id]) !== baza[id]) { delete o.f[id]; dropped++; }
  for (const id of Object.keys(o.c || {})) if (pl[id] === undefined || txt(pl[id]) !== baza[id]) { delete o.c[id]; dropped++; }
  fs.writeFileSync(pub('odmiana.json'), JSON.stringify(o));
  if (dropped) console.log('talia: odmiana usunięta dla zmienionych kart:', dropped);
}
console.log('talia: zbudowano', total, 'kart z plików talia/*.txt');
