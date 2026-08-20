-- ─────────────────────────────────────────────
-- CONFIGURACOES — garante tenant_id + chave composta (tenant_id, chave)
-- e RLS por tenant. Corrige o "salvar não persiste" em Financeiro > Configurações:
-- o upsert do app usa onConflict 'tenant_id,chave', então a PK precisa ser essa
-- dupla — se a tabela só tiver PK em (chave), o upsert falha silenciosamente.
-- Idempotente: seguro rodar de novo.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave       text NOT NULL,
  valor       jsonb,
  updated_at  timestamptz DEFAULT now(),
  tenant_id   uuid NOT NULL DEFAULT public.meu_tenant_id()
);

ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.meu_tenant_id();

-- ── Garante que a PK seja (tenant_id, chave), não só (chave) ──
DO $$
DECLARE
  pk_cols text[];
BEGIN
  SELECT array_agg(att.attname ORDER BY att.attname)
  INTO pk_cols
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'configuracoes' AND con.contype = 'p';

  IF pk_cols IS DISTINCT FROM ARRAY['chave','tenant_id'] THEN
    IF pk_cols IS NOT NULL THEN
      EXECUTE (
        SELECT format('ALTER TABLE public.configuracoes DROP CONSTRAINT %I', con.conname)
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'configuracoes' AND con.contype = 'p'
        LIMIT 1
      );
    END IF;
    ALTER TABLE public.configuracoes ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (tenant_id, chave);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant ON public.configuracoes(tenant_id);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- remove policy antiga permissiva (se existir, de setups anteriores)
  DROP POLICY IF EXISTS "authed_configuracoes" ON public.configuracoes;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'tenant_configuracoes') THEN
    CREATE POLICY tenant_configuracoes ON public.configuracoes
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'configuracoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes;
  END IF;
END $$;
