-- ─────────────────────────────────────────────
-- SISTEMA DE GESTÃO G4 — peso/prioridade nas metas,
-- medição mensal colorida e RMR (Reunião Mensal de Resultados)
-- ─────────────────────────────────────────────
-- Idempotente (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
-- estrategia_objetivos e estrategia_resultados já existem em produção.

-- ── estrategia_objetivos: peso (%) e prioridade P1/P2/P3 ──
ALTER TABLE public.estrategia_objetivos
  ADD COLUMN IF NOT EXISTS peso        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prioridade  text    NOT NULL DEFAULT 'P2';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estrategia_objetivos_prioridade_check'
  ) THEN
    ALTER TABLE public.estrategia_objetivos
      ADD CONSTRAINT estrategia_objetivos_prioridade_check
      CHECK (prioridade IN ('P1','P2','P3'));
  END IF;
END $$;

-- ── meta_medicoes_mensais: régua mês a mês de cada meta ──
CREATE TABLE IF NOT EXISTS public.meta_medicoes_mensais (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id      uuid NOT NULL REFERENCES public.estrategia_objetivos(id) ON DELETE CASCADE,
  ano              int  NOT NULL,
  mes              int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_meta       numeric,
  valor_realizado  numeric,
  observacao       text,
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  tenant_id        uuid NOT NULL DEFAULT public.meu_tenant_id(),
  UNIQUE (objetivo_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_meta_medicoes_objetivo ON public.meta_medicoes_mensais(objetivo_id, ano, mes);

ALTER TABLE public.meta_medicoes_mensais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'meta_medicoes_mensais' AND policyname = 'tenant_meta_medicoes_mensais'
  ) THEN
    CREATE POLICY tenant_meta_medicoes_mensais ON public.meta_medicoes_mensais
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'meta_medicoes_mensais'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_medicoes_mensais;
  END IF;
END $$;

-- ── rmr_reunioes: uma reunião mensal de resultados por mês/tenant ──
CREATE TABLE IF NOT EXISTS public.rmr_reunioes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                int  NOT NULL,
  mes                int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  resumo             text,
  gargalo_principal  text,
  decisao            text,
  percentual_geral   numeric,
  concluida          boolean NOT NULL DEFAULT false,
  concluida_em       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  tenant_id          uuid NOT NULL DEFAULT public.meu_tenant_id(),
  UNIQUE (tenant_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_rmr_reunioes_ano_mes ON public.rmr_reunioes(ano, mes);

ALTER TABLE public.rmr_reunioes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rmr_reunioes' AND policyname = 'tenant_rmr_reunioes'
  ) THEN
    CREATE POLICY tenant_rmr_reunioes ON public.rmr_reunioes
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rmr_reunioes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rmr_reunioes;
  END IF;
END $$;
