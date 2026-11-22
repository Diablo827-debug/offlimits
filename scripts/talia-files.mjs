// Wspólna definicja: które pliki tekstowe w talia/ trafiają do których plików JSON w public/.
export const PACKS = [
  { file: 'rodzinny', prefix: 'R', name: 'Rodzinny (dla wszystkich)' },
  { file: 'po22', prefix: 'N', name: 'Po 22:00 (pikantniejsze)' },
  { file: '18plus', prefix: 'X', name: 'Bez tabu (18+)' },
  { file: 'cah', prefix: 'C', name: 'Cards Against Humanity (CC BY-NC-SA)' },
  { file: 'kd', prefix: 'K', name: 'Karty Dżentelmenów (CC BY-NC-SA)' },
];
// język → { json: plik w public/, lang: klucz wewnątrz pliku albo null, packs: prefiksy }
export const TARGETS = {
  pl: [{ json: 'talia.json', key: null, prefixes: ['R', 'N', 'X'] }, { json: 'cah.json', key: 'pl', prefixes: ['C'] }, { json: 'kd.json', key: 'pl', prefixes: ['K'] }],
  en: [{ json: 'talia-en.json', key: null, prefixes: ['R', 'N', 'X'] }, { json: 'cah.json', key: 'en', prefixes: ['C'] }],
  es: [{ json: 'talia-es.json', key: null, prefixes: ['R', 'N', 'X'] }],
  el: [{ json: 'talia-el.json', key: null, prefixes: ['R', 'N', 'X'] }],
};
export const HEADER = (pack, kind, lang) => `# OFFLIMITS – ${kind === 'c' ? 'PYTANIA (czarne karty)' : 'ODPOWIEDZI (białe karty)'} · ${pack.name} · język: ${lang}
#
# Jedna linijka = jedna karta. Format:   ID | tekst karty
#  • Edycja: popraw tekst po znaku „|”. ID zostaw bez zmian.
#  • Usunięcie: postaw minus na początku linijki, np.   - ${pack.prefix}-${kind === 'c' ? 'C001' : 'B0001'} | tekst
#  • Nowa karta: dopisz samą treść w nowej linijce (bez ID) – numer nada się sam.
${kind === 'c' ? '#  • Luka do uzupełnienia to cztery podkreślniki: ____ . Pytanie bez luki = odpowiedź na końcu.\n#  • Gdy luk ma być inaczej niż podkreślników, dopisz na końcu np. {2}.\n' : '#  • Odpowiedzi piszemy w mianowniku albo bezokoliczniku, z kropką na końcu.\n'}#  • Linijki zaczynające się od # to komentarze – gra je pomija.
#
`;
