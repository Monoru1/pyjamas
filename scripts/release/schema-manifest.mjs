// pg_dump emits object blocks in dependency/OID order, not a canonical schema order.
// Keep every SQL byte within each block. Only pg_dump's own version/restrict/footer
// lines outside SQL literals are removed; sort complete blocks, never SQL statements.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const hash = text => createHash('sha256').update(text).digest('hex');
export function schemaManifest(sql) {
  const blocks = []; let name = 'preamble'; let lines = [];
  let dollar = null, quote = null, comment = 0, escapeSingle = false, standardStrings = true;
  const flush = () => {
    const body = lines.join('\n').trim(); let object = name;
    // --no-owner hides owner names in pg_dump headers. DEFAULT ACL blocks for
    // different grantor roles then share the same header, while their SQL still
    // names the role. Preserve and identify each one; never discard a duplicate.
    if (body && name.includes('; Type: DEFAULT ACL;')) {
      const roles = [...body.matchAll(/^ALTER DEFAULT PRIVILEGES FOR ROLE ("(?:[^"]|"")*"|[^\s;]+)/gm)].map(m=>m[1]);
      if (!roles.length || new Set(roles).size !== 1) throw new Error('Ambiguous default ACL role: schema comparison refused');
      object += `; Default ACL role: ${roles[0]}`;
    }
    if (body) blocks.push({ object, sha256: hash(body) }); lines = [];
  };
  for (const line of sql.replace(/\r\n/g, '\n').split('\n')) {
    const outside = !dollar && !quote && !comment;
    if (outside && line === '--') continue;
    if (outside && /^SET standard_conforming_strings = (on|off);$/.test(line)) standardStrings = line.includes('= on;');
    if (outside && (/^\\(?:un)?restrict \S+$/.test(line) || /^-- Dumped (?:from database|by pg_dump) version /.test(line) || line === '-- PostgreSQL database dump complete')) continue;
    if (outside && /^-- Name: .*; Type: .*; Schema: .*; Owner: .*$/.test(line)) { flush(); name = line; }
    lines.push(line);
    // Lex SQL enough to distinguish dump metadata from literal function bodies/comments.
    for (let i = 0; i < line.length; i++) {
      const ch=line[i], next=line[i+1];
      if (dollar) { if (line.startsWith(dollar,i)) { i += dollar.length-1; dollar=null; } continue; }
      if (quote) { if(ch==='\\' && quote==="'" && escapeSingle) { i++; continue; } if(ch===quote) { if(next===quote)i++;else quote=null; } continue; }
      if (comment) { if(ch==='/'&&next==='*'){comment++;i++;}else if(ch==='*'&&next==='/'){comment--;i++;} continue; }
      if(ch==='-'&&next==='-')break;
      if(ch==='/'&&next==='*'){comment++;i++;continue;}
      if(ch==='\''||ch==='"'){quote=ch;escapeSingle=!standardStrings || (i>0 && /[eE]/.test(line[i-1]) && (i<2 || !/[A-Za-z0-9_$]/.test(line[i-2])));continue;}
      if(ch==='$'){const match=line.slice(i).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/);if(match){dollar=match[0];i+=dollar.length-1;}}
    }
  }
  if(dollar||quote||comment)throw new Error('Unterminated SQL literal or comment: schema comparison refused');
  flush();
  // Duplicate object labels would make a name-based diagnostic ambiguous: fail closed.
  if(new Set(blocks.map(b=>b.object)).size!==blocks.length)throw new Error('Duplicate dump object label: schema comparison refused');
  return blocks.sort((a,b)=>a.object < b.object ? -1 : a.object > b.object ? 1 : 0);
}
export function schemaDifferences(left,right) {
  const a=new Map(left.map(x=>[x.object,x.sha256])),b=new Map(right.map(x=>[x.object,x.sha256]));
  return [...new Set([...a.keys(),...b.keys()])].sort().filter(k=>a.get(k)!==b.get(k)).map(object=>({object,source:a.get(object)??null,restored:b.get(object)??null}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [input,output]=process.argv.slice(2); const manifest=schemaManifest(readFileSync(input,'utf8'));
    if(output)writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
    process.stdout.write(hash(JSON.stringify(manifest))+'\n');
  } catch (error) {
    const known=['Unterminated SQL literal or comment: schema comparison refused','Duplicate dump object label: schema comparison refused','Ambiguous default ACL role: schema comparison refused'];
    const reason=error instanceof Error && known.includes(error.message)?error.message:'Input/output failure';
    console.error(`Schema manifest generation failed: ${reason}; raw SQL remains private.`);process.exitCode=1;
  }
}
