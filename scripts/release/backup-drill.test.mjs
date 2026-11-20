import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const script = name => resolve(`scripts/release/${name}`);
function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lmp-backup-')); roots.push(root);
  const bin = join(root, 'bin'); mkdirSync(bin);
  const mock = `#!${process.execPath}
const fs = require('node:fs'); const path = require('node:path');
const tool = path.basename(process.argv[1]); const a = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, tool + '\\n');
if(tool==='pg_restore')fs.appendFileSync(process.env.CALLS,a.at(-1)+'\\n');
const arg = flag => { const inline = a.find(x => x.startsWith(flag+'=')); return inline ? inline.slice(flag.length+1) : a[a.indexOf(flag)+1]; };
const sql = a[a.indexOf('-c')+1] || '';
if(tool==='psql') {
  if(a.includes('-f')) {
    const file=arg('-f');
    if(file.endsWith('preflight.sql')) {
      fs.appendFileSync(process.env.CALLS,'historical-preflight\\n');
      for(let i=0;i<12;i++) console.log(i+'|BLOQUANT|historical|'+(process.env.SOURCE_STATE==='old'?'t':'f'));
    } else if(file.endsWith('postflight.sql')) console.log('1|postflight|t');
    else fs.appendFileSync(process.env.CALLS,'historical-migration\\n');
  } else if(sql.includes('server_version_num')) console.log('170006');
  else if(sql.includes('select rolname')) console.log('anon');
  else if(sql.includes('select e.extname')) {}
  else if(sql.includes('string_agg(d,')) console.log('public.products='+((process.env.FAILURE==='comparison' && a.join(' ').includes('/lmp_restore_drill'))?'DIFFERENT':'same'));
  else if(sql.includes('xpath(')) console.log('public.products=18');
  else if(sql.includes("'migrations='")) console.log('migrations=67');
  else if(sql.includes("'produits='")) console.log('produits=18');
} else if(tool==='pg_dump') {
  if(a.includes('--version')) console.log('pg_dump (PostgreSQL) 17.6');
  else if(a.includes('--schema-only')) console.log('-- Dumped from database version 17.6\\n\\\\restrict '+Math.random()+'\\nCREATE TABLE products(id '+(process.env.FAILURE==='schema' && a.join(' ').includes('/lmp_restore_drill')?'text':'int')+');\\n\\\\unrestrict random');
  else fs.writeFileSync(arg('--file'),'synthetic-dump');
} else if(tool==='pg_restore') {
  if(a.includes('--list')) console.log('1; 0 0 SCHEMA - public postgres\\n2; 0 0 TABLE public products postgres');
  else if(process.env.FAILURE==='restore') {console.error('pg_restore: error: fixture failure');process.exit(1);}
}
`;
  for (const name of ['psql', 'pg_dump', 'pg_restore']) writeFileSync(join(bin, name), mock, { mode: 0o755 });
  writeFileSync(join(bin, 'curl'), `#!${process.execPath}
const fs=require('node:fs');const a=process.argv.slice(2);const out=a[a.indexOf('-o')+1];
// Capture header names only. Never put the credential in the test trace.
fs.appendFileSync(process.env.CALLS, a.includes('Authorization: Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY)?'forbidden-bearer\\n':'apikey-only\\n');
let body='{}',status=200;
if(process.env.REJECT_KEY==='true')status=401;
else if(a.some(x=>x.includes('/object/authenticated/')))body=fs.readFileSync(process.env.UPLOADED);
else if(a.some(x=>x.includes('/object/list/')))body='[]';
else if(a.includes('--data-binary'))fs.copyFileSync(a[a.indexOf('--data-binary')+1].slice(1),process.env.UPLOADED);
else body='{"public":false}';
fs.writeFileSync(out,body);process.stdout.write(String(status));
`, { mode: 0o755 });
  // This fixture replaces the CLI crypto adapter because the local sandbox cannot start
  // gpg-agent sockets. The release-rehearsal job independently tests real GPG on PG17.
  writeFileSync(join(bin, 'gpg'), `#!${process.execPath}
const fs=require('node:fs'), crypto=require('node:crypto'); const a=process.argv.slice(2);
const key=crypto.createHash('sha256').update(fs.readFileSync(3)).digest();
const source=fs.readFileSync(a.at(-1)); let output;
if(a.includes('--decrypt')) {
  const d=crypto.createDecipheriv('aes-256-gcm',key,source.subarray(0,12));d.setAuthTag(source.subarray(12,28));
  output=Buffer.concat([d.update(source.subarray(28)),d.final()]);
} else {
  const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);
  const data=Buffer.concat([c.update(source),c.final()]);output=Buffer.concat([iv,c.getAuthTag(),data]);
}
fs.writeFileSync(a[a.indexOf('--output')+1],output);
`, { mode:0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, PG_CONTAINER: '',
    CALLS: join(root, 'calls'), UPLOADED: join(root, 'uploaded'), SOURCE_STATE: 'migrated', FAILURE: '', BACKUP_MODE: 'current',
    PROD_DB_URL: 'postgresql://fixture@remote.invalid/production', DRILL_ADMIN_URL: 'postgresql://fixture@127.0.0.1:55432/postgres',
    BACKUP_DIR: join(root, 'backups'), EVIDENCE_DIR: join(root, 'evidence'), RELEASE_SHA: 'a'.repeat(40),
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fixture-do-not-log',
    BACKUP_PASSPHRASE: 'synthetic-passphrase-for-ci-only', REQUIRE_SECRET_KEY: 'true', ...overrides };
  return { root, env, run: name => spawnSync('bash', [script(name)], { env, encoding: 'utf8' }),
    calls: () => existsSync(env.CALLS) ? readFileSync(env.CALLS, 'utf8') : '',
    proof: () => readFileSync(join(env.EVIDENCE_DIR, 'PREUVE.txt'), 'utf8') };
}

it('backs up an already migrated source without any historical preflight or migration', () => {
  const f=fixture(); const r=f.run('backup-drill.sh'); expect(r.status, r.stdout+r.stderr).toBe(0);
  expect(f.proof()).toContain('backup_mode=current'); expect(f.proof()).toContain('restauration_verifiee=true');
  expect(f.calls()).not.toContain('commerce.dump'); expect(f.calls()).toContain('full.dump');
  expect(f.calls()).not.toContain('historical-'); expect(f.proof()).not.toContain('sha256_migration=');
});
it('keeps the strict historical preflight for an old compatible source', () => {
  const f=fixture({ BACKUP_MODE:'v1-rehearsal', SOURCE_STATE:'old' }); const r=f.run('backup-drill.sh');
  expect(r.status, r.stdout+r.stderr).toBe(0); expect(f.calls()).toContain('historical-preflight');
  expect(f.calls()).toContain('historical-migration'); expect(f.proof()).toContain('sha256_migration=');
});
it('refuses a V1 rehearsal on an already migrated source before any migration', () => {
  const f=fixture({ BACKUP_MODE:'v1-rehearsal' }); const r=f.run('backup-drill.sh');
  expect(r.status).not.toBe(0); expect(r.stdout).toContain('préflight de production'); expect(f.calls()).not.toContain('historical-migration');
});
for(const failure of ['restore','comparison','schema']) it(`blocks storage after ${failure} failure and invalidates stale proof`, () => {
  const f=fixture({ FAILURE:failure }); mkdirSync(f.env.EVIDENCE_DIR); writeFileSync(join(f.env.EVIDENCE_DIR,'PREUVE.txt'),'restauration_verifiee=true\n');
  const r=f.run('backup-drill.sh'); expect(r.status,r.stdout+r.stderr).not.toBe(0);
  expect(existsSync(join(f.env.EVIDENCE_DIR,'PREUVE.txt'))).toBe(false);
  const stored=f.run('store-backup.sh'); expect(stored.status).not.toBe(0); expect(stored.stdout).toContain('Storage refused'); expect(f.calls()).not.toContain('apikey-only');
});
it('refuses migration evidence from a routine backup before querying production', () => {
  const f=fixture(); expect(f.run('backup-drill.sh').status).toBe(0);
  writeFileSync(f.env.CALLS,''); f.env.DRILL_EVIDENCE_DIR=f.env.EVIDENCE_DIR;
  const r=f.run('migrate.sh'); expect(r.status).not.toBe(0); expect(r.stdout).toContain('un backup courant'); expect(f.calls()).toBe('');
});
for(const key of ['', 'invalid-do-not-log', 'sb_secret_rejected-do-not-log']) it(`rejects ${key?'invalid':'missing'} storage credential without disclosure`, () => {
  const f=fixture(); expect(f.run('backup-drill.sh').status).toBe(0);
  f.env.SUPABASE_SERVICE_ROLE_KEY=key; f.env.REJECT_KEY='true'; const r=f.run('store-backup.sh');
  expect(r.status).not.toBe(0); expect(r.stdout+r.stderr).toContain('SUPABASE_SERVICE_ROLE_KEY');
  if(key) expect(r.stdout+r.stderr).not.toContain(key);
});
it('stores only ciphertext, reads it back, decrypts and records the modern key type', () => {
  const f=fixture(); expect(f.run('backup-drill.sh').status).toBe(0); const r=f.run('store-backup.sh');
  expect(r.status,r.stdout+r.stderr).toBe(0); expect(f.proof()).toContain('type_cle_stockage=sb_secret');
  expect(f.proof()).toContain('relecture_et_dechiffrement=identique'); expect(f.proof()).toContain('retention_jours=30');
  expect(f.calls()).not.toContain('forbidden-bearer'); expect(f.calls()).toContain('apikey-only');
  expect(readFileSync(f.env.UPLOADED).equals(readFileSync(join(f.env.BACKUP_DIR,'full.dump')))).toBe(false);
  expect(f.proof()).not.toContain(f.env.SUPABASE_SERVICE_ROLE_KEY);
});
it('rejects a dump changed after validation', () => {
  const f=fixture(); expect(f.run('backup-drill.sh').status).toBe(0); writeFileSync(join(f.env.BACKUP_DIR,'full.dump'),'changed');
  expect(f.run('store-backup.sh').status).not.toBe(0); expect(f.calls()).not.toContain('apikey-only');
});
it('never accepts a remote or overlapping restore target', () => {
  for(const target of ['postgresql://secret@production.invalid/postgres', 'postgresql://secret@localhost/postgres?host=remote.invalid']) {
    const f=fixture({DRILL_ADMIN_URL:target}); const r=f.run('backup-drill.sh'); expect(r.status).not.toBe(0); expect(r.stdout+r.stderr).not.toContain('secret@'); expect(f.calls()).toBe('');
  }
  const f=fixture({PROD_DB_URL:'postgresql://fixture@localhost:55432/lmp_restore_drill'}); expect(f.run('backup-drill.sh').status).not.toBe(0);
});
it('requires human environment approval before exposing production secrets and serializes runs', () => {
  const w=yaml.load(readFileSync('.github/workflows/production-release.yml','utf8'));
  expect(w.concurrency).toEqual({group:'production-release','cancel-in-progress':false});
  expect(JSON.stringify(w.jobs.verify)).not.toContain('secrets.');
  const verify=w.jobs.verify.steps[0].run;
  expect(verify).toContain('required_reviewers'); expect(verify).toContain('length'); expect(verify).toContain('exit 1');
  expect(verify).toContain('[ "$RELEASE_SHA" = "$WORKFLOW_SHA" ]');
  for(const job of Object.values(w.jobs)) if(JSON.stringify(job).includes('secrets.')) {
    expect(job.environment).toBe('production'); expect(job.needs).toBe('verify');
    expect(job.steps.find(s=>s.uses?.startsWith('actions/checkout')).with.ref).toBe('${{ github.sha }}');
  }
  const steps=w.jobs['backup-drill'].steps; const store=steps.findIndex(s=>s.run==='bash scripts/release/store-backup.sh');
  expect(steps[store].if).toBeUndefined(); expect(steps[store-1].run).toBe('bash scripts/release/backup-drill.sh');
  expect(steps[store].env.REQUIRE_SECRET_KEY).toBe('true');
});
it('executes the verification gate: missing reviewers, unreadable environment and red CI stop before protected jobs', () => {
  const w=yaml.load(readFileSync('.github/workflows/production-release.yml','utf8'));
  for(const protection of ['valid','no-reviewer','unreadable','red-ci']) {
    const f=fixture();
    writeFileSync(join(f.root,'bin','gh'), `#!${process.execPath}
const path=process.argv[3];
if(path.endsWith('/environments/production')) {
 if(process.env.PROTECTION==='unreadable')process.exit(1);
 console.log(JSON.stringify({protection_rules:process.env.PROTECTION==='no-reviewer'?[]:[{type:'required_reviewers',reviewers:[{reviewer:{id:1}}]}]}));
} else if(path.includes('/check-runs'))console.log(JSON.stringify({check_runs:['quality','commerce-postgres','release-rehearsal'].map((name,id)=>({name,id,status:'completed',conclusion:process.env.PROTECTION==='red-ci'?'failure':'success'}))}));
else process.exit(1);
`, { mode:0o755 });
    const r=spawnSync('bash',['-c',w.jobs.verify.steps[0].run],{encoding:'utf8',env:{...f.env,PROTECTION:protection,
      REPO:'fixture/repo',REF:'refs/heads/main',DEFAULT_BRANCH:'main',PHASE:'backup-drill',WORKFLOW_SHA:'a'.repeat(40),RELEASE_SHA:'a'.repeat(40)}});
    if(protection==='valid')expect(r.status,r.stdout+r.stderr).toBe(0);else expect(r.status,r.stdout+r.stderr).not.toBe(0);
  }
});

it('refuses Legacy JWT credentials even outside the workflow', () => {
  const f=fixture({SUPABASE_SERVICE_ROLE_KEY:'eyJfixture.legacy.signature', REQUIRE_SECRET_KEY:'false'});
  expect(f.run('backup-drill.sh').status).toBe(0); const r=f.run('store-backup.sh');
  expect(r.status,r.stdout+r.stderr).not.toBe(0); expect(f.calls()).not.toContain('forbidden-bearer');
  expect(r.stdout).toContain('Legacy JWTs are refused');
});
