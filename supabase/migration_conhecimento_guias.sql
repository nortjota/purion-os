-- ═══════════════════════════════════════════════════════════════════════════
-- Central de Conhecimento — guias práticos (mensagens prontas e dados da empresa)
-- O conteúdo padrão vive no código; aqui ficam só as edições e os modelos novos
-- da equipe (por slug). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.kb_guias (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL,
  tipo        text        NOT NULL,              -- modelo | fato
  dados       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  oculto      boolean     NOT NULL DEFAULT false,
  usos        int         NOT NULL DEFAULT 0,     -- quantas vezes foi copiado (ordena os mais usados)
  autor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_kb_guias_tipo CHECK (tipo IN ('modelo', 'fato')),
  CONSTRAINT uq_kb_guias_slug UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_kb_guias_tenant ON public.kb_guias (tenant_id);

ALTER TABLE public.kb_guias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_kb_guias" ON public.kb_guias;
CREATE POLICY "tenant_kb_guias" ON public.kb_guias
  USING (tenant_id = public.meu_tenant_id())
  WITH CHECK (tenant_id = public.meu_tenant_id());

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sou_logistica') THEN
    DROP POLICY IF EXISTS "logistica_bloqueio" ON public.kb_guias;
    CREATE POLICY "logistica_bloqueio" ON public.kb_guias AS RESTRICTIVE FOR ALL TO authenticated
      USING (NOT public.sou_logistica()) WITH CHECK (NOT public.sou_logistica());
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_guias;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Os documentos antigos da Central (Plano de Lançamento, Brand Book, Playbooks…)
-- vão para a lixeira (soft delete, recuperável). Pedido dos sócios: a Central passa
-- a ter só guias práticos.
UPDATE public.kb_documentos SET deleted_at = now() WHERE deleted_at IS NULL;
UPDATE public.kb_categorias SET deleted_at = now() WHERE deleted_at IS NULL;
UPDATE public.kb_blocos     SET deleted_at = now() WHERE deleted_at IS NULL;
