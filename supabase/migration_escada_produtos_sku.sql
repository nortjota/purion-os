-- ============================================================
-- PURION OS — Escada de produtos (SKUs): Frasco · Kit 2 · Kit 3 · Discovery
-- AUTO-ADAPTATIVO: inspeciona produtos_sku (information_schema) antes de inserir.
--   • Se a tabela não existe → cria completa (RLS tenant + realtime).
--   • Se existe (tabela legada nome/unidades/threshold) → só ADICIONA as colunas que faltam
--     e afrouxa NOT NULL de colunas legadas sem default (para os inserts não quebrarem).
-- PURION tem UMA ÚNICA fragrância: kits = mais frascos dela; Discovery = amostra dela.
-- Idempotente (ON CONFLICT DO NOTHING por tenant + codigo).
-- ============================================================

-- 0. Diagnóstico (opcional — rode antes para ver o schema atual)
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'produtos_sku'
--  ORDER BY ordinal_position;

-- 1. Cria a tabela se não existir
CREATE TABLE IF NOT EXISTS public.produtos_sku (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text,
  nome            text,
  tipo            text,
  preco           numeric,
  qtd_frascos     int,
  custo_producao  numeric,
  economia        numeric,
  descricao       text,
  preco_a_validar boolean     NOT NULL DEFAULT false,
  ativo           boolean     NOT NULL DEFAULT true,
  ordem           int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  tenant_id       uuid        DEFAULT public.meu_tenant_id()
);

-- 2. Garante as colunas essenciais (tabela legada)
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS codigo          text;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS nome            text;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS tipo            text;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS preco           numeric;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS qtd_frascos     int;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS custo_producao  numeric;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS economia        numeric;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS descricao       text;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS preco_a_validar boolean NOT NULL DEFAULT false;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS ativo           boolean NOT NULL DEFAULT true;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS ordem           int;
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.produtos_sku ADD COLUMN IF NOT EXISTS tenant_id       uuid DEFAULT public.meu_tenant_id();

-- 3. Colunas legadas NOT NULL sem default (ex.: sku, unidades) não podem travar os inserts
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'produtos_sku'
       AND is_nullable = 'NO' AND column_default IS NULL
       AND column_name NOT IN ('id')
  LOOP
    EXECUTE format('ALTER TABLE public.produtos_sku ALTER COLUMN %I DROP NOT NULL', c.column_name);
    RAISE NOTICE 'produtos_sku.%: NOT NULL removido (coluna legada sem default)', c.column_name;
  END LOOP;
END $$;

-- 4. Chave de idempotência
CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_sku_tenant_codigo
  ON public.produtos_sku (tenant_id, codigo);

-- 5. RLS por tenant (só cria a política se não houver nenhuma)
ALTER TABLE public.produtos_sku ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'produtos_sku') THEN
    CREATE POLICY "tenant_produtos_sku" ON public.produtos_sku
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos_sku;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Seed dos 4 SKUs (números oficiais). tenant explícito porque o SQL Editor não tem sessão.
DO $$
DECLARE
  v_tenant uuid := COALESCE(public.meu_tenant_id(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid);
BEGIN
  INSERT INTO public.produtos_sku
    (codigo, nome, tipo, preco, qtd_frascos, custo_producao, economia, descricao, preco_a_validar, ativo, ordem, tenant_id)
  VALUES
    ('frasco_60ml', '1 Frasco 60ml', 'frasco', 97.90, 1, 30.00, 0,
     'PURION GT 60ml — a fragrância única da marca. Margem 69%.', false, true, 1, v_tenant),
    ('kit_2', 'Kit 2 (2 frascos)', 'kit', 179.90, 2, 60.00, 15.90,
     '2 frascos PURION GT 60ml. Economia de R$ 15,90 para o cliente. Margem 67%.', false, true, 2, v_tenant),
    ('kit_3', 'Kit 3 (3 frascos)', 'kit', 259.90, 3, 90.00, 33.80,
     '3 frascos PURION GT 60ml. Economia de R$ 33,80 para o cliente. Margem 65%.', false, true, 3, v_tenant),
    ('discovery', 'Discovery Set (amostra 2–3ml)', 'discovery', NULL, 0, NULL, NULL,
     'Produto de AQUISIÇÃO: amostra pequena (2–3ml) da fragrância única PURION, com crédito convertível na compra do frasco full size. Preço e margem A VALIDAR.',
     true, true, 4, v_tenant)
  ON CONFLICT (tenant_id, codigo) DO NOTHING;
END $$;
