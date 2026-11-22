import React from 'react';
import { Avatar, sortedPlayers, Parts } from './ui.jsx';
import { fillParts, answersFor } from './deck.js';
import { voteList } from './master.js';
import { nameFor } from './imiona.js';
import { inApp, switchRole } from './install.js';
import { tr, LANGS } from './i18n.js';

function Hand({ cards, deck, luki, onPlay, t }) {
  const [sel, setSel] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const scroller = React.useRef(null);
  const timer = React.useRef(0);
  const n = cards.length;
  const loop = n > 2;
  // Karuzela w kółko: trzy kopie ręki, zawsze wracamy na środkową.
  const list = loop ? cards.concat(cards, cards) : cards;
  React.useEffect(() => { setSel([]); }, [cards.join(',')]);

  const step = () => {
    const el = scroller.current;
    if (!el || el.children.length < 2) return 1;
    return el.children[1].offsetLeft - el.children[0].offsetLeft;
  };
  const jump = (delta) => {
    const el = scroller.current;
    el.style.scrollSnapType = 'none';
    el.scrollLeft += delta;
    requestAnimationFrame(() => { el.style.scrollSnapType = ''; });
  };
  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !loop) return;
    const c = el.children[n];
    if (c) { el.style.scrollSnapType = 'none'; el.scrollLeft = c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2; requestAnimationFrame(() => { el.style.scrollSnapType = ''; }); }
  }, [cards.join(',')]);

  function toggle(id) {
    setSel((s) => {
      if (s.indexOf(id) >= 0) return s.filter((x) => x !== id);
      if (luki === 1) return [id];
      return s.length >= luki ? s.slice(1).concat(id) : s.concat(id);
    });
  }
  function onScroll() {
    const el = scroller.current;
    if (!el || !el.children.length) return;
    const w = step();
    const first = el.children[0];
    const center = el.scrollLeft + el.clientWidth / 2 - first.offsetLeft - first.offsetWidth / 2;
    const raw = Math.round(center / w);
    setIdx(((raw % n) + n) % n);
    if (!loop) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (raw < n) jump(n * w);
      else if (raw >= 2 * n) jump(-n * w);
    }, 140);
  }
  const ready = sel.length === luki;
  return (
    <>
      <div className="hand-wrap">
        <div className="hand" ref={scroller} onScroll={onScroll}>
          {list.map((id, k) => {
            const m = sel.indexOf(id);
            return (
              <button type="button" key={id + '-' + k} className={'wcard' + (m >= 0 ? ' sel' : '')} onClick={() => toggle(id)} aria-pressed={m >= 0}>
                <span>{deck.b[id]}</span>
                {m >= 0 ? <span className="badge">{luki === 2 ? m + 1 : '✓'}</span> : null}
                <span className="foot">OFFLIMITS</span>
              </button>
            );
          })}
        </div>
        <div className="dots" aria-hidden="true">{cards.map((id, i) => <i key={id} className={i === idx ? 'on' : ''} />)}</div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onPlay(sel)}>
          {ready ? t('play') : luki === 2 ? t('pick2cards') + ' (' + sel.length + '/2)' : t('pickCard')}
        </button>
      </div>
    </>
  );
}

function Judge({ room, deck, black, onPick, t }) {
  // 1 zaznaczona = zwycięzca; 2 zaznaczone = gracze głosują między nimi.
  const [sel, setSel] = React.useState([]);
  const list = room.reveal || [];
  const toggle = (k) => setSel((s) => (s.indexOf(k) >= 0 ? s.filter((x) => x !== k) : s.concat([k]).slice(-2)));
  return (
    <>
      <div className="big" style={{ fontSize: 22, margin: '6px 0 6px' }}>{t('pickBest')}</div>
      <div className="muted" style={{ marginBottom: 10 }}>{t('judgeHint2')}</div>
      <div className="list">
        {list.map((e, i) => (
          <button type="button" key={e.k} className={'opt' + (sel.indexOf(e.k) >= 0 ? ' sel' : '')} onClick={() => toggle(e.k)}>
            <b style={{ color: 'var(--gold)', marginRight: 8 }}>{i + 1}.</b>
            <Parts parts={fillParts(black[0], answersFor(deck, room.black, e.cards))} />
          </button>
        ))}
      </div>
      <div className="actions">
        {sel.length === 2
          ? <button type="button" className="btn btn-primary" onClick={() => onPick('__vote', sel)}>{t('voteTwo')}</button>
          : <button type="button" className="btn btn-primary" disabled={sel.length !== 1} onClick={() => onPick(sel[0])}>{t('pickWinner')}</button>}
        <button type="button" className="btn btn-ghost" onClick={() => onPick('__vote')}>{t('cantDecide')}</button>
      </div>
    </>
  );
}

// Głosowanie, gdy sędzia nie umie wybrać – na swoją kartę głosować nie można.
function Vote({ room, me, deck, black, mySub, onVote, t }) {
  const [k, setK] = React.useState(null);
  const list = voteList(room);
  const mine = (mySub && mySub.round === room.round && mySub.cards) || [];
  const isMine = (e) => mine.length > 0 && mine.join('|') === (e.cards || []).join('|');
  const my = (room.players || {})[me] || {};
  if (room.judge === me) {
    return <div className="center"><div className="big">{t('voteTv')}</div><div className="muted">{t('votedWait')}</div></div>;
  }
  if (my.vote && my.vote.round === room.round) {
    return <div className="center"><div className="big gold-text">{t('voted')}</div><div className="muted">{t('votedWait')}</div></div>;
  }
  return (
    <>
      <div className="big" style={{ fontSize: 22, margin: '6px 0 12px' }}>{room.voteKs ? t('finalVote') + ' · ' : ''}{t('voteTitle')}</div>
      {list.some(isMine) ? <div className="muted" style={{ marginBottom: 10 }}>{t('cantVoteOwn')}</div> : null}
      <div className="list">
        {list.map((e, i) => {
          const own = isMine(e);
          return (
            <button type="button" key={e.k} disabled={own} className={'opt' + (k === e.k ? ' sel' : '')} style={own ? { opacity: 0.45 } : null} onClick={() => setK(e.k)}>
              <b style={{ color: 'var(--gold)', marginRight: 8 }}>{(room.reveal || []).findIndex((x) => x.k === e.k) + 1}.</b>
              <Parts parts={fillParts(black[0], answersFor(deck, room.black, e.cards))} />
              {own ? <span className="muted"> ({t('ownCard')})</span> : null}
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!k} onClick={() => onVote(k)}>{t('voteBtn')}</button>
      </div>
    </>
  );
}

export function LangPick({ lang, onLang, t }) {
  return (
    <details className="fold">
      <summary>{t('language')}: {(LANGS.find((x) => x.v === lang) || LANGS[0]).l}</summary>
      <div className="inner lang-pick">
        {LANGS.map((x) => (
          <button type="button" key={x.v} className={'btn btn-small ' + (x.v === lang ? 'btn-primary' : 'btn-ghost')} onClick={() => onLang(x.v)}>{x.l}</button>
        ))}
      </div>
    </details>
  );
}

export default function GrajView({ room, me, hand, mySub, deck, onPlay, onPick, onVote, onCmd, lang, onLang, onLeave, onMine, tvGone }) {
  const t = tr(lang || 'pl');
  const players = sortedPlayers(room);
  const meP = (room.players || {})[me] || {};
  const isJudge = room.judge === me;
  const isHost = players.length && players[0].uid === me;
  const black = deck.c[room.black] || ['', 1];
  let body;

  if (room.state === 'lobby') {
    body = (
      <div className="center">
        <img src="/sygnet.svg" alt="" style={{ width: 70 }} />
        <div className="big">{t('inGame')}</div>
        <div className="muted">{t('watchTvLobby')}</div>
        <details className="fold" open>
          <summary>{t('players')} ({players.length})</summary>
          <div className="inner">
            {players.map((p) => <div className="prow" key={p.uid}><Avatar uid={p.uid} name={p.name} />{p.name}{p.uid === me ? <span className="muted"> {t('you')}</span> : null}</div>)}
          </div>
        </details>
        {onLang ? <LangPick lang={lang} onLang={onLang} t={t} /> : null}
        {onMine ? <button type="button" className="btn btn-ghost btn-small" onClick={onMine}>🃏 {t('myDeck')}</button> : null}
        {onLeave ? <button type="button" className="btn btn-ghost btn-small" onClick={onLeave}>{t('leaveGame')}</button> : null}
        {inApp() ? <button type="button" className="btn btn-ghost btn-small" onClick={() => switchRole('tv')}>{t('thisIsTv')}</button> : null}
      </div>
    );
  } else if (room.state === 'picking') {
    if (isJudge) {
      body = (
        <div className="center">
          <div className="tagline">{t('yourRound')}</div>
          <div className="big">{t('youJudge')}</div>
          <div className="mini-black">{black[0]}</div>
          <div className="muted">{t('judgeWait')}</div>
        </div>
      );
    } else if (mySub && mySub.round === room.round) {
      body = (
        <div className="center">
          <div className="big">{t('played')}</div>
          <div className="mini-black"><Parts parts={fillParts(black[0], answersFor(deck, room.black, mySub.cards))} /></div>
          <div className="muted">{t('waitRest')}</div>
        </div>
      );
    } else if (!hand || !hand.length) {
      body = <div className="center"><div className="muted">{t('dealing')}</div></div>;
    } else {
      body = (
        <>
          <div className="mini-black">{black[0]}{black[1] === 2 ? <div className="tagline" style={{ marginTop: 8 }}>{t('pick2cards')}</div> : null}</div>
          <div style={{ height: 14 }} />
          <Hand cards={hand} deck={deck} luki={black[1]} onPlay={onPlay} t={t} />
        </>
      );
    }
  } else if (room.state === 'reveal') {
    body = (
      <div className="center">
        <div className="big">{t('watchTv')}</div>
        <div className="muted">{t('readerReads')}</div>
        {isJudge ? <button type="button" className="btn btn-ghost" onClick={() => onCmd('next')}>{t('nextAnswer')}</button> : null}
      </div>
    );
  } else if (room.state === 'judging') {
    body = isJudge ? <Judge room={room} deck={deck} black={black} onPick={onPick} t={t} /> : (
      <div className="center"><div className="big">{t('judgeChoosing')}</div><div className="muted">{t('fingers')}</div></div>
    );
  } else if (room.state === 'voting') {
    body = <Vote room={room} me={me} deck={deck} black={black} mySub={mySub} onVote={onVote} t={t} />;
  } else if (room.state === 'result') {
    const won = room.winner === me;
    const w = (room.players || {})[room.winner];
    body = (
      <div className="center">
        <div className="big gold-text" style={{ fontSize: 34 }}>{won ? t('youWon') : t('pointFor') + ' ' + (w ? nameFor(lang, w.name) : '')}</div>
        <div className="muted">{t('nextSoon')}</div>
      </div>
    );
  } else if (room.state === 'end') {
    const ranking = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    body = (
      <div className="center">
        <div className="big">{t('gameOver')}</div>
        <div className="list">
          {ranking.map((p, i) => <div className="opt" key={p.uid} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i + 1}. {p.name}</span><b className="gold-text">{p.score || 0}</b></div>)}
        </div>
        {isHost ? <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => onCmd('again')}>{t('again')}</button> : null}
        {onLeave ? <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={onLeave}>{t('leaveGame')}</button> : null}
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="phone-top">
        <div className="who"><b>{meP.name || ''}</b>{isJudge && room.state !== 'lobby' ? ' · ' + t('judgeSuffix') : ''}</div>
        {room.state !== 'lobby' ? <div className="sc">{meP.score || 0} {t('pts')}</div> : <div className="muted" style={{ fontSize: 13 }}>OFFLIMITS</div>}
      </div>
      {tvGone ? (
        <div className="tv-gone">
          <div>{t('tvGone')}</div>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onLeave}>{t('leaveGame')}</button>
        </div>
      ) : null}
      {body}
      {isHost && room.state !== 'lobby' && room.state !== 'end' ? (
        <details className="fold" style={{ marginTop: 14 }}>
          <summary>{t('hostOpts')}</summary>
          <div className="inner">
            {room.state === 'picking' ? <button type="button" className="btn btn-ghost" onClick={() => onCmd('next')}>{t('forceReveal')}</button> : null}
            {room.state === 'judging' ? <button type="button" className="btn btn-ghost" onClick={() => onCmd('next')}>{t('startVote')}</button> : null}
            <button type="button" className="btn btn-ghost" onClick={() => onCmd('end')}>{t('endGame')}</button>
          </div>
        </details>
      ) : null}
      {room.state !== 'lobby' && room.state !== 'end' && onLeave ? (
        <button type="button" className="btn btn-ghost btn-small" style={{ marginTop: 14, alignSelf: 'center', opacity: 0.7 }} onClick={onLeave}>{t('leaveGame')}</button>
      ) : null}
    </div>
  );
}
