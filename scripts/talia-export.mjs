// Jednorazowo / na żądanie: zapisuje obecne public/*.json jako czytelne pliki talia/<język>/<pakiet>-pytania|odpowiedzi.txt
import fs from 'node:fs';
import { PACKS, TARGETS, HEADER } from './talia-files.mjs';
const pub = (f) => JSON.parse(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8'));
for (const [lang, targets] of Object.entries(TARGETS)) {
  fs.mkdirSync(new URL(`../talia/${lang}/`, import.meta.url), { recursive: true });
  for (const tg of targets) {
    const d = pub(tg.json); const box = tg.key ? d[tg.key] : d;
    for (const pack of PACKS.filter((p) => tg.prefixes.includes(p.prefix))) for (const kind of ['c', 'b']) {
      const lines = Object.entries(box[kind]).filter(([id]) => id[0] === pack.prefix).map(([id, v]) => {
        if (kind === 'b') return id + ' | ' + v;
        const auto = Math.max(1, (v[0].match(/____/g) || []).length);
        return id + ' | ' + v[0] + (v[1] !== auto ? ' {' + v[1] + '}' : '');
      });
      // Paczki po 100 pytań / 200 odpowiedzi – łatwiej przejrzeć i poprawić.
      const size = kind === 'c' ? 100 : 200, base = kind === 'c' ? 'pytania' : 'odpowiedzi';
      const folder = new URL(`../talia/${lang}/${pack.file}/`, import.meta.url);
      fs.mkdirSync(folder, { recursive: true });
      for (let i = 0, n = 1; i < lines.length; i += size, n++) {
        const nr = String(n).padStart(2, '0');
        fs.writeFileSync(new URL(`${base}-${nr}.txt`, folder), HEADER(pack, kind, lang).replace('język: ' + lang, `język: ${lang} · paczka ${nr} (karty ${i + 1}–${Math.min(i + size, lines.length)} z ${lines.length})`) + lines.slice(i, i + size).join('\n') + '\n');
      }
    }
  }
}
