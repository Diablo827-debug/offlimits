import React from 'react';
import QRCode from 'qrcode';
import { ref, onValue, get, remove } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck, fillText, deckKnows } from './deck.js';
import { speak, stopSpeaking, unlockSpeech, prefetchSpeech } from './lektor.js';
import * as M from './master.js';
import TvView from './TvView.jsx';
import { tr, okLang } from './i18n.js';

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
        const user = await ensureAuth();
        if (!alive) return;
        let c = localStorage.getItem('ol_tv_code');
        if (c) {
          const s = await get(ref(db, 'rooms/' + c));
          if (!s.exists() || s.val().hostUid !== user.uid || s.val().state === 'end') c = null;
        }
        if (!c) c = await M.createRoom(user.uid, localStorage.getItem('ol_tv_lang') || 'pl');
        localStorage.setItem('ol_tv_code', c);
        if (alive) setCode(c);
      } catch (e) {
        setErr((e && e.message) || '-');
      }
    })();
    return () => { alive = false; };
  }, []);

  // Talia w języku telewizora (karty mają te same ID we wszystkich językach).
  const lang = okLang(room && room.lang);
  const t = tr(lang);
  React.useEffect(() => {
    let alive = true;
    loadDeck(lang).then((d) => { if (alive) setDeck(d); }).catch((e) => setErr(e.message || '-'));
    return () => { alive = false; };
  }, [lang]);

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
        if (c.type === 'end' && r.state !== 'lobby' && r.state !== 'end') { stopSpeaking(); M.endGame(code); }
        remove(ref(db, 'rooms/' + code + '/cmd'));
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [code]);

  async function newRoom() {
    try {
      stopSpeaking();
      const user = await ensureAuth();
      const c = await M.createRoom(user.uid, localStorage.getItem('ol_tv_lang') || 'pl');
      localStorage.setItem('ol_tv_code', c);
      done.current = {};
      setRoom(null); setSubs({});
      setCode(c);
    } catch (e) { setErr(e.message); }
  }

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
    const so = { enabled: lektor, voice: r.voice, lang };
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
        if (lektor) prefetchSpeech(list.map((e) => fillText(black ? black[0] : '', e.cards.map((id) => deck.b[id] || ''))), r.voice, lang);
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
      speak(t('pointFor') + ' ' + (w ? w.name : ''), so);
      const timer = setTimeout(() => M.nextRound(code, roomRef.current, deck), M.RESULT_SECONDS * 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [room, subs, deck, code, lang]);

  const stale = deck && room && !deckKnows(deck, room, []);
  const refreshing = React.useRef(false);
  React.useEffect(() => {
    if (!stale || refreshing.current) return;
    refreshing.current = true;
    loadDeck(lang, true).then((d) => { setDeck(d); refreshing.current = false; }).catch(() => { refreshing.current = false; });
  }, [stale]);

  if (err) return <div className="home"><div className="big">{t('oops')}</div><p className="muted">{t('errConn')} {err}</p><button className="btn btn-ghost" onClick={() => location.reload()}>{t('retry')}</button></div>;
  if (!room || !deck) return <div className="home"><img src="/sygnet.svg" alt="" /><div className="muted">{t('preparing')}</div></div>;

  return (
    <>
    <TvView
      room={room} code={code} deck={deck} qr={qr} joinUrl={joinUrl} subs={subs} lite={LITE}
      minPlayers={MIN_PLAYERS}
      onSettings={(p) => { M.saveSettings(code, p); if (p.lang) localStorage.setItem('ol_tv_lang', p.lang); if (p.voice || (p.lang && room.lektor !== false)) { unlockSpeech(); setSound(true); speak(tr(okLang(p.lang || room.lang))('voiceSample'), { voice: p.voice || room.voice, lang: okLang(p.lang || room.lang) }); } }}
      onStart={handleStart}
      onAgain={() => M.backToLobby(code)}
      onEnd={() => { stopSpeaking(); M.endGame(code); }}
      onNewRoom={newRoom}
    />
    {!sound && room.lektor !== false ? (
      <div className="sound-gate" role="dialog" aria-label={t('soundOn')}>
        <div className="sound-box">
          <img src="/sygnet.svg" alt="" />
          <div className="big">{t('soundTitle')}</div>
          <p className="muted">{t('soundText')}</p>
          <button type="button" className="btn btn-primary" autoFocus onClick={enableSound}>{t('soundOn')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setSound(true)}>{t('soundOff')}</button>
        </div>
      </div>
    ) : null}
    </>
  );
}
