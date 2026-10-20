import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const inventory=JSON.parse(readFileSync('docs/remote-migration-inventory.json','utf8'));
const actual=readdirSync('supabase/migrations');
for(const migration of inventory){
 const filename=`${migration.version}_${migration.name}.sql`;
 if(!actual.includes(filename))throw Error('Missing remote migration: '+filename);
 const sql=readFileSync('supabase/migrations/'+filename,'utf8').trim();
 if(createHash('sha256').update(sql).digest('hex')!==migration.sha256)throw Error('SQL differs from remote snapshot: '+filename);
}
const versions=actual.filter(f=>f.endsWith('.sql')).map(f=>f.split('_')[0]);
if(new Set(versions).size!==versions.length)throw Error('Duplicate local migration version');
console.log(`PASS: ${inventory.length} remote versions, names and SQL contents match the 2026-10-20 snapshot; ${versions.length-inventory.length} pending migrations. No remote history write performed.`);
