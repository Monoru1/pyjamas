import { runProductionServiceChecks, type ProductionDeployEvent } from '../lib/production-service-checks';

declare const Netlify: { env: { get(key: string): string | undefined } };
const keys = ['COMMERCE_VALIDATION_RUN_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'FEDAPAY_ENABLED', 'FEDAPAY_LIVE_APPROVED', 'PAYMENT_CHECKOUT_ENABLED', 'ORDER_NOTIFICATIONS_ENABLED',
  'FEDAPAY_ENVIRONMENT', 'FEDAPAY_ACCOUNT_ID', 'FEDAPAY_SECRET_KEY', 'FEDAPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'ORDER_EMAIL_FROM', 'ORDER_ADMIN_EMAIL', 'ORDER_TEST_EMAILS'];

// Platform events are authenticated by Netlify. No web-request handler is exported.
const handlers = {
  async deploySucceeded(event: ProductionDeployEvent) {
    try {
      await runProductionServiceChecks(event, Object.fromEntries(keys.map(key => [key, Netlify.env.get(key)])));
    } catch {
      // Provider bodies and credentials must never enter function logs.
      console.error('production_service_check_failed');
    }
  },
};

export default handlers;
