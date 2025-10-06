import { query, pool } from '../src/config/db.js';

describe('db.js exports', () => {
  it('should export query function', () => {
    expect(typeof query).toBe('function');
  });

  it('should export pool instance', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
    expect(typeof pool.connect).toBe('function');
    expect(typeof pool.end).toBe('function');
  });

  it('query function should return promise', () => {
    const result = query('SELECT 1');
    expect(result).toBeInstanceOf(Promise);
  });
});