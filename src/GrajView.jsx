import React from 'react';
import { Avatar, sortedPlayers, Parts } from './ui.jsx';
import { fillParts } from './deck.js';

function Hand({ cards, deck, luki, onPlay }) {
  const [sel, setSel] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const scroller = React.useRef(null);
  React.useEffect(() => { setSel([]); }, [cards.join(',')]);

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
    const w = el.children[0].getBoundingClientRect().width + 14;
    setIdx(Math.round(el.scrollLeft / w));
  }
  const ready = sel.length === luki;
  return (
    <>
      <div className="hand-wrap">
        <div className="hand" ref={scroller} onScroll={onScroll}>
          {cards.map((id) => {
            const n = sel.indexOf(id);
            return (
              <button type="button" key={id} className={'wcard' + (n >= 0 ? ' sel' : '')} onClick={() => toggle(id)} aria-pressed={n >= 0}>
                <span>{deck.b[id]}</span>
                {n >= 0 ? <span className="badge">{luki === 2 ? n + 1 : '✓'}</span> : null}
                <span className="foot">OFFLIMITS</span>
              </button>
            );
          })}
        </div>
        <div className="dots" aria-hidden="true">{cards.map((id, i) => <i key={id} className={i === idx ? 'on' : ''} />)}</div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onPlay(sel)}>
          {ready ? 'Zagraj' : luki === 2 ? 'Wybierz 2 karty (' + sel.length + '/2)' : 'Wybierz kartę'}
        </button>
      </div>
    </>
  );
}

function Judge({ room, deck, black, onPick }) {
  const [k, setK] = React.useState(null);
  const list = room.reveal || [];
  return (
    <>
      <div className="big" style={{ fontSize: 22, margin: '6px 0 12px' }}>Wybierz najlepszą odpowiedź</div>
      <div className="list">
        {list.map((e, i) => (
          <button type="button" key={e.k} className={'opt' + (k === e.k ? ' sel' : '')} onClick={() => setK(e.k)}>
            <b style={{ color: 'var(--gold)', marginRight: 8 }}>{i + 1}.</b>
            <Parts parts={fillParts(black[0], e.cards.map((id) => deck.b[id] || ''))} />
          </button>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!k} onClick={() => onPick(k)}>Wybierz zwycięzcę</button>
      </div>
    </>
  );
}

export default function GrajView({ room, me, hand, mySub, deck, onPlay, onPick, onCmd }) {
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
        <div className="big">Jesteś w grze!</div>
        <div className="muted">Patrz na telewizor. Gra ruszy, gdy wszyscy dołączą.</div>
        <details className="fold" open>
          <summary>Gracze ({players.length})</summary>
          <div className="inner">
            {players.map((p) => <div className="prow" key={p.uid}><Avatar uid={p.uid} name={p.name} />{p.name}{p.uid === me ? <span className="muted"> (ty)</span> : null}</div>)}
          </div>
        </details>
        {isHost ? <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => onCmd('start')}>Start gry</button> : null}
      </div>
    );
  } else if (room.state === 'picking') {
    if (isJudge) {
      body = (
        <div className="center">
          <div className="tagline">TWOJA RUNDA</div>
          <div className="big">Jesteś sędzią</div>
          <div className="mini-black">{black[0]}</div>
          <div className="muted">Poczekaj, aż wszyscy zagrają. Potem wybierzesz najlepszą odpowiedź.</div>
        </div>
      );
    } else if (mySub && mySub.round === room.round) {
      body = (
        <div className="center">
          <div className="big">Zagrane!</div>
          <div className="mini-black"><Parts parts={fillParts(black[0], mySub.cards.map((id) => deck.b[id] || ''))} /></div>
          <div className="muted">Czekamy na resztę graczy…</div>
        </div>
      );
    } else if (!hand || !hand.length) {
      body = <div className="center"><div className="muted">Rozdaję karty…</div></div>;
    } else {
      body = (
        <>
          <div className="mini-black">{black[0]}{black[1] === 2 ? <div className="tagline" style={{ marginTop: 8 }}>Wybierz 2 karty</div> : null}</div>
          <div style={{ height: 14 }} />
          <Hand cards={hand} deck={deck} luki={black[1]} onPlay={onPlay} />
        </>
      );
    }
  } else if (room.state === 'reveal') {
    body = (
      <div className="center">
        <div className="big">Patrz na TV</div>
        <div className="muted">Lektor czyta odpowiedzi po kolei.</div>
        {isJudge ? <button type="button" className="btn btn-ghost" onClick={() => onCmd('next')}>Następna odpowiedź</button> : null}
      </div>
    );
  } else if (room.state === 'judging') {
    body = isJudge ? <Judge room={room} deck={deck} black={black} onPick={onPick} /> : (
      <div className="center"><div className="big">Sędzia wybiera…</div><div className="muted">Trzymaj kciuki za swoją kartę.</div></div>
    );
  } else if (room.state === 'result') {
    const won = room.winner === me;
    const w = (room.players || {})[room.winner];
    body = (
      <div className="center">
        <div className="big gold-text" style={{ fontSize: 34 }}>{won ? 'Wygrałeś rundę!' : 'Punkt dla: ' + (w ? w.name : '')}</div>
        <div className="muted">Za chwilę następna runda.</div>
      </div>
    );
  } else if (room.state === 'end') {
    const ranking = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    body = (
      <div className="center">
        <div className="big">Koniec gry</div>
        <div className="list">
          {ranking.map((p, i) => <div className="opt" key={p.uid} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i + 1}. {p.name}</span><b className="gold-text">{p.score || 0}</b></div>)}
        </div>
        {isHost ? <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => onCmd('again')}>Jeszcze raz</button> : null}
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="phone-top">
        <div className="who"><b>{meP.name || ''}</b>{isJudge && room.state !== 'lobby' ? ' · sędzia' : ''}</div>
        {room.state !== 'lobby' ? <div className="sc">{meP.score || 0} pkt</div> : <div className="muted" style={{ fontSize: 13 }}>OFFLIMITS</div>}
      </div>
      {body}
    </div>
  );
}
