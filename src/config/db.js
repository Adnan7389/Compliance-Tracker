// db.js
import pg from "pg";
const { Pool } = pg;

const isTest = process.env.NODE_ENV === "test";

const connectionOptions = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: String(process.env.DB_USER),
      host: String(process.env.DB_HOST),
      database: isTest
        ? 'compliance_tracker_test'
        : String(process.env.DB_NAME),
      password: String(process.env.DB_PASSWORD),
      port: parseInt(process.env.DB_PORT, 10),
    };

const pool = new Pool({
  ...connectionOptions,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.query('SELECT NOW() as current_time')
  .then(() => {
    console.log('✅ Database connected');
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Check if PostgreSQL is running and .env file is correct');
  });

export const query = (text, params) => pool.query(text, params);
export { pool };