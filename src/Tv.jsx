import React from 'react';
import QRCode from 'qrcode';
import { ref, onValue, get, remove } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { loadDeck, fillText, fillTextMarked, deckKnows, answersFor } from './deck.js';
import { speak, stopSpeaking, unlockSpeech, prefetchSpeech } from './lektor.js';
import { musicStart, musicStop } from './muzyka.js';
import { withPrivate, privateSig } from './moja.js';
import { nameFor } from './imiona.js';
import * as M from './master.js';
import TvView from './TvView.jsx';
import { useWakeLock } from './Graj.jsx';
import { tr, okLang } from './i18n.js';

const params = new URLSearchParams(location.search);
const MIN_PLAYERS = Math.max(1, parseInt(params.get('min') || '3', 10));
const LITE = params.get('lite') === '1';
const AWAY_SECONDS = 40;      // tyle czekamy na gracza, którego telefon jest poza grą
const AUTO_REVEAL_SECONDS = 75; // tyle po ostatniej zagranej karcie odkrywamy resztę sami
const JUDGE_AWAY_SECONDS = 60;

export default function Tv() {
  const [err, setErr] = React.useState('');
  const [code, setCode] = React.useState(null);
  const [room, setRoom] = React.useState(null);
  const [subs, setSubs] = React.useState({});
  const [baseDeck, setDeck] = React.useState(null);
  const [qr, setQr] = React.useState('');
  const [sound, setSound] = React.useState(false);
  function enableSound() { unlockSpeech(); setSound(true); }
  const done = React.useRef({});
  const roomRef = React.useRef(null);
  roomRef.current = room;
  // Talia publiczna + prywatne karty graczy z tego pokoju.
  const sig = privateSig(room);
  const deck = React.useMemo(() => withPrivate(baseDeck, room), [baseDeck, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const deckRef = React.useRef(null);
  deckRef.current = deck;
  const subsRef = React.useRef({});
  subsRef.current = subs;
  const once = (key) => { if (done.current[key]) return false; done.current[key] = true; return true; };
  const retry = (key) => (e) => { delete done.current[key]; console.warn('[offlimits]', key, e); };
  // Zegar – co 2 s sprawdzamy, czy gra nie stoi.
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const i = setInterval(() => setNow(Date.now()), 2000); return () => clearInterval(i); }, []);
  // Od kiedy gracz jest poza grą (zegar telewizora) i kiedy ostatnio ktoś zagrał.
  const awaySince = React.useRef({});
  const lastSub = React.useRef({ key: '', n: 0, at: 0 });
  const stageSince = React.useRef({ key: '', at: 0 });
  useWakeLock(true);
  // Muzyczka w tle (po włączeniu dźwięku na telewizorze; wyłączana w ustawieniach).
  const musicOn = !!(sound && room && room.music !== false);
  React.useEffect(() => { if (musicOn) musicStart(0.5); else musicStop(); }, [musicOn]);

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
        if (p && r && r.state === 'judging' && p.round === r.round && p.vote && once('vote-' + r.round)) {
          M.toVoting(code, p.finalists).catch(retry('vote-' + r.round));
        } else if (p && r && r.state === 'judging' && p.round === r.round && p.k && once('pick-' + r.round)) {
          M.applyPick(code, r, p.k).catch(retry('pick-' + r.round));
        }
      }),
      onValue(ref(db, 'rooms/' + code + '/cmd'), (s) => {
        const c = s.val(); const r = roomRef.current;
        if (!c || !r) return;
        if (c.type === 'start' && r.state === 'lobby') handleStart();
        if (c.type === 'again' && r.state === 'end') M.backToLobby(code);
        if (c.type === 'next' && r.state === 'picking') forceReveal();
        if (c.type === 'next' && r.state === 'judging' && once('vote-' + r.round)) M.toVoting(code).catch(retry('vote-' + r.round));
        if (c.type === 'next') stopSpeaking();
        if (c.type === 'end' && r.state !== 'lobby' && r.state !== 'end') { stopSpeaking(); M.endGame(code); }
        remove(ref(db, 'rooms/' + code + '/cmd'));
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [code]);

  // Gospodarz nie chce czekać (ktoś odszedł od telefonu) – odkrywamy to, co już zagrano.
  function forceReveal() {
    const r = roomRef.current;
    if (!r || r.state !== 'picking' || !deckRef.current) return;
    const k = 'reveal-' + r.round + '-' + r.black;
    if (once(k)) M.toReveal(code, r, deckRef.current, subsRef.current).catch(retry(k));
  }

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

    const players = r.players || {};
    Object.keys(players).forEach((u) => {
      if (players[u].connected === false) { if (!awaySince.current[u]) awaySince.current[u] = now; }
      else delete awaySince.current[u];
    });
    const away = (u, sec) => awaySince.current[u] && now - awaySince.current[u] > sec * 1000;
    const stageKey = r.state + '-' + r.round;
    if (stageSince.current.key !== stageKey) stageSince.current = { key: stageKey, at: now };
    const inStage = (now - stageSince.current.at) / 1000;

    // Tryb testowy: boty grają, sędziują i głosują z „ludzkim” opóźnieniem.
    const bots = Object.keys(players).filter(M.isBot);
    if (bots.length && r.state === 'picking') {
      const luki = deck.c[r.black] ? deck.c[r.black][1] : 1;
      bots.filter((u) => u !== r.judge && !(subs[u] && subs[u].round === r.round)).forEach((u, i) => {
        if (once('botplay-' + r.round + '-' + u)) setTimeout(() => M.botPlay(code, r, u, luki).catch(retry('botplay-' + r.round + '-' + u)), 2500 + i * 1800 + Math.random() * 2500);
      });
    }
    if (bots.length && r.state === 'judging' && M.isBot(r.judge) && once('botjudge-' + r.round)) {
      setTimeout(() => { const cur = roomRef.current; if (cur && cur.state === 'judging' && cur.round === r.round) M.botJudge(code, cur).catch(retry('botjudge-' + r.round)); }, 7000);
    }
    if (bots.length && r.state === 'voting') {
      bots.filter((u) => u !== r.judge).forEach((u, i) => {
        if (once('botvote-' + r.round + '-' + u)) setTimeout(() => { const cur = roomRef.current; if (cur && cur.state === 'voting') M.botVote(code, cur, u).catch(() => {}); }, 3000 + i * 1500);
      });
    }

    if (r.state === 'picking') {
      if (black && once('read-' + r.round + '-' + r.black)) speak(black[0], Object.assign({}, so, { mood: 'q' }));
      const played = (u) => subs[u] && subs[u].round === r.round && (subs[u].cards || []).length > 0;
      // Czekamy na graczy w grze; ktoś, kto zniknął na dłużej (telefon w tle), nie blokuje rundy.
      const needed = M.activeOrder(r).filter((u) => u !== r.judge && !(away(u, AWAY_SECONDS) && !played(u)));
      const n = needed.filter(played).length;
      const subKey = r.round + '-' + r.black;
      if (lastSub.current.key !== subKey || lastSub.current.n !== n) lastSub.current = { key: subKey, n, at: now };
      const ready = needed.length > 0 && needed.every(played);
      const tooLong = n > 0 && now - lastSub.current.at > AUTO_REVEAL_SECONDS * 1000;
      const go = () => { const k = 'reveal-' + subKey; if (once(k)) M.toReveal(code, r, deck, subs).catch(retry(k)); };
      if (ready || tooLong) go();
      return undefined;
    }

    if (r.state === 'reveal') {
      const list = r.reveal || [];
      if (once('seq-' + r.round)) {
        (async () => {
          if (lektor) prefetchSpeech(list.map((e) => fillTextMarked(black ? black[0] : '', answersFor(deck, r.black, e.cards))), r.voice, lang, 'a');
          for (let i = 0; i < list.length; i++) {
            if (roomRef.current && roomRef.current.state !== 'reveal') return;
            await M.setRevealIdx(code, i).catch(() => {});
            const answers = answersFor(deck, r.black, list[i].cards);
            await speak(fillTextMarked(black ? black[0] : '', answers), Object.assign({}, so, { mood: 'a' }));
          }
          await M.toJudging(code);
        })().catch(retry('seq-' + r.round));
      } else if (inStage > 25 * Math.max(1, list.length) + 20 && once('seq-guard-' + r.round)) {
        // Lektor albo sieć utknęły – przechodzimy dalej.
        M.toJudging(code).catch(retry('seq-guard-' + r.round));
      }
    }

    if (r.state === 'judging' && r.judge && (players[r.judge] && (players[r.judge].left || away(r.judge, JUDGE_AWAY_SECONDS)))
      && once('vote-' + r.round)) {
      // Sędziego nie ma – decyduje głosowanie.
      M.toVoting(code).catch(retry('vote-' + r.round));
    }

    if (r.state === 'voting') {
      if (once('vote-say-' + r.round)) speak(t(r.voteKs ? 'voteSpeak2' : 'voteSpeak'), Object.assign({}, so, { mood: 'w' }));
      const vs = M.voters(r);
      const got = M.votesOf(r);
      const all = vs.length > 0 && vs.every((u) => got[u]);
      if ((all || now > (r.voteUntil || 0) + 1500) && once('tally-' + r.round)) {
        M.applyPick(code, r, M.tally(r)).catch(retry('tally-' + r.round));
      }
    }

    if (r.state === 'result') {
      const next = () => {
        const cur = roomRef.current;
        if (cur && cur.state === 'result' && cur.round === r.round && once('next-' + r.round)) {
          M.nextRound(code, cur, deckRef.current || deck).catch(retry('next-' + r.round));
        }
      };
      if (once('res-' + r.round)) {
        const w = r.players && r.players[r.winner];
        speak(t('pointFor') + ' ' + (w ? nameFor(lang, w.name) : '') + '!', Object.assign({}, so, { mood: 'w' }));
        // Licznik niezależny od odświeżeń ekranu (zegar co 2 s nie może go kasować).
        setTimeout(next, M.RESULT_SECONDS * 1000);
      } else if (inStage > M.RESULT_SECONDS + 10) next();
    }
    return undefined;
  }, [room, subs, deck, code, lang, now]);
  const autoIn = room && room.state === 'picking' && lastSub.current.n > 0
    ? Math.max(0, Math.ceil((lastSub.current.at + AUTO_REVEAL_SECONDS * 1000 - now) / 1000)) : 0;

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
      onSettings={(p) => { if ('bots' in p) { M.setBots(code, room, p.bots); return; } M.saveSettings(code, p); if (p.lang) localStorage.setItem('ol_tv_lang', p.lang); if (p.voice || (p.lang && room.lektor !== false)) { unlockSpeech(); setSound(true); speak(tr(okLang(p.lang || room.lang))('voiceSample'), { voice: p.voice || room.voice, lang: okLang(p.lang || room.lang), mood: 's' }); } }}
      onStart={handleStart}
      onAgain={() => M.backToLobby(code)}
      onEnd={() => { stopSpeaking(); M.endGame(code); }}
      onNewRoom={newRoom}
      onForce={forceReveal}
      autoIn={autoIn}
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
