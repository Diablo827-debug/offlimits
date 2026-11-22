import React from 'react';

// Postać prowadzącego. Klatki leżą w public/prowadzacy/<mina>-<c|o|b>.webp
// (c = usta zamknięte, o = usta otwarte w trakcie mówienia, b = mrugnięcie).
// Dopóki klatek nie ma, widać tylko dymek z tekstem.
export const EMOS = ['neutral', 'happy', 'laugh', 'smug', 'shocked', 'evil', 'bored', 'crazy', 'card'];
const src = (emo, v) => '/prowadzacy/' + emo + '-' + v + '.webp';

let available = null; // null = jeszcze nie sprawdzono
function checkFrames() {
  if (available !== null) return Promise.resolve(available);
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { available = true; res(true); };
    img.onerror = () => { available = false; res(false); };
    img.src = src('neutral', 'c');
  });
}

// Czy klatki postaci są wgrane (bez nich zostaje stary układ ekranu z dymkiem w kolumnie wyników).
export function useHostFrames() {
  const [ok, setOk] = React.useState(available);
  React.useEffect(() => { checkFrames().then(setOk); }, []);
  return !!ok;
}

function baseEmo(room, stageAt) {
  const s = room.state;
  if (s === 'picking') return Date.now() - stageAt > 35000 ? 'bored' : 'neutral';
  if (s === 'reveal') return 'card';
  if (s === 'judging') return 'smug';
  if (s === 'voting') return 'shocked';
  if (s === 'result') return 'happy';
  if (s === 'end') return 'laugh';
  return 'happy';
}

export default function Prowadzacy({ room, cue, compact, big }) {
  const [ok, setOk] = React.useState(available);
  const [talk, setTalk] = React.useState(null); // { mood }
  const [open, setOpen] = React.useState(false);
  const [blink, setBlink] = React.useState(false);
  const [laughUntil, setLaughUntil] = React.useState(0);
  const [, tick] = React.useState(0);
  const stage = React.useRef({ key: '', at: Date.now() });
  const key = room.state + '-' + room.round;
  if (stage.current.key !== key) stage.current = { key, at: Date.now() };

  React.useEffect(() => {
    checkFrames().then((v) => {
      setOk(v);
      if (v) EMOS.forEach((e) => ['c', 'o', 'b'].forEach((x) => { const i = new Image(); i.src = src(e, x); }));
    });
  }, []);

  // Lektor mówi → ruszamy ustami; po odczytanej odpowiedzi chwila śmiechu.
  React.useEffect(() => {
    const on = (ev) => {
      const d = ev.detail || {};
      if (d.on) setTalk(d.enabled ? { mood: d.mood } : null);
      else {
        setTalk(null);
        if (d.mood === 'a') setLaughUntil(Date.now() + 1800);
      }
    };
    window.addEventListener('ol-speak', on);
    return () => window.removeEventListener('ol-speak', on);
  }, []);

  React.useEffect(() => {
    if (!talk) { setOpen(false); return undefined; }
    let t;
    const flap = () => { setOpen((o) => !o); t = setTimeout(flap, 80 + Math.random() * 110); };
    flap();
    return () => clearTimeout(t);
  }, [talk]);

  React.useEffect(() => {
    let t;
    const next = () => {
      t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); next(); }, 2500 + Math.random() * 3500);
    };
    next();
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  if (!room || room.host === 'off') return null;
  const now = Date.now();
  const cueOn = cue && now - cue.at < 7000;
  let emo = baseEmo(room, stage.current.at);
  if (talk && (talk.mood === 'q' || talk.mood === 'a')) emo = 'card';
  if (now < laughUntil) emo = 'laugh';
  if (cueOn && (talk || now - cue.at < 2500)) emo = cue.emo;
  const frame = talk && open ? 'o' : blink ? 'b' : 'c';

  return (
    <div className={'host' + (big ? ' big' : '') + (compact ? ' compact' : '') + (talk ? ' talking' : '') + (emo === 'laugh' ? ' laughing' : '')}>
      {cueOn ? <div className="host-bubble" key={cue.at}>{cue.text}</div> : null}
      {ok ? <img className="host-img" src={src(emo, frame)} alt="" draggable="false" /> : null}
    </div>
  );
}
