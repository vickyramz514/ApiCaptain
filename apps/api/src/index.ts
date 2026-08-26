import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getApiConfig } from '@apicaptain/config';
import { createApp } from './app.js';

const loadEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return;
  const contents = readFileSync(filePath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(resolve(process.cwd(), '../../.env'));
loadEnvFile(resolve(process.cwd(), '.env'));

const config = getApiConfig();
const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`[api] listening on http://${config.host}:${config.port}`);
});
