import React from 'react';
import { ref, onValue, get, set, update, onDisconnect, serverTimestamp } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck, deckKnows } from './deck.js';
import GrajView from './GrajView.jsx';
import { inApp, switchRole } from './install.js';
import { tr, phoneLang, savePhoneLang } from './i18n.js';
import { LangPick } from './GrajView.jsx';
import MojaTalia from './MojaTalia.jsx';
import { loadMine, countMine, withPrivate, privateSig } from './moja.js';

const params = new URLSearchParams(location.search);

function Join({ onJoin, busy, err, lang, onLang, onMine }) {
  const t = tr(lang);
  const [code, setCode] = React.useState((params.get('kod') || localStorage.getItem('ol_code') || '').toUpperCase());
  const [name, setName] = React.useState(localStorage.getItem('ol_name') || '');
  return (
    <div className="phone">
      <form className="center" onSubmit={(e) => { e.preventDefault(); onJoin(code.trim().toUpperCase(), name.trim()); }}>
        <img src="/sygnet.svg" alt="" style={{ width: 80 }} />
        <div className="wordmark gold-text" style={{ fontSize: 40 }}>OFFLIMITS</div>
        <div className="field"><label htmlFor="kod">{t('roomCodeField')}</label>
          <input id="kod" className="code" maxLength={4} autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
        <div className="field"><label htmlFor="imie">{t('yourName')}</label>
          <input id="imie" maxLength={16} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {err ? <div className="err">{t(err)}</div> : null}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy || code.length !== 4 || !name}>{t('joinBtn')}</button>
        <LangPick lang={lang} onLang={onLang} t={t} />
        <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={onMine}>🃏 {t('myDeckCount', { n: countMine(loadMine()) })}</button>
        {inApp()
          ? <button type="button" className="btn btn-ghost btn-small" onClick={() => switchRole('tv')}>{t('thisIsTv')}</button>
          : <a className="muted" style={{ fontSize: 14 }} href="/pobierz">{t('download')}</a>}
      </form>
    </div>
  );
}

// Ekran nie gaśnie w trakcie gry (tam, gdzie przeglądarka na to pozwala).
export function useWakeLock(on) {
  React.useEffect(() => {
    if (!on || !navigator.wakeLock) return undefined;
    let lock = null;
    let alive = true;
    const get = () => { navigator.wakeLock.request('screen').then((l) => { if (alive) lock = l; else l.release(); }).catch(() => {}); };
    const onVis = () => { if (document.visibilityState === 'visible') get(); };
    get();
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); if (lock) lock.release().catch(() => {}); };
  }, [on]);
}

export default function Graj() {
  const [uid, setUid] = React.useState(null);
  const [deck, setDeck] = React.useState(null);
  const [code, setCode] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [hand, setHand] = React.useState([]);
  const [mySub, setMySub] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [lang, setLang] = React.useState(phoneLang());
  const [mineOpen, setMineOpen] = React.useState(false);
  const [mineV, setMineV] = React.useState(0);
  function changeLang(l) { savePhoneLang(l); setLang(l); }

  React.useEffect(() => {
    ensureAuth().then((u) => setUid(u.uid)).catch(() => setErr('errNoServer'));
  }, []);
  React.useEffect(() => {
    let alive = true;
    loadDeck(lang).then((d) => { if (alive) setDeck(d); }).catch(() => setErr('errNoServer'));
    return () => { alive = false; };
  }, [lang]);

  // Automatyczny powrót do gry po odświeżeniu telefonu.
  React.useEffect(() => {
    if (!uid) return;
    const saved = localStorage.getItem('ol_code');
    const want = (params.get('kod') || saved || '').toUpperCase();
    if (!want || want !== saved) return;
    // Wracamy tylko do gry, która jeszcze trwa – po zakończonej zaczynamy od ekranu dołączania.
    get(ref(db, 'rooms/' + want)).then((s) => {
      const r = s.val();
      // Stara gra (telewizor nie daje znaku życia od 10 min) – nie wracamy do niej.
      const last = r && (r.alive || r.createdAt || 0);
      const stale = !last || Date.now() - last > 10 * 60 * 1000;
      if (!r || r.state === 'end' || !r.players || !r.players[uid] || stale) { localStorage.removeItem('ol_code'); return; }
      enter(want, r.players[uid].name);
    }).catch(() => {});
  }, [uid]);

  async function enter(c, name) {
    const base = 'rooms/' + c + '/players/' + uid;
    const existing = await get(ref(db, base));
    if (existing.exists()) {
      await update(ref(db, base), { name, connected: true, left: null, offAt: null });
    } else {
      await set(ref(db, base), { name, joinedAt: Date.now(), connected: true, score: 0 });
    }
    localStorage.setItem('ol_code', c);
    localStorage.setItem('ol_name', name);
    setCode(c);
  }

  async function join(c, name) {
    setErr(''); setBusy(true);
    try {
      const s = await get(ref(db, 'rooms/' + c + '/state'));
      if (!s.exists()) { setErr('errNoRoom'); return; }
      await enter(c, name);
    } catch (e) {
      setErr('errJoin');
    } finally { setBusy(false); }
  }

  function leave() {
    if (code && uid) {
      const base = 'rooms/' + code + '/players/' + uid;
      onDisconnect(ref(db, base)).cancel().catch(() => {});
      update(ref(db, base), { connected: false, left: true }).catch(() => {});
    }
    localStorage.removeItem('ol_code');
    setCode(null); setRoom(null); setHand([]); setMySub(null);
  }

  React.useEffect(() => {
    if (!code || !uid) return undefined;
    const offs = [
      onValue(ref(db, 'rooms/' + code), (s) => { if (!s.exists()) { leave(); return; } setRoom(s.val()); }),
      onValue(ref(db, 'hands/' + code + '/' + uid), (s) => setHand((s.val() && s.val().cards) || [])),
      onValue(ref(db, 'subs/' + code + '/' + uid), (s) => setMySub(s.val())),
    ];
    return () => offs.forEach((o) => o());
  }, [code, uid]);

  // Telewizor co 30 s daje znak życia (room.alive). Brak zmian przez 2 min = telewizor padł.
  const aliveSeen = React.useRef({ v: null, at: Date.now() });
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const i = setInterval(() => setTick((x) => x + 1), 15000); return () => clearInterval(i); }, []);
  if (room && room.alive !== aliveSeen.current.v) aliveSeen.current = { v: room.alive, at: Date.now() };
  const tvGone = !!(room && room.state !== 'end' && tick >= 0 && Date.now() - aliveSeen.current.at > 2 * 60 * 1000);

  // Obecność: telefon w tle albo chwilowy brak sieci nie wyrzuca z gry.
  // Po każdym powrocie połączenia gracz znów jest „w grze”.
  React.useEffect(() => {
    if (!code || !uid) return undefined;
    const base = 'rooms/' + code + '/players/' + uid;
    const off = onValue(ref(db, '.info/connected'), (s) => {
      if (s.val() !== true) return;
      onDisconnect(ref(db, base)).update({ connected: false, offAt: serverTimestamp() })
        .then(() => update(ref(db, base), { connected: true, offAt: null }))
        .catch(() => {});
    });
    const onVis = () => {
      if (document.visibilityState === 'visible') update(ref(db, base), { connected: true, offAt: null }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { off(); document.removeEventListener('visibilitychange', onVis); };
  }, [code, uid]);
  useWakeLock(!!code);

  // Prywatne karty graczy w tym pokoju dokładamy do talii.
  const sig = privateSig(room);
  const deckAll = React.useMemo(() => withPrivate(deck, room), [deck, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  // Moja talia jedzie do pokoju (tylko ta gra ją widzi).
  React.useEffect(() => {
    if (!code || !uid) return;
    const m = loadMine();
    const base = 'rooms/' + code + '/players/' + uid + '/talia';
    if (countMine(m)) set(ref(db, base), { c: m.c, b: m.b, v: m.v || Date.now() }).catch(() => {});
    else set(ref(db, base), null).catch(() => {});
  }, [code, uid, mineV]);

  // Strona otwarta przed dodaniem nowych kart – dociągamy świeżą talię.
  const stale = deckAll && room && !deckKnows(deckAll, room, hand);
  const refreshing = React.useRef(false);
  React.useEffect(() => {
    if (!stale || refreshing.current) return;
    refreshing.current = true;
    loadDeck(lang, true).then((d) => { setDeck(d); refreshing.current = false; }).catch(() => { refreshing.current = false; });
  }, [stale]);

  if (mineOpen) return <MojaTalia lang={lang} onClose={() => setMineOpen(false)} onChange={() => setMineV((v) => v + 1)} />;
  if (!code || !room || !deck) return <Join onJoin={join} busy={busy || !uid} err={err} lang={lang} onLang={changeLang} onMine={() => setMineOpen(true)} />;

  return (
    <GrajView
      room={room} me={uid} hand={hand} mySub={mySub} deck={deckAll} lang={lang} onLang={changeLang} onLeave={leave} onMine={() => setMineOpen(true)} tvGone={tvGone}
      onPlay={(cards) => set(ref(db, 'subs/' + code + '/' + uid), { round: room.round, cards, at: Date.now() })}
      onPick={(k, fin) => set(ref(db, 'picks/' + code), k === '__vote' ? Object.assign({ round: room.round, vote: true, by: uid }, fin ? { finalists: fin } : {}) : { round: room.round, k, by: uid })}
      onVote={(k) => update(ref(db, 'rooms/' + code + '/players/' + uid), { vote: { round: room.round, k } })}
      onCmd={(type) => set(ref(db, 'rooms/' + code + '/cmd'), { type, by: uid, at: Date.now() })}
    />
  );
}
