import React from 'react';
import { ref, onValue, get, set, update, onDisconnect } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck } from './deck.js';
import GrajView from './GrajView.jsx';
import { inApp, switchRole } from './install.js';

const params = new URLSearchParams(location.search);

function Join({ onJoin, busy, err }) {
  const [code, setCode] = React.useState((params.get('kod') || localStorage.getItem('ol_code') || '').toUpperCase());
  const [name, setName] = React.useState(localStorage.getItem('ol_name') || '');
  return (
    <div className="phone">
      <form className="center" onSubmit={(e) => { e.preventDefault(); onJoin(code.trim().toUpperCase(), name.trim()); }}>
        <img src="/sygnet.svg" alt="" style={{ width: 80 }} />
        <div className="wordmark gold-text" style={{ fontSize: 40 }}>OFFLIMITS</div>
        <div className="field"><label htmlFor="kod">Kod pokoju</label>
          <input id="kod" className="code" maxLength={4} autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
        <div className="field"><label htmlFor="imie">Twoje imię</label>
          <input id="imie" maxLength={16} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {err ? <div className="err">{err}</div> : null}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy || code.length !== 4 || !name}>Dołącz do gry</button>
        {inApp()
          ? <button type="button" className="btn btn-ghost btn-small" onClick={() => switchRole('tv')}>To jest telewizor – przełącz</button>
          : <a className="muted" style={{ fontSize: 14 }} href="/pobierz">Pobierz aplikację na telefon</a>}
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

  React.useEffect(() => {
    Promise.all([ensureAuth(), loadDeck()]).then(([u, d]) => { setUid(u.uid); setDeck(d); })
      .catch(() => setErr('Brak połączenia z serwerem gry.'));
  }, []);

  // Automatyczny powrót do gry po odświeżeniu telefonu.
  React.useEffect(() => {
    if (!uid) return;
    const saved = localStorage.getItem('ol_code');
    const want = (params.get('kod') || saved || '').toUpperCase();
    if (!want || want !== saved) return;
    get(ref(db, 'rooms/' + want + '/players/' + uid)).then((s) => { if (s.exists()) enter(want, s.val().name); });
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
      if (!s.exists()) { setErr('Nie ma pokoju o takim kodzie. Sprawdź kod na telewizorze.'); return; }
      await enter(c, name);
    } catch (e) {
      setErr('Nie udało się dołączyć. Spróbuj jeszcze raz.');
    } finally { setBusy(false); }
  }

  React.useEffect(() => {
    if (!code || !uid) return undefined;
    const offs = [
      onValue(ref(db, 'rooms/' + code), (s) => setRoom(s.val())),
      onValue(ref(db, 'hands/' + code + '/' + uid), (s) => setHand((s.val() && s.val().cards) || [])),
      onValue(ref(db, 'subs/' + code + '/' + uid), (s) => setMySub(s.val())),
    ];
    return () => offs.forEach((o) => o());
  }, [code, uid]);

  if (!code || !room || !deck) return <Join onJoin={join} busy={busy || !uid} err={err} />;

  return (
    <GrajView
      room={room} me={uid} hand={hand} mySub={mySub} deck={deck}
      onPlay={(cards) => set(ref(db, 'subs/' + code + '/' + uid), { round: room.round, cards, at: Date.now() })}
      onPick={(k) => set(ref(db, 'picks/' + code), { round: room.round, k, by: uid })}
      onCmd={(type) => set(ref(db, 'rooms/' + code + '/cmd'), { type, by: uid, at: Date.now() })}
    />
  );
}
