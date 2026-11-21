// Muzyczka w tle – grana na żywo przez Web Audio (bez plików i bez praw autorskich).
// Spokojny, „klubowy” lounge: miękkie akordy, kontrabas i szczoteczki. Przycisza się, gdy mówi lektor.

const BPM = 84;
const BEAT = 60 / BPM;
// ii–V–I w kilku tonacjach, żeby się nie nudziło (MIDI: bas + akord)
const PROG = [
  [45, [57, 60, 64, 67]], // Am7
  [50, [57, 60, 62, 65]], // Dm7
  [43, [55, 59, 62, 65]], // G7
  [48, [55, 59, 60, 64]], // Cmaj7
  [41, [57, 60, 64, 65]], // Fmaj7
  [40, [56, 59, 62, 64]], // E7
  [45, [55, 60, 64, 67]], // Am7
  [45, [56, 59, 62, 64]], // E7/A
];

let ctx = null;
let master = null;
let duck = null;
let timer = null;
let nextBar = 0;
let bar = 0;
let level = 0.5;

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function note(t, midi, len, vol, type, cutoff) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = type;
  o.frequency.value = hz(midi);
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + len * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f); f.connect(g); g.connect(duck);
  o.start(t); o.stop(t + len + 0.05);
}

let noiseBuf = null;
function brush(t, vol) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = 'highpass'; f.frequency.value = 6000;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  s.connect(f); f.connect(g); g.connect(duck);
  s.start(t); s.stop(t + 0.2);
}

function scheduleBar(t) {
  const [bass, chord] = PROG[bar % PROG.length];
  // akord „Rhodes” na 1 i lekko przesunięty na „i” po 3
  chord.forEach((m, i) => note(t + i * 0.012, m, BEAT * 2.6, 0.045, 'sine', 2200));
  chord.forEach((m) => note(t + BEAT * 2.5, m, BEAT * 1.4, 0.025, 'triangle', 1600));
  // bas: pryma, kwinta, oktawa, przejście
  const walk = [bass, bass + 7, bass + 12, bass + (bar % 2 ? 10 : 5)];
  walk.forEach((m, i) => note(t + i * BEAT, m - 12, BEAT * 0.95, 0.12, 'triangle', 500));
  // szczoteczki ze swingiem
  for (let i = 0; i < 4; i++) {
    brush(t + i * BEAT, i % 2 ? 0.05 : 0.03);
    brush(t + i * BEAT + BEAT * 0.66, 0.018);
  }
  // co 4 takty krótka melodyjka
  if (bar % 4 === 3) {
    const top = chord[chord.length - 1] + 12;
    [0, 2, 3].forEach((s, i) => note(t + BEAT * (1 + i * 0.66), top - s, BEAT * 0.8, 0.03, 'sine', 3000));
  }
  bar++;
}

function tick() {
  while (nextBar < ctx.currentTime + 1.5) {
    scheduleBar(nextBar);
    nextBar += BEAT * 4;
  }
}

export function musicStart(vol) {
  try {
    if (typeof vol === 'number') level = vol;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      duck = ctx.createGain();
      duck.connect(master); master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
    if (!timer) {
      nextBar = ctx.currentTime + 0.2;
      timer = setInterval(tick, 400);
      tick();
    }
  } catch (e) { /* brak Web Audio – po prostu bez muzyki */ }
}

export function musicStop() {
  if (!ctx) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  if (timer) { clearInterval(timer); timer = null; }
}

// Gdy mówi lektor, muzyka cichnie do ok. 25%.
export function musicDuck(on) {
  if (!ctx || !duck) return;
  duck.gain.setTargetAtTime(on ? 0.25 : 1, ctx.currentTime, on ? 0.15 : 0.6);
}
