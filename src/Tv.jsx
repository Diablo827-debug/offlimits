import React from 'react';
import QRCode from 'qrcode';
import { ref, onValue, get, remove } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck, fillText } from './deck.js';
import { speak, stopSpeaking, unlockSpeech, prefetchSpeech } from './lektor.js';
import * as M from './master.js';
import TvView from './TvView.jsx';

const params = new URLSearchParams(location.search);
const MIN_PLAYERS = Math.max(1, parseInt(params.get('min') || '3', 10));
const LITE = params.get('lite') === '1';

export default function Tv() {
  const [err, setErr] = React.useState('');
  const [code, setCode] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [subs, setSubs] = React.useState({});
  const [deck, setDeck] = React.useState(null);
  const [qr, setQr] = React.useState('');
  const [sound, setSound] = React.useState(false);
  function enableSound() { unlockSpeech(); setSound(true); }
  const done = React.useRef({});
  const roomRef = React.useRef(null);
  roomRef.current = room;
  const once = (key) => { if (done.current[key]) return false; done.current[key] = true; return true; };

  // Logowanie, talia i pokój (wznawiany po odświeżeniu strony).
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [user, d] = await Promise.all([ensureAuth(), loadDeck()]);
        if (!alive) return;
        setDeck(d);
        let c = localStorage.getItem('ol_tv_code');
        if (c) {
          const s = await get(ref(db, 'rooms/' + c));
          if (!s.exists() || s.val().hostUid !== user.uid) c = null;
        }
        if (!c) c = await M.createRoom(user.uid);
        localStorage.setItem('ol_tv_code', c);
        if (alive) setCode(c);
      } catch (e) {
        setErr('Nie udało się połączyć z serwerem gry. ' + (e && e.message ? e.message : ''));
      }
    })();
    return () => { alive = false; };
  }, []);

  const joinUrl = code ? location.origin + '/graj?kod=' + code : '';
  React.useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 480, color: { dark: '#0B0B0B', light: '#F2EBDD' } }).then(setQr).catch(() => {});
  }, [joinUrl]);

  React.useEffect(() => {
    if (!code) return undefined;
    const offs = [
      onValue(ref(db, 'rooms/' + code), (s) => setRoom(s.val())),
      onValue(ref(db, 'subs/' + code), (s) => setSubs(s.val() || {})),
      onValue(ref(db, 'picks/' + code), (s) => {
        const p = s.val(); const r = roomRef.current;
        if (p && r && r.state === 'judging' && p.round === r.round && once('pick-' + r.round)) {
          M.applyPick(code, r, p.k);
        }
      }),
      onValue(ref(db, 'rooms/' + code + '/cmd'), (s) => {
        const c = s.val(); const r = roomRef.current;
        if (!c || !r) return;
        if (c.type === 'start' && r.state === 'lobby') handleStart();
        if (c.type === 'again' && r.state === 'end') M.backToLobby(code);
        if (c.type === 'next') stopSpeaking();
        remove(ref(db, 'rooms/' + code + '/cmd'));
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [code]);

  function handleStart() {
    const r = roomRef.current;
    if (!r || !deck) return;
    done.current = {};
    M.startGame(code, r, deck).catch((e) => setErr(e.message));
  }

  // Przejścia między etapami rundy.
  React.useEffect(() => {
    if (!room || !deck || !code) return undefined;
    const r = room;
    const lektor = r.lektor !== false;
    const so = { enabled: lektor, voice: r.voice };
    const black = deck.c[r.black];

    if (r.state === 'picking') {
      if (black && once('read-' + r.round + '-' + r.black)) speak(black[0], so);
      const needed = M.activeOrder(r).filter((u) => u !== r.judge);
      const ready = needed.length > 0 && needed.every((u) => subs[u] && subs[u].round === r.round);
      const go = () => { if (once('reveal-' + r.round + '-' + r.black)) M.toReveal(code, r, deck, subs); };
      if (ready) go();
      return undefined;
    }

    if (r.state === 'reveal' && once('seq-' + r.round)) {
      (async () => {
        const list = r.reveal || [];
        if (lektor) prefetchSpeech(list.map((e) => fillText(black ? black[0] : '', e.cards.map((id) => deck.b[id] || ''))), r.voice);
        for (let i = 0; i < list.length; i++) {
          await M.setRevealIdx(code, i);
          const answers = list[i].cards.map((id) => deck.b[id] || '');
          await speak(fillText(black ? black[0] : '', answers), so);
        }
        await M.toJudging(code);
      })();
    }

    if (r.state === 'result' && once('res-' + r.round)) {
      const w = r.players && r.players[r.winner];
      speak('Punkt dla: ' + (w ? w.name : ''), so);
      const t = setTimeout(() => M.nextRound(code, roomRef.current, deck), M.RESULT_SECONDS * 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [room, subs, deck, code]);

  if (err) return <div className="home"><div className="big">Ups…</div><p className="muted">{err}</p><button className="btn btn-ghost" onClick={() => location.reload()}>Spróbuj ponownie</button></div>;
  if (!room || !deck) return <div className="home"><img src="/sygnet.svg" alt="" /><div className="muted">Przygotowuję pokój…</div></div>;

  return (
    <>
    <TvView
      room={room} code={code} deck={deck} qr={qr} joinUrl={joinUrl} subs={subs} lite={LITE}
      minPlayers={MIN_PLAYERS}
      onSettings={(p) => M.saveSettings(code, p)}
      onStart={handleStart}
      onAgain={() => M.backToLobby(code)}
    />
    {!sound && room.lektor !== false ? (
      <div className="sound-gate" role="dialog" aria-label="Włącz dźwięk">
        <div className="sound-box">
          <img src="/sygnet.svg" alt="" />
          <div className="big">Włącz dźwięk lektora</div>
          <p className="muted">Przeglądarka wpuszcza dźwięk dopiero po jednym kliknięciu na tym ekranie.</p>
          <button type="button" className="btn btn-primary" autoFocus onClick={enableSound}>Włącz dźwięk</button>
          <button type="button" className="btn btn-ghost" onClick={() => setSound(true)}>Graj bez lektora</button>
        </div>
      </div>
    ) : null}
    </>
  );
}
