-- ============================================================
-- PURION OS — Fila de Despacho + handoff com Logística (Goiânia)
-- Pré-requisito: migration_socios_logistica.sql (cria public.sou_logistica()).
-- Idempotente. Rodar no SQL Editor do Supabase.
-- ============================================================

-- 1. Quem despachou (data do despacho = vendas.data_envio, já existente)
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS despachado_por      text;  -- 'logistica' | 'matheus' | 'joao'
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS despachado_por_nome text;  -- nome do operador logado
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS m02_enviada_em      timestamptz; -- aviso "envio realizado" ao cliente

CREATE INDEX IF NOT EXISTS idx_vendas_fila_despacho
  ON public.vendas (status_pagamento, status_entrega, data_venda)
  WHERE deleted_at IS NULL;

-- 2. Idempotência da baixa de estoque: no máximo 1 saída por venda.
--    Só cria o índice se não houver duplicatas antigas (nada é apagado automaticamente).
DO $$ BEGIN
  IF EXISTS (
    SELECT origem_id FROM public.estoque_movimentacoes
     WHERE tipo = 'saida_venda' AND origem_tipo = 'venda'
     GROUP BY origem_id HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Há vendas com mais de uma saída de estoque — índice único NÃO criado. O app continua idempotente (checa antes de inserir).';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_estoque_mov_saida_venda
      ON public.estoque_movimentacoes (origem_id)
      WHERE tipo = 'saida_venda' AND origem_tipo = 'venda';
  END IF;
END $$;

-- 3. Acesso RESTRITO do perfil 'logistica' no banco (não só na interface).
--    Políticas RESTRICTIVE somam-se (AND) às políticas de tenant existentes.

-- 3a. Bloqueio total nas tabelas sensíveis (financeiro, estratégia, metas, CRM, configurações…)
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'financeiro','receitas','despesas','aportes_socios','assinaturas','contas_acessos','configuracoes',
    'metas_diarias','meta_checklist_itens','meta_medicoes_mensais','estrategia_blocos','estrategia_progresso_historico',
    'decisoes','reunioes','rmr_reunioes','daily_async','tarefas','subtarefas','tarefa_comentarios','tarefa_anexos',
    'leads_crm','leads','leads_site','leads_saas','creators','doacoes_ugc','campanhas_ads','carrinhos_abandonados',
    'afiliados','afiliado_vendas','afiliado_pagamentos','afiliado_metas','afiliado_materiais','afiliado_cliques',
    'kb_categorias','kb_documentos','kb_blocos','quadros','quadro_nos','quadro_conexoes','eventos_calendario',
    'tickets_sac','ticket_mensagens','audit_log','webhook_logs','lotes_producao','insumos','estoque_insumos',
    'insumo_movimentacoes','bom_receita','follow_up_tarefas'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "logistica_bloqueio" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "logistica_bloqueio" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
           USING (NOT public.sou_logistica()) WITH CHECK (NOT public.sou_logistica())', t);
    END IF;
  END LOOP;
END $$;

-- 3b. vendas: logística lê e atualiza (marca despacho), mas não cria nem apaga
DROP POLICY IF EXISTS "logistica_vendas_sem_insert" ON public.vendas;
CREATE POLICY "logistica_vendas_sem_insert" ON public.vendas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.sou_logistica());
DROP POLICY IF EXISTS "logistica_vendas_sem_delete" ON public.vendas;
CREATE POLICY "logistica_vendas_sem_delete" ON public.vendas AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.sou_logistica());

-- 3c. estoque_movimentacoes: logística só registra SAÍDA DE VENDA (baixa no despacho)
DROP POLICY IF EXISTS "logistica_mov_so_saida_venda" ON public.estoque_movimentacoes;
CREATE POLICY "logistica_mov_so_saida_venda" ON public.estoque_movimentacoes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.sou_logistica() OR (tipo = 'saida_venda' AND origem_tipo = 'venda'));

-- 4. Realtime (ignora se a tabela já estiver na publicação)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
