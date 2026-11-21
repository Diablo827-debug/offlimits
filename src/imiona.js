// Odmiana imion graczy w dopełniaczu (kogo?): „Punkt dla Kamila”, „Punkt dla Ani”, „Punkt dla Tomka”.
// Reguły dla polskich imion i zdrobnień; czego nie umiemy odmienić – zostawiamy bez zmian.

const SOFT = { ni: 1, si: 1, zi: 1, ci: 1, dzi: 1 };
const KEEP = /^(ola|ula|jola|ela|iza|ida|ana)$/i; // krótkie – reguła ogólna i tak działa

function word(w) {
  if (!/^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{2,}$/.test(w)) return w;
  const low = w.toLowerCase();
  const end = (s) => low.endsWith(s);
  const cut = (n, add) => w.slice(0, w.length - n) + add;
  void KEEP;
  // -a (głównie żeńskie, też Kuba, Barnaba)
  if (end('a')) {
    if (end('ia')) {
      const pre = low.slice(-3, -1); const pre3 = low.slice(-4, -1);
      if (SOFT[pre] || SOFT[pre3]) return cut(1, ''); // Ania → Ani, Kasia → Kasi, Zuzia → Zuzi
      return cut(1, 'i'); // Natalia → Natalii, Julia → Julii
    }
    if (/[aeiouyó]ja$/.test(low)) return cut(2, 'i'); // Maja → Mai, Kaja → Kai
    if (end('ja')) return cut(1, 'i'); // Zoja? rzadkie
    if (/[kg]a$/.test(low)) return cut(1, 'i'); // Monika → Moniki, Olga → Olgi
    if (end('la')) return cut(1, 'i'); // Ola → Oli, Ula → Uli
    return cut(1, 'y'); // Ewa → Ewy, Kuba → Kuby, Grażyna → Grażyny
  }
  // -o (Zdzisio, Kazio, Bruno)
  if (end('io')) return cut(1, 'a'); // Zdzisio → Zdzisia
  if (end('o')) return cut(1, 'a'); // Bruno → Bruna
  // -y / -i (Jerzy, Antoni)
  if (end('y')) return cut(1, 'ego'); // Jerzy → Jerzego
  if (end('i')) return w + 'ego'; // Antoni → Antoniego
  if (/[eu]$/.test(low)) return w;
  // -ek po spółgłosce: Tomek → Tomka, Wojtek → Wojtka, Bartek → Bartka
  if (/[^aeiouyąęó]ek$/.test(low)) return cut(2, 'ka');
  if (end('eł')) return cut(2, 'ła'); // Paweł → Pawła
  if (end('ieć')) return cut(3, 'ćca');
  // spółgłoska: Kamil → Kamila, Łukasz → Łukasza, Piotr → Piotra
  return w + 'a';
}

export function genPl(name) {
  const n = String(name || '').trim();
  if (!n) return n;
  const parts = n.split(' ');
  // odmieniamy ostatnie słowo (np. „Wujek Zdzisio” → „Wujka Zdzisia” to już za dużo – tylko ostatnie)
  parts[parts.length - 1] = word(parts[parts.length - 1]);
  return parts.join(' ');
}

// „Punkt dla” + imię w dopełniaczu (po polsku); w innych językach bez zmian.
export function nameFor(lang, name) { return lang === 'pl' ? genPl(name) : name; }
