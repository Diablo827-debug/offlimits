# Odmiana dla pakietu (cah / kd): formy białych kart (a, g, i, l, d) + przypadki luk -> dopisane do public/odmiana.json
import json, sys
sys.path.insert(0, '.')
from infl import inflect
pack = sys.argv[1] if len(sys.argv) > 1 else 'cah'
cah = json.load(open('../../public/' + pack + '.json'))
odm = json.load(open('../../public/odmiana.json'))
C = {'a': 'acc', 'g': 'gen', 'i': 'inst', 'l': 'loc', 'd': 'dat'}
n = 0
for i, t in cah['pl']['b'].items():
    e = {}
    for k, c in C.items():
        r = inflect(t, c)
        if r and r != t: e[k] = r
    if e: odm['f'][i] = e; n += 1
odm['c'].update(cah['k'])
json.dump(odm, open('../../public/odmiana.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('formy:', n, 'przypadki luk:', len(cah['k']))

# Ręczne poprawki (Morfeusz brał nazwisko zamiast miasta / ludzi zamiast kraju) – w public/odmiana.json:
# K-B231 Radom → Radomia/Radomiem/Radomiu/Radomiowi; K-B170 Niemcy → Niemiec/Niemcami/Niemczech/Niemcom.
# Po każdym przebiegu uruchom też wlasne.py (lista nazw własnych „w”).
