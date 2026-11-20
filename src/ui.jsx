import React from 'react';
import { fillParts } from './deck.js';

const AV_COLORS = ['#E3C88E', '#D98C8C', '#9CC3A8', '#9DB4D9', '#D9A6D0', '#E6B17A', '#B5D98C', '#8CD3D9', '#C9B3F0', '#F0C2A0'];
export function avatarColor(uid) {
  let h = 0;
  for (let i = 0; i < (uid || '').length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function Avatar({ uid, name, className }) {
  return (
    <span className={'avatar ' + (className || '')} style={{ background: avatarColor(uid) }} aria-hidden="true">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Parts({ parts }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={p.a ? 'ans' : p.blank ? 'blank' : undefined}>{p.t}</span>
      ))}
    </>
  );
}

export function BlackCard({ text, answers, luki, small, className }) {
  const parts = fillParts(text || '', answers || []);
  return (
    <div className={'bcard ' + (small ? 'small ' : '') + (className || '')}>
      <div className="card-mark"><img src="/sygnet.svg" alt="" />OFFLIMITS</div>
      <div className="t"><Parts parts={parts} /></div>
      {luki === 2 ? <div className="pick">WYBIERZ 2</div> : null}
    </div>
  );
}

export function Logo({ size }) {
  return (
    <div className="tv-logo">
      <img src="/sygnet.svg" alt="" />
      <span className="wordmark gold-text" style={size ? { fontSize: size } : null}>OFFLIMITS</span>
    </div>
  );
}

export function sortedPlayers(room) {
  const players = (room && room.players) || {};
  return Object.keys(players)
    .map((u) => Object.assign({ uid: u }, players[u]))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

export function useCountdown(deadline) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function endLabel(room) {
  if (room.endType === 'points') return 'do ' + room.endValue + ' pkt';
  if (room.endType === 'rounds') return room.endValue + ' rund';
  return room.endValue + ' min';
}
