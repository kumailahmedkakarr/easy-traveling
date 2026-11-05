'use strict';

const config = require('../config');

const stamp = () => new Date().toISOString();

module.exports = {
  info: (...a) => console.log(stamp(), 'INFO ', ...a),
  warn: (...a) => console.warn(stamp(), 'WARN ', ...a),
  error: (...a) => console.error(stamp(), 'ERROR', ...a),
  debug: (...a) => { if (!config.isProduction) console.log(stamp(), 'DEBUG', ...a); },
};
