/** Read-only release gate. Does not call FedaPay, Supabase or send any email. */
import { pathToFileURL } from 'node:url';

const targets = ['sandbox', 'live', 'live-test', 'production-closed'];
const productionOrigin = 'https://pyjamas25.netlify.app';
const productionDatabase = 'https://pukvrerdloudfiphomsj.supabase.co';

export function checkPaymentReadiness(env, target) {
  if (!targets.includes(target)) throw new Error('Unknown payment readiness target.');
  const closed = target === 'production-closed';
  const providerEnvironment = target === 'sandbox' ? 'sandbox' : 'live';
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'FEDAPAY_SECRET_KEY', 'FEDAPAY_WEBHOOK_SECRET', 'FEDAPAY_ACCOUNT_ID', 'PAYMENT_SITE_URL', 'PAYMENT_RECONCILE_SECRET', 'PAYMENT_SHIPPING_XOF'];
  for (const name of required) check(`${name} configured`, typeof env[name] === 'string' && env[name].trim().length > 0);
  check('provider environment matches target', env.FEDAPAY_ENVIRONMENT === providerEnvironment);
  check('secret key environment matches target', env.FEDAPAY_SECRET_KEY?.startsWith(`sk_${providerEnvironment}_`));
  check('merchant account is a positive safe integer', /^[1-9][0-9]*$/.test(env.FEDAPAY_ACCOUNT_ID || '') && Number.isSafeInteger(Number(env.FEDAPAY_ACCOUNT_ID)));
  check('shipping is explicitly configured as integer XOF', /^\d+$/.test(env.PAYMENT_SHIPPING_XOF || '') && Number.isSafeInteger(Number(env.PAYMENT_SHIPPING_XOF)) && Number(env.PAYMENT_SHIPPING_XOF) <= 1_000_000);
  check('reconciliation secret has sufficient length', (env.PAYMENT_RECONCILE_SECRET?.length || 0) >= 32);
  let site;
  let database;
  try { site = new URL(env.PAYMENT_SITE_URL); } catch { /* Report only the check name. */ }
  try { database = new URL(env.NEXT_PUBLIC_SUPABASE_URL); } catch { /* Never print env values. */ }
  check('trusted payment origin uses HTTPS without credentials or port', site?.protocol === 'https:' && !site?.username && !site?.password && !site?.port && site?.pathname === '/' && !site?.search && !site?.hash);
  check('database URL uses HTTPS without credentials', database?.protocol === 'https:' && !database?.username && !database?.password);
  if (target === 'sandbox') {
    check('isolated sandbox database explicitly confirmed', env.PAYMENT_DATABASE_ISOLATED === 'true');
    check('sandbox does not use production database', database && database.hostname !== 'pukvrerdloudfiphomsj.supabase.co');
    check('live approval stays disabled in sandbox', env.FEDAPAY_LIVE_APPROVED !== 'true');
  } else if (target === 'live-test') {
    check('private Live test explicitly enabled', env.PAYMENT_LIVE_TEST_ENABLED === 'true');
    check('only Netlify PR 20 preview', env.CONTEXT === 'deploy-preview' && env.REVIEW_ID === '20' && site?.origin === 'https://deploy-preview-20--pyjamas25.netlify.app');
    check('exact isolated recipe database', env.NEXT_PUBLIC_SUPABASE_URL === 'https://oxhymanjibveayhcaqvj.supabase.co' && env.PAYMENT_DATABASE_ISOLATED === 'true');
    check('public live approval stays disabled', env.FEDAPAY_LIVE_APPROVED === 'false');
    check('expected Live merchant', env.FEDAPAY_ACCOUNT_ID === '101915');
    check('strict test ceiling between 1 and 100 XOF', /^\d+$/.test(env.PAYMENT_LIVE_TEST_MAX_XOF || '') && Number.isSafeInteger(Number(env.PAYMENT_LIVE_TEST_MAX_XOF)) && Number(env.PAYMENT_LIVE_TEST_MAX_XOF) >= 1 && Number(env.PAYMENT_LIVE_TEST_MAX_XOF) <= 100);
    check('one owner authorization identifier configured', /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env.PAYMENT_LIVE_TEST_AUTHORIZATION_ID || ''));
  } else {
    check('Netlify production context', env.CONTEXT === 'production');
    check('exact production payment origin', env.PAYMENT_SITE_URL === productionOrigin || env.PAYMENT_SITE_URL === productionOrigin + '/');
    check('exact production database', env.NEXT_PUBLIC_SUPABASE_URL === productionDatabase || env.NEXT_PUBLIC_SUPABASE_URL === productionDatabase + '/');
    check('production is not declared isolated', env.PAYMENT_DATABASE_ISOLATED !== 'true');
    check('private live test is disabled in production', env.PAYMENT_LIVE_TEST_ENABLED !== 'true');
    check(closed ? 'live approval explicitly off' : 'explicit final live approval', env.FEDAPAY_LIVE_APPROVED === (closed ? 'false' : 'true'));
  }
  if (closed) {
    for (const name of ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'ORDER_EMAIL_FROM', 'ORDER_ADMIN_EMAIL', 'ORDER_TEST_EMAILS']) {
      check(`${name} configured`, typeof env[name] === 'string' && env[name].trim().length > 0);
    }
    check('notifications explicitly off', env.ORDER_NOTIFICATIONS_ENABLED === 'false');
  }
  const state = closed ? 'false' : 'true';
  check(closed ? 'server payment processing explicitly off' : 'server payment processing enabled', env.FEDAPAY_ENABLED === state);
  check(closed ? 'new checkout admission explicitly off' : 'new checkout admission enabled', env.PAYMENT_CHECKOUT_ENABLED === state);
  return { ready: checks.every(c => c.ok), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flags = process.argv.slice(2);
  if (flags.length !== 1 || !targets.some(target => flags[0] === '--' + target)) {
    console.error('Usage: npm run payments:check -- --sandbox|--live|--live-test|--production-closed');
    process.exitCode = 2;
  } else {
    const target = flags[0].slice(2);
    const result = checkPaymentReadiness(process.env, target);
    for (const item of result.checks) console.log(`${item.ok ? 'OK' : 'MISSING/BLOCKED'} ${item.name}`);
    const success = target === 'production-closed'
      ? 'CLOSED CONFIGURATION READY — sales stay off; external acceptance evidence is still required.'
      : 'CONFIGURATION READY — external acceptance evidence is still required.';
    console.log(result.ready ? success : 'NO-GO — configuration incomplete or inconsistent with the requested stage.');
    console.log('Read-only check: no provider request, database mutation, email or payment executed. No environment value printed.');
    process.exitCode = result.ready ? 0 : 1;
  }
}
