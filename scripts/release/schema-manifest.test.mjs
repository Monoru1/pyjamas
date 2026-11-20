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

it('distinguishes DEFAULT ACL grantor roles hidden by --no-owner in real dump headers',()=>{
 const acl=role=>`-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -\n--\n\nALTER DEFAULT PRIVILEGES FOR ROLE ${role} IN SCHEMA public GRANT SELECT ON TABLES TO service_role;\n\n--\n`;
 const source=schemaManifest(pre+a+acl('postgres')+acl('supabase_admin')+end);
 const restored=schemaManifest(pre+acl('supabase_admin')+a+acl('postgres')+end);
 expect(source).toEqual(restored);expect(source.filter(x=>x.object.includes('Default ACL role:'))).toHaveLength(2);
 expect(schemaDifferences(source,schemaManifest(pre+a+acl('postgres')+end))).toHaveLength(1);
 expect(()=>schemaManifest(pre+acl('postgres')+acl('postgres')+end)).toThrow('Duplicate');
});

// Terrain 14: a --no-owner restore flattens an object's real owner to the connecting admin
// role. pg_dump's ACL text for an object is a diff against the CURRENT implicit default
// privileges of its OWNER, so once ownership no longer matches between production and the
// restored copy, an owner-only "REVOKE ALL ... FROM <owner>" bookkeeping line can silently
// appear or disappear even though no grant to any other role ever changed. The header alone
// (Owner: supabase_auth_admin vs Owner: -) already makes this detectable as a real schema
// difference — see scripts/release/lib.sh and backup-drill.sh, which keep real ownership.
it('treats an object whose real owner is lost by a --no-owner restore as a genuine difference',()=>{
 const tableWithOwner=`-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin\n--\n\nCREATE TABLE auth.users (id uuid NOT NULL);\n\n--\n`;
 const aclWithOwnerPrivilegesFrozen=`-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin\n--\n\nREVOKE ALL ON TABLE auth.users FROM supabase_auth_admin;\nGRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON TABLE auth.users TO supabase_auth_admin;\nGRANT SELECT,INSERT,UPDATE,DELETE ON TABLE auth.users TO anon,authenticated,service_role;\n\n--\n`;
 const tableNoOwner=`-- Name: users; Type: TABLE; Schema: auth; Owner: -\n--\n\nCREATE TABLE auth.users (id uuid NOT NULL);\n\n--\n`;
 // Once the restored copy's connecting role IS the owner, its freshly materialized ACL
 // already matches the current default, so the owner-only REVOKE ALL line disappears —
 // every grant to anon/authenticated/service_role stays identical.
 const aclOwnerFlattened=`-- Name: TABLE users; Type: ACL; Schema: auth; Owner: -\n--\n\nGRANT SELECT,INSERT,UPDATE,DELETE ON TABLE auth.users TO anon,authenticated,service_role;\n\n--\n`;
 const production=schemaManifest(pre+tableWithOwner+aclWithOwnerPrivilegesFrozen+end);
 const restoredWithoutOwner=schemaManifest(pre+tableNoOwner+aclOwnerFlattened+end);
 const diff=schemaDifferences(production,restoredWithoutOwner);
 expect(diff.map(d=>d.object).sort()).toEqual(['-- Name: TABLE users; Type: ACL; Schema: auth; Owner: -','-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin','-- Name: users; Type: TABLE; Schema: auth; Owner: -','-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin'].sort());
 // Preserving real ownership on both sides (what the fixed scripts do) makes the two
 // independent pg_dump outputs agree again, with nothing lost for any other role.
 const restoredWithOwner=schemaManifest(pre+tableWithOwner+aclWithOwnerPrivilegesFrozen+end);
 expect(schemaDifferences(production,restoredWithOwner)).toHaveLength(0);
});
