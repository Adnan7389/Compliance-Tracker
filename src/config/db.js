import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const { Pool } = pg;

const isTest = process.env.NODE_ENV === 'test';

const connectionOptions = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: isTest ? 'compliance_tracker_test' : process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10),
    };

export const pool = new Pool({
  ...connectionOptions,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', err => {
  console.error('❌ Database pool error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

export const closePool = async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed.');
};