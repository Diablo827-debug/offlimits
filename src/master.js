// Logika gry prowadzona przez telewizor (TV = „mistrz gry”).
// Telefony zapisują tylko swoje odpowiedzi (subs), wybór sędziego (picks) i komendy (cmd).
import { ref, set, update, get, remove } from 'firebase/database';
import { db } from './firebase.js';
import { idsFor, shuffle } from './deck.js';

export const HAND = 10;
export const PICK_SECONDS = 60;
export const RESULT_SECONDS = 9;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export async function createRoom(uid) {
  for (let i = 0; i < 6; i++) {
    const code = newCode();
    const r = ref(db, 'rooms/' + code);
    const snap = await get(r);
    if (snap.exists()) continue;
    await set(r, {
      hostUid: uid,
      createdAt: Date.now(),
      mode: 'wszystkie',
      endType: 'points',
      endValue: 7,
      lektor: true,
      state: 'lobby',
      round: 0,
    });
    return code;
  }
  throw new Error('Nie udało się utworzyć pokoju');
}

export function activeOrder(room) {
  const players = room.players || {};
  return Object.keys(players)
    .filter((u) => players[u].connected !== false)
    .sort((a, b) => (players[a].joinedAt || 0) - (players[b].joinedAt || 0));
}

function nextJudge(room) {
  const order = activeOrder(room);
  if (!order.length) return null;
  const i = order.indexOf(room.judge);
  return order[(i + 1) % order.length];
}

async function loadSecret(code) {
  const s = await get(ref(db, 'secret/' + code));
  return s.val() || {};
}

function drawFrom(pile, count, refillIds, exclude) {
  const out = [];
  let p = pile.slice();
  for (let i = 0; i < count; i++) {
    if (!p.length) p = shuffle(refillIds.filter((id) => !exclude[id]));
    if (!p.length) break;
    out.push(p.shift());
  }
  return { cards: out, pile: p };
}

// Uzupełnia ręce wszystkich graczy do 10 kart i losuje nową czarną kartę.
async function dealAndBlack(code, room, deck, secret, patch) {
  const players = room.players || {};
  const handsSnap = await get(ref(db, 'hands/' + code));
  const hands = handsSnap.val() || {};
  const inHands = {};
  Object.keys(hands).forEach((u) => (hands[u].cards || []).forEach((id) => { inHands[id] = 1; }));
  const allWhite = idsFor(deck, room.mode, 'b');
  const allBlack = idsFor(deck, room.mode, 'c');
  let whitePile = secret.white || shuffle(allWhite);
  let blackPile = secret.black || shuffle(allBlack);
  const handUpdates = {};
  Object.keys(players).forEach((u) => {
    const cur = (hands[u] && hands[u].cards) || [];
    if (cur.length >= HAND) return;
    const d = drawFrom(whitePile, HAND - cur.length, allWhite, inHands);
    whitePile = d.pile;
    d.cards.forEach((id) => { inHands[id] = 1; });
    handUpdates[u] = { cards: cur.concat(d.cards) };
  });
  if (!blackPile.length) blackPile = shuffle(allBlack);
  const black = blackPile.shift();
  await update(ref(db, 'hands/' + code), handUpdates);
  await set(ref(db, 'secret/' + code), { white: whitePile, black: blackPile, owners: null });
  await remove(ref(db, 'subs/' + code));
  await remove(ref(db, 'picks/' + code));
  await update(ref(db, 'rooms/' + code), Object.assign({
    state: 'picking',
    black,
    deadline: 0,
    reveal: null,
    revealIdx: 0,
    owners: null,
    winner: null,
    winK: null,
  }, patch));
}

export async function startGame(code, room, deck) {
  const order = activeOrder(room);
  const scores = {};
  order.forEach((u) => { scores['players/' + u + '/score'] = 0; });
  await remove(ref(db, 'hands/' + code));
  await update(ref(db, 'rooms/' + code), scores);
  const fresh = Object.assign({}, room, { players: room.players });
  await dealAndBlack(code, fresh, deck, {}, {
    round: 1,
    judge: order[0],
    startedAt: Date.now(),
  });
}

// Wszyscy (oprócz sędziego) zagrali albo minął czas → odkrywanie.
export async function toReveal(code, room, deck, subs) {
  const luki = deck.c[room.black] ? deck.c[room.black][1] : 1;
  const entries = Object.keys(subs || {})
    .filter((u) => u !== room.judge && subs[u].round === room.round && (subs[u].cards || []).length === luki)
    .map((u) => ({ u, cards: subs[u].cards }));
  if (!entries.length) {
    // Nikt nie zagrał: nowa czarna karta, ten sam sędzia.
    const secret = await loadSecret(code);
    await dealAndBlack(code, room, deck, secret, {});
    return;
  }
  const mixed = shuffle(entries);
  const owners = {};
  const reveal = mixed.map((e, i) => { owners['k' + i] = e.u; return { k: 'k' + i, cards: e.cards }; });
  // Zagrane karty znikają z rąk.
  const handsSnap = await get(ref(db, 'hands/' + code));
  const hands = handsSnap.val() || {};
  const upd = {};
  entries.forEach((e) => {
    const cur = (hands[e.u] && hands[e.u].cards) || [];
    upd[e.u + '/cards'] = cur.filter((id) => e.cards.indexOf(id) < 0);
  });
  await update(ref(db, 'hands/' + code), upd);
  await update(ref(db, 'secret/' + code), { owners });
  await update(ref(db, 'rooms/' + code), { state: 'reveal', reveal, revealIdx: 0, deadline: 0 });
}

export function setRevealIdx(code, i) {
  return update(ref(db, 'rooms/' + code), { revealIdx: i });
}

export function toJudging(code) {
  return update(ref(db, 'rooms/' + code), { state: 'judging' });
}

export async function applyPick(code, room, k) {
  const secret = await loadSecret(code);
  const owners = secret.owners || {};
  const winner = owners[k];
  if (!winner) return;
  const players = room.players || {};
  const score = ((players[winner] && players[winner].score) || 0) + 1;
  const patch = { state: 'result', winner, winK: k, owners };
  patch['players/' + winner + '/score'] = score;
  await update(ref(db, 'rooms/' + code), patch);
}

export function isGameOver(room) {
  const players = room.players || {};
  const top = Math.max.apply(null, [0].concat(Object.keys(players).map((u) => players[u].score || 0)));
  if (room.endType === 'points') return top >= room.endValue;
  if (room.endType === 'rounds') return room.round >= room.endValue;
  if (room.endType === 'time') return Date.now() >= (room.startedAt || 0) + room.endValue * 60000;
  return false;
}

export async function nextRound(code, room, deck) {
  if (isGameOver(room)) {
    await update(ref(db, 'rooms/' + code), { state: 'end', deadline: 0 });
    return;
  }
  const secret = await loadSecret(code);
  await dealAndBlack(code, room, deck, secret, {
    round: (room.round || 0) + 1,
    judge: nextJudge(room),
  });
}

export async function backToLobby(code) {
  await remove(ref(db, 'hands/' + code));
  await remove(ref(db, 'subs/' + code));
  await remove(ref(db, 'picks/' + code));
  await remove(ref(db, 'secret/' + code));
  await update(ref(db, 'rooms/' + code), {
    state: 'lobby', round: 0, judge: null, black: null, reveal: null, owners: null, winner: null, winK: null,
  });
}

export function endGame(code) {
  return update(ref(db, 'rooms/' + code), { state: 'end', deadline: 0 });
}

export function saveSettings(code, patch) {
  return update(ref(db, 'rooms/' + code), patch);
}
