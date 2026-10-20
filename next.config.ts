import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { PREVIEW_QA_BUILD: process.env.CONTEXT === 'deploy-preview' ? 'true' : 'false' },
  async headers() {
    const preview = process.env.CONTEXT === 'deploy-preview';
    const securityHeaders = [
      { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors ${preview ? "'self'" : "'none'"}; form-action 'self'; img-src 'self' data: blob: https://pukvrerdloudfiphomsj.supabase.co https://images.unsplash.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self' blob: https://pukvrerdloudfiphomsj.supabase.co; font-src 'self' data:; connect-src 'self' https://pukvrerdloudfiphomsj.supabase.co; frame-src 'self' https://www.google.com; upgrade-insecure-requests` },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: preview ? 'SAMEORIGIN' : 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/paiement', headers: [...securityHeaders, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/api/payments/:path*', headers: [...securityHeaders, { key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/admin/:path*', headers: [...securityHeaders, { key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pukvrerdloudfiphomsj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
