import morfeusz2, re
m = morfeusz2.Morfeusz()
STOP = set('z ze w we na do od po przy o dla bez pod nad za przed przez zamiast jako niż to u co żeby bo jak gdy kiedy aby czyli który która które którzy którego której którym których gdzie – - albo lub ani'.split())
ADJP = ('adj','ppas','pact')
ARCH = {'mego','mej','mą','twego','twej','twą','swego','swej','swą','mym','twym','swym','mych','twych','swych'}
POSTSTOP = STOP | {'pełen','godny','godna','warty','warta','że','żeby','który,'}
def an(w):
    res=[a[2] for a in m.analyse(w)]
    return res
def sp(t,i):
    p=t.split(':'); return p[i].split('.') if len(p)>i else []
def base(l): return l.split(':')[0]
def gen(lemma, pos, num, case, gnd, extra=None):
    best=None
    for g in m.generate(lemma):
        p=g[2].split(':')
        if p[0]!=pos: continue
        if num not in p[1].split('.') or case not in p[2].split('.'): continue
        if pos in ADJP:
            if not any(x in p[3].split('.') for x in gnd): continue
            if pos=='adj' and len(p)>4 and p[4]!=((extra or ['pos'])[0]): continue
            if pos in ('ppas','pact') and extra and p[4:]!=extra: continue
        elif gnd and len(p)>3 and not any(x in p[3].split('.') for x in gnd): continue
        if pos=='ger' and extra and p[4:]!=extra: continue
        if g[0] in ARCH:
            best = best or g[0]; continue
        return g[0]
    return best
def split_w(w):
    mm=re.match(r'^([„"(]*)(.*?)([”",.!?:;)]*)$',w)
    return mm.group(1),mm.group(2),mm.group(3)
def cands(core, kinds):
    out=[]
    for w in (core.lower(), core):
        for a in an(w):
            t=a[2]
            if t.split(':')[0] in kinds and 'nom' in sp(t,2):
                if w==core.lower() and any(q in ('nazwisko','imię','nazwa_geograficzna') for q in (a[3] or [])): continue
                out.append(a)
        if out: break
    full=[a for a in out if len(sp(a[2],2))>=6]   # nieodmienne (np. nazwiska) – na koniec
    rest=[a for a in out if len(sp(a[2],2))<6]
    pri={'m1':0,'f':1,'n':2,'m3':3,'m2':4}
    rest.sort(key=lambda a: min([pri.get(g,5) for g in sp(a[2],3)] or [5]))
    return rest+full
def keepcap(src,dst):
    return dst[:1].upper()+dst[1:] if src[:1].isupper() else dst
def phrase(words, start, case):
    """Odmienia frazę rzeczownikową zaczynającą się od start. Zwraca (nowe słowa, koniec) albo None."""
    pre=[]; i=start; head=None
    while i < len(words):
        pf,core,sf=split_w(words[i])
        if not core or core.lower() in STOP or '-' in core: return None
        nouns=cands(core,('subst','ger','depr'))
        adjs=cands(core,ADJP)
        nxt = words[i+1] if i+1<len(words) else ''
        nxt_noun = bool(nxt) and not sf and bool(cands(split_w(nxt)[1],('subst','ger')+ADJP))
        if adjs and (not nouns or nxt_noun):
            pre.append((i,adjs)); 
            if sf: return None
            i+=1; continue
        if nouns: head=(i,nouns); break
        return None
    if head is None: return None
    hi,hc=head
    for a in hc:
        lem,tag=a[1],a[2]; pos=tag.split(':')[0]
        if pos=='depr': continue
        num=sp(tag,1)[0]; gnd=sp(tag,3)
        extra=tag.split(':')[4:] if pos=='ger' else None
        nf=gen(base(lem),pos,num,case,gnd,extra)
        if not nf: continue
        out={}
        pf,core,sf=split_w(words[hi]); out[hi]=pf+keepcap(core,nf)+sf
        ok=True
        for j,ac in pre:
            pf,core,sf=split_w(words[j]); f=None
            for b in ac:
                bt=b[2].split(':')
                if num not in sp(b[2],1) or not any(x in sp(b[2],3) for x in gnd): continue
                f=gen(base(b[1]),bt[0],num,case,gnd,bt[4:])
                if f: break
            if not f: ok=False; break
            out[j]=pf+keepcap(core,f)+sf
        if not ok: continue
        # przymiotniki / imiesłowy tuż po rzeczowniku („filozofia życiowa”, „kolacja zamówiona”)
        k=hi+1; last=sf
        # dopowiedzenie: „Barman psycholog”, „Pan Zdzisio”
        if not last and k<len(words):
            pf2,core2,sf2=split_w(words[k])
            if core2.lower() not in POSTSTOP and not any('gen' in sp(a[2],2) for a in an(core2) if a[2].startswith('subst:')):
                ap=[b for b in cands(core2,('subst',)) if num in sp(b[2],1) and 'gen' not in sp(b[2],2)]
                if ap and not cands(core2,ADJP) and (core2[:1].isupper() or ('m1' in gnd and 'm1' in sp(ap[0][2],3))):
                    bt=ap[0][2]
                    f2=gen(base(ap[0][1]),'subst',num,case,sp(bt,3))
                    if f2:
                        out[k]=pf2+keepcap(core2,f2)+sf2; last=sf2; k+=1
        while k<len(words) and not last:
            pf,core,sf=split_w(words[k])
            if core.lower() in POSTSTOP or '-' in core: break
            # rzeczownik w dopełniaczu („Rytmy Afryki”) – to dopowiedzenie, nie przymiotnik
            if any(a[2].startswith('subst:') and 'gen' in sp(a[2],2) for a in an(core)) and not any(a[2].startswith(ADJP) and 'nom' in sp(a[2],2) and 'gen' not in sp(a[2],2) for a in an(core.lower())): break
            ac=[b for b in cands(core,ADJP) if num in sp(b[2],1) and any(x in sp(b[2],3) for x in gnd)]
            if not ac or cands(core,('subst',)) and not ac: break
            f=None
            for b in ac:
                bt=b[2].split(':')
                f=gen(base(b[1]),bt[0],num,case,gnd,bt[4:])
                if f: break
            if not f: break
            out[k]=pf+keepcap(core,f)+sf; last=sf; k+=1
        # imiesłów dalej w zdaniu: „Koperta od dziadków wydana na imprezę”
        j=k
        while j<len(words) and not last:
            pf,core,sf=split_w(words[j]); low=core.lower()
            if low in POSTSTOP and low not in ('z','ze','w','we','na','do','od','po','przy','o','dla','bez','pod','nad','za','przed','przez','u'): break
            prevw=split_w(words[j-1])[1].lower()
            pp=[b for b in cands(core,('ppas','pact')) if num in sp(b[2],1) and any(x in sp(b[2],3) for x in gnd)]
            if pp and prevw not in STOP:
                bt=pp[0][2].split(':')
                f=gen(base(pp[0][1]),bt[0],num,case,gnd,bt[4:])
                if f: out[j]=pf+keepcap(core,f)+sf
                break
            if sf and sf.strip('”"') : break
            j+=1
        return out, k, last
    return None
PRON={'ktoś':{'acc':'kogoś','gen':'kogoś','inst':'kimś','loc':'kimś','dat':'komuś'},'coś':{'acc':'coś','gen':'czegoś','inst':'czymś','loc':'czymś','dat':'czemuś'},
      'nikt':{'acc':'nikogo','gen':'nikogo','inst':'nikim','loc':'nikim','dat':'nikomu'},'nic':{'acc':'nic','gen':'niczego','inst':'niczym','loc':'niczym','dat':'niczemu'},
      'wszystko':{'acc':'wszystko','gen':'wszystkiego','inst':'wszystkim','loc':'wszystkim','dat':'wszystkiemu'}}
def inflect(text, case):
    if case=='n': return text
    words=text.split(' ')
    pf,core,sf=split_w(words[0])
    if core.lower() in PRON:
        words[0]=pf+keepcap(core,PRON[core.lower()][case])+sf
        return ' '.join(words)
    r=phrase(words,0,case)
    if not r: return None
    out,k,last=r
    # współrzędność: „Kawa i ciastko”
    if not last and k<len(words)-1 and words[k] in ('i','oraz','albo','lub'):
        r2=phrase(words,k+1,case)
        if r2: out.update(r2[0])
    w=list(words)
    for i,v in out.items(): w[i]=v
    return ' '.join(w)
if __name__=='__main__':
    import json,random,sys
    d=json.load(open('/home/claude/offlimits/public/talia.json'))
    ids=list(d['b']); random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 3)
    for i in random.sample(ids,50):
        t=d['b'][i]; print(t,' -> ',inflect(t,'acc'), ' | ', inflect(t,'gen'))
