-- ============================================================
-- PURION OS — Central de Conhecimento + Contas & Acessos
-- PARTE 1: ESTRUTURA (tabelas, índices, RLS)
-- ============================================================

-- ── kb_categorias ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_categorias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  icone       text NOT NULL DEFAULT 'BookOpen',
  cor         text NOT NULL DEFAULT '#C9A84C',
  ordem       integer DEFAULT 0,
  tenant_id   uuid DEFAULT public.meu_tenant_id()
);

-- ── kb_documentos ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_documentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id   uuid REFERENCES kb_categorias(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  emoji          text DEFAULT '📄',
  resumo         text DEFAULT '',
  ordem          integer DEFAULT 0,
  favorito       boolean DEFAULT false,
  atualizado_por text,
  updated_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz,
  tenant_id      uuid DEFAULT public.meu_tenant_id()
);

-- ── kb_blocos ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_blocos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES kb_documentos(id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('titulo','subtitulo','paragrafo','lista','checklist','citacao','divisor','tabela','callout','codigo')),
  conteudo     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordem        integer DEFAULT 0,
  tenant_id    uuid DEFAULT public.meu_tenant_id()
);

-- ── contas_acessos ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contas_acessos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma    text NOT NULL,
  categoria     text NOT NULL CHECK (categoria IN ('ads','pagamento','social','infra','banco','legal')),
  identificador text DEFAULT '',
  url           text DEFAULT '',
  responsavel   text,
  status        text NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo','pendente','inativo')),
  observacoes   text DEFAULT '',
  vault_ref     text DEFAULT '',
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz,
  tenant_id     uuid DEFAULT public.meu_tenant_id()
);

-- ── Índices ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kb_documentos_categoria_id ON kb_documentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_kb_blocos_documento_id     ON kb_blocos(documento_id);
CREATE INDEX IF NOT EXISTS idx_kb_documentos_favorito     ON kb_documentos(favorito);

-- ── RLS — mesmo padrão usado em tarefas/subtarefas ────────────

ALTER TABLE kb_categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_blocos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_acessos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE POLICY "authed_kb_categorias" ON kb_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE POLICY "authed_kb_documentos" ON kb_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE POLICY "authed_kb_blocos" ON kb_blocos FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'CREATE POLICY "authed_contas_acessos" ON contas_acessos FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
