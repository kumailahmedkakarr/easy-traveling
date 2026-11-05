'use strict';

const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Picks where the data is kept:
 *   DB_DRIVER=memory (default)  no database needed, great for testing
 *   DB_DRIVER=mysql             real MySQL database (set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
 */
function createStore() {
  if (config.dbDriver === 'mysql') {
    const { createMysql } = require('./mysql');
    const { createSqlStore } = require('./sql-store');
    return createSqlStore(createMysql(config.db));
  }
  const { createMemoryStore } = require('./memory-store');
  logger.warn('Running WITHOUT a database (DB_DRIVER=memory). Data is saved in a local file for testing only.');
  return createMemoryStore({ file: config.dataFile });
}

module.exports = { createStore };
