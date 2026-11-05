import { $, escapeHtml, money } from '../shared/dom.js';
import { state } from './state.js';
import { applyRoute } from './search.js';

/** Popular route cards on the home page (from GET /api/meta). */
export function renderRoutes() {
  const routes = state.meta.routes || [];
  $('routes-grid').innerHTML = routes.map((r) => `
    <button class="tile route-card text-left" data-action="bookRoute" data-args='${JSON.stringify([r.mode, r.from, r.to])}'>
      <div class="flex items-center justify-between text-xs font-extrabold text-brand-600">
        <span class="bg-brand-50 px-2 py-0.5 rounded-full">${r.mode === 'bus' ? 'Bus' : '2D Car'}</span>
        <i class="fa-solid ${r.mode === 'bus' ? 'fa-bus' : 'fa-car-side'} text-base"></i>
      </div>
      <div class="mt-2 font-extrabold text-lg">${escapeHtml(r.from)} → ${escapeHtml(r.to)}</div>
      <div class="text-xs text-ink-soft h-4">${r.via ? `via ${escapeHtml(r.via)}` : 'Direct'}</div>
      <div class="mt-3 flex items-end justify-between"><span class="text-xs text-ink-soft">from</span><b class="text-brand-600 text-lg">${money(r.fromPrice)}</b></div>
    </button>`).join('');
}

/** Phone / WhatsApp / email cards are shown only when the owner set them in .env */
export function renderSupport() {
  const { phone, whatsapp, email } = state.meta.support || {};
  const show = (id, href) => { const a = $(id); a.href = href; a.classList.remove('hidden'); };
  if (phone) { show('help-call', `tel:${phone.replace(/\s/g, '')}`); $('help-call-text').textContent = phone; }
  if (whatsapp) show('help-wa', `https://wa.me/${whatsapp}`);
  if (email) { show('help-mail', `mailto:${email}`); $('help-mail-text').textContent = email; }
}

export function goToBooking() {
  document.getElementById('book').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function bookRoute(_el, mode, from, to) {
  applyRoute(mode, from, to);
  goToBooking();
}

/** Opening splash: shown briefly once per visit, then fades out. */
export function hideSplash() {
  const splash = $('splash');
  let seen = false;
  try { seen = sessionStorage.getItem('et.splash') === '1'; sessionStorage.setItem('et.splash', '1'); } catch { /* ignore */ }
  const wait = seen ? 0 : 1300;
  setTimeout(() => { splash.classList.add('done'); setTimeout(() => splash.remove(), 600); }, wait);
}
