import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Zezwól na żądania do zewnętrznych API z server components
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        ],
      },
    ];
  },
};

export default nextConfig;
