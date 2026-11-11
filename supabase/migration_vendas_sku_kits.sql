-- ============================================================
-- PURION OS — Vendas com SKU (frasco / Kit 2 / Kit 3 / Discovery)
-- Estoque baixa quantidade × frascos_por_unidade (1 Kit 3 = 3 frascos; Discovery = 0).
-- Idempotente. Rodar DEPOIS de migration_escada_produtos_sku.sql.
-- ============================================================

ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS sku_codigo          text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS frascos_por_unidade int NOT NULL DEFAULT 1;

-- Vendas antigas (antes da escada) eram frascos avulsos / lotes de frascos
UPDATE public.vendas SET sku_codigo = 'frasco_60ml' WHERE sku_codigo IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_sku ON public.vendas (sku_codigo) WHERE deleted_at IS NULL;

-- Conferência (opcional): pedidos vs frascos por SKU
-- SELECT sku_codigo, count(*) AS pedidos, sum(quantidade * frascos_por_unidade) AS frascos
--   FROM public.vendas WHERE deleted_at IS NULL AND status_pagamento = 'pago' GROUP BY 1;
