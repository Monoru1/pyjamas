import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { checkPaymentReadiness } from './check-payment-readiness.mjs';

const fixture = {
  NEXT_PUBLIC_SUPABASE_URL:'https://isolated.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-public',
  SUPABASE_SERVICE_ROLE_KEY:'fixture-service-secret',
  FEDAPAY_SECRET_KEY:'sk_sandbox_fixture-secret',
  FEDAPAY_WEBHOOK_SECRET:'fixture-webhook-secret',
  FEDAPAY_ACCOUNT_ID:'42', PAYMENT_SITE_URL:'https://preview.example.test',
  PAYMENT_RECONCILE_SECRET:'fixture-reconcile-secret-32-characters',
  PAYMENT_SHIPPING_XOF:'0',FEDAPAY_ENVIRONMENT:'sandbox',
  PAYMENT_DATABASE_ISOLATED:'true',FEDAPAY_ENABLED:'true',
  PAYMENT_CHECKOUT_ENABLED:'true',FEDAPAY_LIVE_APPROVED:'false',
};
it('fails closed on incomplete configuration and blocks production stock in sandbox',()=>{
 expect(checkPaymentReadiness({},'sandbox').ready).toBe(false);
 expect(checkPaymentReadiness(fixture,'sandbox').ready).toBe(true);
 expect(checkPaymentReadiness({...fixture,NEXT_PUBLIC_SUPABASE_URL:'https://pukvrerdloudfiphomsj.supabase.co'},'sandbox').ready).toBe(false);
});
it('requires explicit live approval and a matching live key in the production context',()=>{
 const live={...fixture,FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture-secret',CONTEXT:'production',FEDAPAY_LIVE_APPROVED:'true'};
 expect(checkPaymentReadiness(live,'live').ready).toBe(true);
 for(const override of [{FEDAPAY_LIVE_APPROVED:'false'},{CONTEXT:'deploy-preview'},{FEDAPAY_SECRET_KEY:'sk_sandbox_fixture'},{PAYMENT_CHECKOUT_ENABLED:'false'}])expect(checkPaymentReadiness({...live,...override},'live').ready).toBe(false);
});
it('does not print any configured key or reconciliation secret to CLI output',()=>{
 const r=spawnSync(process.execPath,['scripts/check-payment-readiness.mjs','--sandbox'],{env:{...process.env,...fixture},encoding:'utf8'});
 expect(r.status).toBe(0);
 for(const name of ['FEDAPAY_SECRET_KEY','FEDAPAY_WEBHOOK_SECRET','SUPABASE_SERVICE_ROLE_KEY','PAYMENT_RECONCILE_SECRET'])expect(r.stdout+r.stderr).not.toContain(fixture[name]);
 expect(r.stdout).toContain('external acceptance evidence is still required');
});
it('permits only the explicitly authorized isolated PR 11 Live recipe',()=>{
 const liveTest={...fixture,FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture-secret',CONTEXT:'deploy-preview',REVIEW_ID:'11',PAYMENT_SITE_URL:'https://deploy-preview-11--pyjamas25.netlify.app',NEXT_PUBLIC_SUPABASE_URL:'https://oxhymanjibveayhcaqvj.supabase.co',PAYMENT_LIVE_TEST_ENABLED:'true',PAYMENT_LIVE_TEST_MAX_XOF:'100',PAYMENT_LIVE_TEST_AUTHORIZATION_ID:'00000000-0000-4000-8000-000000000001'};
 expect(checkPaymentReadiness(liveTest,'live-test').ready).toBe(true);
 for(const override of [{CONTEXT:'production'},{REVIEW_ID:'12'},{PAYMENT_LIVE_TEST_ENABLED:'false'},{PAYMENT_LIVE_TEST_MAX_XOF:'1001'},{PAYMENT_LIVE_TEST_MAX_XOF:'0'},{PAYMENT_LIVE_TEST_AUTHORIZATION_ID:''},{NEXT_PUBLIC_SUPABASE_URL:fixture.NEXT_PUBLIC_SUPABASE_URL},{FEDAPAY_LIVE_APPROVED:'true'}])expect(checkPaymentReadiness({...liveTest,...override},'live-test').ready).toBe(false);
});
