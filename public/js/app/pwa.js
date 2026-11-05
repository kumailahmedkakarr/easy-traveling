import { $ } from '../shared/dom.js';

let installEvent = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Registers the service worker (offline shell) and shows "Install app" when the browser allows it. */
export function initPwa() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not fatal: the site works without it */ });
  }
  const buttons = () => document.querySelectorAll('[data-install]');
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; buttons().forEach((b) => b.classList.remove('hidden')); });
  window.addEventListener('appinstalled', () => { installEvent = null; buttons().forEach((b) => b.classList.add('hidden')); });
  // iPhone / iPad Safari has no install prompt, so show a hint button instead.
  if (isIos() && !isStandalone()) buttons().forEach((b) => b.classList.remove('hidden'));
}

export async function installApp() {
  if (installEvent) { installEvent.prompt(); await installEvent.userChoice; installEvent = null; return; }
  $('install-help').textContent = isIos()
    ? 'Tap the Share button in Safari, then choose "Add to Home Screen".'
    : 'Open the browser menu and choose "Install app" or "Add to Home screen".';
  $('modal-install').classList.remove('hidden');
}
