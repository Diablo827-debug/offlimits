# Uzupełnia odmianę dla kart zmienionych/dodanych w talia/*.txt (bez przebiegu całej talii).
# Odpowiedzi: formy z Morfeusza. Pytania: przypadek luki przeniesiony ze starej wersji, gdy słowo przed luką się nie zmieniło;
# inaczej ustalony z przyimka przed luką. Na koniec zapisuje teksty do baza.json, żeby build ich nie wyrzucał.
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from infl import inflect
R = '/home/claude/offlimits/public/'
odm = json.load(open(R + 'odmiana.json'))
old = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {'c': {}, 'f': {}}
oldtxt = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
baza_p = os.path.join(os.path.dirname(__file__), 'baza.json')
baza = json.load(open(baza_p))
deck = {'c': {}, 'b': {}}
for f, key in (('talia.json', None), ('cah.json', 'pl'), ('kd.json', 'pl')):
    d = json.load(open(R + f)); d = d[key] if key else d
    deck['c'].update(d['c']); deck['b'].update(d['b'])
C = {'a': 'acc', 'g': 'gen', 'i': 'inst', 'l': 'loc', 'd': 'dat'}
GEN = 'do od bez dla u zamiast podczas obok oprócz według wokół prócz spod koło zza sprzed spośród wśród'.split()
PREP = {'przez': 'a', 'przy': 'l', 'po': 'l', 'ku': 'd', 'dzięki': 'd', 'wbrew': 'd', 'z': 'i', 'ze': 'i', 'nad': 'i', 'pod': 'i', 'przed': 'i', 'między': 'i'}
for g in GEN: PREP[g] = 'g'
nb = nc = 0
for i, t in deck['b'].items():
    if i in odm['f'] or not i[0] in 'RNXCK': continue
    if baza.get(i) == t and i not in odm['f']:
        pass
    e = {}
    for k, c in C.items():
        r = inflect(t, c)
        if r and r != t: e[k] = r
    if e: odm['f'][i] = e; nb += 1
    baza[i] = t
def before_words(t):
    return [re.split(r'\s+', t[:m.start()].rstrip())[-1].lower().strip('„”,(') if t[:m.start()].strip() else '' for m in re.finditer('____', t)]
for i, (t, l) in deck['c'].items():
    if i in odm['c'] or baza.get(i) == t: continue
    ot = oldtxt.get(i)
    if ot and i in old['c'] and before_words(ot[0] if isinstance(ot, list) else ot) == before_words(t):
        odm['c'][i] = old['c'][i]; nc += 1
    else:
        code = ''.join(PREP.get(w, 'n') for w in before_words(t))
        if code.strip('n'): odm['c'][i] = code; nc += 1
    baza[i] = t
json.dump(odm, open(R + 'odmiana.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(baza, open(baza_p, 'w'), ensure_ascii=False)
print('odpowiedzi:', nb, 'pytania:', nc)
