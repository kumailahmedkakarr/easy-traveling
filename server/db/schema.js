'use strict';

const fs = require('fs');
const path = require('path');

/** Splits schema.sql into single statements (comments removed). */
function schemaStatements({ forSqlite = false } = {}) {
  let sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    .split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  if (forSqlite) sql = sql.replace(/ENGINE=\w+ DEFAULT CHARSET=\w+/g, '');
  return sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
}

module.exports = { schemaStatements };
