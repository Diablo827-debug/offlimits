import React from 'react';
import { ref, onValue, get, set, update, onDisconnect } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck } from './deck.js';
import GrajView from './GrajView.jsx';
import { inApp, switchRole } from './install.js';
import { tr, phoneLang, savePhoneLang } from './i18n.js';
import { LangPick } from './GrajView.jsx';

const params = new URLSearchParams(location.search);

function Join({ onJoin, busy, err, lang, onLang }) {
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
        {inApp()
          ? <button type="button" className="btn btn-ghost btn-small" onClick={() => switchRole('tv')}>{t('thisIsTv')}</button>
          : <a className="muted" style={{ fontSize: 14 }} href="/pobierz">{t('download')}</a>}
      </form>
    </div>
  );
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
      if (!r || r.state === 'end' || !r.players || !r.players[uid]) { localStorage.removeItem('ol_code'); return; }
      enter(want, r.players[uid].name);
    }).catch(() => {});
  }, [uid]);

  async function enter(c, name) {
    const base = 'rooms/' + c + '/players/' + uid;
    const existing = await get(ref(db, base));
    if (existing.exists()) {
      await update(ref(db, base), { name, connected: true });
    } else {
      await set(ref(db, base), { name, joinedAt: Date.now(), connected: true, score: 0 });
    }
    onDisconnect(ref(db, base + '/connected')).set(false);
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
    if (code && uid) set(ref(db, 'rooms/' + code + '/players/' + uid + '/connected'), false).catch(() => {});
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

  if (!code || !room || !deck) return <Join onJoin={join} busy={busy || !uid} err={err} lang={lang} onLang={changeLang} />;

  return (
    <GrajView
      room={room} me={uid} hand={hand} mySub={mySub} deck={deck} lang={lang} onLang={changeLang} onLeave={leave}
      onPlay={(cards) => set(ref(db, 'subs/' + code + '/' + uid), { round: room.round, cards, at: Date.now() })}
      onPick={(k) => set(ref(db, 'picks/' + code), { round: room.round, k, by: uid })}
      onCmd={(type) => set(ref(db, 'rooms/' + code + '/cmd'), { type, by: uid, at: Date.now() })}
    />
  );
}
