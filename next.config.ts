import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/': ['./data/GESTIONALE_UFFICIALE.xlsx'],
  },
};

export default nextConfig;
