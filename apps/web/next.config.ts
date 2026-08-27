import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@apicaptain/types', '@apicaptain/config'],
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
