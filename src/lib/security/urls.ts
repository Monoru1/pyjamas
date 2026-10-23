const storageOrigin = 'https://pukvrerdloudfiphomsj.supabase.co';
export function safeMediaUrl(value: unknown, fallback = ''): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) return fallback;
  if (/^\/christmas-2026\/[a-zA-Z0-9/_.-]+$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (url.origin === storageOrigin && !url.username && !url.password && /^\/storage\/v1\/object\/public\/(site-assets|product-images|christmas-videos)\//.test(url.pathname)) return url.href;
  } catch { /* Untrusted source. */ }
  return fallback;
}
export function safeSocialUrl(value: unknown, platform: 'instagram' | 'tiktok', fallback = ''): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.port && !url.username && !url.password && [platform + '.com', 'www.' + platform + '.com'].includes(url.hostname)) return url.href;
  } catch { /* Never render arbitrary schemes from CMS settings. */ }
  return fallback;
}
