import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Verifying MatabAI Environment Configuration...');

const envFile = path.join(rootDir, '.env');
const envExample = path.join(rootDir, '.env.example');

if (!fs.existsSync(envExample)) {
  console.error('❌ .env.example is missing from repository root!');
  process.exit(1);
}

const exampleKeys = fs
  .readFileSync(envExample, 'utf-8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#') && line.includes('='))
  .map((line) => line.split('=')[0].trim());

console.log(`📋 Found ${exampleKeys.length} environment variables in template.`);

if (!fs.existsSync(envFile)) {
  console.warn(
    '⚠️  No .env file found in root. Using default fallback configuration for development verification.',
  );
} else {
  const currentKeys = fs
    .readFileSync(envFile, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());

  const missing = exampleKeys.filter((k) => !currentKeys.includes(k));
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Following keys are in .env.example but missing in .env: ${missing.join(', ')}`);
  } else {
    console.log('✅ All template keys are present in .env');
  }
}

console.log('✅ Environment verification complete.');
