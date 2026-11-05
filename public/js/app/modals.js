import { api, ApiError } from '../shared/api.js';
import { $ } from '../shared/dom.js';
import { ticketHtml, drawQr } from './ticket.js';
import { getTrips, tripPhone, clearAll } from './trips.js';
import { escapeHtml, fmtDate } from '../shared/dom.js';

export function openModal(_el, name) {
  closeModal();
  $(`modal-${name}`).classList.remove('hidden');
  if (name === 'trips') renderTrips();
}
export function closeModal() { document.querySelectorAll('.modal-bg').forEach((m) => m.classList.add('hidden')); }

const say = (el, text, ok = false) => {
  el.textContent = text;
  el.classList.toggle('hidden', !text);
  el.classList.toggle('text-rose-600', !ok);
  el.classList.toggle('text-brand-600', ok);
};

export async function trackBooking() {
  say($('track-error'), '');
  const id = $('t-id').value.trim();
  const phone = $('t-phone').value.trim();
  try {
    const { booking } = await api.get(`/bookings/track?${new URLSearchParams({ id, phone })}`);
    $('track-result').innerHTML = ticketHtml(booking, { cancelable: true });
    drawQr($('track-result'));
  } catch (err) {
    $('track-result').innerHTML = '';
    say($('track-error'), err instanceof ApiError ? err.message : 'Something went wrong');
  }
}

export function renderTrips() {
  const trips = getTrips();
  $('trips-result').innerHTML = '';
  $('trips-list').innerHTML = trips.length
    ? trips.map((t) => `<button class="trip-row" data-action="openTrip" data-args='["${escapeHtml(t.id)}"]'>
        <span><b class="text-sm">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</b><span class="block text-[11px] text-ink-soft">${fmtDate(t.date)}${t.time ? ` · ${escapeHtml(t.time)}` : ''} · ${t.type === 'bus' ? 'Bus' : '2D Car'}</span></span>
        <span class="text-xs font-extrabold text-brand-600">${escapeHtml(t.id)} <i class="fa-solid fa-chevron-right ml-1"></i></span></button>`).join('')
    : '<div class="text-center text-sm text-ink-soft py-6"><i class="fa-solid fa-suitcase-rolling text-3xl text-slate-300 block mb-2"></i>No trips yet.<br>Book a seat and it will show up here.</div>';
}

export async function openTrip(_el, id) {
  const box = $('trips-result');
  box.innerHTML = '<p class="text-xs text-ink-soft">Loading...</p>';
  try {
    const { booking } = await api.get(`/bookings/track?${new URLSearchParams({ id, phone: tripPhone(id) })}`);
    box.innerHTML = ticketHtml(booking, { cancelable: true });
    drawQr(box);
  } catch (err) { box.innerHTML = `<p class="text-xs font-semibold text-rose-600">${escapeHtml(err.message)}</p>`; }
}

export function clearSaved() {
  if (!confirm('Remove your saved trips and details from this device?')) return;
  clearAll();
  renderTrips();
}

export async function cancelBooking(el, id) {
  if (!confirm(`Cancel booking ${id}? This cannot be undone.`)) return;
  const root = el.closest('[data-ticket-root]') || $('track-result');
  try {
    const { booking } = await api.patch(`/bookings/${encodeURIComponent(id)}/cancel`, { phone: tripPhone(id) || $('t-phone').value.trim() });
    root.innerHTML = ticketHtml(booking);
    drawQr(root);
  } catch (err) { say($('track-error'), err instanceof ApiError ? err.message : 'Could not cancel the booking'); alert(err.message); }
}

export async function sendContact(event, form) {
  const message = $('contact-msg');
  try {
    await api.post('/contact', Object.fromEntries(new FormData(form)));
    say(message, 'Thank you! We will get back to you shortly.', true);
    form.reset();
  } catch (err) { say(message, err instanceof ApiError ? err.readable : 'Could not send your message'); }
}
