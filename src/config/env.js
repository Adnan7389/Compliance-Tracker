import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'BCRYPT_ROUNDS',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

console.log('✅ Environment variables loaded and validated');