import { expect, it } from 'vitest';
import { adminMfaGate, adminMfaRequired } from './admin-mfa';
it('SEC-011: verified factor always requires AAL2; enrolment only when the obligation is on', () => {
  expect(adminMfaGate({ currentLevel: 'aal2', nextLevel: 'aal2' }, true)).toBe('ok');
  expect(adminMfaGate({ currentLevel: 'aal1', nextLevel: 'aal2' }, false)).toBe('verify');
  expect(adminMfaGate({ currentLevel: 'aal1', nextLevel: 'aal1' }, false)).toBe('ok');
  expect(adminMfaGate({ currentLevel: 'aal1', nextLevel: 'aal1' }, true)).toBe('enroll');
  expect(adminMfaGate(null, true)).toBe('enroll');
  expect(adminMfaRequired('true')).toBe(true);
  for (const value of [undefined, '', 'TRUE', '1', 'yes']) expect(adminMfaRequired(value)).toBe(false);
});
