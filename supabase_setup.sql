-- Execute esse SQL no Supabase SQL Editor
-- Menu esquerdo > SQL Editor > New query

CREATE TABLE IF NOT EXISTS hr_sync (
  codigo TEXT PRIMARY KEY,
  dados TEXT NOT NULL,
  ts BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permite acesso público (anon key)
ALTER TABLE hr_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON hr_sync
  FOR ALL USING (true) WITH CHECK (true);
