import { expect, it } from 'vitest';
import { customerErrorMessage, customerFieldErrors } from './checkout-input';

const valid = { name: 'Cliente Test', phone: '+229 01 00 00 00 02', email: 'cliente@example.test', address: 'Rue de test, Cotonou', city: 'Cotonou', comment: '' };

it('accepts a complete Beninese customer', () => {
  expect(customerFieldErrors(valid)).toEqual([]);
  expect(customerFieldErrors({ ...valid, phone: '2290100000002' })).toEqual([]);
});

it('names exactly the invalid fields, in form order, without echoing values', () => {
  expect(customerFieldErrors({ ...valid, phone: '+33 6 12 34 56 78' })).toEqual(['phone']);
  expect(customerFieldErrors({ ...valid, phone: '+229 97 12 34 56' })).toEqual(['phone']); // Pre-2025 format.
  expect(customerFieldErrors({ ...valid, phone: '', email: 'pas-un-email', address: 'court' })).toEqual(['phone', 'email', 'address']);
  expect(customerFieldErrors({ ...valid, name: 'A', city: '' })).toEqual(['name', 'city']);
  expect(customerFieldErrors(null)).toEqual([]); // Not a customer object: generic message.
  const message = customerErrorMessage(['phone', 'address']);
  expect(message).toBe('Vérifiez : téléphone béninois : +229 01 suivi de 8 chiffres ; adresse de livraison (8 caractères minimum).');
  expect(customerErrorMessage(customerFieldErrors({ ...valid, email: 'secret@@x' }))).not.toContain('secret');
});
