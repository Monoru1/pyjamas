import { describe, expect, it } from 'vitest';
import { safeMediaUrl, safeSocialUrl, trustedSiteOrigin } from './urls';
import { privateContentSecurityPolicy, privateResponseHeaders } from './policy';
import { readLimitedBody, requireJsonRequest, requireBrowserOrigin, UUID_PATTERN } from '../payments/read-body';

describe('CMS URL boundaries', () => {
  it.each(['javascript:alert(1)','data:text/html,<script>alert(1)</script>','//evil.test/a','/christmas-2026/../admin','/christmas-2026/%2e%2e/a','https://pukvrerdloudfiphomsj.supabase.co.evil.test/storage/v1/object/public/site-assets/a.jpg','https://evil.test/a.jpg','https://user:pw@pukvrerdloudfiphomsj.supabase.co/storage/v1/object/public/site-assets/a.jpg','/christmas-2026/evil\\file'])('rejects untrusted media %s', value => expect(safeMediaUrl(value)).toBe(''));
  it('permits only own media and expected social platforms', () => {
    expect(safeMediaUrl('/christmas-2026/drive/video-03.mp4')).toContain('video-03');
    expect(safeMediaUrl('https://pukvrerdloudfiphomsj.supabase.co/storage/v1/object/public/site-assets/a.webp')).toContain('site-assets');
    expect(safeSocialUrl('https://www.instagram.com/lamaisondespyjamas','instagram')).toContain('instagram.com');
    for(const value of ['javascript:alert(1)','https://instagram.com.evil.test/a','https://user:pw@instagram.com/a','http://instagram.com/a','https://instagram.com:8443/a'])expect(safeSocialUrl(value,'instagram')).toBe('');
  });
});
describe('private browser policy', () => {
  it('blocks inline scripts and event handlers, frames and shared caching', () => {
    const headers=new Headers(); privateResponseHeaders(headers,'a'.repeat(48));
    const script=privateContentSecurityPolicy('a'.repeat(48)).split(';').find(v=>v.trim().startsWith('script-src '));
    expect(script).not.toContain('unsafe-inline');expect(script).not.toContain('unsafe-eval');
    expect(headers.get('content-security-policy')).toContain("script-src-attr 'none'");
    expect(headers.get('netlify-cdn-cache-control')).toBe('no-store');
    expect(headers.get('referrer-policy')).toBe('no-referrer');
    expect(()=>privateContentSecurityPolicy("';script-src *")).toThrow();
  });
});
describe('request parsing boundaries', () => {
  const request=(body:string,headers:Record<string,string>={})=>new Request('https://pyjamas25.netlify.app/api/payments/checkout',{method:'POST',body,headers});
  it('rejects HTML forms, compressed JSON and cross-site requests',()=>{
    expect(()=>requireJsonRequest(request('{}',{'content-type':'text/plain'}))).toThrow('JSON');
    expect(()=>requireJsonRequest(request('{}',{'content-type':'application/json','content-encoding':'gzip'}))).toThrow('Encodage');
    expect(()=>requireBrowserOrigin(request('{}',{'origin':'https://evil.test'}),'https://pyjamas25.netlify.app')).toThrow('Origine');
    expect(()=>requireBrowserOrigin(request('{}',{'origin':'https://pyjamas25.netlify.app','sec-fetch-site':'cross-site'}),'https://pyjamas25.netlify.app')).toThrow('Origine');
  });
  it('enforces byte limits even without a declared Content-Length',async()=>{
    await expect(readLimitedBody(request('ééé'),5)).rejects.toMatchObject({status:413});
    await expect(readLimitedBody(request('{}',{'content-length':'1000000'}),100)).rejects.toMatchObject({status:413});
    expect(await readLimitedBody(request('{"ok":true}'),100)).toBe('{"ok":true}');
  });
  it('stops slow streaming bodies and rejects invalid UTF-8',async()=>{
    const slow=new Request('https://example.test',{method:'POST',body:new ReadableStream({start(){}}),duplex:'half'} as RequestInit);
    await expect(readLimitedBody(slow,100,10)).rejects.toMatchObject({status:408});
    const invalid=new Request('https://example.test',{method:'POST',body:new Uint8Array([0xff])});
    await expect(readLimitedBody(invalid,100)).rejects.toMatchObject({status:400});
  });
  it('rejects malformed UUIDs that previously matched 36 arbitrary hyphens',()=>{
    expect(UUID_PATTERN.test('-'.repeat(36))).toBe(false);expect(UUID_PATTERN.test('11111111-1111-4111-8111-111111111111')).toBe(true);
  });
});

it('uses only trusted site origins for auth redirects', () => {
  expect(trustedSiteOrigin('https://deploy-preview-5--pyjamas25.netlify.app/path')).toBe('https://deploy-preview-5--pyjamas25.netlify.app');
  expect(trustedSiteOrigin()).toBe('https://pyjamas25.netlify.app');
  for (const value of ['https://example.invalid', 'https://pyjamas25.netlify.app.evil.test', 'https://user:pw@pyjamas25.netlify.app', 'http://pyjamas25.netlify.app', 'https://pyjamas25.netlify.app:8443']) expect(trustedSiteOrigin(value)).toBe('https://pyjamas25.netlify.app');
});
