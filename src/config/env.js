// src/config/env.js
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    process.exit(1);
  }
}

console.log('✅ Environment variables loaded');