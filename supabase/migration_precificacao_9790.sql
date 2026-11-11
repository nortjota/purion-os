-- ============================================================
-- PURION OS — Precificação oficial: B2C R$ 97,90 · custo R$ 30,00
-- Substitui R$ 109,90 / R$ 28,00. Idempotente (upsert por chave + tenant).
-- Adapta-se ao tipo real da coluna configuracoes.valor (text, numeric ou jsonb).
--
-- tenant_id: no SQL Editor não há usuário logado (meu_tenant_id() = NULL), então o script
-- usa o tenant da PURION. O app nunca envia tenant_id.
-- ============================================================

DO $$
DECLARE
  v_tenant uuid := COALESCE(public.meu_tenant_id(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid);
  v_tipo   text;
  r        record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
    RAISE EXCEPTION 'Tenant % não encontrado — ajuste v_tenant no topo do script.', v_tenant;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
    FROM pg_attribute a
   WHERE a.attrelid = 'public.configuracoes'::regclass AND a.attname = 'valor' AND NOT a.attisdropped;

  FOR r IN SELECT * FROM (VALUES
    ('custo_unitario',        '30'),
    ('preco_b2c',             '97.9'),
    ('preco_b2b',             '64.9'),
    ('markup',                '226'),
    ('margem_real',           '69'),
    ('margem_minima_alvo',    '65'),
    ('contribuicao_organica', '39.9'),
    ('custos_variaveis',      '28'),
    -- chaves legadas (camelCase) alinhadas aos valores novos
    ('custoProdutoUnitario',  '30'),
    ('precoB2C',              '97.9'),
    ('precoB2B',              '64.9')
  ) AS t(chave, valor)
  LOOP
    EXECUTE format(
      'INSERT INTO public.configuracoes (chave, valor, tenant_id, updated_at)
       VALUES (%L, %L::%s, %L, now())
       ON CONFLICT (chave, tenant_id) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now()',
      r.chave, r.valor, v_tipo, v_tenant);
  END LOOP;

  -- margemMinimaAlvo legado é fração (0,65)
  EXECUTE format(
    'INSERT INTO public.configuracoes (chave, valor, tenant_id, updated_at)
     VALUES (%L, %L::%s, %L, now())
     ON CONFLICT (chave, tenant_id) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now()',
    'margemMinimaAlvo', '0.65', v_tipo, v_tenant);
END $$;
