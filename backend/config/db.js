/**
 * SkillBridge Backend - MySQL Database Connection Pool
 * Configured using mysql2/promise for async/await execution
 * Reads credentials securely from environment variables (.env)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const path = require('path');

// Load environment variables (.env in backend directory or project root)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

// Create connection pool configuration supporting local & cloud environments
const poolConfig = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (databaseUrl) {
  poolConfig.uri = databaseUrl;
  const isLocalDb = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  if (process.env.DB_SSL === 'true' || !isLocalDb) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '3306', 10);
  poolConfig.user = process.env.DB_USER || 'root';
  poolConfig.password = process.env.DB_PASSWORD || '';
  poolConfig.database = process.env.DB_NAME || 'skillbridge_db';

  const isLocalHost = poolConfig.host === 'localhost' || poolConfig.host === '127.0.0.1';
  if (process.env.DB_SSL === 'true' || (!isLocalHost && process.env.DB_SSL !== 'false')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = mysql.createPool(poolConfig);

/**
 * Test database connectivity
 * Returns an object with connection status, latency, and details
 */
async function testConnection() {
  const startTime = Date.now();
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS status, NOW() AS db_time, DATABASE() AS db_name');
    connection.release();
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
      database: rows[0].db_name,
      serverTime: rows[0].db_time
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
}

module.exports = {
  pool,
  testConnection
};
