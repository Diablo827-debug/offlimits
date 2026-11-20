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

const path = location.pathname.replace(/\/+$/, '') || '/';
const demo = new URLSearchParams(location.search).get('demo');

function Home() {
  return (
    <div className="home">
      <img src="/sygnet.svg" alt="" />
      <div className="wordmark gold-text">OFFLIMITS</div>
      <div className="tagline">The Unrestricted Game Club</div>
      <div className="script" style={{ fontSize: 26 }}>Play beyond the rules.</div>
      <div className="choices">
        <a className="btn btn-primary" href="/graj">Dołącz do gry (telefon)</a>
        <a className="btn btn-ghost" href="/tv">Ekran gry (telewizor)</a>
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
  else El = Home;
  createRoot(document.getElementById('root')).render(<El />);
}
boot();
