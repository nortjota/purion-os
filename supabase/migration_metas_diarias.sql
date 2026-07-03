-- ============================================================
-- PURION OS — Metas Diárias
-- Tabelas: metas_diarias + meta_checklist_itens
-- ============================================================

-- ── metas_diarias ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.metas_diarias (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text        NOT NULL,
  tipo          text        NOT NULL DEFAULT 'numerica',
  escopo        text        NOT NULL DEFAULT 'individual',
  responsavel   text,
  categoria     text        NOT NULL DEFAULT 'geral',
  valor_alvo    numeric,
  valor_atual   numeric     NOT NULL DEFAULT 0,
  unidade       text,
  data          date        NOT NULL DEFAULT current_date,
  recorrente    boolean     NOT NULL DEFAULT true,
  concluida     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  tenant_id     uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_metas_tipo   CHECK (tipo   IN ('numerica', 'checklist')),
  CONSTRAINT chk_metas_escopo CHECK (escopo IN ('individual', 'time'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metas_data_responsavel ON public.metas_diarias (data, responsavel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metas_escopo           ON public.metas_diarias (escopo)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metas_tenant           ON public.metas_diarias (tenant_id);

-- RLS
ALTER TABLE public.metas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_metas_diarias" ON public.metas_diarias;
CREATE POLICY "tenant_metas_diarias" ON public.metas_diarias
  USING (tenant_id = public.meu_tenant_id());

-- ── meta_checklist_itens ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_checklist_itens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id    uuid        NOT NULL REFERENCES public.metas_diarias(id) ON DELETE CASCADE,
  texto      text        NOT NULL,
  feito      boolean     NOT NULL DEFAULT false,
  ordem      int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id  uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_checklist_meta_id ON public.meta_checklist_itens (meta_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tenant  ON public.meta_checklist_itens (tenant_id);

ALTER TABLE public.meta_checklist_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_meta_checklist_itens" ON public.meta_checklist_itens;
CREATE POLICY "tenant_meta_checklist_itens" ON public.meta_checklist_itens
  USING (tenant_id = public.meu_tenant_id());

-- ── Realtime ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.metas_diarias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_checklist_itens;
