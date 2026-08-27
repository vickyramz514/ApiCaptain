#!/usr/bin/env node
/** Print a redacted DATABASE_URL summary for troubleshooting (no secrets). */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, '../apps/api/.env'),
  resolve(here, '../.env'),
];

let raw;
for (const path of candidates) {
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('DATABASE_URL=')) {
      raw = line.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      console.log(`Loaded DATABASE_URL from: ${path}`);
      break;
    }
  }
  if (raw) break;
}

if (!raw) {
  console.error('DATABASE_URL not found in apps/api/.env or root .env');
  process.exit(1);
}

try {
  // Handle postgresql:// URLs
  const url = new URL(raw);
  console.log(`protocol: ${url.protocol}`);
  console.log(`host:     ${url.hostname}`);
  console.log(`port:     ${url.port || '(default)'}`);
  console.log(`database: ${url.pathname.replace(/^\//, '') || '(none)'}`);
  console.log(`user:     ${url.username || '(none)'}`);
  console.log(`sslmode:  ${url.searchParams.get('sslmode') ?? '(not set)'}`);
  if (url.hostname.endsWith('.proxy.rlwy.net') && !url.searchParams.get('sslmode')) {
    console.warn('\nWarning: Railway public URLs usually need ?sslmode=require');
  }
  if (url.hostname.includes('railway.internal')) {
    console.error('\nThis is a Railway INTERNAL URL. It only works inside Railway.');
    console.error('For local migrate, use the public proxy URL (*.proxy.rlwy.net).');
    process.exit(2);
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    console.warn('\nWarning: DATABASE_URL points at localhost.');
    console.warn('If you intend to use Railway, replace this with the public Railway URL.');
  }
} catch {
  console.error('DATABASE_URL is not a valid URL');
  process.exit(1);
}
