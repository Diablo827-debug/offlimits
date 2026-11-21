// Sterowanie strzałkami (klawiatura, pilot telewizora): przenosi fokus na najbliższy przycisk w danym kierunku.
const SEL = 'button:not([disabled]), a[href], summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

function visible(el) {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.display !== 'none';
}
function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

function candidates() {
  // Gdy otwarte jest okno (nakładka), poruszamy się tylko w nim.
  const dlg = document.querySelector('.sound-gate');
  const root = dlg || document;
  return Array.from(root.querySelectorAll(SEL)).filter(visible);
}

function move(key) {
  const [dx, dy] = DIRS[key];
  const list = candidates();
  if (!list.length) return false;
  const cur = document.activeElement;
  if (!cur || cur === document.body || list.indexOf(cur) < 0) { list[0].focus(); return true; }
  const a = center(cur.getBoundingClientRect());
  let best = null; let bestScore = Infinity;
  list.forEach((el) => {
    if (el === cur) return;
    const b = center(el.getBoundingClientRect());
    const vx = b.x - a.x; const vy = b.y - a.y;
    const along = vx * dx + vy * dy;          // odległość w kierunku ruchu
    if (along <= 4) return;
    const across = Math.abs(vx * dy) + Math.abs(vy * dx); // odchylenie w bok
    const score = along + across * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  });
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; }
  return false;
}

export function initSpatialNav() {
  window.addEventListener('keydown', (e) => {
    if (!DIRS[e.key]) return;
    const t = e.target;
    // W polach tekstowych strzałki w lewo/prawo przesuwają kursor.
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    // Karuzela kart na telefonie przewija się sama.
    if (t && t.closest && t.closest('.hand') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (move(e.key)) e.preventDefault();
  });
}
