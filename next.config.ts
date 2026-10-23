import type { NextConfig } from 'next';

export function deploymentSiteOrigin(env: Record<string, string | undefined>) {
  const production = 'https://pyjamas25.netlify.app';
  return env.CONTEXT === 'production' ? env.URL || production : env.DEPLOY_PRIME_URL || env.URL || production;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { SITE_ORIGIN: deploymentSiteOrigin(process.env), PREVIEW_QA_BUILD: process.env.CONTEXT === 'deploy-preview' ? 'true' : 'false', BUILD_COMMIT_REF: process.env.COMMIT_REF || 'local' },
  async headers() {
    const preview = process.env.CONTEXT === 'deploy-preview';
    const securityHeaders = [
      { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors ${preview ? "'self'" : "'none'"}; form-action 'self'; img-src 'self' data: blob: https://pukvrerdloudfiphomsj.supabase.co https://images.unsplash.com; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; media-src 'self' blob: https://pukvrerdloudfiphomsj.supabase.co; font-src 'self' data:; connect-src 'self' https://pukvrerdloudfiphomsj.supabase.co; frame-src ${preview ? "'self' https://app.netlify.com https://www.google.com https://maps.google.com" : "https://www.google.com https://maps.google.com"}; upgrade-insecure-requests` },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
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

export default function configuration(phase: string) {
  if (phase === 'phase-production-build' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) throw new Error('Supabase public configuration is required for a production build.');
  return nextConfig;
}
