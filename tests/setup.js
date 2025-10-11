import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

// Set the DATABASE_URL directly
process.env.DATABASE_URL = 'postgresql://adnan:127389@localhost:5432/compliance_tracker_test';
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'integration';


// Global test timeout
jest.setTimeout(30000);

// Only setup database connection if we're running integration tests
if (process.env.TEST_TYPE === 'integration') {
  let pool;
  beforeAll(async () => {
    try {
      const db = await import('../src/config/db.js');
      pool = db.pool;
      // Read and execute schema
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
      await pool.query(schemaSQL);

      console.log('✅ Test database schema loaded');
    } catch (error) {
      console.error('❌ Test database setup failed:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });
}