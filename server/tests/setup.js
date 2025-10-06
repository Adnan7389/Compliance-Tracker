import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Global test timeout
jest.setTimeout(30000);

// Only setup database connection if we're running integration tests
if (process.env.TEST_TYPE === 'integration') {
  let pool;
  beforeAll(async () => {
    const db = await import('../src/config/db.js');
    pool = db.pool;
    try {
      // Read and execute schema
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
      await pool.query(schemaSQL);

      const client = await pool.connect();
      console.log('✅ Test database connected and schema loaded');
      client.release();
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