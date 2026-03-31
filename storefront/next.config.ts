import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
    NEXT_PUBLIC_STORE_DOMAIN: process.env['NEXT_PUBLIC_STORE_DOMAIN'] ?? 'sellify.kr',
  },
}

export default nextConfig
