// Lektor z chmury (Google Cloud Text-to-Speech) – zawsze ten sam głos na każdym telewizorze.
// Klucz działa wyłącznie dla Text-to-Speech w projekcie offlimitsapp. Gotowe nagrania trafiają do
// pamięci podręcznej Cloudflare, więc to samo zdanie nie jest generowane (ani płatne) drugi raz.
const KEY = 'AIzaSyAQOeSE5ozxLpxndNtbFoog90gS0Z5XNb8';
const ALLOWED = /^https:\/\/(([a-z0-9-]+\.)?offlimits-esn\.pages\.dev|offlimits\.grudka-studio\.dev)$/;
const DEFAULT_VOICE = 'pl-PL-Chirp3-HD-Charon';

function originOf(h) { try { return new URL(h).origin; } catch (e) { return ''; } }

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const src = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!ALLOWED.test(originOf(src))) return new Response('Brak dostępu', { status: 403 });
  const text = (url.searchParams.get('t') || '').trim().slice(0, 600);
  const voice = url.searchParams.get('v') || DEFAULT_VOICE;
  if (!text || !/^pl-PL-[A-Za-z0-9-]+$/.test(voice)) return new Response('Zły parametr', { status: 400 });

  const cacheKey = new Request('https://tts.cache/' + encodeURIComponent(voice) + '/' + encodeURIComponent(text));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'pl-PL', name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  const j = await r.json();
  if (!r.ok || !j.audioContent) return new Response('Błąd lektora', { status: 502 });
  const bin = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
  const res = new Response(bin, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' } });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
