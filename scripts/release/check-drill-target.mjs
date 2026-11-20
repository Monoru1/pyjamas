// Reject remote restore targets and every alias of the source's database on loopback.
// Never include connection strings or parser exceptions in diagnostics.
try {
  const target = new URL(process.env.DRILL_ADMIN_URL);
  const source = new URL(process.env.PROD_DB_URL);
  const local = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !local.has(target.hostname)
    || target.search || target.hash
    || (local.has(source.hostname) && (source.port || '5432') === (target.port || '5432')
      && decodeURIComponent(source.pathname) === '/lmp_restore_drill')) throw new Error();
} catch {
  console.error('DRILL_ADMIN_URL must target a disposable loopback server, separate from the source database.');
  process.exitCode = 1;
}
