-- ============================================================
-- PURION OS — All new tables migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Onboarding per user
CREATE TABLE IF NOT EXISTS onboarding (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passo       text NOT NULL,
  concluido   boolean NOT NULL DEFAULT false,
  criado_em   timestamptz DEFAULT now(),
  UNIQUE(usuario_id, passo)
);
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON onboarding USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS notificacoes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid,
  usuario_id  uuid,
  tipo        text NOT NULL,
  titulo      text NOT NULL,
  mensagem    text NOT NULL,
  canal       text[] DEFAULT '{sistema}',
  link        text,
  lida        boolean DEFAULT false,
  enviada     boolean DEFAULT false,
  enviada_em  timestamptz,
  criado_em   timestamptz DEFAULT now()
);
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any_authed" ON notificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. SAC tickets
CREATE TABLE IF NOT EXISTS tickets_sac (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero            text NOT NULL,
  cliente_nome      text NOT NULL,
  cliente_email     text,
  cliente_whatsapp  text,
  canal             text NOT NULL DEFAULT 'manual',
  tipo              text,
  assunto           text NOT NULL,
  descricao         text,
  pedido_ref        text,
  status            text NOT NULL DEFAULT 'aberto',
  prioridade        text NOT NULL DEFAULT 'normal',
  satisfacao        integer CHECK (satisfacao BETWEEN 1 AND 5),
  criado_em         timestamptz DEFAULT now(),
  atualizado_em     timestamptz DEFAULT now(),
  resolvido_em      timestamptz,
  deleted_at        timestamptz
);
ALTER TABLE tickets_sac ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any_authed" ON tickets_sac FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_tickets_sac_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_sac_updated
BEFORE UPDATE ON tickets_sac
FOR EACH ROW EXECUTE FUNCTION update_tickets_sac_atualizado_em();

-- 4. SAC ticket messages
CREATE TABLE IF NOT EXISTS ticket_mensagens (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  uuid NOT NULL REFERENCES tickets_sac(id) ON DELETE CASCADE,
  autor      text NOT NULL CHECK (autor IN ('cliente', 'atendente')),
  conteudo   text NOT NULL,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE ticket_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any_authed" ON ticket_mensagens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Subscriptions (Stripe)
CREATE TABLE IF NOT EXISTS assinaturas (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_customer_id     text,
  stripe_subscription_id text UNIQUE,
  email                  text,
  plano                  text NOT NULL DEFAULT 'starter',
  status                 text NOT NULL DEFAULT 'trialing',
  periodo_inicio         timestamptz,
  periodo_fim            timestamptz,
  criado_em              timestamptz DEFAULT now(),
  atualizado_em          timestamptz DEFAULT now()
);
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any_authed" ON assinaturas FOR ALL TO authenticated USING (true) WITH CHECK (true);
