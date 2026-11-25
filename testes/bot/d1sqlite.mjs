// D1 de verdade para os testes (SQLite do Node): prepare().bind().run/all/first
import { DatabaseSync } from 'node:sqlite';
export function d1() { const db = new DatabaseSync(':memory:');
  const mk = sql => { let a = []; const o = { bind(...x) { a = x.map(v => v === undefined ? null : v); return o; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }, async all() { return { results: db.prepare(sql).all(...a) }; }, async first() { return db.prepare(sql).get(...a) || null; } }; return o; };
  return { prepare: mk, batch: async l => Promise.all(l.map(s => s.run())), _db: db }; }
