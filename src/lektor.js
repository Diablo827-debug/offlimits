// Lektor z głosu przeglądarki (Web Speech API). Gdy brak polskiego głosu – milczy,
// a gra idzie dalej na czasie. Wersja z głosem z chmury dojdzie w kolejnym etapie.
// Chrome ładuje listę głosów z opóźnieniem – słuchamy zdarzenia i trzymamy ją pod ręką.
let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => { try { cachedVoices = window.speechSynthesis.getVoices() || []; } catch (e) { /* nic */ } };
  load();
  try { window.speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { window.speechSynthesis.onvoiceschanged = load; }
}

let unlocked = false;
// Przeglądarki wpuszczają mowę dopiero po kliknięciu na stronie – to wywołujemy z kliknięcia.
export function unlockSpeech() {
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'pl-PL';
    window.speechSynthesis.speak(u);
  } catch (e) { /* nic */ }
}
export function isUnlocked() { return unlocked; }

function voices() {
  if (cachedVoices.length) return cachedVoices;
  try { return window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch (e) { return []; }
}

export function polishVoice() {
  return voices().find((v) => (v.lang || '').toLowerCase().indexOf('pl') === 0) || null;
}

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export const VOICES = [
  { id: 'pl-PL-Chirp3-HD-Charon', label: 'Męski 1' },
  { id: 'pl-PL-Chirp3-HD-Algenib', label: 'Męski 2' },
  { id: 'pl-PL-Chirp3-HD-Kore', label: 'Kobiecy 1' },
  { id: 'pl-PL-Chirp3-HD-Aoede', label: 'Kobiecy 2' },
];

function cleanText(text) { return text.replace(/_{2,}/g, ', coś, '); }
export function ttsUrl(text, voice) {
  return '/api/tts?v=' + encodeURIComponent(voice || VOICES[0].id) + '&t=' + encodeURIComponent(cleanText(text));
}
// Rozgrzewa pamięć podręczną, żeby lektor nie czekał na nagranie.
export function prefetchSpeech(texts, voice) {
  texts.forEach((t) => { try { fetch(ttsUrl(t, voice)).catch(() => {}); } catch (e) { /* nic */ } });
}

function playCloud(text, voice) {
  return new Promise((resolve, reject) => {
    try {
      const a = new Audio(ttsUrl(text, voice));
      let done = false;
      const ok = () => { if (!done) { done = true; resolve(); } };
      a.onended = ok;
      a.onerror = () => { if (!done) { done = true; reject(new Error('audio')); } };
      a.play().catch((e) => { if (!done) { done = true; reject(e); } });
      setTimeout(ok, 6000 + text.length * 120);
    } catch (e) { reject(e); }
  });
}

export async function speak(text, opts) {
  const enabled = !opts || opts.enabled !== false;
  if (enabled && opts && opts.cloud !== false && typeof Audio !== 'undefined') {
    const started = Date.now();
    try {
      await playCloud(text, opts.voice);
      const left = 900 - (Date.now() - started);
      if (left > 0) await new Promise((r) => setTimeout(r, left));
      return;
    } catch (e) { /* brak sieci lub blokada dźwięku – głos przeglądarki */ }
  }
  return speakBrowser(text, opts);
}

function speakBrowser(text, opts) {
  const rate = (opts && opts.rate) || 1;
  const enabled = !opts || opts.enabled !== false;
  // Minimalny czas na przeczytanie przez graczy, nawet bez lektora.
  const minMs = 2200 + text.length * 45;
  return new Promise((resolve) => {
    const started = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const left = minMs - (Date.now() - started);
      setTimeout(resolve, Math.max(0, Math.min(left, 3000)));
    };
    const voice = polishVoice();
    if (!enabled || !speechSupported()) {
      setTimeout(() => { done = true; resolve(); }, minMs);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/_{2,}/g, ', coś, '));
      u.lang = 'pl-PL';
      if (voice) u.voice = voice;
      u.rate = rate;
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setTimeout(finish, 4000 + text.length * 110); // zabezpieczenie, gdy TV nie zgłosi końca
    } catch (e) {
      setTimeout(() => { done = true; resolve(); }, minMs);
    }
  });
}

export function stopSpeaking() {
  try { if (speechSupported()) window.speechSynthesis.cancel(); } catch (e) { /* nic */ }
}
