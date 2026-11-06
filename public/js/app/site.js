import { $, escapeHtml, money } from '../shared/dom.js';
import { state } from './state.js';
import { applyRoute } from './search.js';
import { showView } from './navigation.js';

/** Prices on the bus photo cards + the 2D car route cards (from GET /api/meta). */
export function renderRoutes() {
  const routes = state.meta.routes || [];
  document.querySelectorAll('[data-route-price]').forEach((el) => {
    const [mode, from, to] = el.dataset.routePrice.split('|');
    const r = routes.find((x) => x.mode === mode && x.from === from && x.to === to);
    if (r) el.textContent = money(r.fromPrice);
  });
  $('routes-grid').innerHTML = routes.filter((r) => r.mode === 'car').map((r) => `
    <button class="card !p-4 text-left lift" data-action="bookRoute" data-args='${JSON.stringify([r.mode, r.from, r.to])}'>
      <div class="font-extrabold">${escapeHtml(r.from)} <i class="fa-solid fa-arrow-right text-[10px] text-brand-500"></i> ${escapeHtml(r.to)}</div>
      <div class="flex items-center justify-between mt-2 text-xs"><span class="text-slate-500">from</span><b class="text-brand-600">${money(r.fromPrice)}</b></div>
    </button>`).join('');
}

/** Easypaisa / bank details come from the owner's settings (.env), with the original numbers as default. */
export function renderPayment() {
  const p = state.meta.payment;
  if (!p) return;
  $('pay-easypaisa').textContent = p.easypaisa;
  $('pay-bank-name').textContent = p.bankName;
  $('pay-bank-account').textContent = p.bankAccount;
  $('f-easypaisa').textContent = p.easypaisa;
  $('f-bank').textContent = `${p.bankName} ${p.bankAccount}`;
}

/** If the owner set phone / email / WhatsApp in .env, they replace the defaults on the Contact page. */
export function renderContact() {
  const { phone, whatsapp, email } = state.meta.support || {};
  if (phone) { $('c-phone').textContent = phone; $('c-phone').href = `tel:${phone.replace(/[^\d+]/g, '')}`; }
  if (email) { $('c-email').textContent = email; $('c-email').href = `mailto:${email}`; }
  if (whatsapp) { $('c-wa').href = `https://wa.me/${whatsapp}`; $('c-wa').classList.remove('hidden'); }
}

export function bookRoute(_el, mode, from, to) {
  showView('book');
  applyRoute(mode, from, to);
}
