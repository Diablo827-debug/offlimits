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
  Gacrux: 'EXAVITQu4vr4xnSDxMaL', // Babcia – podmienimy na głos starszej pani z Voice Library
};
// Polscy lektorzy z Voice Library ElevenLabs (uzupełnimy ID, gdy wybierzesz głosy).
const PL_VOICES = {
  pl: { Charon: '', Algenib: '', Kore: '', Aoede: '' },
};
// Reżyseria lektora „z jajem”: ma brzmieć jak kumpel, który czyta kartę i sam się z niej śmieje.
// Wybór wariantu zależy od tekstu (to samo zdanie = to samo nagranie w pamięci, różne zdania = różne miny).
const pick = (arr, text, salt) => {
  let h = salt || 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
};
const EL_Q = ['[playfully]', '[mischievously]', '[curious]', '[sarcastically]', '[conspiratorially]'];
const EL_BEFORE = ['[dramatic pause] [mischievously]', '[pause] [whispers]', '[short pause] [deadpan]', '[pause] [trying not to laugh]', '[dramatic pause] [excited]', '[sighs] [sarcastically]'];
const EL_AFTER = ['[laughs]', '[chuckles]', '[giggles]', '[snorts]', '[laughs out loud]', '[wheezing laughter]'];
const EL_WIN = ['[excited] ', '[cheerfully] ', '[laughs] '];

function direct(text, mood) {
  if (mood === 'a' && text.indexOf('⟦') >= 0) {
    let first = true;
    const body = text.replace(/⟦/g, () => { const t = first ? pick(EL_BEFORE, text) + ' ' : ''; first = false; return t; }).replace(/⟧/g, '');
    return body + ' ' + pick(EL_AFTER, text, 3);
  }
  const plain = text.replace(/[⟦⟧]/g, '');
  if (mood === 'q') return pick(EL_Q, plain) + ' ' + plain;
  if (mood === 'w') return pick(EL_WIN, plain) + plain;
  if (mood === 's') return '[warmly] ' + plain + ' [chuckles]';
  // Prowadzący – charakter: a absurdalny, s sarkastyczny, b bezczelny, c czarny humor
  if (mood === 'hg') return '[sweet old lady voice] ' + plain + ' [cackles]';
  if (mood === 'ha') return '[excited] [silly voice] ' + plain + ' [giggles]';
  if (mood === 'hs') return '[sarcastically] [deadpan] ' + plain + ' [sighs]';
  if (mood === 'hb') return '[mischievously] [cocky] ' + plain + ' [laughs]';
  if (mood === 'hc') return '[ominous] [darkly] ' + plain + ' [evil chuckle]';
  return plain;
}

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
    body: JSON.stringify({ text: direct(text, mood), model_id: env.ELEVEN_MODEL || 'eleven_v3', voice_settings: { stability: 0.0, similarity_boost: 0.7 } }),
  });
  if (!r.ok) return null;
  return new Uint8Array(await r.arrayBuffer());
}

const G_STYLE = {
  pl: {
    q: 'Jesteś rozbawionym prowadzącym imprezowej gry karcianej wśród przyjaciół. Przeczytaj pytanie luźno, naturalnie, z łobuzerskim zaciekawieniem, jakbyś już się uśmiechał pod nosem. Zero sztywności, zero spikerskiego tonu.',
    a: 'Jesteś kumplem, który na imprezie czyta na głos kartę z głupią odpowiedzią i sam ledwo powstrzymuje śmiech. Przeczytaj początek normalnie, przed odpowiedzią zrób krótką pauzę dla efektu, puentę powiedz z niedowierzaniem i rozbawieniem, a na końcu parsknij albo zaśmiej się krótko. Ma być naturalnie, głupio i śmiesznie, nie sztywno.',
    w: 'Ogłoś zwycięzcę rundy radośnie i z przesadną pompą, jak rozbawiony prowadzący teleturnieju, ze śmiechem w głosie.',
    s: 'Powiedz to ciepło i z uśmiechem, luźno, jak kumpel na imprezie.',
    hg: 'Jesteś słodką, starszą babcią, która prowadzi teleturniej. Mówisz ciepło, czule i powoli, jak do wnuków, a złośliwe puenty rzucasz niewinnie, po czym chichoczesz jak czarownica.',
    ha: 'Jesteś kompletnie odklejonym, absurdalnym prowadzącym teleturnieju. Powiedz to z szaloną energią, dziwacznie, z przesadną emfazą i chichotem.',
    hs: 'Jesteś sarkastycznym, błyskotliwym prowadzącym. Powiedz to z kamienną twarzą, kąśliwie, z ironicznym westchnieniem.',
    hb: 'Jesteś bezczelnym prowadzącym, który prowokuje graczy. Powiedz to zadziornie, pewnie siebie, z łobuzerskim śmiechem.',
    hc: 'Jesteś mrocznym prowadzącym z czarnym humorem. Powiedz to powoli, złowieszczo, cynicznie, z cichym, złym chichotem.',
  },
  en: {
    q: 'You are an amused host of a party card game among friends. Read the question casually and naturally, with mischievous curiosity, like you are already smirking. Never stiff.',
    a: 'You are a friend at a party reading a silly card out loud and barely holding back laughter. Read the start normally, pause briefly before the answer for effect, deliver the punchline with amused disbelief, then snort or laugh briefly. Natural, silly and funny, not stiff.',
    w: 'Announce the round winner joyfully with exaggerated pomp, like an amused game-show host, laughing a little.',
    s: 'Say it warmly and with a smile, casually, like a friend at a party.',
    hg: 'You are a sweet old grandma hosting a game show. Speak warmly, tenderly and slowly, like to your grandchildren, deliver the savage punchlines innocently, then cackle like a witch.',
    ha: 'You are a completely unhinged, absurd game-show host. Say it with crazy energy, weirdly, with exaggerated emphasis and a giggle.',
    hs: 'You are a sarcastic, witty host. Say it deadpan and biting, with an ironic sigh.',
    hb: 'You are a cheeky host who provokes the players. Say it cocky and teasing, with a mischievous laugh.',
    hc: 'You are a dark-humoured host. Say it slowly, ominously, cynically, with a quiet evil chuckle.',
  },
};
G_STYLE.es = G_STYLE.en; G_STYLE.el = G_STYLE.en;

async function gemini(voice, text, mood) {
  const loc = voice.slice(0, 2);
  let st = (G_STYLE[loc] || G_STYLE.en)[mood || 's'] || G_STYLE.pl.s;
  // Głos „Babcia”: starsza pani, ciepła, z lekko drżącym głosem i chichotem.
  if (/Gacrux$/.test(voice)) st = (loc === 'pl' ? 'Mów głosem ok. 75-letniej, energicznej babci: ciepło, trochę skrzekliwie, z lekkim drżeniem, przeciągając słowa, z łobuzerskim chichotem. ' : 'Speak as an energetic grandma of about 75: warm, a bit croaky, slightly trembling, drawing out words, with a cheeky giggle. ') + st;
  // odpowiedź: pauza przed puentą i śmiech na końcu (znaczniki Gemini-TTS)
  let t = text;
  if (mood === 'a' && t.indexOf('⟦') >= 0) {
    let first = true;
    t = t.replace(/⟦/g, () => { const x = first ? '[short pause] ' : ''; first = false; return x; }).replace(/⟧/g, '') + ' [laughing]';
  } else t = t.replace(/[⟦⟧]/g, '');
  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { prompt: st, text: t },
      voice: { languageCode: voice.slice(0, 5), name: voice.split('-').pop(), modelName: 'gemini-2.5-flash-tts' },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.audioContent) { lastGeminiError = JSON.stringify(j).slice(0, 600); return null; }
  return Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
}
let lastGeminiError = '';

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const src = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!ALLOWED.test(originOf(src))) return new Response('Brak dostępu', { status: 403 });
  const text = (url.searchParams.get('t') || '').trim().slice(0, 600);
  const voice = url.searchParams.get('v') || DEFAULT_VOICE;
  if (!text || !/^(pl-PL|en-US|es-ES|el-GR)-[A-Za-z0-9-]+$/.test(voice)) return new Response('Zły parametr', { status: 400 });

  const mood = /^([qaws]|h[gasbc])$/.test(url.searchParams.get('m') || '') ? url.searchParams.get('m') : '';
  const cache = caches.default;
  const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' };

  if (env && env.ELEVENLABS_API_KEY) {
    const elKey = new Request('https://tts.cache/el/' + encodeURIComponent(voice) + '/' + mood + '/' + encodeURIComponent(text));
    const elHit = await cache.match(elKey);
    if (elHit) return elHit;
    try {
      const bin = await eleven(env, voice, text, mood);
      if (bin && bin.length > 1000) {
        const res = new Response(bin, { headers: Object.assign({ 'X-Lektor': 'elevenlabs' }, headers) });
        waitUntil(cache.put(elKey, res.clone()));
        return res;
      }
    } catch (e) { /* awaria ElevenLabs – głos Google */ }
  }

  // Gemini-TTS: ten sam klucz Google, a styl ustawiamy zwykłym poleceniem.
  if (!(env && env.GEMINI_TTS === 'off')) {
    const gKey = new Request('https://tts.cache/gm/' + encodeURIComponent(voice) + '/' + mood + '/' + encodeURIComponent(text));
    const gHit = await cache.match(gKey);
    if (gHit) return gHit;
    try {
      const bin = await gemini(voice, text, mood);
      if (bin && bin.length > 1000) {
        const res = new Response(bin, { headers: Object.assign({ 'X-Lektor': 'gemini' }, headers) });
        waitUntil(cache.put(gKey, res.clone()));
        return res;
      }
    } catch (e) { /* zostaje zwykły głos Google */ }
  }

  if (url.searchParams.get('dbg') === 'gm') return new Response('gemini: ' + lastGeminiError, { status: 200 });
  const plain = text.replace(/[⟦⟧]/g, '');
  const cacheKey = new Request('https://tts.cache/' + encodeURIComponent(voice) + '/' + encodeURIComponent(plain));
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text: plain }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  const j = await r.json();
  if (!r.ok || !j.audioContent) return new Response('Błąd lektora', { status: 502 });
  const bin = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
  const res = new Response(bin, { headers: Object.assign({ 'X-Lektor': 'chirp' }, headers) });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
