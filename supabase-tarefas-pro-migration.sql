-- ============================================================
-- PURION OS — MIGRATION: Tarefas Pro (kanban+lista, subtarefas,
-- recorrência, comentários, anexos)
-- Run in: https://supabase.com/dashboard/project/jqvghvttgydptksgpvcc/sql/new
-- ============================================================

-- ── 1. tarefas — novas colunas ────────────────────────────────

ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS start_date      date;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS lembrete_em     timestamptz;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS recorrencia     text DEFAULT 'nenhuma'
  CHECK (recorrencia IN ('nenhuma','diaria','semanal','mensal'));
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS recorrencia_ate date;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS ordem           integer DEFAULT 0;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS estimativa_min  integer;

-- ── 2. subtarefas ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subtarefas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id   uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  concluida   boolean DEFAULT false,
  ordem       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  tenant_id   uuid DEFAULT public.meu_tenant_id()
);

-- ── 3. tarefa_comentarios ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS tarefa_comentarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id   uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  autor       text NOT NULL,
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  tenant_id   uuid DEFAULT public.meu_tenant_id()
);

-- ── 4. tarefa_anexos ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tarefa_anexos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id   uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  url         text NOT NULL,
  tipo        text,
  tamanho_kb  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  tenant_id   uuid DEFAULT public.meu_tenant_id()
);

-- ── 5. Índices ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa_id         ON subtarefas(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_comentarios_tarefa_id ON tarefa_comentarios(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_tarefa_id      ON tarefa_anexos(tarefa_id);

-- ── 6. RLS — mesmo padrão usado em tarefas ────────────────────

ALTER TABLE subtarefas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_anexos      ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE POLICY "authed_subtarefas" ON subtarefas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE POLICY "authed_tarefa_comentarios" ON tarefa_comentarios FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE POLICY "authed_tarefa_anexos" ON tarefa_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- Observação: o bucket de Storage "tarefa-anexos" (público,
-- limite 10MB) já foi criado automaticamente por esta sessão.
-- Não é necessária nenhuma ação manual no Storage.
-- ============================================================
