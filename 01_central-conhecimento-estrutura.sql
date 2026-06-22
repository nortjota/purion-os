-- ============================================================
-- PURION OS — CENTRALIZAÇÃO TOTAL · PARTE 1: ESTRUTURA
-- Cria: Central de Conhecimento (wiki), Contas & Acessos
-- Seguro: IF NOT EXISTS, não apaga nada.
-- ============================================================

-- ─────────────────────────────────────────────
-- A) CENTRAL DE CONHECIMENTO (estilo Notion)
-- ─────────────────────────────────────────────

-- Categorias da wiki (Estratégia, Marca, Marketing, Operações, B2B...)
CREATE TABLE IF NOT EXISTS public.kb_categorias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  icone       text DEFAULT 'BookOpen',   -- nome do ícone lucide-react
  cor         text DEFAULT '#C9A84C',
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid DEFAULT public.meu_tenant_id()
);

-- Documentos (cada página da wiki)
CREATE TABLE IF NOT EXISTS public.kb_documentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES public.kb_categorias(id) ON DELETE SET NULL,
  titulo       text NOT NULL,
  emoji        text DEFAULT '📄',
  resumo       text DEFAULT '',
  ordem        integer NOT NULL DEFAULT 0,
  favorito     boolean NOT NULL DEFAULT false,
  atualizado_por text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  tenant_id    uuid DEFAULT public.meu_tenant_id()
);

-- Blocos de conteúdo (estilo Notion: cada bloco é uma linha ordenada)
CREATE TABLE IF NOT EXISTS public.kb_blocos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.kb_documentos(id) ON DELETE CASCADE,
  tipo         text NOT NULL DEFAULT 'paragrafo',
  -- tipos: titulo, subtitulo, paragrafo, lista, checklist, citacao, divisor, tabela, callout, codigo
  conteudo     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- texto + metadados (ex: itens de lista, linhas de tabela)
  ordem        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid DEFAULT public.meu_tenant_id()
);

-- ─────────────────────────────────────────────
-- B) CONTAS & ACESSOS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contas_acessos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma   text NOT NULL,            -- Meta Ads, TikTok, Appmax, Domínio...
  categoria    text DEFAULT 'outro',     -- ads, pagamento, social, infra, banco, legal
  identificador text DEFAULT '',         -- login/email/usuário (NÃO senha)
  url          text DEFAULT '',
  responsavel  text DEFAULT '',          -- joao, gabriel, matheus
  status       text DEFAULT 'ativo',     -- ativo, pendente, inativo
  observacoes  text DEFAULT '',
  vault_ref    text DEFAULT '',          -- referência onde a senha está guardada (ex: "1Password / Bitwarden")
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  tenant_id    uuid DEFAULT public.meu_tenant_id()
);

-- ─────────────────────────────────────────────
-- C) RLS MULTI-TENANT
-- ─────────────────────────────────────────────
ALTER TABLE public.kb_categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_documentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_blocos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_kb_categorias" ON public.kb_categorias;
CREATE POLICY "tenant_kb_categorias" ON public.kb_categorias FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

DROP POLICY IF EXISTS "tenant_kb_documentos" ON public.kb_documentos;
CREATE POLICY "tenant_kb_documentos" ON public.kb_documentos FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

DROP POLICY IF EXISTS "tenant_kb_blocos" ON public.kb_blocos;
CREATE POLICY "tenant_kb_blocos" ON public.kb_blocos FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

DROP POLICY IF EXISTS "tenant_contas_acessos" ON public.contas_acessos;
CREATE POLICY "tenant_contas_acessos" ON public.contas_acessos FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

-- ─────────────────────────────────────────────
-- D) ÍNDICES + REALTIME
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kb_doc_categoria ON public.kb_documentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_kb_blocos_doc    ON public.kb_blocos(documento_id);

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_categorias';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_documentos';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_blocos';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_acessos';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

SELECT 'estrutura criada' as status;
