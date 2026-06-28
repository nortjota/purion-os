-- ============================================================
-- LEADS DO SITE (perfumed-canvas-lab) + CARRINHOS ABANDONADOS
-- Cole este SQL no Supabase SQL Editor e execute
-- ============================================================

-- Leads capturados pelo pop-up de desconto (10% na 1ª compra)
CREATE TABLE IF NOT EXISTS leads_site (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  cupom       text,
  utm_source  text,
  pagina      text,
  criado_em   timestamptz DEFAULT now()
);
ALTER TABLE leads_site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_site_insert" ON leads_site;
DROP POLICY IF EXISTS "leads_site_select" ON leads_site;
CREATE POLICY "leads_site_insert" ON leads_site FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_site_select" ON leads_site FOR SELECT TO authenticated USING (true);

-- Carrinhos abandonados no checkout
CREATE TABLE IF NOT EXISTS carrinhos_abandonados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text,
  email         text,
  telefone      text,
  etapa         text DEFAULT 'dados' CHECK (etapa IN ('dados','endereco','pagamento')),
  produtos      jsonb DEFAULT '[]',
  valor_total   numeric DEFAULT 0,
  cupom         text,
  utm_source    text,
  recuperado    boolean DEFAULT false,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
ALTER TABLE carrinhos_abandonados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carrinhos_abandonados_insert" ON carrinhos_abandonados;
DROP POLICY IF EXISTS "carrinhos_abandonados_update" ON carrinhos_abandonados;
DROP POLICY IF EXISTS "carrinhos_abandonados_select" ON carrinhos_abandonados;
CREATE POLICY "carrinhos_abandonados_insert" ON carrinhos_abandonados FOR INSERT WITH CHECK (true);
CREATE POLICY "carrinhos_abandonados_update" ON carrinhos_abandonados FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "carrinhos_abandonados_select" ON carrinhos_abandonados FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FIM
-- ============================================================
