// Instalacja: przycisk przeglądarki (PWA) albo plik APK dla Androida i Android TV.
let deferred = null;
const listeners = [];
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}
export function inApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
    || (window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
}
export function canPrompt() { return !!deferred; }
export function onPromptReady(f) { listeners.push(f); }
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null;
  return !!(r && r.outcome === 'accepted');
}
export const APK_URL = '/offlimits.apk';

// Przełączanie aplikacji między trybem telewizora i telefonu (zapamiętany wybór).
export function switchRole(role) {
  try { localStorage.setItem('ol_role', role); } catch (e) { /* nic */ }
  location.href = role === 'tv' ? '/tv' : '/graj';
}
