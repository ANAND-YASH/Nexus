import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Load the shared monorepo-root .env so web and api use one env file.
// App-local .env* files (if any) still take precedence.
loadEnvConfig(path.resolve(process.cwd(), '../..'));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Shared workspace packages shipped as TypeScript source.
  transpilePackages: ['@nexus/ui'],
};

export default nextConfig;
