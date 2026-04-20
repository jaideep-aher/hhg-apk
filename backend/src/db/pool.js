const { Pool } = require('pg');

/**
 * Single shared connection pool — reused across all requests.
 * Railway injects DATABASE_URL automatically when you link a Postgres service,
 * or you can paste your existing RDS URL in the Railway environment variables.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // required for AWS RDS & Railway Postgres
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = pool;
