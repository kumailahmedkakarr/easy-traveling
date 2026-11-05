'use strict';

/**
 * In-memory SQLite with the same 3 methods as db/mysql.js.
 * ONLY for automated tests (needs Node 22+), so the tests run without a MySQL server.
 */
const { schemaStatements } = require('./schema');
const { DuplicateKeyError } = require('./errors');

function createSqlite(file = ':memory:') {
  let db;
  let chain = Promise.resolve(); // one transaction at a time
  const wrap = (e) => (e && /UNIQUE constraint failed|PRIMARY KEY/.test(e.message) ? new DuplicateKeyError(e.message) : e);

  const api = {
    async query(sql, params = []) { try { return db.prepare(sql).all(...params); } catch (e) { throw wrap(e); } },
    async execute(sql, params = []) {
      try { return { affectedRows: Number(db.prepare(sql).run(...params).changes) }; } catch (e) { throw wrap(e); }
    },
  };

  return {
    ...api,
    async init() {
      const { DatabaseSync } = require('node:sqlite');
      db = new DatabaseSync(file);
      for (const s of schemaStatements({ forSqlite: true })) db.exec(s);
    },
    transaction(fn) {
      const run = async () => {
        db.exec('BEGIN');
        try { const out = await fn(api); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
      };
      const next = chain.then(run, run);
      chain = next.catch(() => {});
      return next;
    },
    async close() { db.close(); },
  };
}

module.exports = { createSqlite };
