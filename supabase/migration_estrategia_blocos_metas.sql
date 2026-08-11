-- ============================================================
-- PURION OS — Adiciona a seção "metas" ao editor de blocos de Estratégias
-- Idempotente: pode ser executado múltiplas vezes com segurança.
-- ============================================================

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'estrategia_blocos'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%secao%'
  LOOP
    EXECUTE format('ALTER TABLE estrategia_blocos DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.estrategia_blocos
  ADD CONSTRAINT chk_estrategia_bloco_secao CHECK (
    secao IN ('visao_geral', 'metas', 'b2b', 'social', 'growth', 'icp', 'decisoes', 'geral')
  );
