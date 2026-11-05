'use strict';

/** Today's date in Pakistan time, as YYYY-MM-DD. */
const todayPk = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

const isPast = (isoDate) => isoDate < todayPk();

module.exports = { todayPk, isPast };
