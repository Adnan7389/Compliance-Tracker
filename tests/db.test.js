import { query, pool } from '../src/config/db.js';
import { jest } from '@jest/globals';
import pg from 'pg';

describe('Database Connection and Queries', () => {
  // Test database connection
  describe('Database Connection', () => {
    it('should establish successful database connection', async () => {
      const client = await pool.connect();
      expect(client).toBeDefined();
      client.release();
    });

    it('should have valid pool configuration', () => {
      expect(pool).toBeDefined();
      expect(pool.options).toBeDefined();
    });
  });

  // Test basic queries
  describe('Query Function', () => {
    it('should execute simple SELECT query', async () => {
      const result = await query('SELECT 1 as test_value');
      expect(result.rows[0].test_value).toBe(1);
      expect(result.rowCount).toBe(1);
    });

    it('should execute query with parameters', async () => {
      const result = await query('SELECT $1 as param1, $2 as param2', [123, 'test']);
      expect(parseInt(result.rows[0].param1, 10)).toBe(123);
      expect(result.rows[0].param2).toBe('test');
    });

    it('should handle empty result sets', async () => {
      const result = await query('SELECT * FROM users WHERE 1=0');
      expect(result.rows).toHaveLength(0);
      expect(result.rowCount).toBe(0);
    });
  });

  // Test connection pool
  describe('Connection Pool', () => {
    it('should acquire and release connections properly', async () => {
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
      client.release();
    });

    it('should handle multiple concurrent connections', async () => {
      const queries = Array(5).fill().map(() => 
        query('SELECT $1 as value', [Math.random()])
      );
      
      const results = await Promise.all(queries);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.rows[0].value).toBeDefined();
      });
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('should throw error for invalid SQL', async () => {
      await expect(query('INVALID SQL')).rejects.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      // Temporarily modify connection string to test error
      const originalUrl = process.env.DATABASE_URL;
      
      // Mock invalid connection string
      const invalidPool = new pg.Pool({
        connectionString: 'postgresql://invalid:password@invalid_host:5432/invalid_db'
      });

      await expect(invalidPool.query('SELECT 1')).rejects.toThrow();
      await invalidPool.end();
    });
  });
});