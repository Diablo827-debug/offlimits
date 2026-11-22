// Jednorazowo / na żądanie: zapisuje obecne public/*.json jako czytelne pliki talia/<język>/<pakiet>-pytania|odpowiedzi.txt
import fs from 'node:fs';
import { PACKS, TARGETS, HEADER } from './talia-files.mjs';
const pub = (f) => JSON.parse(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8'));
for (const [lang, targets] of Object.entries(TARGETS)) {
  let off = 0; // pakiety numerowane kolejno w całym języku: off001, off002…
  fs.mkdirSync(new URL(`../talia/${lang}/`, import.meta.url), { recursive: true });
  for (const tg of targets) {
    const d = pub(tg.json); const box = tg.key ? d[tg.key] : d;
    for (const pack of PACKS.filter((p) => tg.prefixes.includes(p.prefix))) {
      const folder = new URL(`../talia/${lang}/${pack.file}/`, import.meta.url);
      fs.mkdirSync(folder, { recursive: true });
      const chunks = { c: [], b: [] };
      for (const kind of ['c', 'b']) {
        const lines = Object.entries(box[kind]).filter(([id]) => id[0] === pack.prefix).map(([id, v]) => {
          if (kind === 'b') return id + ' | ' + v;
          const auto = Math.max(1, (v[0].match(/____/g) || []).length);
          return id + ' | ' + v[0] + (v[1] !== auto ? ' {' + v[1] + '}' : '');
        });
        const size = kind === 'c' ? 100 : 200; // pakiet = 100 pytań + 200 odpowiedzi
        for (let i = 0; i < lines.length; i += size) chunks[kind].push({ from: i + 1, to: Math.min(i + size, lines.length), all: lines.length, lines: lines.slice(i, i + size) });
      }
      const n = Math.max(chunks.c.length, chunks.b.length);
      for (let k = 0; k < n; k++) {
        const nr = 'off' + String(++off).padStart(3, '0');
        for (const kind of ['c', 'b']) {
          const ch = chunks[kind][k];
          if (!ch) continue;
          fs.writeFileSync(new URL(`${nr}-${kind === 'c' ? 'pytania' : 'odpowiedzi'}.txt`, folder), HEADER(pack, kind, lang).replace('język: ' + lang, `język: ${lang} · pakiet ${nr.toUpperCase()} (karty ${ch.from}–${ch.to} z ${ch.all})`) + ch.lines.join('\n') + '\n');
        }
      }
    }
  }
}
