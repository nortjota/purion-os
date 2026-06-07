-- ============================================================
-- PURION OS — MIGRATION: Fix tarefas + daily_async schema
-- Run in: https://supabase.com/dashboard/project/jqvghvttgydptksgpvcc/sql/new
-- ============================================================

-- ── 1. tarefas — add missing columns ─────────────────────────

ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- ── 2. tarefas — fix status CHECK constraint ─────────────────
-- App uses: 'pendente' | 'em_andamento' | 'bloqueada' | 'concluida' | 'cancelada'
-- SQL had:  'aberta'   | 'em_progresso' | 'bloqueada' | 'concluida' | 'cancelada'

ALTER TABLE tarefas DROP CONSTRAINT IF EXISTS tarefas_status_check;
ALTER TABLE tarefas
  ADD CONSTRAINT tarefas_status_check
  CHECK (status IN ('pendente','em_andamento','bloqueada','concluida','cancelada'));

ALTER TABLE tarefas ALTER COLUMN status SET DEFAULT 'pendente';

-- ── 3. tarefas — fix prioridade CHECK constraint ─────────────
-- App uses: 'baixa' | 'media' | 'alta' | 'urgente'
-- SQL had:  'baixa' | 'media' | 'alta' | 'critica'

ALTER TABLE tarefas DROP CONSTRAINT IF EXISTS tarefas_prioridade_check;
ALTER TABLE tarefas
  ADD CONSTRAINT tarefas_prioridade_check
  CHECK (prioridade IN ('baixa','media','alta','urgente'));

-- Fix any existing rows with old status values
UPDATE tarefas SET status     = 'pendente'    WHERE status     = 'aberta';
UPDATE tarefas SET status     = 'em_andamento' WHERE status    = 'em_progresso';
UPDATE tarefas SET prioridade = 'urgente'     WHERE prioridade = 'critica';

-- ── 4. daily_async — rename column + add missing columns ─────
-- Hook uses 'bloqueado_em'; table had 'bloqueado'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_async' AND column_name = 'bloqueado'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_async' AND column_name = 'bloqueado_em'
  ) THEN
    ALTER TABLE daily_async RENAME COLUMN bloqueado TO bloqueado_em;
  END IF;
END $$;

ALTER TABLE daily_async ADD COLUMN IF NOT EXISTS bloqueado_em text DEFAULT '';
ALTER TABLE daily_async ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE daily_async ADD COLUMN IF NOT EXISTS updated_at   timestamptz;

-- ── 5. RLS — make sure tarefas has a policy ──────────────────
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE POLICY "authed_tarefas" ON tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- Done — tarefas and daily_async schema is now in sync with hooks
-- ============================================================
