import { $, escapeHtml, fmtDate, money, todayIso } from '../shared/dom.js';
import { state } from './state.js';
import { goStep } from './steps.js';
import { setPickup } from './map.js';

/** Ticket card used after booking and in "Track booking". */
export function ticketHtml(b, { cancelable = false } = {}) {
  const cancelled = b.status === 'Cancelled';
  const rows = [
    ['Route', `${b.from} → ${b.to}${b.via ? ` (via ${escapeHtml(b.via)})` : ''}`],
    ['Date', fmtDate(b.date) + (b.time ? ` · ${escapeHtml(b.time)}` : '')],
    [b.type === 'bus' ? 'Bus' : 'Car', `${escapeHtml(b.operatorName)} · ${escapeHtml(b.classLabel || '')}`],
    ['Seats', `<b class="text-brand-600">${b.seats.join(', ')}</b>`],
    ['Current city', escapeHtml(b.currentCity)],
    ['Pickup', b.pickup ? `<a class="text-brand-600 underline" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${b.pickup.lat}&mlon=${b.pickup.lng}#map=16/${b.pickup.lat}/${b.pickup.lng}">Open on map</a>` : 'Not set'],
    ['Payment', escapeHtml(b.paymentMethod || '-')],
  ];
  return `
  <div id="ticket-print" class="border-2 border-dashed ${cancelled ? 'border-rose-300' : 'border-brand-500'} rounded-2xl p-4 bg-white">
    <div class="flex items-start justify-between gap-3">
      <div><span class="text-[11px] text-ink-soft block">Booking number</span><span class="text-xl font-black ${cancelled ? 'text-rose-600' : 'text-brand-600'}">${escapeHtml(b.id)}</span>
        <span class="block mt-1 text-[10px] font-extrabold ${cancelled ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'} px-2 py-0.5 rounded-full w-fit">${escapeHtml(b.status)}</span></div>
      <div class="qr w-[84px] h-[84px] flex-shrink-0" data-qr="${escapeHtml(b.id)}"></div>
    </div>
    <dl class="mt-3 text-xs divide-y divide-slate-100">${rows.map(([k, v]) => `<div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-soft">${k}</dt><dd class="font-semibold text-right">${v}</dd></div>`).join('')}</dl>
    <div class="mt-2 space-y-1">${b.passengers.map((p, i) => `<div class="flex justify-between text-[11px] bg-slate-50 rounded-lg px-2 py-1.5"><span><b>${i + 1}. ${escapeHtml(p.name)}</b> · CNIC ${escapeHtml(p.cnic)}</span><span class="font-bold text-brand-600">Seat ${b.seats[i]}</span></div>`).join('')}</div>
    <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-200"><span class="text-xs text-ink-soft">Total</span><span class="text-lg font-black">${money(b.amount.total)}</span></div>
    ${cancelable && !cancelled && b.date >= todayIso() ? `<button data-action="cancelBooking" data-args='["${escapeHtml(b.id)}"]' class="no-print mt-3 w-full text-xs font-extrabold text-rose-600 border border-rose-200 rounded-xl py-2.5">Cancel this booking</button>` : ''}
  </div>`;
}

/** Draws the QR code(s) inside `root` (needs the qrcode library, skipped if it did not load). */
export function drawQr(root) {
  if (!window.QRCode) return;
  root.querySelectorAll('[data-qr]').forEach((el) => { el.innerHTML = ''; new window.QRCode(el, { text: el.dataset.qr, width: 84, height: 84 }); });
}

/** Text for sharing on WhatsApp (no CNIC or phone inside). */
export function shareLink(b) {
  const text = [`Ease Traveling booking ${b.id}`, `${b.from} → ${b.to}`, `${fmtDate(b.date)}${b.time ? `, ${b.time}` : ''}`,
    `${b.operatorName}`, `Seats: ${b.seats.join(', ')}`, `Total: ${money(b.amount.total)}`].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function showTicket(booking) {
  const box = $('ticket-box');
  box.innerHTML = ticketHtml(booking);
  drawQr(box);
  $('wa-share').href = shareLink(booking);
}

export const printTicket = () => window.print();

export function newBooking() {
  Object.assign(state, { seats: [], booked: [], bus: null, operator: null, pickup: null });
  setPickup(null);
  goStep('search');
}
