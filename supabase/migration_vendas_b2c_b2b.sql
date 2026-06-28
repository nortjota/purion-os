-- ============================================================
-- PURION OS — VENDAS B2C/B2B MANUAIS COM LOGÍSTICA E ENTREGA
-- A tabela 'vendas' já existe (criada para o webhook Appmax).
-- Esta migration ADAPTA a tabela existente — adiciona colunas
-- faltantes para suportar registro manual + logística, sem
-- recriar nada e sem quebrar o fluxo automático do webhook.
-- Seguro: IF NOT EXISTS / DO blocks, idempotente.
-- ============================================================

-- pedido_appmax é específico do fluxo automático do webhook —
-- vendas registradas manualmente não têm esse identificador.
ALTER TABLE public.vendas ALTER COLUMN pedido_appmax DROP NOT NULL;

-- B2B: vínculo opcional com a estética (lead) já cadastrada no CRM
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads_crm(id) ON DELETE SET NULL;

-- Cliente
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cliente_documento text;

-- Endereço de entrega
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cep          text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS endereco     text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS numero       text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS complemento  text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS bairro       text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cidade       text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS uf           text;

-- Produto / valores (registro manual — distinto de valor_bruto/valor_liquido/taxa do gateway)
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS valor_unitario numeric;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS desconto       numeric DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS valor_total    numeric;

-- Pagamento (status_pagamento é o vocabulário do fluxo manual;
-- 'status' continua sendo usado pelo webhook Appmax)
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente';

-- Logística / entrega
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS status_entrega          text DEFAULT 'aguardando';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS codigo_rastreio         text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS transportadora          text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_envio              timestamptz;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_entrega_prevista   timestamptz;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_entrega_realizada  timestamptz;

-- Afiliado por vínculo direto (FK) — complementa afiliado_codigo (texto, usado pelo webhook/UTM)
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS afiliado_creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL;

-- Meta
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS responsavel  text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS observacoes  text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- CHECK constraints (idempotentes)
DO $$
BEGIN
  ALTER TABLE public.vendas ADD CONSTRAINT vendas_canal_check CHECK (canal IN ('b2c','b2b'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.vendas ADD CONSTRAINT vendas_status_pagamento_check
    CHECK (status_pagamento IN ('pendente','pago','estornado','cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.vendas ADD CONSTRAINT vendas_status_entrega_check
    CHECK (status_entrega IN ('aguardando','separando','postado','em_transito','entregue','devolvido'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendas_canal          ON public.vendas(canal);
CREATE INDEX IF NOT EXISTS idx_vendas_status_entrega  ON public.vendas(status_entrega);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda_b    ON public.vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_lead_id          ON public.vendas(lead_id);

-- RLS + realtime já existem (confirmados na Fase 0) — blocos defensivos, idempotentes
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY tenant_vendas ON public.vendas
    USING (tenant_id = public.meu_tenant_id())
    WITH CHECK (tenant_id = public.meu_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

SELECT 'tabela vendas adaptada para registro manual b2c/b2b + logistica' AS status;
