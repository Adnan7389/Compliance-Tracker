import dotenv from 'dotenv';
dotenv.config();

import pg from "pg";
const { Pool } = pg;

let poolInstance = null;

function getPool() {
  if (!poolInstance) {
    console.log('Initializing database pool...');
    const isTest = process.env.NODE_ENV === "test";
    const connectionOptions = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          user: String(process.env.DB_USER),
          host: String(process.env.DB_HOST),
          database: isTest
            ? "compliance_tracker_test"
            : String(process.env.DB_NAME),
          password: String(process.env.DB_PASSWORD),
          port: parseInt(process.env.DB_PORT, 10),
        };
    poolInstance = new Pool({
      ...connectionOptions,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    poolInstance.on('connect', () => {
      console.log('✅ Database connected');
    });

    poolInstance.on('error', (err) => {
      console.error('❌ Database pool error:', err.message);
    });
  }
  return poolInstance;
}

export const pool = new Proxy({}, {
  get: function(target, prop) {
    return getPool()[prop];
  }
});

export const query = (text, params) => getPool().query(text, params);