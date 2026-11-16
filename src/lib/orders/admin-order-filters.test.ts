import { expect, it } from 'vitest';
import { parseAdminOrderFilters } from './admin-order-filters';

it('accepts a reference and filters from the admin form', () => {
  expect(parseAdminOrderFilters({ q: ' MDP-20261113-ABCDEF ', status: 'pending', paiement: 'paid',
    du: '2026-11-13', au: '2026-11-14', tri: 'ancien', page: '2' })).toEqual({
    search: 'mdp-20261113-abcdef', status: 'pending', payment: 'paid',
    from: '2026-11-13', to: '2026-11-14', oldestFirst: true, page: 2,
  });
});

it('ignores duplicate query values, inherited status names and impossible dates', () => {
  expect(parseAdminOrderFilters({ q: ['a','b'], status: 'constructor', paiement: 'toString',
    du: '2026-02-30', au: ['2026-11-13'], page: ['2'] })).toEqual({
    search: '', status: '', payment: '', from: undefined, to: undefined, oldestFirst: false, page: 1,
  });
});
