'use strict';

const { badRequest } = require('./errors');

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(?:\+92|0)?3\d{2}-?\d{7}$/,   // 0300-1234567, 03001234567, +923001234567
  cnic: /^\d{5}-?\d{7}-?\d$/,            // 12345-6789012-3
  date: /^\d{4}-\d{2}-\d{2}$/,
};

/** Collects validation problems and throws one 400 with all of them. */
class Validator {
  constructor() { this.errors = {}; }

  fail(field, message) { if (!this.errors[field]) this.errors[field] = message; return this; }

  string(value, field, { min = 1, max = 120 } = {}) {
    const v = typeof value === 'string' ? value.trim() : '';
    if (v.length < min || v.length > max) this.fail(field, `${field} must be ${min}-${max} characters`);
    return v;
  }

  pattern(value, field, name, message) {
    const v = typeof value === 'string' ? value.trim() : '';
    if (!PATTERNS[name].test(v)) this.fail(field, message || `${field} is invalid`);
    return v;
  }

  date(value, field) {
    const v = this.pattern(value, field, 'date', `${field} must be YYYY-MM-DD`);
    if (v && Number.isNaN(Date.parse(`${v}T00:00:00Z`))) this.fail(field, `${field} is not a real date`);
    return v;
  }

  oneOf(value, field, allowed) {
    if (!allowed.includes(value)) this.fail(field, `${field} must be one of: ${allowed.join(', ')}`);
    return value;
  }

  stringArray(value, field, { min = 1, max = 10 } = {}) {
    if (!Array.isArray(value) || value.length < min || value.length > max
      || value.some((x) => typeof x !== 'string')) {
      this.fail(field, `${field} must be a list of ${min}-${max} items`);
      return [];
    }
    if (new Set(value).size !== value.length) this.fail(field, `${field} contains duplicates`);
    return value;
  }

  done() {
    if (Object.keys(this.errors).length) throw badRequest('Validation failed', this.errors);
  }
}

module.exports = { Validator, PATTERNS };
