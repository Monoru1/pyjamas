import { afterEach, expect, it, vi } from 'vitest';
import { allowedBrowserOrigin, customSiteHost, customSiteOrigin, PRODUCTION_NETLIFY_ORIGIN } from './site-domain';
import { trustedSiteOrigin } from './urls';
import { paymentConfiguration } from '@/lib/payments/fedapay';
import { orderWhatsAppUrl } from '@/lib/orders/whatsapp';
import { deploymentSiteOrigin } from '../../../next.config';

// Terrain 15 — custom domain readiness. The real hostname is unknown: tests use a placeholder.
const live = { CONTEXT: 'production', URL: PRODUCTION_NETLIFY_ORIGIN, FEDAPAY_ENABLED: 'true', FEDAPAY_ENVIRONMENT: 'live', FEDAPAY_LIVE_APPROVED: 'true', FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'wh', SUPABASE_SERVICE_ROLE_KEY: 'fixture', FEDAPAY_ACCOUNT_ID: '101915', PAYMENT_SITE_URL: PRODUCTION_NETLIFY_ORIGIN, PAYMENT_SHIPPING_XOF: '0' };
const from = (origin: string) => new Request(`${PRODUCTION_NETLIFY_ORIGIN}/api/payments/quote`, { method: 'POST', headers: { origin } });
afterEach(() => vi.unstubAllEnvs());

it('changes nothing while no custom domain is configured', () => {
  vi.stubEnv('SITE_CUSTOM_DOMAIN', '');
  expect(customSiteOrigin()).toBeNull();
  expect(trustedSiteOrigin()).toBe(PRODUCTION_NETLIFY_ORIGIN);
  expect(deploymentSiteOrigin(live)).toBe(PRODUCTION_NETLIFY_ORIGIN);
  expect(paymentConfiguration(live).origin).toBe(PRODUCTION_NETLIFY_ORIGIN);
  expect(allowedBrowserOrigin(from(PRODUCTION_NETLIFY_ORIGIN), PRODUCTION_NETLIFY_ORIGIN)).toBe(PRODUCTION_NETLIFY_ORIGIN);
  expect(allowedBrowserOrigin(from('https://www.boutique-exemple.test'), PRODUCTION_NETLIFY_ORIGIN)).toBe(PRODUCTION_NETLIFY_ORIGIN); // i.e. refused by the check
});

it('makes the configured domain canonical for return URLs, e-mails, metadata and origin checks', () => {
  vi.stubEnv('SITE_CUSTOM_DOMAIN', 'WWW.Boutique-Exemple.test.');
  const custom = 'https://www.boutique-exemple.test';
  expect(customSiteOrigin()).toBe(custom);
  expect(trustedSiteOrigin()).toBe(custom);
  expect(trustedSiteOrigin(`${custom}/paiement?x=1`)).toBe(custom);
  expect(trustedSiteOrigin(PRODUCTION_NETLIFY_ORIGIN)).toBe(PRODUCTION_NETLIFY_ORIGIN); // Old address still valid.
  for (const hostile of [`${custom}.evil.test`, 'https://evil.test', 'http://www.boutique-exemple.test', 'https://www.boutique-exemple.test:8443']) expect(trustedSiteOrigin(hostile)).toBe(custom);
  const env = { ...live, SITE_CUSTOM_DOMAIN: 'www.boutique-exemple.test' };
  expect(deploymentSiteOrigin(env)).toBe(custom);
  expect(paymentConfiguration(env).origin).toBe(custom); // FedaPay callback_url follows the domain.
  // Transition: customers on the new domain or on the old Netlify link can both order. Nothing else.
  expect(allowedBrowserOrigin(from(custom), custom)).toBe(custom);
  expect(allowedBrowserOrigin(from(PRODUCTION_NETLIFY_ORIGIN), custom)).toBe(PRODUCTION_NETLIFY_ORIGIN);
  expect(allowedBrowserOrigin(from('https://evil.test'), custom)).toBe(custom);
  expect(allowedBrowserOrigin(from('https://deploy-preview-9--pyjamas25.netlify.app'), custom)).toBe(custom);
  // WhatsApp links never depend on the site domain.
  expect(orderWhatsAppUrl('+229 01 97 33 88 43', 'MDP-20261120-E6AAAD')!.startsWith('https://wa.me/2290197338843?text=')).toBe(true);
});

it('rejects anything that is not a bare public hostname', () => {
  for (const bad of ['', 'https://www.example.bj', 'example', 'pyjamas25.netlify.app', 'x.netlify.app', '127.0.0.1', 'localhost', 'a b.bj', 'example.bj:443', 'exa_mple.bj', '-x.bj'])
    expect(customSiteHost(bad)).toBeNull();
  expect(customSiteHost('lamaison.bj')).toBe('lamaison.bj');
});
