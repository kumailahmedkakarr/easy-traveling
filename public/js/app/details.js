import { api, ApiError } from '../shared/api.js';
import { $, fmtDate, money } from '../shared/dom.js';
import { state, isBus, unitPrice, fareBase, fareTotal, serviceFee, departure } from './state.js';
import { goStep } from './steps.js';
import { setPickup, pickingMode } from './map.js';
import { showTicket } from './ticket.js';
import { loadSeatMap } from './seats.js';
import { getProfile, saveProfile, saveTrip } from './trips.js';

const PAY_LABELS = { easypaisa: ['fa-wallet', 'Easypaisa'], bank: ['fa-building-columns', 'Bank'], cash: ['fa-money-bill-wave', 'Cash'] };
const showError = (text) => { const e = $('form-error'); e.textContent = text; e.classList.toggle('hidden', !text); };

export function renderDetails() {
  const name = isBus() ? state.bus.operator : state.operator.name;
  $('sum-route').textContent = `${state.from} → ${state.to}`;
  $('sum-trip').textContent = `${name} · ${fmtDate(state.date)}${isBus() ? ` · ${departure()}` : ''} · Seats ${state.seats.join(', ')}`;
  $('details-sub').textContent = state.seats.length > 1 ? `You are booking ${state.seats.length} seats. Add each passenger below.` : 'Fill in your details to confirm the seat.';

  $('extra-passengers').innerHTML = state.seats.slice(1).map((seat, i) => `
    <div class="bg-slate-50 rounded-2xl p-3 space-y-2" data-extra>
      <span class="text-[11px] font-extrabold text-brand-600 uppercase">Passenger ${i + 2} · Seat ${seat}</span>
      <div class="grid grid-cols-2 gap-2">
        <input required class="field !py-2.5" placeholder="Full name" aria-label="Passenger ${i + 2} name">
        <input required inputmode="numeric" class="field !py-2.5" placeholder="CNIC 12345-6789012-3" aria-label="Passenger ${i + 2} CNIC">
      </div>
    </div>`).join('');

  const methods = state.meta.paymentMethods[state.mode];
  $('pay-options').innerHTML = methods.map((m, i) => `
    <label class="cursor-pointer"><input type="radio" name="pay" value="${m}" data-change="payChanged" class="peer sr-only" ${i === 0 ? 'checked' : ''}>
      <span class="peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 border-2 border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 text-xs font-bold"><i class="fa-solid ${PAY_LABELS[m][0]} text-lg"></i>${PAY_LABELS[m][1]}</span></label>`).join('');

  $('fare-label').textContent = `Fare (${state.seats.length} × ${money(unitPrice())})`;
  $('fare-base').textContent = money(fareBase());
  $('fare-fee').textContent = money(serviceFee());
  $('fee-row').classList.toggle('hidden', !isBus());
  $('fare-total').textContent = money(fareTotal());
  prefill();
  paintPayInfo();
  paintPickup();
  showError('');
  pickingMode(true, paintPickup);
}

/** Tells the person where to send the money for the payment method they picked. */
export function paintPayInfo() {
  const method = (document.querySelector('input[name="pay"]:checked') || {}).value;
  const p = state.meta.payment || {};
  const total = money(fareTotal());
  $('pay-info').innerHTML = ({
    easypaisa: `<i class="fa-solid fa-circle-info mr-1 text-brand-600"></i>After booking, send <b>${total}</b> to Easypaisa <b class="select-all">${p.easypaisa || ''}</b> and keep the receipt.`,
    bank: `<i class="fa-solid fa-circle-info mr-1 text-brand-600"></i>After booking, transfer <b>${total}</b> to ${p.bankName || 'the bank'} account <b class="select-all">${p.bankAccount || ''}</b> and keep the receipt.`,
    cash: '<i class="fa-solid fa-circle-info mr-1 text-brand-600"></i>Pay the driver in cash when you board.',
  })[method] || '';
}

/** Fills the form with the details saved on this device (only if the person chose to remember them). */
function prefill() {
  const saved = getProfile();
  $('d-remember').checked = !!saved;
  if (saved && !$('d-name').value) {
    $('d-name').value = saved.name || ''; $('d-cnic').value = saved.cnic || '';
    $('d-phone').value = saved.phone || ''; $('d-city').value = saved.city || '';
  }
}

function paintPickup() {
  const p = state.pickup;
  $('pickup-text').textContent = p ? `Pinned: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} (drag the pin to adjust)` : 'Tap the map to choose where we pick you up.';
  $('pickup-clear').classList.toggle('hidden', !p);
}

export function clearPickup() { setPickup(null); paintPickup(); }

export function useMyLocation() {
  if (!navigator.geolocation) { $('pickup-text').textContent = 'Your browser cannot share your location. Tap the map instead.'; return; }
  $('pickup-text').textContent = 'Finding your location...';
  navigator.geolocation.getCurrentPosition(
    (pos) => { setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude }); paintPickup(); },
    () => { $('pickup-text').textContent = 'Location blocked. Please tap the map to choose your pickup point.'; },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export async function submitBooking() {
  showError('');
  const lead = { name: $('d-name').value.trim(), cnic: $('d-cnic').value.trim(), phone: $('d-phone').value.trim() };
  const extras = [...document.querySelectorAll('#extra-passengers [data-extra]')].map((box) => {
    const [n, c] = box.querySelectorAll('input');
    return { name: n.value.trim(), cnic: c.value.trim() };
  });
  const common = {
    seats: state.seats, date: state.date, passengers: [lead, ...extras], currentCity: $('d-city').value.trim(),
    pickup: state.pickup, paymentMethod: document.querySelector('input[name="pay"]:checked').value,
  };
  const button = $('confirm-btn');
  button.disabled = true;
  try {
    const { booking } = isBus()
      ? await api.post('/bus-bookings', { ...common, busId: state.bus.id, classIndex: state.cls, time: departure() })
      : await api.post('/car-bookings', { ...common, operatorId: state.operator.id, from: state.from, to: state.to });
    saveTrip(booking);
    if ($('d-remember').checked) saveProfile({ name: lead.name, cnic: lead.cnic, phone: lead.phone, city: common.currentCity });
    showTicket(booking);
    goStep('ticket');
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      showError(`Seat(s) ${err.details.unavailable.join(', ')} were just booked by someone else. Please choose your seats again.`);
      await loadSeatMap();
      goStep('seats');
    } else showError(err instanceof ApiError ? err.readable : 'Booking failed. Please try again.');
  } finally { button.disabled = false; }
}

