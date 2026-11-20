import { expect, it } from 'vitest';
import { schemaManifest, schemaDifferences } from './schema-manifest.mjs';
const pre='-- PostgreSQL database dump\n-- Dumped from database version 17.6\n\\restrict random\nSET statement_timeout = 0;\n\n--\n';
const block=(name,body)=>`-- Name: ${name}; Type: TABLE; Schema: public; Owner: -\n--\n\n${body}\n\n--\n`;
const a=block('a','CREATE TABLE public.a (id integer);');
const b=block('b','CREATE TABLE public.b (id integer);');
const end='--\n-- PostgreSQL database dump complete\n--\n\n\\unrestrict random\n';
it('normalizes object dependency order and pg_dump metadata only',()=>{
 expect(schemaManifest(pre+a+b+end)).toEqual(schemaManifest(pre.replace('17.6','17.12').replace('random','other')+b+a+end));
});
for(const changed of ['CREATE TABLE public.a (id text);','CREATE TABLE public.a (id integer NOT NULL);','CREATE TABLE public.a (id integer); GRANT SELECT ON public.a TO anon;'])it(`rejects a real schema change: ${changed}`,()=>{
 const diff=schemaDifferences(schemaManifest(pre+a+b+end),schemaManifest(pre+block('a',changed)+b+end));expect(diff).toHaveLength(1);expect(diff[0].object).toContain('Name: a;');
});
it('detects missing objects and never ignores SQL inside a quoted function body',()=>{
 expect(schemaDifferences(schemaManifest(pre+a+b+end),schemaManifest(pre+a+end))).toHaveLength(1);
 const f=body=>block('fn',`CREATE FUNCTION public.fn() RETURNS text LANGUAGE sql AS $function$\n${body}\n$function$;`);
 const original="SELECT 'x';\n-- Name: fake; Type: TABLE; Schema: public; Owner: -\n-- Dumped from database version 17.6\n\\restrict not_metadata";
 expect(schemaManifest(pre+f(original)+end)).not.toEqual(schemaManifest(pre+f(original.replace('17.6','17.12'))+end));
});
it('keeps ACL statement order and session settings significant',()=>{
 expect(schemaManifest(pre+block('acl','GRANT SELECT ON public.a TO anon;\nREVOKE SELECT ON public.a FROM anon;')+end)).not.toEqual(schemaManifest(pre+block('acl','REVOKE SELECT ON public.a FROM anon;\nGRANT SELECT ON public.a TO anon;')+end));
 expect(schemaManifest(pre+a+end)).not.toEqual(schemaManifest(pre.replace('timeout = 0','timeout = 1')+a+end));
});
it('fails closed for malformed SQL or duplicate labels',()=>{
 expect(()=>schemaManifest(pre+a+a+end)).toThrow('Duplicate');expect(()=>schemaManifest(pre+block('fn','SELECT $body$unterminated')+end)).toThrow('Unterminated');
});

it('accepts standard strings ending in backslashes and E strings with escaped quotes',()=>{
 const standard=block('a',String.raw`COMMENT ON TABLE public.a IS 'path\';`);
 const escaped=block('a',String.raw`COMMENT ON TABLE public.a IS E'path\\ and quote\'';`);
 expect(()=>schemaManifest(pre+standard+end)).not.toThrow();
 expect(()=>schemaManifest(pre+escaped+end)).not.toThrow();
});
