import { createHash, timingSafeEqual } from 'node:crypto';

/** SEC-003: constant-time comparison of the bearer secret (digests have a fixed length). */
export function authorizedMaintenance(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
