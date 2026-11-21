import json,re
from infl import an, sp
d=json.load(open('/home/claude/offlimits/public/talia.json'))
GEN='do od bez dla u zamiast podczas obok oprócz według wokół prócz spod koło zza sprzed spośród wśród'.split()
PREP={'przez':'acc','przy':'loc','po':'loc','ku':'dat','dzięki':'dat','wbrew':'dat','z':'inst','ze':'inst','nad':'inst','pod':'inst','przed':'inst','między':'inst','jako':'nom','to':'nom','jest':'nom','są':'nom','był':'nom','była':'nom','było':'nom','byli':'nom','będzie':'nom'}
for g in GEN: PREP[g]='gen'
AMB={'o','na','w','we','za'}
def verb_person(words):
    for w in words:
        lw=w.lower().strip('?,.!„”')
        if re.search(r'(łem|łam|łbym|łabym|liśmy|łyśmy|łeś|łaś|łbyś|łabyś|libyśmy|liście)$',lw): return 'p12'
        for a in an(lw):
            t=a[2].split(':')
            if t[0] in ('fin','bedzie') and len(t)>2:
                return 'p12' if t[2] in ('pri','sec') else 'ter'
            if t[0]=='praet': return 'ter'
            if t[0]=='impt': return 'p12'
    return None
SUBJV=set('jest są był była było będzie dzieje stało stanie stała wydarzyło dzieją mieszka straszy sprawia znaczy oznacza czeka kryje ukrywa wpada zostaje zostało ginie psuje rośnie pojawi pojawiło trzyma przeraża odróżnia zniszczy zniszczyło spędza wraca ląduje leży stoi'.split())
def main_clause(words):
    out=[]
    for w in words:
        out.append(w)
        if w.endswith(',') : break
    return out
def has_subject(words):
    prev=''
    for w in words:
        lw=w.lower().strip('?,.!„”')
        if prev in PREP or prev in AMB: prev=lw; continue
        for a in an(lw):
            t=a[2]
            if t.startswith(('subst:','ppron3:','ppron12:')) and 'nom' in sp(t,2) and lw not in ('co','się','to','mnie','nas','cię') and not t.startswith('subst:') or (t.startswith('subst:') and 'nom' in sp(t,2) and lw not in ('co','to')): return True
        prev=lw
    return False
out={}; review=[]
for i,(t,l) in d['c'].items():
    if '____' not in t:
        w=t.split()
        f=w[0].lower()
        if f=='czego': k='gen'
        elif f=='co':
            mc=main_clause(w[1:])
            p=verb_person(mc)
            if p=='p12': k='acc'
            elif has_subject(mc): k='acc'
            elif p: k='nom'
            else: k='?'
        elif f=='kogo': k='acc'
        elif f in ('czym','kim'): k='inst'
        else: k='?'
        out[i]=[k]; review.append((i,t,k,'Q'))
    else:
        ks=[]
        for mm in re.finditer('____',t):
            before=t[:mm.start()].rstrip()
            if before=='' or before.endswith(':') or before.endswith('.'): ks.append('nom'); continue
            pw=re.split(r'\s+',before)[-1].lower().strip('„”,(')
            k=PREP.get(pw,'?' if pw in AMB else '?v')
            if before.endswith(','): k='nom'
            ks.append(k)
            review.append((i,t,k,'I'))
        out[i]=ks
json.dump(out,open('cases_auto.json','w'),ensure_ascii=False,indent=0)
import collections
print(collections.Counter(k for v in out.values() for k in v))
with open('review_q.txt','w') as f:
    for i,t,k,ty in review:
        if ty=='Q': f.write(f'{i}\t{k}\t{t}\n')
with open('review_i.txt','w') as f:
    seen=set()
    for i,t,k,ty in review:
        if ty=='I' and i not in seen: seen.add(i); f.write(f'{i}\t{",".join(out[i])}\t{t}\n')
