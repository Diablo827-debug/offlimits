// Lektor z głosu przeglądarki (Web Speech API). Gdy brak polskiego głosu – milczy,
// a gra idzie dalej na czasie. Wersja z głosem z chmury dojdzie w kolejnym etapie.
function voices() {
  try { return window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch (e) { return []; }
}

export function polishVoice() {
  return voices().find((v) => (v.lang || '').toLowerCase().indexOf('pl') === 0) || null;
}

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text, opts) {
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
    if (!enabled || !speechSupported() || !voice) {
      setTimeout(() => { done = true; resolve(); }, minMs);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/_{2,}/g, ', coś, '));
      u.lang = 'pl-PL';
      u.voice = voice;
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
