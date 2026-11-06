'use strict';

/**
 * MySQL connection (used by the real website).
 * Every database call in the project goes through the 3 methods below:
 *   db.query(sql, params)        -> rows (SELECT)
 *   db.execute(sql, params)      -> { affectedRows } (INSERT / UPDATE / DELETE)
 *   db.transaction(async (tx) => { ... })   -> all-or-nothing group of queries
 */
const { schemaStatements } = require('./schema');
const { DuplicateKeyError } = require('./errors');
const logger = require('../utils/logger');

const wrap = (err) => (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) ? new DuplicateKeyError(err.message) : err);

function createMysql(cfg) {
  let pool;

  const bind = (target) => ({
    async query(sql, params = []) {
      try { const [rows] = await target().query(sql, params); return rows; } catch (e) { throw wrap(e); }
    },
    async execute(sql, params = []) {
      try { const [res] = await target().query(sql, params); return { affectedRows: res.affectedRows }; } catch (e) { throw wrap(e); }
    },
  });

  const api = bind(() => pool);

  return {
    ...api,

    /** Connects, creates the database and tables if they do not exist yet. */
    async init() {
      let mysql;
      try { mysql = require('mysql2/promise'); } catch { // loaded only here, so tests do not need it
        throw new Error('The "mysql2" package is missing. Run:  npm install');
      }
      const base = { host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, ...(cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}) };

      try {
        const conn = await mysql.createConnection(base);
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.name}\` CHARACTER SET utf8mb4`);
        await conn.end();
      } catch (err) {
        // Cloud MySQL often does not allow creating databases: that is fine if it already exists.
        logger.warn(`Could not auto-create database "${cfg.name}" (${err.message}). Trying to use it anyway.`);
      }

      pool = mysql.createPool({ ...base, database: cfg.name, waitForConnections: true, connectionLimit: process.env.VERCEL ? 3 : 10, connectTimeout: 15000, enableKeepAlive: true, charset: 'utf8mb4' });
      for (const statement of schemaStatements()) await pool.query(statement);
      logger.info(`MySQL connected (${cfg.host}:${cfg.port}/${cfg.name})`);
    },

    async transaction(fn) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const out = await fn(bind(() => conn));
        await conn.commit();
        return out;
      } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
      } finally { conn.release(); }
    },

    async close() { if (pool) await pool.end(); },
  };
}

module.exports = { createMysql };
