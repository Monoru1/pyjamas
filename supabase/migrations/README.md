# Migration history

The original 50 timestamped historical migrations were retrieved from the production migration table on 2026-10-20. Their normalized contents are verified by `node scripts/check-migration-history.mjs` against `docs/remote-migration-inventory.json`.

Legacy numbered files are preserved in `../history/legacy-local/` and must not be executed as pending migrations. No remote history repair was performed. One additional targeted RLS guard was applied after backing up its policy/configuration; the inventory now covers 51 remote versions.

The remote baseline is a marker, not a full initial schema. A fresh Supabase Preview still requires a verified schema baseline/restoration workflow. Do not reset, seed production, or claim empty-database bootstrap is verified.

New migrations are pending production backup, restoration verification and Supabase integration acceptance. See `docs/WORK_2026-10-20.md` for deployment gates and rollback procedure.
