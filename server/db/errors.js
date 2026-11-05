'use strict';

/** Thrown by the database layer when a UNIQUE / PRIMARY KEY rule is broken. */
class DuplicateKeyError extends Error {
  constructor(message) { super(message); this.name = 'DuplicateKeyError'; }
}

module.exports = { DuplicateKeyError };
