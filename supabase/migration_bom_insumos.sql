-- ─────────────────────────────────────────────
-- ESTOQUE RIGOROSO E INTERLIGADO — catálogo de insumos,
-- receita (BOM) de 1 frasco, e livro-razão de movimentações de insumo.
-- ─────────────────────────────────────────────
-- Idempotente (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- estoque_produto, estoque_movimentacoes e lotes_producao já existem em produção.

-- ── insumos: catálogo (líquidos, embalagem do produto, embalagem de envio, etiquetas) ──
CREATE TABLE IF NOT EXISTS public.insumos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text NOT NULL,
  categoria          text NOT NULL,
  unidade            text NOT NULL DEFAULT 'un',
  quantidade_atual   numeric NOT NULL DEFAULT 0,
  quantidade_minima  numeric NOT NULL DEFAULT 0,
  custo_unitario     numeric NOT NULL DEFAULT 0,
  fornecedor         text,
  notas              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  tenant_id          uuid NOT NULL DEFAULT public.meu_tenant_id()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insumos_categoria_check'
  ) THEN
    ALTER TABLE public.insumos
      ADD CONSTRAINT insumos_categoria_check
      CHECK (categoria IN ('liquido','embalagem_produto','embalagem_envio','etiqueta'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_insumos_tenant ON public.insumos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insumos_ativos ON public.insumos(categoria) WHERE deleted_at IS NULL;

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insumos' AND policyname = 'tenant_insumos') THEN
    CREATE POLICY tenant_insumos ON public.insumos
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'insumos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insumos;
  END IF;
END $$;

-- ── bom_receita: composição de 1 frasco PURION ──
CREATE TABLE IF NOT EXISTS public.bom_receita (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id              uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  quantidade_por_unidade numeric NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  tenant_id              uuid NOT NULL DEFAULT public.meu_tenant_id(),
  UNIQUE (insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_receita_tenant ON public.bom_receita(tenant_id);

ALTER TABLE public.bom_receita ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bom_receita' AND policyname = 'tenant_bom_receita') THEN
    CREATE POLICY tenant_bom_receita ON public.bom_receita
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bom_receita') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bom_receita;
  END IF;
END $$;

-- ── insumo_movimentacoes: livro-razão (compra / produção / ajuste) ──
-- quantidade é o DELTA assinado (positivo = entrou, negativo = saiu).
CREATE TABLE IF NOT EXISTS public.insumo_movimentacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id    uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  tipo         text NOT NULL,
  quantidade   numeric NOT NULL,
  saldo_apos   numeric NOT NULL,
  motivo       text,
  origem_tipo  text,
  origem_id    uuid,
  autor        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid NOT NULL DEFAULT public.meu_tenant_id()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insumo_movimentacoes_tipo_check'
  ) THEN
    ALTER TABLE public.insumo_movimentacoes
      ADD CONSTRAINT insumo_movimentacoes_tipo_check
      CHECK (tipo IN ('compra','producao','ajuste'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_insumo_movimentacoes_insumo ON public.insumo_movimentacoes(insumo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insumo_movimentacoes_origem ON public.insumo_movimentacoes(origem_tipo, origem_id);

ALTER TABLE public.insumo_movimentacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insumo_movimentacoes' AND policyname = 'tenant_insumo_movimentacoes') THEN
    CREATE POLICY tenant_insumo_movimentacoes ON public.insumo_movimentacoes
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'insumo_movimentacoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insumo_movimentacoes;
  END IF;
END $$;

-- ── lotes_producao: custo real da produção (N × custo da receita no momento) ──
ALTER TABLE public.lotes_producao
  ADD COLUMN IF NOT EXISTS custo_producao numeric;
