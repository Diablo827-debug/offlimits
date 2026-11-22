# Karty białe zaczynające się od nazwy własnej (Radom, Niemcy, Allah…) – nie zmniejszamy wtedy pierwszej litery w zdaniu.
import json, glob, re, morfeusz2
m = morfeusz2.Morfeusz()
ids = {}
ZAWSZE = {'Warszawa', 'Mikołaj', 'Polska', 'Polak', 'Niemcy', 'Polki', 'Polacy', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań', 'Łódź', 'Śląsk', 'Bóg', 'Jezus'}
for f in ['../../public/talia.json', '../../public/cah.json', '../../public/kd.json']:
    d = json.load(open(f))
    for b in ([d['b']] if 'b' in d else []) + ([d['pl']['b']] if 'pl' in d else []):
        for k, t in (b.items() if isinstance(b, dict) else enumerate(b)):
            w = re.split(r'[\s,.!?:;]', t.strip())[0]
            if len(w) < 2 or not w[0].isupper() or w.isupper(): continue
            an = m.analyse(w)
            q = any(x in ('nazwa_geograficzna', 'imię', 'nazwa_organizacji', 'nazwa_osobowa', 'nazwa_obiektu') for r in an for x in r[2][3])
            pos = any(r[2][1].split(':')[0] == w.lower() and 'nazwa_pospolita' in r[2][3] for r in an)
            pos = pos or any('nazwa_pospolita' in r[2][3] and r[2][1][0].islower() and ':nom' in ':' + r[2][2] for r in an)
            pos = pos or any(r[2][2].split(':')[0] in ('adj', 'ger', 'fin', 'praet', 'inf', 'adv', 'pact', 'ppas', 'num', 'prep', 'conj', 'qub', 'ppron3', 'ppron12') for r in an)
            nx = (re.split(r'\s+', t.strip()) + ['', ''])[1]
            if w == 'Polska' and nx[:1].islower() and nx not in ('w', 'jako'): continue
            if (q and not pos) or w in ZAWSZE: ids[str(k)] = 1
o = json.load(open('../../public/odmiana.json')); o['w'] = sorted(ids); json.dump(o, open('../../public/odmiana.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(ids)); print(sorted(ids)[:400])
