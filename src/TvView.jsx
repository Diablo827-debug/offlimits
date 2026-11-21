import React from 'react';
import { createPortal } from 'react-dom';
import { BlackCard, Avatar, Logo, sortedPlayers, useCountdown, endLabel, Parts } from './ui.jsx';
import { fillParts } from './deck.js';
import { VOICES } from './lektor.js';
import { tr, LANGS } from './i18n.js';
import { inApp, canPrompt, promptInstall, onPromptReady, switchRole } from './install.js';

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

function InstallTv({ t }) {
  const [open, setOpen] = React.useState(false);
  const [, force] = React.useState(0);
  React.useEffect(() => { onPromptReady(() => force((n) => n + 1)); }, []);
  if (inApp()) return null;
  return (
    <>
      <button type="button" className="btn btn-ghost btn-small" onClick={async () => { if (canPrompt()) await promptInstall(); else setOpen(!open); }}>{t('installTv')}</button>
      {open ? createPortal(
        <div className="sound-gate" role="dialog" aria-label={t('installTv')}><div className="sound-box install-box fade-in">
          <div className="big" style={{ textAlign: 'center' }}>{t('installTv')}</div>
          <div dangerouslySetInnerHTML={{ __html: t('installAndroid') }} />
          <div dangerouslySetInnerHTML={{ __html: t('installOther') }} />
          <div dangerouslySetInnerHTML={{ __html: t('installPhones') }} />
          <button type="button" className="btn btn-primary" autoFocus onClick={() => setOpen(false)} style={{ alignSelf: 'center' }}>{t('close')}</button>
        </div></div>, document.body
      ) : null}
    </>
  );
}

function Lobby({ room, code, qr, joinUrl, onSettings, onStart, onNewRoom, minPlayers, t }) {
  const players = sortedPlayers(room).filter((p) => !p.left);
  const can = players.length >= minPlayers;
  return (
    <div className="lobby">
      <div className="lobby-brand fade-in">
        <img src="/sygnet.svg" alt="" />
        <div className="wordmark gold-text">OFFLIMITS</div>
        <div className="tagline">The Unrestricted Game Club</div>
        <div className="script">Good company. Worse answers.</div>
        {room.mode !== 'rodzinny' ? <div className="chip done" style={{ borderColor: '#8C3446' }}>{t(room.mode === 'po22' ? 'chip22' : room.mode === 'bez' ? 'chipBez' : 'chipAll')}</div> : null}
      </div>
      <div className="join-box fade-in">
        <div className="join-top">
          <div className="join-code">
            <div className="lbl">{t('roomCode')}</div>
            <div className="code gold-text">{code}</div>
            <div className="url">{joinUrl.replace(/^https?:\/\//, '')}</div>
          </div>
          {qr ? <img className="qr" src={qr} alt={t('qrAlt') + joinUrl} /> : null}
        </div>
        <div className="status-row" style={{ justifyContent: 'center' }}>
          {players.length ? players.map((p) => (
            <span className="chip done pop-in" key={p.uid}><Avatar uid={p.uid} name={p.name} />{p.name}</span>
          )) : <span className="hint">{t('waitingPlayers')}</span>}
        </div>
        <details className="fold" open>
          <summary>{t('settings')}</summary>
          <div className="inner tv-settings">
            <div className="set-row"><span>{t('language')}</span>
              <Seg value={room.lang || 'pl'} onChange={(v) => onSettings({ lang: v })}
                options={LANGS.map((x) => ({ v: x.v, l: x.l }))} /></div>
            <div className="set-row"><span>{t('mode')}</span>
              <Seg value={room.mode} onChange={(v) => onSettings({ mode: v })}
                options={[{ v: 'wszystkie', l: t('modeAll') }, { v: 'rodzinny', l: t('modeFamily') }, { v: 'po22', l: t('mode22') }, { v: 'bez', l: t('modeBez') }]} /></div>
            <div className="set-row"><span>{t('cards')}</span>
              <Seg value={room.fresh === false ? 'all' : 'fresh'} onChange={(v) => onSettings({ fresh: v === 'fresh' })}
                options={[{ v: 'fresh', l: t('cardsFresh') }, { v: 'all', l: t('cardsAll') }]} /></div>
            <div className="set-row"><span>{t('endGameSet')}</span>
              <Seg value={room.endType} onChange={(v) => onSettings({ endType: v, endValue: END_OPTIONS[v][1] })}
                options={[{ v: 'points', l: t('points') }, { v: 'time', l: t('time') }, { v: 'rounds', l: t('rounds') }]} /></div>
            <div className="set-row"><span>{t(room.endType === 'points' ? 'toPoints' : room.endType === 'time' ? 'howMinutes' : 'howRounds')}</span>
              <Seg value={room.endValue} onChange={(v) => onSettings({ endValue: v })}
                options={END_OPTIONS[room.endType].map((n) => ({ v: n, l: String(n) }))} /></div>
            <div className="set-row"><span>{t('lektor')}</span>
              <Seg value={room.lektor === false ? 'off' : (room.voice ? room.voice.split('-').pop() : VOICES[0].id)}
                onChange={(v) => onSettings(v === 'off' ? { lektor: false } : { lektor: true, voice: v })}
                options={VOICES.map((x) => ({ v: x.id, l: t(x.key) })).concat([{ v: 'off', l: t('off') }])} /></div>
          </div>
        </details>
        <button type="button" className="btn btn-primary" disabled={!can} onClick={onStart}>
          {can ? t('start') : t('needMin', { n: minPlayers })}
        </button>
        <div style={{ display: 'flex', gap: '1vw', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-ghost btn-small" onClick={onNewRoom}>{t('newRoom')}</button>
          <InstallTv t={t} />
          {inApp() ? <button type="button" className="btn btn-ghost btn-small" onClick={() => switchRole('graj')}>{t('thisIsPhone')}</button> : null}
        </div>
      </div>
    </div>
  );
}

function Scoreboard({ room, t }) {
  const players = sortedPlayers(room);
  return (
    <aside className="tv-side">
      <div className="side-title">{t('scores')} · {endLabel(room, t).toUpperCase()}</div>
      {players.map((p) => (
        <div key={p.uid} className={'score-row' + (p.uid === room.judge ? ' judge' : '') + (room.state === 'result' && p.uid === room.winner ? ' win' : '') + (p.connected === false ? ' off' : '')}>
          <Avatar uid={p.uid} name={p.name} />
          <span className="nm">{p.name}</span>
          {p.uid === room.judge ? <span className="tag">{t('judgeTag')}</span> : null}
          <span className="pts">{p.score || 0}</span>
        </div>
      ))}
    </aside>
  );
}

function answersOf(deck, cards) { return (cards || []).map((id) => deck.b[id] || ''); }

export default function TvView({ room, code, deck, qr, joinUrl, subs, onSettings, onStart, onAgain, onEnd, onNewRoom, minPlayers, lite, onForce, autoIn }) {
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const t = tr(room.lang || 'pl');
  const pl2 = t('pick2');
  const left = useCountdown(room.state === 'picking' ? room.deadline : 0);
  if (room.state === 'lobby' || !room.state) {
    return (
      <div className={'tv' + (lite ? ' lite' : '')}>
        <div className="tv-main">
          <Lobby room={room} code={code} qr={qr} joinUrl={joinUrl} onSettings={onSettings} onStart={onStart} onNewRoom={onNewRoom} minPlayers={minPlayers} t={t} />
        </div>
      </div>
    );
  }
  const black = deck.c[room.black] || ['', 1];
  const players = sortedPlayers(room);
  const judge = players.find((p) => p.uid === room.judge);
  let stage = null;

  if (room.state === 'picking') {
    const waiting = players.filter((p) => p.uid !== room.judge && !p.left);
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} pickLabel={pl2} className="pop-in" key={room.black} />
        <div className="status-row">
          {waiting.map((p) => {
            const done = subs && subs[p.uid] && subs[p.uid].round === room.round;
            return <span key={p.uid} className={'chip' + (done ? ' done' : '') + (!done && p.connected === false ? ' off' : '')}><Avatar uid={p.uid} name={p.name} />{p.name}{done ? <span className="ok">✓</span> : p.connected === false ? <span className="muted"> · {t('offline')}</span> : null}</span>;
          })}
        </div>
        <div className="hint">{t('pickHint')} <b>{judge ? judge.name : '—'}</b>{autoIn > 0 && autoIn <= 30 ? <> · {t('autoReveal', { n: autoIn })}</> : null}</div>
        {onForce && waiting.some((p) => subs && subs[p.uid] && subs[p.uid].round === room.round) ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onForce}>{t('forceReveal')}</button>
        ) : null}
      </>
    );
  } else if (room.state === 'reveal') {
    const list = room.reveal || [];
    const cur = list[room.revealIdx || 0];
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} answers={cur ? answersOf(deck, cur.cards) : []} pickLabel={pl2} className="pop-in" key={'r' + room.revealIdx} animate={!lite} />
        <div className="hint">{t('answerOf', { a: Math.min((room.revealIdx || 0) + 1, list.length), b: list.length })}</div>
      </>
    );
  } else if (room.state === 'judging' || room.state === 'result') {
    const list = room.reveal || [];
    const result = room.state === 'result';
    const names = {};
    players.forEach((p) => { names[p.uid] = p.name; });
    stage = (
      <>
        <BlackCard text={black[0]} luki={black[1]} pickLabel={pl2} small />
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
          {result ? <>{t('pointFor')} <b className="gold-text" style={{ fontSize: '1.8vw' }}>{names[room.winner] || ''}</b></> : <>{t('judgeWord')} <b>{judge ? judge.name : ''}</b> {t('judgePicks')}</>}
        </div>
      </>
    );
  } else if (room.state === 'end') {
    const ranking = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const top3 = [ranking[1], ranking[0], ranking[2]];
    stage = (
      <div className="center">
        <div className="wordmark gold-text" style={{ fontSize: '4vw' }}>{t('gameOverTv')}</div>
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
          <button type="button" className="btn btn-primary" onClick={onAgain}>{t('again')}</button>
          <button type="button" className="btn btn-ghost" onClick={onNewRoom}>{t('newRoom')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={'tv' + (lite ? ' lite' : '')}>
      <div className="tv-main">
        <div className="tv-head">
          <Logo />
          <div className="tv-round">{t('round')} <b>{room.round}</b>{room.endType === 'rounds' ? ' / ' + room.endValue : ''} · {t('code')} <b>{code}</b></div>
          {room.state !== 'end' ? (
            confirmEnd ? (
              <div className="end-confirm">
                <span>{t('endConfirm')}</span>
                <button type="button" className="btn btn-primary btn-small" onClick={() => { setConfirmEnd(false); onEnd(); }}>{t('yes')}</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmEnd(false)}>{t('no')}</button>
              </div>
            ) : <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmEnd(true)}>{t('endGame')}</button>
          ) : <div className={'timer' + (left !== null && left <= 10 ? ' low' : '')}>{left !== null ? left : ''}</div>}
        </div>
        <div className="tv-stage">{stage}</div>
      </div>
      {room.state !== 'end' ? <Scoreboard room={room} t={t} /> : null}
    </div>
  );
}
