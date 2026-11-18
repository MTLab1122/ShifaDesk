import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Verifying MatabAI Multi-Environment Configuration...');

const targetEnv = process.argv.find((arg) => arg.startsWith('--env='))?.split('=')[1] || '.env';
const envFile = path.join(rootDir, targetEnv);
const envExample = path.join(rootDir, '.env.example');
const stagingExample = path.join(rootDir, '.env.staging.example');
const prodExample = path.join(rootDir, '.env.production.example');

// Check all templates exist
[envExample, stagingExample, prodExample].forEach((file) => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Template missing: ${path.basename(file)}`);
    process.exit(1);
  }
});

const parseEnvKeys = (filePath) =>
  fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());

const parseEnvMap = (filePath) => {
  const map = {};
  fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#') && line.includes('='))
    .forEach((line) => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      map[key] = val;
    });
  return map;
};

const exampleKeys = parseEnvKeys(envExample);
console.log(`📋 Found ${exampleKeys.length} environment parameters in master template.`);

if (!fs.existsSync(envFile)) {
  console.warn(
    `⚠️  Target environment file '${targetEnv}' not found. Using default fallback configuration for development verification.`,
  );
} else {
  const currentMap = parseEnvMap(envFile);
  const currentKeys = Object.keys(currentMap);
  const missing = exampleKeys.filter((k) => !currentKeys.includes(k));

  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Following keys are in .env.example but missing in ${targetEnv}: ${missing.join(', ')}`);
  } else {
    console.log(`✅ All template parameters are present in ${targetEnv}`);
  }

  // Security checks for production
  if (currentMap.NODE_ENV === 'production') {
    console.log('🔒 Executing Production Security Audits on Environment Variables...');

    if (currentMap.JWT_SECRET && currentMap.JWT_SECRET.length < 32) {
      console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters in production!');
      process.exit(1);
    }

    if (currentMap.DATABASE_URL && currentMap.DATABASE_URL.includes('sslmode=disable')) {
      console.error('❌ CRITICAL: DATABASE_URL must require SSL in production (remove sslmode=disable)!');
      process.exit(1);
    }

    if (currentMap.CORS_ORIGIN && currentMap.CORS_ORIGIN.includes('localhost')) {
      console.warn('⚠️  Warning: CORS_ORIGIN contains localhost in production configuration.');
    }
  }
}

console.log('✅ Environment verification complete.');
