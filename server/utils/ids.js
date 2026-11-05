'use strict';

const crypto = require('crypto');

/** Booking reference like ET-482913 (checked for uniqueness by the caller). */
const bookingRef = () => `ET-${crypto.randomInt(100000, 1000000)}`;
const uid = () => crypto.randomUUID();

module.exports = { bookingRef, uid };
