// Remembers things on THIS device only (browser storage). There are no user accounts.
const TRIPS = 'et.trips';
const PROFILE = 'et.profile';

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: ignore */ } };

export const getTrips = () => read(TRIPS, []);
export const tripPhone = (id) => (getTrips().find((t) => t.id === id) || {}).phone || '';

/** Keeps the booking number + phone (not the CNIC) so "My trips" can find the booking again. */
export function saveTrip(b) {
  const trip = { id: b.id, phone: b.passengers[0].phone, type: b.type, from: b.from, to: b.to, date: b.date, time: b.time };
  write(TRIPS, [trip, ...getTrips().filter((t) => t.id !== b.id)].slice(0, 20));
}

export const getProfile = () => read(PROFILE, null);
export const saveProfile = (p) => write(PROFILE, p);

export function clearAll() {
  try { localStorage.removeItem(TRIPS); localStorage.removeItem(PROFILE); } catch { /* ignore */ }
}
