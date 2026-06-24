-- ============================================================
-- PURION OS — FINANCEIRO INICIAL PRÉ-LANÇAMENTO (Lote 1)
-- Schema real confirmado em produção:
--   financeiro(id, tipo, categoria, valor, data, descricao, regiao,
--              responsavel, pedido_id, fornecedor, nota_fiscal,
--              created_at, updated_at, deleted_at, tenant_id)
--   CHECK: tipo IN ('receita','despesa') — categoria é texto livre, sem CHECK
--   configuracoes(chave, valor jsonb, updated_at, tenant_id)
-- tenant_id tem DEFAULT meu_tenant_id() — NUNCA enviado nos inserts abaixo
-- ============================================================

-- ── PASSO 2 — CUSTOS DE PRODUÇÃO DO LOTE 1 (R$ 11.039,34 total) ──
-- categoria 'insumos'/'embalagens' seguem o enum do app; itens de
-- produção/equipamento/P&D não têm categoria dedicada → 'outro'

INSERT INTO public.financeiro (tipo, categoria, valor, data, descricao, regiao, responsavel) VALUES
('despesa', 'insumos',    2830.40, '2026-05-10', 'Insumos líquidos do perfume (essência Creed Aventus, base, DPG, ISO E Super, fixador Galaxolide)', 'SC', 'gabriel'),
('despesa', 'embalagens', 2985.98, '2026-05-10', 'Frasco + tampa + válvula (384 un)', 'SC', 'gabriel'),
('despesa', 'embalagens', 4570.00, '2026-05-10', 'Caixa (1000 un - sobra p/ próximos lotes)', 'SC', 'gabriel'),
('despesa', 'embalagens',  342.00, '2026-05-10', 'Adesivo/rótulo (378 un)', 'SC', 'gabriel'),
('despesa', 'embalagens',   26.80, '2026-05-10', 'Plástico bolha (gargalo: cobre só 45 un)', 'SC', 'gabriel'),
('despesa', 'embalagens',   34.90, '2026-05-10', 'Envelope p/ entrega (300 un)', 'SC', 'gabriel'),
('despesa', 'outro',        42.90, '2026-05-10', 'Bombona 20L (equipamento reutilizável)', 'SC', 'gabriel'),
('despesa', 'outro',       206.36, '2026-05-10', 'Rodada de validação / P&D (custo único)', 'SC', 'gabriel');

-- ── PASSO 3 — APORTES DOS SÓCIOS (R$ 3.679,78 cada = R$ 11.039,34) ──
-- categoria 'aporte' (texto livre, sem CHECK constraint no banco)

INSERT INTO public.financeiro (tipo, categoria, valor, data, descricao, regiao, responsavel) VALUES
('receita', 'aporte', 3679.78, '2026-05-10', 'Aporte inicial - cota de produção Lote 1', 'SP', 'joao'),
('receita', 'aporte', 3679.78, '2026-05-10', 'Aporte inicial - cota de produção Lote 1', 'SC', 'gabriel'),
('receita', 'aporte', 3679.78, '2026-05-10', 'Aporte inicial - cota de produção Lote 1', 'DF', 'matheus');

-- ── PASSO 4 — PARÂMETROS OFICIAIS DE CONFIG ──
-- formato chave/valor (jsonb); upsert por chave preserva linhas já existentes
-- (cpa_maximo, meta_receita_mensal, roas_minimo permanecem intactas)

INSERT INTO public.configuracoes (chave, valor) VALUES
('preco_b2c',          '119.90'::jsonb),
('custo_unitario',     '23.99'::jsonb),
('contribuicao_media', '85.00'::jsonb),
('roas_equilibrio',    '1.29'::jsonb),
('meta_roas',          '2.5'::jsonb),
('meta_cpa',           '45.00'::jsonb),
('estoque_inicial',    '282'::jsonb),
('caixa_inicial',      '0'::jsonb)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

SELECT 'OK' AS status,
  (SELECT count(*) FROM financeiro WHERE descricao LIKE '%Lote 1%' OR categoria = 'aporte') AS linhas_financeiro_lote1,
  (SELECT count(*) FROM configuracoes WHERE chave IN ('preco_b2c','custo_unitario','contribuicao_media','roas_equilibrio','meta_roas','meta_cpa','estoque_inicial','caixa_inicial')) AS linhas_config;
