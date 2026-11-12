-- ═══════════════════════════════════════════════════════════════════
-- Integração SITE (puriongt.com.br) ↔ CRM
-- Rodar no SQL Editor do Supabase. Idempotente: pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Leads do site: origem completa da visita
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS ref_afiliado text;
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS cupom        text;
ALTER TABLE public.leads_site ADD COLUMN IF NOT EXISTS pagina       text;

-- 2) Carrinhos a recuperar (alimentados pelo webhook Appmax: Pix/boleto vencido, cartão recusado)
CREATE TABLE IF NOT EXISTS public.carrinhos_abandonados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid,
  nome          text,
  email         text,
  telefone      text,
  etapa         text DEFAULT 'pagamento',
  produtos      jsonb DEFAULT '[]'::jsonb,
  valor_total   numeric DEFAULT 0,
  cupom         text,
  utm_source    text,
  recuperado    boolean DEFAULT false,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
ALTER TABLE public.carrinhos_abandonados ADD COLUMN IF NOT EXISTS tenant_id     uuid;
ALTER TABLE public.carrinhos_abandonados ADD COLUMN IF NOT EXISTS produtos      jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.carrinhos_abandonados ADD COLUMN IF NOT EXISTS utm_source    text;
ALTER TABLE public.carrinhos_abandonados ADD COLUMN IF NOT EXISTS recuperado    boolean DEFAULT false;
ALTER TABLE public.carrinhos_abandonados ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_carrinhos_email_aberto ON public.carrinhos_abandonados (email) WHERE recuperado = false;

-- Leitura no CRM pelos sócios do tenant (o site NÃO acessa esta tabela: quem grava é o webhook, com service role)
ALTER TABLE public.carrinhos_abandonados ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'carrinhos_abandonados' AND policyname = 'carrinhos_tenant_select') THEN
    CREATE POLICY carrinhos_tenant_select ON public.carrinhos_abandonados FOR SELECT
      USING (tenant_id = public.meu_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'carrinhos_abandonados' AND policyname = 'carrinhos_tenant_update') THEN
    CREATE POLICY carrinhos_tenant_update ON public.carrinhos_abandonados FOR UPDATE
      USING (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

-- 3) Vendas vindas do Appmax: busca rápida por pedido (o webhook faz upsert por pedido_appmax)
CREATE INDEX IF NOT EXISTS idx_vendas_pedido_appmax ON public.vendas (pedido_appmax) WHERE pedido_appmax IS NOT NULL;

-- 4) Corrige vendas do Appmax já gravadas sem o status de pagamento do CRM
--    ATENÇÃO: ao virar "pago", um pedido com entrega "aguardando" entra na fila de Despachos.
--    Pedidos antigos que vocês já enviaram por fora do CRM apareceriam como atrasados.
--    Por isso o passo 4b (logo abaixo) marca como "entregue" os pagos com mais de 15 dias —
--    rode o 4b SÓ se esses pedidos antigos já foram de fato enviados.
--    (antes desta versão o webhook só preenchia "status"; elas nunca entravam na fila de despacho)
UPDATE public.vendas SET status_pagamento = 'pago'
 WHERE pedido_appmax IS NOT NULL AND status = 'aprovado' AND coalesce(status_pagamento, 'pendente') = 'pendente';
UPDATE public.vendas SET status_pagamento = 'estornado'
 WHERE pedido_appmax IS NOT NULL AND status IN ('reembolsado', 'estornado') AND coalesce(status_pagamento, 'pendente') <> 'estornado';
UPDATE public.vendas SET status_pagamento = 'cancelado'
 WHERE pedido_appmax IS NOT NULL AND status = 'recusado' AND coalesce(status_pagamento, 'pendente') = 'pendente';

-- 4b) OPCIONAL — só se os pedidos pagos com mais de 15 dias já foram enviados por fora do CRM:
-- UPDATE public.vendas SET status_entrega = 'entregue'
--  WHERE pedido_appmax IS NOT NULL AND status_pagamento = 'pago' AND status_entrega = 'aguardando'
--    AND data_venda < now() - interval '15 days';

-- Conferência:
-- SELECT status, status_pagamento, count(*) FROM public.vendas WHERE pedido_appmax IS NOT NULL GROUP BY 1, 2;
