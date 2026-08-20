-- ─────────────────────────────────────────────
-- CENTRAL DE CONHECIMENTO — soft delete (arquivar/recuperar) para
-- categorias (guias), documentos e blocos.
-- Idempotente: seguro rodar de novo.
-- ─────────────────────────────────────────────

ALTER TABLE public.kb_documentos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.kb_categorias ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.kb_blocos     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_kb_documentos_ativos ON public.kb_documentos(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_categorias_ativos  ON public.kb_categorias(ordem) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_blocos_ativos       ON public.kb_blocos(documento_id) WHERE deleted_at IS NULL;
