import { test, expect } from '@playwright/test';

test('closed checkout keeps a synthetic basket, its amounts and the tracking link', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const providerRequests: string[] = [];
  await page.route(/https:\/\/.*(?:fedapay\.com|resend\.com)/, route => {
    providerRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/panier');
  await page.evaluate(() => localStorage.setItem('mdp-cart', JSON.stringify({ version: 1, state: { lines: [{
    variantId: '11111111-1111-4111-8111-111111111111', productId: '22222222-2222-4222-8222-222222222222',
    productName: 'Pyjama de test', sizeLabel: 'M', colorName: 'Rouge', unitPrice: 25000, currency: 'XOF', maxStock: 10, quantity: 1,
  }] } })));
  await page.reload();
  await expect(page.getByText('Le paiement en ligne est momentanément indisponible.', { exact: false })).toBeVisible();
  const quantity = page.getByRole('spinbutton', { name: 'Quantité Pyjama de test · M' });
  await expect(quantity).toHaveValue('1');
  await quantity.fill('2');
  await expect(page.locator('aside')).toContainText(/50\s*000/);
  await page.reload();
  await expect(quantity).toHaveValue('2');
  await expect(page.locator('aside')).toContainText(/50\s*000/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: /continuer vers FedaPay|Vérifier les prix/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Suivre mon dernier paiement' }).click();
  await expect(page.getByRole('heading', { name: 'Suivi de votre paiement' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Référence manquante' })).toBeVisible();
  await page.getByRole('link', { name: 'Retour au panier' }).click();
  await page.getByRole('button', { name: 'Retirer', exact: true }).click();
  await expect(page.getByText('Votre panier attend son premier cadeau.')).toBeVisible();
  expect(providerRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('an anonymous visitor is redirected and the local admin login renders', async ({ page, request }) => {
  const localOrigin = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:3000').origin;
  // Inspect the redirect without following it: a production redirect must never satisfy the local UI smoke test.
  const response = await request.get('/admin', { maxRedirects: 0 });
  expect([301, 302, 303, 307, 308]).toContain(response.status());
  const location = response.headers()['location'];
  expect(location).toBeTruthy();
  expect(new URL(location, localOrigin).pathname).toBe('/admin/login');

  await page.goto('/admin/login');
  await expect(page).toHaveURL(url => url.origin === localOrigin && url.pathname === '/admin/login');
  await expect(page.getByRole('button', { name: 'Ouvrir le studio' })).toBeVisible();
});
