-- ============================================================
-- PURION OS — Quadros (Canvas colaborativo tipo Miro)
-- Tabelas: quadros + quadro_nos + quadro_conexoes
-- ============================================================

-- ── quadros ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quadros (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        NOT NULL,
  descricao   text,
  emoji       text        NOT NULL DEFAULT '🧠',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_quadros_tenant ON public.quadros (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE public.quadros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_quadros" ON public.quadros;
CREATE POLICY "tenant_quadros" ON public.quadros
  USING (tenant_id = public.meu_tenant_id());

-- ── quadro_nos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quadro_nos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id   uuid        NOT NULL REFERENCES public.quadros(id) ON DELETE CASCADE,
  tipo        text        NOT NULL DEFAULT 'postit',
  conteudo    text        NOT NULL DEFAULT '',
  pos_x       numeric     NOT NULL DEFAULT 0,
  pos_y       numeric     NOT NULL DEFAULT 0,
  largura     numeric     NOT NULL DEFAULT 200,
  altura      numeric     NOT NULL DEFAULT 120,
  cor         text        NOT NULL DEFAULT '#C9A84C',
  autor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_no_tipo CHECK (tipo IN ('postit', 'caixa', 'texto', 'imagem'))
);

CREATE INDEX IF NOT EXISTS idx_nos_quadro_id ON public.quadro_nos (quadro_id);
CREATE INDEX IF NOT EXISTS idx_nos_tenant    ON public.quadro_nos (tenant_id);

ALTER TABLE public.quadro_nos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_quadro_nos" ON public.quadro_nos;
CREATE POLICY "tenant_quadro_nos" ON public.quadro_nos
  USING (tenant_id = public.meu_tenant_id());

-- ── quadro_conexoes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quadro_conexoes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id   uuid        NOT NULL REFERENCES public.quadros(id) ON DELETE CASCADE,
  origem_id   uuid        NOT NULL REFERENCES public.quadro_nos(id) ON DELETE CASCADE,
  destino_id  uuid        NOT NULL REFERENCES public.quadro_nos(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT '',
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_conexoes_quadro_id ON public.quadro_conexoes (quadro_id);
CREATE INDEX IF NOT EXISTS idx_conexoes_tenant    ON public.quadro_conexoes (tenant_id);

ALTER TABLE public.quadro_conexoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_quadro_conexoes" ON public.quadro_conexoes;
CREATE POLICY "tenant_quadro_conexoes" ON public.quadro_conexoes
  USING (tenant_id = public.meu_tenant_id());

-- ── Realtime ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.quadros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quadro_nos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quadro_conexoes;
