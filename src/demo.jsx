// Podgląd ekranów bez Firebase: /tv?demo=picking, /graj?demo=hand itd.
import React from 'react';
import { loadDeck } from './deck.js';
import TvView from './TvView.jsx';
import GrajView from './GrajView.jsx';

const P = {
  u1: { name: 'Łukasz', score: 4, joinedAt: 1 },
  u2: { name: 'Marta', score: 3, joinedAt: 2 },
  u3: { name: 'Kamil', score: 5, joinedAt: 3 },
  u4: { name: 'Ola', score: 1, joinedAt: 4 },
  u5: { name: 'Patryk', score: 2, joinedAt: 5 },
};

function fixture(state, deck) {
  const whites = Object.keys(deck.b).filter((id) => id[0] === 'R');
  const base = {
    mode: 'rodzinny', endType: 'points', endValue: 7, lektor: true, players: P, round: 6, judge: 'u2',
    black: 'R-C002', deadline: 0, state,
  };
  const reveal = [
    { k: 'k0', cards: ['R-B0020'] }, { k: 'k1', cards: ['R-B0010'] },
    { k: 'k2', cards: ['R-B0033'] }, { k: 'k3', cards: ['R-B0025'] },
  ];
  if (state === 'lobby') return Object.assign(base, { round: 0, judge: null });
  if (state === 'reveal') return Object.assign(base, { reveal, revealIdx: 1 });
  if (state === 'judging') return Object.assign(base, { reveal });
  if (state === 'result') return Object.assign(base, { reveal, winner: 'u3', winK: 'k2', owners: { k0: 'u1', k1: 'u4', k2: 'u3', k3: 'u5' } });
  if (state === 'end') return Object.assign(base, { players: Object.assign({}, P, { u3: Object.assign({}, P.u3, { score: 7 }) }) });
  if (state === 'pick2') return Object.assign(base, { state: 'picking', black: 'R-C019' });
  return Object.assign(base, { _hand: whites.slice(40, 50) });
}

export default function Demo({ screen, demo }) {
  const [deck, setDeck] = React.useState(null);
  React.useEffect(() => { loadDeck().then(setDeck); }, []);
  if (!deck) return null;
  if (screen === 'tv') {
    const room = fixture(demo === 'pick2' ? 'pick2' : demo, deck);
    const subs = { u1: { round: 6 }, u3: { round: 6 } };
    if (demo === 'dzwiek') {
      return (
        <>
          <TvView room={fixture('lobby', deck)} code="8F3K" deck={deck} qr="" joinUrl="https://offlimits-esn.pages.dev/graj?kod=8F3K" subs={{}} minPlayers={3} onSettings={() => {}} onStart={() => {}} onAgain={() => {}} />
          <div className="sound-gate"><div className="sound-box"><img src="/sygnet.svg" alt="" /><div className="big">Włącz dźwięk lektora</div><p className="muted">Przeglądarka wpuszcza dźwięk dopiero po jednym kliknięciu na tym ekranie.</p><button type="button" className="btn btn-primary">Włącz dźwięk</button><button type="button" className="btn btn-ghost">Graj bez lektora</button></div></div>
        </>
      );
    }
    return <TvView room={room} code="8F3K" deck={deck} qr="" joinUrl="https://offlimits.pages.dev/graj?kod=8F3K" subs={subs} minPlayers={3} onSettings={() => {}} onStart={() => {}} onAgain={() => {}} />;
  }
  // telefon: hand | hand2 | judge | wait | played | lobby | result | end
  const map = { hand: 'picking', hand2: 'pick2', judge: 'judging', wait: 'judging', played: 'picking', lobby: 'lobby', result: 'result', end: 'end', reveal: 'reveal', sedzia: 'picking' };
  const room = fixture(map[demo] || 'picking', deck);
  const whites = Object.keys(deck.b).filter((id) => id[0] === 'R').slice(40, 50);
  const me = demo === 'judge' || demo === 'sedzia' ? 'u2' : 'u1';
  const mySub = demo === 'played' ? { round: 6, cards: [whites[2]] } : null;
  return <GrajView room={room} me={me} hand={whites} mySub={mySub} deck={deck} onPlay={() => {}} onPick={() => {}} onCmd={() => {}} />;
}
