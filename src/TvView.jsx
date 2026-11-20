import React from 'react';
import { BlackCard, Avatar, Logo, sortedPlayers, useCountdown, endLabel, Parts } from './ui.jsx';
import { fillParts } from './deck.js';

const END_OPTIONS = {
  points: [5, 7, 10, 15],
  time: [15, 30, 45, 60],
  rounds: [5, 10, 15, 20],
};

function Seg({ value, options, onChange, disabled }) {
  return (
    <span className="seg">
      {options.map((o) => (
        <button key={o.v} type="button" className={o.v === value ? 'on' : ''} disabled={disabled} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </span>
  );
}

function Lobby({ room, code, qr, joinUrl, onSettings, onStart, minPlayers }) {
  const players = sortedPlayers(room).filter((p) => p.connected !== false);
  const can = players.length >= minPlayers;
  return (
    <div className="lobby">
      <div className="lobby-brand fade-in">
        <img src="/sygnet.svg" alt="" />
        <div className="wordmark gold-text">OFFLIMITS</div>
        <div className="tagline">The Unrestricted Game Club</div>
        <div className="script">Good company. Worse answers.</div>
        {room.mode === 'po22' ? <div className="chip done" style={{ borderColor: '#8C3446' }}>Tryb „Po 22:00” · 18+</div> : null}
      </div>
      <div className="join-box fade-in">
        <div className="lbl">KOD POKOJU</div>
        <div className="code gold-text">{code}</div>
        {qr ? <img className="qr" src={qr} alt={'Kod QR do dołączenia: ' + joinUrl} /> : null}
        <div className="url">{joinUrl.replace(/^https?:\/\//, '')}</div>
        <div className="status-row" style={{ justifyContent: 'center' }}>
          {players.length ? players.map((p) => (
            <span className="chip done pop-in" key={p.uid}><Avatar uid={p.uid} name={p.name} />{p.name}</span>
          )) : <span className="hint">Czekamy na graczy…</span>}
        </div>
        <details className="fold" open>
          <summary>Ustawienia gry</summary>
          <div className="inner tv-settings">
            <div className="set-row"><span>Tryb</span>
              <Seg value={room.mode} onChange={(v) => onSettings({ mode: v })}
                options={[{ v: 'rodzinny', l: 'Rodzinny' }, { v: 'po22', l: 'Po 22:00' }]} /></div>
            <div className="set-row"><span>Koniec gry</span>
              <Seg value={room.endType} onChange={(v) => onSettings({ endType: v, endValue: END_OPTIONS[v][1] })}
                options={[{ v: 'points', l: 'Punkty' }, { v: 'time', l: 'Czas' }, { v: 'rounds', l: 'Rundy' }]} /></div>
            <div className="set-row"><span>{room.endType === 'points' ? 'Do ilu punktów' : room.endType === 'time' ? 'Ile minut' : 'Ile rund'}</span>
              <Seg value={room.endValue} onChange={(v) => onSettings({ endValue: v })}
                options={END_OPTIONS[room.endType].map((n) => ({ v: n, l: String(n) }))} /></div>
            <div className="set-row"><span>Lektor</span>
              <Seg value={room.lektor !== false} onChange={(v) => onSettings({ lektor: v })}
                options={[{ v: true, l: 'Włączony' }, { v: false, l: 'Wyłączony' }]} /></div>
          </div>
        </details>
        <button type="button" className="btn btn-primary" disabled={!can} onClick={onStart}>
          {can ? 'Start gry' : 'Potrzeba min. ' + minPlayers + ' graczy'}
        </button>
      </div>
    </div>
  );
}

function Scoreboard({ room }) {
  const players = sortedPlayers(room);
  return (
    <aside className="tv-side">
      <div className="side-title">WYNIKI · {endLabel(room).toUpperCase()}</div>
      {players.map((p) => (
        <div key={p.uid} className={'score-row' + (p.uid === room.judge ? ' judge' : '') + (room.state === 'result' && p.uid === room.winner ? ' win' : '') + (p.connected === false ? ' off' : '')}>
          <Avatar uid={p.uid} name={p.name} />
          <span className="nm">{p.name}</span>
          {p.uid === room.judge ? <span className="tag">SĘDZIA</span> : null}
          <span className="pts">{p.score || 0}</span>
        </div>
      ))}
    </aside>
  );
}

function answersOf(deck, cards) { return (cards || []).map((id) => deck.b[id] || ''); }

export default function TvView({ room, code, deck, qr, joinUrl, subs, onSettings, onStart, onAgain, minPlayers, lite }) {
  const left = useCountdown(room.state === 'picking' ? room.deadline : 0);
  if (room.state === 'lobby' || !room.state) {
    return (
      <div className={'tv' + (lite ? ' lite' : '')}>
        <div className="tv-main">
          <Lobby room={room} code={code} qr={qr} joinUrl={joinUrl} onSettings={onSettings} onStart={onStart} minPlayers={minPlayers} />
        </div>
      </div>
    );
  }
  const black = deck.c[room.black] || ['', 1];
  const players = sortedPlayers(room);
  const judge = players.find((p) => p.uid === room.judge);
  let stage = null;

  if (room.state === 'picking') {
    const waiting = players.filter((p) => p.uid !== room.judge && p.connected !== false);
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} className="pop-in" key={room.black} />
        <div className="status-row">
          {waiting.map((p) => {
            const done = subs && subs[p.uid] && subs[p.uid].round === room.round;
            return <span key={p.uid} className={'chip' + (done ? ' done' : '')}><Avatar uid={p.uid} name={p.name} />{p.name}{done ? <span className="ok">✓</span> : null}</span>;
          })}
        </div>
        <div className="hint">Wybierzcie karty na telefonach. Sędzia w tej rundzie: <b>{judge ? judge.name : '—'}</b></div>
      </>
    );
  } else if (room.state === 'reveal') {
    const list = room.reveal || [];
    const cur = list[room.revealIdx || 0];
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} answers={cur ? answersOf(deck, cur.cards) : []} className="pop-in" key={'r' + room.revealIdx} />
        <div className="hint">Odpowiedź {Math.min((room.revealIdx || 0) + 1, list.length)} z {list.length}</div>
      </>
    );
  } else if (room.state === 'judging' || room.state === 'result') {
    const list = room.reveal || [];
    const result = room.state === 'result';
    const names = {};
    players.forEach((p) => { names[p.uid] = p.name; });
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} small />
        <div className="answers-grid">
          {list.map((e, i) => {
            const parts = fillParts(black[0], answersOf(deck, e.cards));
            const win = result && e.k === room.winK;
            return (
              <div key={e.k} className={'ans-card fade-in' + (win ? ' win' : result ? ' lose' : '')} style={{ animationDelay: (i * 80) + 'ms' }}>
                <span className="n">{i + 1}</span>
                <Parts parts={parts} />
                {result && room.owners ? <span className="by">{win ? '★ ' : ''}{names[room.owners[e.k]] || ''}</span> : null}
              </div>
            );
          })}
        </div>
        <div className="hint">
          {result ? <>Punkt dla: <b className="gold-text" style={{ fontSize: '1.8vw' }}>{names[room.winner] || ''}</b></> : <>Sędzia <b>{judge ? judge.name : ''}</b> wybiera najlepszą odpowiedź…</>}
        </div>
      </>
    );
  } else if (room.state === 'end') {
    const ranking = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const top3 = [ranking[1], ranking[0], ranking[2]];
    stage = (
      <div className="center">
        <div className="wordmark gold-text" style={{ fontSize: '4vw' }}>KONIEC GRY</div>
        <div className="podium">
          {top3.map((p, i) => p ? (
            <div key={p.uid} className={'col pop-in' + (i === 1 ? ' first' : '')} style={{ animationDelay: (i * 150) + 'ms' }}>
              <Avatar uid={p.uid} name={p.name} className="" />
              <div className="nm">{p.name}</div>
              <div className="bar" style={{ height: i === 1 ? '16vw' : i === 0 ? '11vw' : '8vw' }}>{p.score || 0}</div>
            </div>
          ) : <div key={i} className="col" />)}
        </div>
        <button type="button" className="btn btn-primary" onClick={onAgain}>Jeszcze raz</button>
      </div>
    );
  }

  return (
    <div className={'tv' + (lite ? ' lite' : '')}>
      <div className="tv-main">
        <div className="tv-head">
          <Logo />
          <div className="tv-round">RUNDA <b>{room.round}</b>{room.endType === 'rounds' ? ' / ' + room.endValue : ''} · KOD <b>{code}</b></div>
          <div className={'timer' + (left !== null && left <= 10 ? ' low' : '')}>{left !== null ? left : ''}</div>
        </div>
        <div className="tv-stage">{stage}</div>
      </div>
      {room.state !== 'end' ? <Scoreboard room={room} /> : null}
    </div>
  );
}
