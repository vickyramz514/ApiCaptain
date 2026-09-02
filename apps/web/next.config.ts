import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const loadRootPublicEnv = (): void => {
  const rootEnvPath = path.join(monorepoRoot, '.env');
  if (!existsSync(rootEnvPath)) return;
  for (const rawLine of readFileSync(rootEnvPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key.startsWith('NEXT_PUBLIC_')) continue;
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadRootPublicEnv();

const nextConfig: NextConfig = {
  transpilePackages: ['@apicaptain/types', '@apicaptain/config'],
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
};

export default nextConfig;
