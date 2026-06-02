-- ============================================================
-- PURION OS — SETUP COMPLETO DO BANCO DE DADOS
-- Cole este SQL inteiro no Supabase SQL Editor e execute
-- https://supabase.com/dashboard/project/jqvghvttgydptksgpvcc/sql/new
-- ============================================================

-- ============================================================
-- 1. TENANTS & PERFIS (multi-tenant base)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  plano       text DEFAULT 'starter',
  ativo       boolean DEFAULT true,
  criado_em   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfis (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id      uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nome           text NOT NULL,
  email          text NOT NULL,
  cargo          text,
  role           text DEFAULT 'membro' CHECK (role IN ('admin', 'membro')),
  disponibilidade text,
  criado_em      timestamptz DEFAULT now()
);

-- Tenant inicial PURION
INSERT INTO tenants (id, nome, slug, plano)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PURION', 'purion', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- Trigger: cria perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (id, tenant_id, nome, email, cargo, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
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
-- 2. CRM — LEADS B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa          text NOT NULL,
  nome_contato          text NOT NULL DEFAULT '',
  telefone              text DEFAULT '',
  email                 text DEFAULT '',
  regiao                text DEFAULT '',
  cidade                text DEFAULT '',
  responsavel           text DEFAULT 'matheus',
  tier                  text DEFAULT 'C' CHECK (tier IN ('A','B','C','D')),
  status                text DEFAULT 'ativo',
  valor_medio_mensal    numeric DEFAULT 0,
  ultimo_contato        timestamptz,
  notas                 text DEFAULT '',
  tipo_estabelecimento  text,
  historico_interacoes  jsonb DEFAULT '[]',
  latitude              numeric,
  longitude             numeric,
  tags                  text[] DEFAULT '{}',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  deleted_at            timestamptz
);

-- ============================================================
-- 3. TAREFAS
-- ============================================================

CREATE TABLE IF NOT EXISTS tarefas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text NOT NULL,
  descricao        text DEFAULT '',
  status           text DEFAULT 'aberta' CHECK (status IN ('aberta','em_progresso','bloqueada','concluida','cancelada')),
  prioridade       text DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','critica')),
  responsavel      text DEFAULT 'matheus',
  modulo           text DEFAULT 'geral',
  due_date         timestamptz,
  created_at       timestamptz DEFAULT now(),
  completed_at     timestamptz,
  motivo_bloqueio  text,
  tags             text[] DEFAULT '{}'
);

-- ============================================================
-- 4. REUNIÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS reunioes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL,
  tipo            text DEFAULT 'operacional',
  status          text DEFAULT 'agendada',
  data            timestamptz NOT NULL,
  duracao         integer DEFAULT 60,
  participantes   text[] DEFAULT '{}',
  pauta           text[] DEFAULT '{}',
  ata             text DEFAULT '',
  decisoes        text[] DEFAULT '{}',
  proximos_passos jsonb DEFAULT '[]',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE IF NOT EXISTS daily_async (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  socio       text NOT NULL,
  data        date NOT NULL DEFAULT CURRENT_DATE,
  ontem_fiz   text DEFAULT '',
  hoje_farei  text DEFAULT '',
  bloqueado   text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(socio, data)
);

CREATE TABLE IF NOT EXISTS decisoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL,
  descricao       text DEFAULT '',
  proposto_por    text DEFAULT '',
  data            timestamptz DEFAULT now(),
  prazo_votacao   timestamptz,
  votos           jsonb DEFAULT '{}',
  status          text DEFAULT 'em_votacao',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

-- ============================================================
-- 5. FINANCEIRO — RECEITAS E DESPESAS
-- ============================================================

CREATE TABLE IF NOT EXISTS receitas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao    text NOT NULL,
  valor        numeric NOT NULL DEFAULT 0,
  categoria    text DEFAULT 'outro',
  data         date NOT NULL DEFAULT CURRENT_DATE,
  regiao       text DEFAULT '',
  responsavel  text DEFAULT 'matheus',
  pedido_id    text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TABLE IF NOT EXISTS despesas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao    text NOT NULL,
  valor        numeric NOT NULL DEFAULT 0,
  categoria    text DEFAULT 'outro',
  data         date NOT NULL DEFAULT CURRENT_DATE,
  regiao       text DEFAULT '',
  responsavel  text DEFAULT 'matheus',
  fornecedor   text,
  nota_fiscal  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  deleted_at   timestamptz
);

-- ============================================================
-- 6. PRODUÇÃO — LOTES, ESTOQUE, EXPEDIÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS lotes_producao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                text NOT NULL,
  produto               text NOT NULL,
  quantidade_produzida  integer DEFAULT 0,
  quantidade_aprovada   integer DEFAULT 0,
  status                text DEFAULT 'em_producao',
  data_inicio           timestamptz DEFAULT now(),
  data_conclusao        timestamptz,
  responsavel           text DEFAULT 'matheus',
  testes                jsonb DEFAULT '[]',
  insumos               jsonb DEFAULT '[]',
  notas                 text DEFAULT '',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  deleted_at            timestamptz
);

CREATE TABLE IF NOT EXISTS produtos_sku (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 text NOT NULL,
  nome                text NOT NULL,
  unidades            integer DEFAULT 0,
  threshold           integer DEFAULT 10,
  ultima_atualizacao  timestamptz DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE IF NOT EXISTS pedidos_expedicao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia      text NOT NULL,
  numero_pedido   text,
  destinatario    text NOT NULL DEFAULT '',
  data_pedido     timestamptz DEFAULT now(),
  prazo_horas     integer DEFAULT 48,
  status          text DEFAULT 'pendente',
  itens           jsonb DEFAULT '[]',
  observacoes     text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE IF NOT EXISTS estoque_insumos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text NOT NULL,
  tipo              text DEFAULT 'outro',
  fornecedor        text DEFAULT '',
  quantidade_atual  numeric DEFAULT 0,
  unidade           text DEFAULT 'un',
  quantidade_minima numeric DEFAULT 0,
  custo_unitario    numeric DEFAULT 0,
  ultima_entrada    timestamptz DEFAULT now(),
  notas             text DEFAULT '',
  deleted_at        timestamptz
);

-- ============================================================
-- 7. CREATORS / MARKETING
-- ============================================================

CREATE TABLE IF NOT EXISTS creators (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text NOT NULL,
  instagram         text DEFAULT '',
  tiktok            text,
  youtube           text,
  email             text,
  whatsapp          text,
  cidade            text,
  seguidores        integer DEFAULT 0,
  nicho_principal   text DEFAULT '',
  status            text DEFAULT 'prospecto',
  cache_combinado   numeric DEFAULT 0,
  tipo_acordo       text DEFAULT 'permuta',
  codigo_desconto   text,
  engajamento_medio numeric,
  views_medias      integer,
  ultimo_contato    timestamptz,
  produtos_enviados text[] DEFAULT '{}',
  postagens         jsonb DEFAULT '[]',
  roi               numeric DEFAULT 0,
  notas             text DEFAULT '',
  responsavel       text DEFAULT 'matheus',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  deleted_at        timestamptz
);

CREATE TABLE IF NOT EXISTS campanhas_ads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  plataforma       text DEFAULT 'meta' CHECK (plataforma IN ('meta','google','tiktok')),
  status           text DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','encerrada')),
  roas             numeric DEFAULT 0,
  cpa              numeric DEFAULT 0,
  orcamento_diario numeric DEFAULT 0,
  gasto_total      numeric DEFAULT 0,
  impressoes       integer DEFAULT 0,
  cliques          integer DEFAULT 0,
  conversoes       integer DEFAULT 0,
  receita_gerada   numeric DEFAULT 0,
  periodo_inicio   timestamptz DEFAULT now(),
  periodo_fim      timestamptz,
  responsavel      text DEFAULT 'matheus',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz
);

-- ============================================================
-- 8. CONFIGURAÇÕES DO SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes (
  chave       text PRIMARY KEY,
  valor       jsonb,
  updated_at  timestamptz DEFAULT now()
);

-- Configurações padrão
INSERT INTO configuracoes (chave, valor) VALUES
  ('roas_minimo',  '2.5'),
  ('cpa_maximo',   '80'),
  ('meta_receita_mensal', '50000')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- 9. AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid,
  usuario_nome  text DEFAULT '',
  acao          text NOT NULL,
  modulo        text DEFAULT '',
  resumo        text DEFAULT '',
  antes         jsonb,
  depois        jsonb,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 10. NOTIFICAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================================
-- 11. ONBOARDING
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passos_concluidos text[] DEFAULT '{}',
  concluido         boolean DEFAULT false,
  concluido_em      timestamptz,
  criado_em         timestamptz DEFAULT now(),
  UNIQUE(usuario_id)
);

-- ============================================================
-- 12. SAC — TICKETS E MENSAGENS
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets_sac (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS ticket_mensagens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets_sac(id) ON DELETE CASCADE,
  autor      text NOT NULL CHECK (autor IN ('cliente', 'atendente')),
  conteudo   text NOT NULL,
  criado_em  timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_ticket_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_sac_updated ON tickets_sac;
CREATE TRIGGER trg_tickets_sac_updated
BEFORE UPDATE ON tickets_sac
FOR EACH ROW EXECUTE FUNCTION update_ticket_atualizado_em();

-- ============================================================
-- 13. AFILIADOS (já existe, mas inclui tabelas relacionadas)
-- ============================================================

CREATE TABLE IF NOT EXISTS afiliado_cliques (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id   uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  tenant_id     uuid,
  ip_hash       text,
  user_agent    text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  converteu     boolean DEFAULT false,
  criado_em     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afiliado_vendas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  tenant_id           uuid,
  pedido_id           text,
  pedido_ref          text,
  cliente_nome        text,
  cliente_email       text,
  valor_bruto         numeric DEFAULT 0,
  desconto_aplicado   numeric DEFAULT 0,
  valor_liquido       numeric DEFAULT 0,
  comissao_percentual numeric DEFAULT 0,
  comissao_valor      numeric DEFAULT 0,
  produtos            jsonb DEFAULT '[]',
  status_venda        text DEFAULT 'aprovada',
  status_comissao     text DEFAULT 'pendente',
  clique_id           uuid,
  origem              text,
  notas               text,
  data_venda          timestamptz DEFAULT now(),
  data_aprovacao      timestamptz,
  data_pagamento      timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE IF NOT EXISTS afiliado_pagamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id    uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  tenant_id      uuid,
  vendas_ids     uuid[] DEFAULT '{}',
  valor_total    numeric DEFAULT 0,
  metodo         text DEFAULT 'pix',
  chave_pix      text,
  comprovante_url text,
  status         text DEFAULT 'pendente',
  periodo_inicio timestamptz,
  periodo_fim    timestamptz,
  data_pagamento timestamptz,
  notas          text,
  criado_em      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notificacoes_afiliado (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id  uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  tipo         text NOT NULL,
  titulo       text NOT NULL,
  mensagem     text NOT NULL,
  lida         boolean DEFAULT false,
  dados        jsonb,
  criado_em    timestamptz DEFAULT now()
);

-- ============================================================
-- 14. ASSINATURAS (Stripe)
-- ============================================================

CREATE TABLE IF NOT EXISTS assinaturas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================================
-- 15. ROW LEVEL SECURITY — habilita tudo para autenticados
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tenants','perfis','leads','tarefas','reunioes','daily_async','decisoes',
    'receitas','despesas','lotes_producao','produtos_sku','pedidos_expedicao',
    'estoque_insumos','creators','campanhas_ads','configuracoes','audit_log',
    'notificacoes','onboarding','tickets_sac','ticket_mensagens',
    'afiliado_cliques','afiliado_vendas','afiliado_pagamentos',
    'notificacoes_afiliado','assinaturas'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY "authed_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Leads SaaS: público para inserção
CREATE TABLE IF NOT EXISTS leads_saas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text,
  empresa    text,
  email      text,
  whatsapp   text,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE leads_saas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_saas_insert" ON leads_saas FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_saas_select" ON leads_saas FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FIM — PURION OS banco configurado ✓
-- ============================================================
