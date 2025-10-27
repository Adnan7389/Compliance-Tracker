console.log(process.env);
import '../src/config/env.js';
import { pool } from '../src/config/db.js';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    files.sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        console.log(`Migration ${file} completed.`);
      }
    }
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

migrate();
