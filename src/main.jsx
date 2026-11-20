import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import './styles.css';
import { inApp, APK_URL } from './install.js';

const path = location.pathname.replace(/\/+$/, '') || '/';
const demo = new URLSearchParams(location.search).get('demo');

function go(role) {
  try { localStorage.setItem('ol_role', role); } catch (e) { /* nic */ }
  location.href = role === 'tv' ? '/tv' : '/graj';
}

function Download() {
  return (
    <div className="home">
      <img src="/sygnet.svg" alt="" />
      <div className="wordmark gold-text">OFFLIMITS</div>
      <div className="muted">Aplikacja na telefon i telewizor z Androidem</div>
      <div className="choices">
        <a className="btn btn-primary" href={APK_URL} download>Pobierz aplikację (Android)</a>
      </div>
      <div className="choices">
        <details className="fold" open>
          <summary>Jak zainstalować na Androidzie</summary>
          <div className="inner">
            <div>1. Kliknij „Pobierz aplikację”.</div>
            <div>2. Otwórz pobrany plik offlimits.apk.</div>
            <div>3. Jeśli telefon zapyta, zezwól na instalację z tego źródła.</div>
            <div>4. Gotowe – OFFLIMITS jest na liście aplikacji.</div>
          </div>
        </details>
        <details className="fold">
          <summary>iPhone</summary>
          <div className="inner">
            <div>W Safari otwórz offlimits-esn.pages.dev, kliknij „Udostępnij”, a potem „Do ekranu początkowego”.</div>
          </div>
        </details>
        <details className="fold">
          <summary>Telewizor z Android TV / Google TV</summary>
          <div className="inner">
            <div>Zainstaluj darmową aplikację „Downloader” ze sklepu Google Play na telewizorze, wpisz w niej adres offlimits-esn.pages.dev/offlimits.apk i zainstaluj. OFFLIMITS pojawi się w menu telewizora.</div>
          </div>
        </details>
      </div>
    </div>
  );
}

function Home({ remember }) {
  if (remember) {
    let role = null;
    try { role = localStorage.getItem('ol_role'); } catch (e) { /* nic */ }
    if (role === 'tv' || role === 'graj') { location.replace(role === 'tv' ? '/tv' : '/graj'); return null; }
  }
  return (
    <div className="home">
      <img src="/sygnet.svg" alt="" />
      <div className="wordmark gold-text">OFFLIMITS</div>
      <div className="tagline">The Unrestricted Game Club</div>
      <div className="script" style={{ fontSize: 26 }}>Play beyond the rules.</div>
      <div className="choices">
        <button type="button" className="btn btn-primary" autoFocus onClick={() => go('graj')}>Dołącz do gry (telefon)</button>
        <button type="button" className="btn btn-ghost" onClick={() => go('tv')}>Ekran gry (telewizor)</button>
        {!inApp() ? <a className="btn btn-ghost" href="/pobierz">Pobierz aplikację</a> : null}
      </div>
    </div>
  );
}

async function boot() {
  let El;
  if (demo && (path === '/tv' || path === '/graj')) {
    const Demo = (await import('./demo.jsx')).default;
    El = () => <Demo screen={path === '/tv' ? 'tv' : 'graj'} demo={demo} />;
  } else if (path === '/tv/test') El = (await import('./TvTest.jsx')).default;
  else if (path === '/tv') El = (await import('./Tv.jsx')).default;
  else if (path === '/graj') El = (await import('./Graj.jsx')).default;
  else if (path === '/pobierz') El = Download;
  else if (path === '/start') El = () => <Home remember />;
  else El = Home;
  createRoot(document.getElementById('root')).render(<El />);
}
boot();
