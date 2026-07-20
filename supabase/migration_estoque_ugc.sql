-- ============================================================
-- PURION OS — Estoque de Produto Pronto + UGC + Vendas flags
-- ============================================================

-- ── 1. Novos campos em vendas ────────────────────────────────
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS estoque_baixado    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financeiro_lancado boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origem_venda       text,
  ADD COLUMN IF NOT EXISTS cupom              text,
  ADD COLUMN IF NOT EXISTS tipo_cliente       text        NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS nota_fiscal        text;

-- ── 2. estoque_produto (frascos prontos para venda) ──────────
CREATE TABLE IF NOT EXISTS public.estoque_produto (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto          text        NOT NULL DEFAULT 'PURION GT 60ml',
  quantidade_atual int         NOT NULL DEFAULT 0,
  quantidade_minima int        NOT NULL DEFAULT 20,
  custo_unitario   numeric     NOT NULL DEFAULT 23.99,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  tenant_id        uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_tenant ON public.estoque_produto (tenant_id);

ALTER TABLE public.estoque_produto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_estoque_produto" ON public.estoque_produto;
CREATE POLICY "tenant_estoque_produto" ON public.estoque_produto
  USING (tenant_id = public.meu_tenant_id());

-- Registro inicial (ajuste quantidade_atual manualmente conforme seu estoque real)
INSERT INTO public.estoque_produto (produto, quantidade_atual, quantidade_minima, custo_unitario)
SELECT 'PURION GT 60ml', 0, 20, 23.99
WHERE NOT EXISTS (SELECT 1 FROM public.estoque_produto LIMIT 1);

-- ── 3. estoque_movimentacoes (livro-razão de todas as movimentações) ──
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text        NOT NULL,
  quantidade  int         NOT NULL,
  motivo      text,
  origem_tipo text,
  origem_id   uuid,
  saldo_apos  int         NOT NULL,
  autor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_mov_tipo CHECK (tipo IN ('entrada', 'saida_venda', 'saida_ugc', 'ajuste', 'perda'))
);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_tenant    ON public.estoque_movimentacoes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_created   ON public.estoque_movimentacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo      ON public.estoque_movimentacoes (tipo);

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "tenant_estoque_movimentacoes" ON public.estoque_movimentacoes
  USING (tenant_id = public.meu_tenant_id());

-- ── 4. doacoes_ugc ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doacoes_ugc (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          uuid        REFERENCES public.creators(id) ON DELETE SET NULL,
  quantidade          int         NOT NULL DEFAULT 1,
  data_envio          timestamptz NOT NULL DEFAULT now(),
  status_envio        text        NOT NULL DEFAULT 'aguardando',
  codigo_rastreio     text,
  custo_total         numeric,
  contrapartida       text,
  entregue_conteudo   boolean     NOT NULL DEFAULT false,
  estoque_baixado     boolean     NOT NULL DEFAULT false,
  financeiro_lancado  boolean     NOT NULL DEFAULT false,
  observacoes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  tenant_id           uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_ugc_status CHECK (status_envio IN ('aguardando', 'postado', 'entregue'))
);

CREATE INDEX IF NOT EXISTS idx_doacoes_ugc_tenant     ON public.doacoes_ugc (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doacoes_ugc_creator    ON public.doacoes_ugc (creator_id);

ALTER TABLE public.doacoes_ugc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_doacoes_ugc" ON public.doacoes_ugc;
CREATE POLICY "tenant_doacoes_ugc" ON public.doacoes_ugc
  USING (tenant_id = public.meu_tenant_id());

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_produto;
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doacoes_ugc;
