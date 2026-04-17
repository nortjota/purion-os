-- ============================================================
-- PURION OS — Setup Multi-tenant (rodar no Supabase SQL Editor)
-- ============================================================

-- 1. TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  plano      TEXT DEFAULT 'starter',
  ativo      BOOLEAN DEFAULT true,
  criado_em  TIMESTAMPTZ DEFAULT now()
);

-- 2. PERFIS (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS perfis (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL,
  cargo          TEXT,
  role           TEXT DEFAULT 'membro' CHECK (role IN ('admin', 'membro')),
  disponibilidade TEXT,
  criado_em      TIMESTAMPTZ DEFAULT now()
);

-- 3. LEADS SAAS (formulário da landing page)
CREATE TABLE IF NOT EXISTS leads_saas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT,
  empresa    TEXT,
  email      TEXT,
  whatsapp   TEXT,
  criado_em  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_saas ENABLE ROW LEVEL SECURITY;

-- Tenants: cada usuário vê apenas o seu tenant
CREATE POLICY "tenant_isolamento" ON tenants
  FOR ALL USING (
    id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  );

-- Perfis: cada usuário vê perfis do mesmo tenant
CREATE POLICY "perfis_isolamento" ON perfis
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  );

-- Leads saas: qualquer pessoa pode inserir (formulário público), só admins leem
CREATE POLICY "leads_insert_public" ON leads_saas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "leads_select_service" ON leads_saas
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================================
-- TRIGGER: ao criar usuário via convite, preenche o perfil
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Só cria perfil se ainda não existir (pode ter sido pré-criado pelo /api/invite)
  INSERT INTO perfis (id, tenant_id, nome, email, cargo, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'cargo',
    'membro'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TENANT INICIAL (PURION) — ajuste o e-mail do admin
-- ============================================================
INSERT INTO tenants (id, nome, slug, plano)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'PURION',
  'purion',
  'pro'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FIM — após rodar, crie seu usuário em Authentication > Users
-- e defina tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- ============================================================
