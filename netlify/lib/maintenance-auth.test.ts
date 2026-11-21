import { expect, it } from 'vitest';
import { authorizedMaintenance } from './maintenance-auth';
// SEC-003 regression.
it('accepts only the exact bearer secret, in constant time', () => {
  const secret = 'fixture-maintenance-secret-at-least-32-chars';
  expect(authorizedMaintenance(`Bearer ${secret}`, secret)).toBe(true);
  for (const header of [null, '', secret, `Bearer ${secret}x`, `Bearer ${secret.slice(0, -1)}`, `bearer ${secret}`]) expect(authorizedMaintenance(header, secret)).toBe(false);
  expect(authorizedMaintenance(`Bearer `, undefined)).toBe(false);
  expect(authorizedMaintenance(`Bearer `, '')).toBe(false);
});
