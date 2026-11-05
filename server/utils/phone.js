'use strict';

/** 0300-1234567, +92 300 1234567 and 03001234567 all become 03001234567 (used to find a booking). */
const phoneKey = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('92') ? `0${digits.slice(2)}` : digits;
};

module.exports = { phoneKey };
