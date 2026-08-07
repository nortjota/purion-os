-- ============================================================
-- PURION OS — Editor de blocos estilo Notion para a aba Estratégias
-- Tabela: estrategia_blocos (espelha kb_blocos, ligada por "secao")
-- ============================================================

CREATE TABLE IF NOT EXISTS public.estrategia_blocos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  secao       text        NOT NULL,
  tipo        text        NOT NULL DEFAULT 'paragrafo',
  conteudo    jsonb       NOT NULL DEFAULT '{}',
  ordem       int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_estrategia_bloco_secao CHECK (
    secao IN ('visao_geral', 'b2b', 'social', 'growth', 'icp', 'decisoes', 'geral')
  ),
  CONSTRAINT chk_estrategia_bloco_tipo CHECK (
    tipo IN ('titulo', 'subtitulo', 'paragrafo', 'lista', 'checklist', 'citacao', 'divisor', 'tabela', 'callout', 'codigo', 'toggle')
  )
);

CREATE INDEX IF NOT EXISTS idx_estrategia_blocos_secao  ON public.estrategia_blocos (secao);
CREATE INDEX IF NOT EXISTS idx_estrategia_blocos_tenant ON public.estrategia_blocos (tenant_id);

ALTER TABLE public.estrategia_blocos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_estrategia_blocos" ON public.estrategia_blocos;
CREATE POLICY "tenant_estrategia_blocos" ON public.estrategia_blocos
  USING (tenant_id = public.meu_tenant_id());

-- ── Realtime ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.estrategia_blocos;
