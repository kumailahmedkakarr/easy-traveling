// Small helpers used on every page.

export const $ = (id) => document.getElementById(id);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Always use this for text typed by users (names, CNIC...) before putting it in innerHTML. */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const money = (n) => `Rs. ${Number(n).toLocaleString()}`;

/** '2026-10-30' -> '30 Oct 2026' */
export const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const pkDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
};
export const todayIso = () => pkDate(0);
export const tomorrowIso = () => pkDate(1);
