import json
from infl import inflect
d=json.load(open('/home/claude/offlimits/public/talia.json'))
C={'a':'acc','g':'gen','i':'inst','l':'loc'}
f={}
for i,t in d['b'].items():
    e={}
    for k,c in C.items():
        r=inflect(t,c)
        if r and r!=t: e[k]=r
    if e: f[i]=e
cases=json.load(open('cases.json'))
json.dump({'c':cases,'f':f},open('/home/claude/offlimits/public/odmiana.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(f), len(d['b']))
