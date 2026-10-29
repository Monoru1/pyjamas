import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({allowed:true,recover:vi.fn(),storage:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'staff'}}})},rpc:async()=>({data:mocks.allowed})})}));
vi.mock('@/lib/payments/initialization',()=>({recoverPrivateCheckout:mocks.recover}));
vi.mock('@/lib/supabase/recipe-storage',()=>({prepareRecipeStorage:mocks.storage}));
import { POST as recover } from '@/app/api/payments/recover/route';
import { POST as prepare } from '@/app/api/admin/recipe-storage/route';
const origin='https://deploy-preview-11--pyjamas25.netlify.app';
const id='11111111-1111-4111-8111-111111111111';
const request=(body:string,site=origin)=>new Request(`${origin}/api/payments/recover`,{method:'POST',headers:{origin:site,'Content-Type':'application/x-www-form-urlencoded'},body});
beforeEach(()=>{vi.clearAllMocks();mocks.allowed=true;vi.stubEnv('SITE_ORIGIN',origin);mocks.recover.mockResolvedValue('approval_required');mocks.storage.mockResolvedValue(undefined);});
afterEach(()=>vi.unstubAllEnvs());
it('rejects unauthorized or cross-site staff submissions before any operation',async()=>{
 mocks.allowed=false;expect((await recover(request(`payment_id=${id}`))).status).toBe(403);expect((await prepare(request(''))).status).toBe(403);
 mocks.allowed=true;expect((await recover(request(`payment_id=${id}`,'https://evil.test'))).status).toBe(403);expect((await prepare(request('','https://evil.test'))).status).toBe(403);
 expect(mocks.recover).not.toHaveBeenCalled();expect(mocks.storage).not.toHaveBeenCalled();
});
it('redirects expired recovery to a safe notice and rejects client amounts or changed intent fields',async()=>{
 const r=await recover(request(`payment_id=${id}`));expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(`${origin}/admin/paiements?notice=approval_required`);
 expect(mocks.recover).toHaveBeenCalledWith(id,'staff');mocks.recover.mockClear();
 for(const body of [`payment_id=${id}&amount=1`,`payment_id=${id}&payment_id=${id}`,'payment_id=invalid'])expect((await recover(request(body))).status).toBe(400);
 expect(mocks.recover).not.toHaveBeenCalled();
});
it('permits only the empty explicit storage preparation form for an authorized manager',async()=>{
 expect((await prepare(request('bucket=private'))).status).toBe(400);expect(mocks.storage).not.toHaveBeenCalled();
 const r=await prepare(request(''));expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(`${origin}/admin/medias?notice=storage_ready`);expect(mocks.storage).toHaveBeenCalledOnce();
});
