// Lektor z chmury (Google Cloud Text-to-Speech) – zawsze ten sam głos na każdym telewizorze.
// Klucz działa wyłącznie dla Text-to-Speech w projekcie offlimitsapp. Gotowe nagrania trafiają do
// pamięci podręcznej Cloudflare, więc to samo zdanie nie jest generowane (ani płatne) drugi raz.
const KEY = 'AIzaSyAQOeSE5ozxLpxndNtbFoog90gS0Z5XNb8';
const ALLOWED = /^https:\/\/(([a-z0-9-]+\.)?offlimits-esn\.pages\.dev|offlimits\.grudka-studio\.dev)$/;
const DEFAULT_VOICE = 'pl-PL-Chirp3-HD-Charon';

function originOf(h) { try { return new URL(h).origin; } catch (e) { return ''; } }

// ElevenLabs (eleven_v3) – lektor z emocjami. Działa, gdy w Cloudflare Pages jest zmienna
// ELEVENLABS_API_KEY; bez niej (albo przy błędzie) gra używa głosów Google jak dotąd.
// Głosy można podmienić zmienną ELEVEN_VOICES, np. {"Charon":"<voice_id>", ...}.
const ELEVEN_VOICES = {
  Charon: 'JBFqnCBsd6RMkjVDRZzb', // George – męski 1
  Algenib: 'pNInz6obpgDQGcFmaJgB', // Adam – męski 2
  Kore: '21m00Tcm4TlvDq8ikWAM', // Rachel – kobiecy 1
  Aoede: 'EXAVITQu4vr4xnSDxMaL', // Sarah – kobiecy 2
};
// Polscy lektorzy z Voice Library ElevenLabs (uzupełnimy ID, gdy wybierzesz głosy).
const PL_VOICES = {
  pl: { Charon: '', Algenib: '', Kore: '', Aoede: '' },
};
const MOODS = {
  q: '[curious] ',          // pytanie
  a: '[mischievously] ',    // odkrywana odpowiedź
  w: '[excited] ',          // zwycięzca / głosowanie
  s: '[warmly] ',           // próbka głosu
};

async function eleven(env, voice, text, mood) {
  let map = ELEVEN_VOICES;
  try { if (env.ELEVEN_VOICES) map = Object.assign({}, map, JSON.parse(env.ELEVEN_VOICES)); } catch (e) { /* zostają domyślne */ }
  const short = voice.split('-').pop();
  const loc = voice.slice(0, 2); // pl / en / es / el
  // Najpierw głos dla danego języka (np. polski lektor z Voice Library), potem domyślny.
  const id = (PL_VOICES[loc] && PL_VOICES[loc][short]) || (map[loc] && map[loc][short]) || map[short];
  if (!id) return null;
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + id + '?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text: (MOODS[mood] || '') + text, model_id: env.ELEVEN_MODEL || 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!r.ok) return null;
  return new Uint8Array(await r.arrayBuffer());
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const src = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!ALLOWED.test(originOf(src))) return new Response('Brak dostępu', { status: 403 });
  const text = (url.searchParams.get('t') || '').trim().slice(0, 600);
  const voice = url.searchParams.get('v') || DEFAULT_VOICE;
  if (!text || !/^(pl-PL|en-US|es-ES|el-GR)-[A-Za-z0-9-]+$/.test(voice)) return new Response('Zły parametr', { status: 400 });

  const mood = /^[qaws]$/.test(url.searchParams.get('m') || '') ? url.searchParams.get('m') : '';
  const cache = caches.default;
  const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' };

  if (env && env.ELEVENLABS_API_KEY) {
    const elKey = new Request('https://tts.cache/el/' + encodeURIComponent(voice) + '/' + mood + '/' + encodeURIComponent(text));
    const elHit = await cache.match(elKey);
    if (elHit) return elHit;
    try {
      const bin = await eleven(env, voice, text, mood);
      if (bin && bin.length > 1000) {
        const res = new Response(bin, { headers });
        waitUntil(cache.put(elKey, res.clone()));
        return res;
      }
    } catch (e) { /* awaria ElevenLabs – głos Google */ }
  }

  const cacheKey = new Request('https://tts.cache/' + encodeURIComponent(voice) + '/' + encodeURIComponent(text));
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  const j = await r.json();
  if (!r.ok || !j.audioContent) return new Response('Błąd lektora', { status: 502 });
  const bin = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
  const res = new Response(bin, { headers });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
