-- ============================================================
-- PURION OS — Produção & Estoque estilo Asana
-- 1) Novos estágios de lote (planejado/em_producao/controle_qualidade/concluido)
-- 2) Tabela estoque_insumos (matéria-prima: essência, frascos, tampas, rótulos, caixas...)
-- Idempotente: pode ser executado múltiplas vezes com segurança.
-- ============================================================

-- ── 1) lotes_producao — novo CHECK de status (mantém valores antigos) ──────
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'lotes_producao'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE lotes_producao DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.lotes_producao
  ADD CONSTRAINT lotes_producao_status_check
  CHECK (status IN (
    'planejado', 'em_producao', 'controle_qualidade', 'concluido', 'reprovado',
    'aprovado', 'estoque'
  ));

-- ── 2) estoque_insumos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estoque_insumos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text        NOT NULL,
  tipo                  text        NOT NULL DEFAULT 'outro',
  fornecedor            text        NOT NULL DEFAULT '',
  quantidade_atual      numeric     NOT NULL DEFAULT 0,
  unidade               text        NOT NULL DEFAULT 'un',
  quantidade_minima     numeric     NOT NULL DEFAULT 0,
  custo_unitario        numeric     NOT NULL DEFAULT 0,
  rendimento_por_frasco numeric     NOT NULL DEFAULT 1,
  ultima_entrada        date,
  notas                 text        NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  tenant_id             uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_estoque_insumos_tipo CHECK (tipo IN (
    'essencia', 'alcool', 'embalagem', 'frasco', 'tampa', 'rotulo', 'caixa', 'outro'
  ))
);

CREATE INDEX IF NOT EXISTS idx_estoque_insumos_tenant ON public.estoque_insumos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_estoque_insumos_ativos ON public.estoque_insumos (tipo) WHERE deleted_at IS NULL;

ALTER TABLE public.estoque_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_estoque_insumos" ON public.estoque_insumos;
CREATE POLICY "tenant_estoque_insumos" ON public.estoque_insumos
  USING (tenant_id = public.meu_tenant_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_insumos;
