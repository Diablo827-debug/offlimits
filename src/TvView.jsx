import React from 'react';
import { createPortal } from 'react-dom';
import { BlackCard, Avatar, Logo, sortedPlayers, useCountdown, endLabel, Parts } from './ui.jsx';
import { fillParts } from './deck.js';
import { VOICES } from './lektor.js';
import { inApp, canPrompt, promptInstall, onPromptReady } from './install.js';

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

function InstallTv() {
  const [open, setOpen] = React.useState(false);
  const [, force] = React.useState(0);
  React.useEffect(() => { onPromptReady(() => force((n) => n + 1)); }, []);
  if (inApp()) return null;
  return (
    <>
      <button type="button" className="btn btn-ghost btn-small" onClick={async () => { if (canPrompt()) await promptInstall(); else setOpen(!open); }}>Zainstaluj na telewizorze</button>
      {open ? createPortal(
        <div className="sound-gate" role="dialog" aria-label="Instalacja na telewizorze"><div className="sound-box install-box fade-in">
          <div className="big" style={{ textAlign: 'center' }}>Zainstaluj na telewizorze</div>
          <div><b>Android TV / Google TV:</b> zainstaluj z Google Play darmową aplikację „Downloader”, wpisz w niej <b>offlimits-esn.pages.dev/offlimits.apk</b> i zainstaluj. OFFLIMITS pojawi się w menu telewizora.</div>
          <div><b>Samsung, LG i inne:</b> dodaj tę stronę do zakładek albo ekranu głównego w przeglądarce telewizora.</div>
          <div><b>Telefony:</b> aplikacja do pobrania na <b>offlimits-esn.pages.dev/pobierz</b>.</div>
          <button type="button" className="btn btn-primary" autoFocus onClick={() => setOpen(false)} style={{ alignSelf: 'center' }}>Zamknij</button>
        </div></div>, document.body
      ) : null}
    </>
  );
}

function Lobby({ room, code, qr, joinUrl, onSettings, onStart, onNewRoom, minPlayers }) {
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
              <Seg value={room.lektor === false ? 'off' : (room.voice || VOICES[0].id)}
                onChange={(v) => onSettings(v === 'off' ? { lektor: false } : { lektor: true, voice: v })}
                options={VOICES.map((x) => ({ v: x.id, l: x.label })).concat([{ v: 'off', l: 'Wyłączony' }])} /></div>
          </div>
        </details>
        <button type="button" className="btn btn-primary" disabled={!can} onClick={onStart}>
          {can ? 'Start gry' : 'Potrzeba min. ' + minPlayers + ' graczy'}
        </button>
        <div style={{ display: 'flex', gap: '1vw', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-ghost btn-small" onClick={onNewRoom}>Nowy pokój</button>
          <InstallTv />
        </div>
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

export default function TvView({ room, code, deck, qr, joinUrl, subs, onSettings, onStart, onAgain, onEnd, onNewRoom, minPlayers, lite }) {
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const left = useCountdown(room.state === 'picking' ? room.deadline : 0);
  if (room.state === 'lobby' || !room.state) {
    return (
      <div className={'tv' + (lite ? ' lite' : '')}>
        <div className="tv-main">
          <Lobby room={room} code={code} qr={qr} joinUrl={joinUrl} onSettings={onSettings} onStart={onStart} onNewRoom={onNewRoom} minPlayers={minPlayers} />
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
        <div className="hint">Wybierzcie karty na telefonach – odpowiedzi pokażą się, gdy zagrają wszyscy. Sędzia: <b>{judge ? judge.name : '—'}</b></div>
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
        <div style={{ display: 'flex', gap: '1.2vw' }}>
          <button type="button" className="btn btn-primary" onClick={onAgain}>Jeszcze raz</button>
          <button type="button" className="btn btn-ghost" onClick={onNewRoom}>Nowy pokój</button>
        </div>
      </div>
    );
  }

  return (
    <div className={'tv' + (lite ? ' lite' : '')}>
      <div className="tv-main">
        <div className="tv-head">
          <Logo />
          <div className="tv-round">RUNDA <b>{room.round}</b>{room.endType === 'rounds' ? ' / ' + room.endValue : ''} · KOD <b>{code}</b></div>
          {room.state !== 'end' ? (
            confirmEnd ? (
              <div className="end-confirm">
                <span>Zakończyć grę?</span>
                <button type="button" className="btn btn-primary btn-small" onClick={() => { setConfirmEnd(false); onEnd(); }}>Tak</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmEnd(false)}>Nie</button>
              </div>
            ) : <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmEnd(true)}>Zakończ grę</button>
          ) : <div className={'timer' + (left !== null && left <= 10 ? ' low' : '')}>{left !== null ? left : ''}</div>}
        </div>
        <div className="tv-stage">{stage}</div>
      </div>
      {room.state !== 'end' ? <Scoreboard room={room} /> : null}
    </div>
  );
}
