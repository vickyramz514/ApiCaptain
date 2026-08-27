#!/usr/bin/env node
/**
 * Load monorepo root .env (and optional apps/api/.env overrides), then run a command.
 * Prisma runs from apps/api and otherwise may miss the root .env.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const rootEnv = resolve(repoRoot, '.env');
const apiEnv = resolve(repoRoot, 'apps/api/.env');
const apiDir = resolve(repoRoot, 'apps/api');

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
  ...parseEnvFile(rootEnv),
  ...parseEnvFile(apiEnv),
};

for (const [key, value] of Object.entries(merged)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/with-root-env.mjs <command> [...args]');
  process.exit(1);
}

const pathParts = [
  resolve(apiDir, 'node_modules/.bin'),
  resolve(repoRoot, 'node_modules/.bin'),
  process.env.PATH ?? '',
];

const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  cwd: apiDir,
  env: {
    ...process.env,
    PATH: pathParts.join(process.platform === 'win32' ? ';' : ':'),
  },
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
