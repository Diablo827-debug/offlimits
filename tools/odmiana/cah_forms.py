# Odmiana dla pakietu CAH: formy białych kart (a, g, i, l, d) + przypadki luk -> dopisane do public/odmiana.json
import json, sys
sys.path.insert(0, '.')
from infl import inflect
cah = json.load(open('../../public/cah.json'))
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
