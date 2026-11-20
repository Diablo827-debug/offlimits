import React from 'react';
import { ref, onValue } from 'firebase/database';
import { db, ensureAuth } from './firebase.js';
import { speechSupported, speak } from './lektor.js';

function Row({ k, v, cls }) { return <tr><td>{k}</td><td className={cls}>{v}</td></tr>; }

export default function TvTest() {
  const [voices, setVoices] = React.useState([]);
  const [fps, setFps] = React.useState(null);
  const [fb, setFb] = React.useState('sprawdzam…');
  const [auth, setAuth] = React.useState('sprawdzam…');

  React.useEffect(() => {
    const load = () => { try { setVoices(window.speechSynthesis.getVoices() || []); } catch (e) { /* brak */ } };
    if (speechSupported()) { load(); window.speechSynthesis.onvoiceschanged = load; }
    let frames = 0; const t0 = performance.now(); let raf;
    const tick = () => { frames++; if (performance.now() - t0 < 2000) raf = requestAnimationFrame(tick); else setFps(Math.round(frames / 2)); };
    raf = requestAnimationFrame(tick);
    const off = onValue(ref(db, '.info/connected'), (s) => setFb(s.val() ? 'połączono' : 'brak połączenia'));
    ensureAuth().then(() => setAuth('działa')).catch((e) => setAuth('błąd: ' + (e.code || e.message)));
    return () => { cancelAnimationFrame(raf); off(); };
  }, []);

  const pl = voices.filter((v) => (v.lang || '').toLowerCase().indexOf('pl') === 0);
  const blur = typeof CSS !== 'undefined' && CSS.supports && (CSS.supports('backdrop-filter', 'blur(4px)') || CSS.supports('-webkit-backdrop-filter', 'blur(4px)'));
  const lite = fps !== null && fps < 40;
  return (
    <div className="test">
      <h1>OFFLIMITS · test telewizora</h1>
      <p className="muted">Zrób zdjęcie tego ekranu i wyślij je Claude'owi.</p>
      <table><tbody>
        <Row k="Przeglądarka" v={navigator.userAgent} />
        <Row k="Ekran" v={screen.width + '×' + screen.height + ' · okno ' + innerWidth + '×' + innerHeight + ' · DPR ' + (window.devicePixelRatio || 1)} />
        <Row k="Firebase" v={fb} cls={fb === 'połączono' ? 'ok-t' : 'warn-t'} />
        <Row k="Logowanie anonimowe" v={auth} cls={auth === 'działa' ? 'ok-t' : auth.indexOf('błąd') === 0 ? 'bad-t' : 'warn-t'} />
        <Row k="Lektor (mowa)" v={speechSupported() ? 'obsługiwany' : 'brak'} cls={speechSupported() ? 'ok-t' : 'bad-t'} />
        <Row k="Polski głos" v={pl.length ? pl.map((v) => v.name).join(', ') : 'brak – użyjemy głosu z chmury'} cls={pl.length ? 'ok-t' : 'warn-t'} />
        <Row k="Płynność animacji" v={fps === null ? 'mierzę…' : fps + ' kl./s' + (lite ? ' – zalecany tryb lekki (/tv?lite=1)' : '')} cls={fps === null ? '' : lite ? 'warn-t' : 'ok-t'} />
        <Row k="Rozmycia (efekty)" v={blur ? 'tak' : 'nie'} cls={blur ? 'ok-t' : 'warn-t'} />
      </tbody></table>
      <p><button className="btn btn-primary" onClick={() => speak('Witajcie w grze Offlimits. Dobre towarzystwo, gorsze odpowiedzi.', {})}>Test lektora</button></p>
    </div>
  );
}
