-- ============================================================
-- PURION OS — SNAPSHOT DE ADS + NOTIFICAÇÕES POR PAPEL
-- Seguro: IF NOT EXISTS / DO blocks, não apaga nada.
-- ============================================================

-- Snapshot diário por campanha: 1 linha por (tenant, plataforma, nome),
-- atualizada a cada execução do cron — não acumula histórico infinito.
DO $$
BEGIN
  ALTER TABLE public.campanhas_ads
    ADD CONSTRAINT campanhas_ads_tenant_plataforma_nome_unique UNIQUE (tenant_id, plataforma, nome);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notificações direcionadas por papel de negócio (matheus/joao/gabriel).
-- NULL = notificação geral, visível a todos os sócios.
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS papel text;

CREATE INDEX IF NOT EXISTS idx_notificacoes_papel ON public.notificacoes(papel);

SELECT 'constraint campanhas_ads + coluna papel em notificacoes criadas' AS status;
