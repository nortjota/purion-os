-- ─────────────────────────────────────────────
-- APORTES DOS SÓCIOS — quanto cada sócio colocou do próprio bolso na empresa.
-- Fica separado de public.financeiro (receitas/despesas) de propósito:
-- é aporte de capital, não faturamento — não deve entrar em métricas
-- de receita/ticket médio/margem/ROAS.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aportes_socios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  socio       text NOT NULL,
  valor       numeric NOT NULL,
  data        date NOT NULL,
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  tenant_id   uuid NOT NULL DEFAULT public.meu_tenant_id()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aportes_socios_socio_check'
  ) THEN
    ALTER TABLE public.aportes_socios
      ADD CONSTRAINT aportes_socios_socio_check
      CHECK (socio IN ('matheus','joao','gabriel'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aportes_socios_tenant ON public.aportes_socios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aportes_socios_ativos ON public.aportes_socios(socio) WHERE deleted_at IS NULL;

ALTER TABLE public.aportes_socios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'aportes_socios' AND policyname = 'tenant_aportes_socios') THEN
    CREATE POLICY tenant_aportes_socios ON public.aportes_socios
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'aportes_socios') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aportes_socios;
  END IF;
END $$;
