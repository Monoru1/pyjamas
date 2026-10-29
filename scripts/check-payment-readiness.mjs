/** Read-only release gate. Does not call FedaPay, Supabase or send any email. */
import { pathToFileURL } from 'node:url';

export function checkPaymentReadiness(env, target) {
  if (!['sandbox', 'live'].includes(target)) throw new Error('Use --sandbox or --live.');
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'FEDAPAY_SECRET_KEY', 'FEDAPAY_WEBHOOK_SECRET', 'FEDAPAY_ACCOUNT_ID', 'PAYMENT_SITE_URL', 'PAYMENT_RECONCILE_SECRET', 'PAYMENT_SHIPPING_XOF'];
  for (const name of required) check(`${name} configured`, typeof env[name] === 'string' && env[name].trim().length > 0);
  check('provider environment matches target', env.FEDAPAY_ENVIRONMENT === target);
  check('secret key environment matches target', env.FEDAPAY_SECRET_KEY?.startsWith(`sk_${target}_`));
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
  } else {
    check('Netlify production context', env.CONTEXT === 'production');
    check('explicit final live approval', env.FEDAPAY_LIVE_APPROVED === 'true');
  }
  check('server payment processing enabled', env.FEDAPAY_ENABLED === 'true');
  check('new checkout admission enabled', env.PAYMENT_CHECKOUT_ENABLED === 'true');
  return { ready: checks.every(c => c.ok), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flags = process.argv.slice(2);
  if (flags.length !== 1 || !['--sandbox', '--live'].includes(flags[0])) {
    console.error('Usage: npm run payments:check -- --sandbox|--live');
    process.exitCode = 2;
  } else {
    const target = flags[0].slice(2);
    const result = checkPaymentReadiness(process.env, target);
    for (const item of result.checks) console.log(`${item.ok ? 'OK' : 'MISSING/BLOCKED'} ${item.name}`);
    console.log(result.ready ? 'CONFIGURATION READY — external acceptance evidence is still required.' : 'NO-GO — configuration incomplete or activation intentionally disabled.');
    console.log('Read-only check: no provider request, database mutation, email or payment executed. No environment value printed.');
    process.exitCode = result.ready ? 0 : 1;
  }
}
