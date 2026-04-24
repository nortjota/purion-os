-- =============================================
-- SISTEMA DE AFILIADOS PURION
-- Rodar no SQL Editor do Supabase (pode ser executado mais de uma vez com segurança)
-- Pré-requisito: supabase-setup.sql já deve ter sido executado (tabelas tenants e perfis)
-- =============================================

-- ── AFILIADOS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliados (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id),
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL,
  whatsapp         TEXT,
  instagram        TEXT,
  tiktok           TEXT,
  youtube          TEXT,
  seguidores_total INT DEFAULT 0,
  nicho            TEXT,
  -- Código único de rastreamento (ex: PURION-MARI)
  codigo           TEXT UNIQUE NOT NULL,
  -- Link gerado automaticamente a partir do código
  link_afiliado    TEXT GENERATED ALWAYS AS (
    'https://puriongt.com.br?ref=' || codigo
  ) STORED,
  -- Comissão
  tipo_comissao    TEXT DEFAULT 'percentual' CHECK (tipo_comissao IN ('percentual','fixo')),
  valor_comissao   NUMERIC(5,2) DEFAULT 10.00,
  -- Desconto que o afiliado pode oferecer ao cliente
  desconto_cliente NUMERIC(5,2) DEFAULT 0,
  tipo_desconto    TEXT DEFAULT 'percentual' CHECK (tipo_desconto IN ('percentual','fixo')),
  -- Status
  status           TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','pausado','pendente','bloqueado')),
  -- Dados bancários
  pix_chave        TEXT,
  pix_tipo         TEXT CHECK (pix_tipo IN ('cpf','cnpj','email','telefone','aleatoria')),
  banco_nome       TEXT,
  banco_agencia    TEXT,
  banco_conta      TEXT,
  -- Contrato
  data_inicio      DATE DEFAULT CURRENT_DATE,
  data_fim         DATE,
  notas            TEXT,
  criado_por       UUID REFERENCES perfis(id),
  criado_em        TIMESTAMPTZ DEFAULT now(),
  atualizado_em    TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- ── CLIQUES ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliado_cliques (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id  UUID NOT NULL REFERENCES afiliados(id),
  tenant_id    UUID REFERENCES tenants(id),
  ip_hash      TEXT,        -- hash do IP (não armazena dado pessoal bruto)
  user_agent   TEXT,
  referrer     TEXT,        -- origem: TikTok, Instagram, etc.
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  converteu    BOOLEAN DEFAULT false,  -- true se gerou compra
  criado_em    TIMESTAMPTZ DEFAULT now()
);

-- ── VENDAS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliado_vendas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         UUID NOT NULL REFERENCES afiliados(id),
  tenant_id           UUID REFERENCES tenants(id),
  -- Pedido
  pedido_id           TEXT NOT NULL,   -- ID na Nuvemshop
  pedido_ref          TEXT,            -- número legível
  -- Cliente (parcialmente anonimizado)
  cliente_nome        TEXT,
  cliente_email       TEXT,
  -- Valores
  valor_bruto         NUMERIC(10,2) NOT NULL,
  desconto_aplicado   NUMERIC(10,2) DEFAULT 0,
  valor_liquido       NUMERIC(10,2) NOT NULL,
  -- Comissão
  comissao_percentual NUMERIC(5,2),
  comissao_valor      NUMERIC(10,2) NOT NULL,
  -- Produtos comprados [{nome, sku, quantidade, valor}]
  produtos            JSONB,
  -- Status
  status_venda        TEXT DEFAULT 'confirmada' CHECK (status_venda IN ('pendente','confirmada','cancelada','devolvida')),
  status_comissao     TEXT DEFAULT 'pendente'   CHECK (status_comissao IN ('pendente','aprovada','paga','cancelada')),
  -- Rastreamento
  clique_id           UUID REFERENCES afiliado_cliques(id),
  origem              TEXT,  -- 'link' | 'codigo_cupom' | 'manual'
  -- Datas
  data_venda          TIMESTAMPTZ DEFAULT now(),
  data_aprovacao      TIMESTAMPTZ,
  data_pagamento      TIMESTAMPTZ,
  -- Auditoria
  aprovado_por        UUID REFERENCES perfis(id),
  pago_por            UUID REFERENCES perfis(id),
  notas               TEXT,
  criado_em           TIMESTAMPTZ DEFAULT now()
);

-- ── PAGAMENTOS DE COMISSÃO ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliado_pagamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id     UUID NOT NULL REFERENCES afiliados(id),
  tenant_id       UUID REFERENCES tenants(id),
  -- Vendas incluídas neste lote de pagamento
  vendas_ids      UUID[],   -- array de afiliado_vendas.id (FK implícita — PostgreSQL não suporta FK em arrays)
  -- Valor
  valor_total     NUMERIC(10,2) NOT NULL,
  -- Pagamento
  metodo          TEXT CHECK (metodo IN ('pix','transferencia','outro')),
  chave_pix       TEXT,
  comprovante_url TEXT,     -- URL no Supabase Storage
  -- Status
  status          TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','processando','pago','cancelado')),
  -- Período de referência
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  -- Datas e auditoria
  data_pagamento  TIMESTAMPTZ,
  criado_por      UUID REFERENCES perfis(id),
  criado_em       TIMESTAMPTZ DEFAULT now(),
  notas           TEXT
);

-- ── MATERIAIS DE DIVULGAÇÃO ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliado_materiais (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  titulo      TEXT NOT NULL,
  tipo        TEXT CHECK (tipo IN ('imagem','video','texto','link')),
  url         TEXT,
  descricao   TEXT,
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

-- ── METAS (gamificação) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afiliado_metas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         UUID NOT NULL REFERENCES afiliados(id),
  tenant_id           UUID REFERENCES tenants(id),
  periodo_inicio      DATE NOT NULL,
  periodo_fim         DATE NOT NULL,
  meta_vendas_valor   NUMERIC(10,2),
  meta_vendas_qtd     INT,
  meta_cliques        INT,
  bonus_valor         NUMERIC(10,2),
  atingida            BOOLEAN DEFAULT false,
  criado_em           TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_afiliados_codigo     ON afiliados(codigo);
CREATE INDEX IF NOT EXISTS idx_afiliados_status     ON afiliados(status);
CREATE INDEX IF NOT EXISTS idx_afiliados_tenant     ON afiliados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cliques_afiliado     ON afiliado_cliques(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_cliques_data         ON afiliado_cliques(criado_em);
CREATE INDEX IF NOT EXISTS idx_vendas_afiliado      ON afiliado_vendas(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data          ON afiliado_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status        ON afiliado_vendas(status_comissao);
CREATE INDEX IF NOT EXISTS idx_pagamentos_afiliado  ON afiliado_pagamentos(afiliado_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE afiliados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliado_cliques    ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliado_vendas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliado_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliado_materiais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliado_metas      ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário acessa apenas dados do seu tenant
-- DROP garante idempotência (re-execução segura)
DROP POLICY IF EXISTS "tenant_afiliados"    ON afiliados;
DROP POLICY IF EXISTS "tenant_cliques"      ON afiliado_cliques;
DROP POLICY IF EXISTS "tenant_vendas"       ON afiliado_vendas;
DROP POLICY IF EXISTS "tenant_pagamentos"   ON afiliado_pagamentos;
DROP POLICY IF EXISTS "tenant_materiais"    ON afiliado_materiais;
DROP POLICY IF EXISTS "tenant_metas"        ON afiliado_metas;

CREATE POLICY "tenant_afiliados" ON afiliados
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "tenant_cliques" ON afiliado_cliques
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "tenant_vendas" ON afiliado_vendas
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "tenant_pagamentos" ON afiliado_pagamentos
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "tenant_materiais" ON afiliado_materiais
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

CREATE POLICY "tenant_metas" ON afiliado_metas
  USING (tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid()));

-- =============================================
-- FUNÇÃO: gerar código único de afiliado
-- Uso: SELECT gerar_codigo_afiliado('Maria Silva'); → 'PURION-MARI'
-- =============================================
CREATE OR REPLACE FUNCTION gerar_codigo_afiliado(nome_afiliado TEXT)
RETURNS TEXT AS $$
DECLARE
  base         TEXT;
  codigo_final TEXT;
  contador     INT := 0;
BEGIN
  -- Primeiras 4 letras do nome em maiúsculas, somente A-Z
  base := UPPER(REGEXP_REPLACE(LEFT(nome_afiliado, 8), '[^A-Za-z]', '', 'g'));
  base := LEFT(base, 4);
  IF LENGTH(base) < 2 THEN base := UPPER(LEFT(nome_afiliado, 4)); END IF;

  codigo_final := 'PURION-' || base;

  WHILE EXISTS (SELECT 1 FROM afiliados WHERE codigo = codigo_final) LOOP
    contador := contador + 1;
    codigo_final := 'PURION-' || base || contador::TEXT;
  END LOOP;

  RETURN codigo_final;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: atualiza atualizado_em automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_afiliados_atualizado_em ON afiliados;
CREATE TRIGGER trg_afiliados_atualizado_em
  BEFORE UPDATE ON afiliados
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- =============================================
-- SEED: afiliado de exemplo (só insere se não existir)
-- =============================================
INSERT INTO afiliados (
  tenant_id, nome, email, whatsapp, tiktok,
  codigo, valor_comissao, desconto_cliente, status
)
SELECT
  t.id,
  'Maria Exemplo',
  'maria@exemplo.com',
  '61999990000',
  '@mariaexemplo',
  'PURION-MARI',
  10.00,
  5.00,
  'ativo'
FROM tenants t
WHERE t.slug = 'purion'
LIMIT 1
ON CONFLICT (codigo) DO NOTHING;

-- =============================================
-- VERIFICAÇÃO FINAL
-- Deve retornar 6 linhas com as tabelas criadas
-- =============================================
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'afiliados','afiliado_cliques','afiliado_vendas',
    'afiliado_pagamentos','afiliado_materiais','afiliado_metas'
  )
ORDER BY table_name;
