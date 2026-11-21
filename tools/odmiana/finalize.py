import json
auto=json.load(open('cases_auto.json'))
d=json.load(open('/home/claude/offlimits/public/talia.json'))
NOM_Q='R-C009 R-C029 R-C063 R-C085 R-C094 R-C097 R-C122 R-C137 R-C165 R-C184 R-C209 R-C230 R-C281 R-C294 R-C308 R-C379 R-C405 R-C427 R-C444 R-C455 R-C474 R-C490 R-C499 N-C002 N-C065 N-C068 N-C075 N-C109 N-C115 N-C166 N-C193 N-C202 N-C226 N-C255 N-C258 X-C009 X-C056 X-C131 X-C157 X-C206'.split()
ACC_Q='R-C007 R-C102 R-C213 R-C242 R-C339 R-C465 R-C493 N-C009 R-C114 R-C221 N-C080 X-C026'.split()
OVR={'R-C403':['gen'],'N-C147':['gen','gen'],'X-C167':['acc'],'X-C184':['acc','acc'],'X-C185':['loc','loc'],'X-C189':['acc','acc'],'X-C192':['gen','acc']}
out={}
for i,ks in auto.items():
    t=d['c'][i][0]
    if i in OVR: ks=OVR[i]
    elif i in NOM_Q: ks=['nom']
    elif i in ACC_Q: ks=['acc']
    else:
        ks=['nom' if k in ('?v','?') else k for k in ks]
        # „____ i ____” – druga luka w tym samym przypadku co pierwsza
        parts=t.split('____')
        for j in range(1,len(ks)):
            if parts[j].strip() in ('i','czy','plus','kontra','oraz','albo','lub','i o'): ks[j]=ks[j-1]
    code=''.join({'nom':'n','acc':'a','gen':'g','inst':'i','loc':'l','dat':'d'}[k] for k in ks)
    if code.strip('n'): out[i]=code
json.dump(out,open('cases.json','w'),ensure_ascii=False)
import collections; print(len(out), collections.Counter(out.values()))
