-- ============================================================
-- PURION OS — INTEGRAÇÃO APPMAX: tabela de vendas + webhook_logs
-- + UNIQUE em creators.codigo_desconto (reaproveitado como código
--   de afiliado — já existia na tabela, mas estava 100% vazio)
-- Seguro: IF NOT EXISTS, não apaga nada.
-- ============================================================

-- ── A) TABELA VENDAS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vendas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_appmax     text NOT NULL,
  cliente_nome      text DEFAULT '',
  cliente_email     text DEFAULT '',
  cliente_telefone  text DEFAULT '',
  valor_bruto       numeric DEFAULT 0,
  valor_liquido     numeric DEFAULT 0,
  taxa              numeric DEFAULT 0,
  status            text NOT NULL DEFAULT 'pendente',
  -- status: aprovado | pendente | recusado | estornado | reembolsado
  metodo_pagamento  text,
  -- metodo_pagamento: pix | cartao | boleto
  parcelas          integer DEFAULT 1,
  canal             text DEFAULT 'b2c',
  -- canal: b2c | b2b
  afiliado_codigo   text,
  produto           text DEFAULT '',
  quantidade        integer DEFAULT 1,
  data_venda        timestamptz DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  tenant_id         uuid DEFAULT public.meu_tenant_id()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendas_pedido_appmax ON public.vendas(pedido_appmax);
CREATE INDEX IF NOT EXISTS idx_vendas_afiliado_codigo      ON public.vendas(afiliado_codigo);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda           ON public.vendas(data_venda);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_vendas" ON public.vendas;
CREATE POLICY "tenant_vendas" ON public.vendas FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ── B) TABELA WEBHOOK_LOGS (auditoria/debug) ──────────────────

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem                text NOT NULL,
  payload               jsonb DEFAULT '{}'::jsonb,
  status_processamento  text DEFAULT 'recebido',
  -- status_processamento: recebido | processado | erro | ignorado
  created_at            timestamptz NOT NULL DEFAULT now(),
  tenant_id             uuid DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_origem ON public.webhook_logs(origem, created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_webhook_logs" ON public.webhook_logs;
CREATE POLICY "tenant_webhook_logs" ON public.webhook_logs FOR ALL TO authenticated
  USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id());

-- ── C) creators.codigo_desconto — torna único ─────────────────
-- Coluna já existia (text) mas estava 100% vazia; reaproveitada
-- como código de afiliado em vez de criar 'codigo_afiliado' nova.
-- NULLs múltiplos são permitidos sob UNIQUE no Postgres, então é
-- seguro adicionar antes do backfill.

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.creators ADD CONSTRAINT creators_codigo_desconto_unique UNIQUE (codigo_desconto);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

SELECT 'estrutura vendas/webhook_logs criada' AS status;
