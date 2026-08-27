#!/usr/bin/env node
/**
 * Test DATABASE_URL connectivity without printing credentials.
 * Usage: node scripts/db-connect-test.mjs [--apply-railway-params]
 */
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const applyRailwayParams = process.argv.includes('--apply-railway-params');

const parseEnvFile = (path) => {
  const out = {};
  if (!existsSync(path)) return out;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const merged = {
  ...parseEnvFile(resolve(repoRoot, '.env')),
  ...parseEnvFile(resolve(repoRoot, 'apps/api/.env')),
};

let databaseUrl = merged.DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env or environment');
  process.exit(1);
}

const withRailwayParams = (raw) => {
  const url = new URL(raw);
  if (!url.searchParams.has('sslmode') && url.hostname.endsWith('.proxy.rlwy.net')) {
    url.searchParams.set('sslmode', 'require');
  }
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set('connect_timeout', '60');
  }
  if (!url.searchParams.has('schema')) {
    url.searchParams.set('schema', 'public');
  }
  return url.toString();
};

if (applyRailwayParams) {
  databaseUrl = withRailwayParams(databaseUrl);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is not a valid URL');
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port || 5432);

console.log('DATABASE_URL summary:');
console.log(`  host:     ${host}`);
console.log(`  port:     ${port}`);
console.log(`  database: ${parsed.pathname.replace(/^\//, '') || '(none)'}`);
console.log(`  user:     ${parsed.username || '(none)'}`);
console.log(`  sslmode:  ${parsed.searchParams.get('sslmode') ?? '(not set)'}`);
console.log(`  connect_timeout: ${parsed.searchParams.get('connect_timeout') ?? '(not set)'}`);

if (host.includes('railway.internal')) {
  console.error('\nThis is a Railway INTERNAL host. Use *.proxy.rlwy.net from your laptop.');
  process.exit(2);
}

const tcpOk = await new Promise((resolvePromise) => {
  const socket = net.connect({ host, port, timeout: 10000 }, () => {
    socket.end();
    resolvePromise(true);
  });
  socket.on('error', () => {
    socket.destroy();
    resolvePromise(false);
  });
  socket.on('timeout', () => {
    socket.destroy();
    resolvePromise(false);
  });
});

console.log(`\nTCP reachability (${host}:${port}): ${tcpOk ? 'OK' : 'FAILED'}`);

if (!tcpOk) {
  console.error('\nCannot open a TCP connection. Check Railway service status, firewall, or URL.');
  process.exit(3);
}

console.log('\nRunning Prisma db execute (SELECT 1)...');
const apiDir = resolve(repoRoot, 'apps/api');
const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'],
  {
  cwd: apiDir,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  input: 'SELECT 1 AS ok;',
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (result.status === 0) {
  console.log('Prisma connection: OK');
  if (applyRailwayParams) {
    console.log('\nTip: persist these params in DATABASE_URL:');
    console.log('  ?sslmode=require&connect_timeout=60&schema=public');
  }
  process.exit(0);
}

const stderr = (result.stderr ?? '').trim();
const stdout = (result.stdout ?? '').trim();
console.error('Prisma connection: FAILED');
if (stdout) console.error(stdout);
if (stderr) console.error(stderr);

if (stderr.includes('P1001') || stdout.includes('P1001')) {
  console.error('\nP1001 usually means:');
  console.error('  1. Railway Postgres is stopped or sleeping — open it in the Railway dashboard');
  console.error('  2. Missing SSL — add ?sslmode=require to DATABASE_URL');
  console.error('  3. Stale credentials — copy a fresh public URL from Railway → Postgres → Connect');
  console.error('  4. Wake-up timeout — add connect_timeout=60 and retry after ~30s');
}

process.exit(result.status ?? 1);
