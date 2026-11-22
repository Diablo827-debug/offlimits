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
      fs.writeFileSync(new URL(`../talia/${lang}/${pack.file}-${kind === 'c' ? 'pytania' : 'odpowiedzi'}.txt`, import.meta.url), HEADER(pack, kind, lang) + lines.join('\n') + '\n');
    }
  }
}
