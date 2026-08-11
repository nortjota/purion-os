-- ─────────────────────────────────────────────────────────────
-- PURION OS — CRM B2B: pipeline padronizado estilo Asana
-- Máquina de Vendas (Doc07): prospecto → abordado → reuniao_agendada
--   → oportunidade → cliente → recorrente → perdido
-- Idempotente: pode ser executado múltiplas vezes com segurança.
-- ─────────────────────────────────────────────────────────────

-- 1. Remove qualquer CHECK constraint existente na coluna status de leads_crm
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'leads_crm'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE leads_crm DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2. Novo CHECK aceitando os novos estágios + os antigos (compatibilidade)
ALTER TABLE leads_crm
  ADD CONSTRAINT leads_crm_status_check
  CHECK (status IN (
    'prospecto', 'abordado', 'reuniao_agendada', 'oportunidade', 'cliente', 'recorrente', 'perdido',
    'contato_feito', 'proposta_enviada', 'negociando', 'parceiro_ativo', 'inativo'
  ));

-- 3. Próximo passo (follow-up agendado) + histórico de mudanças de estágio
ALTER TABLE leads_crm ADD COLUMN IF NOT EXISTS proximo_passo_data date;
ALTER TABLE leads_crm ADD COLUMN IF NOT EXISTS proximo_passo_acao text;
ALTER TABLE leads_crm ADD COLUMN IF NOT EXISTS historico_estagios jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN leads_crm.proximo_passo_data IS 'Data do próximo follow-up agendado com o lead';
COMMENT ON COLUMN leads_crm.proximo_passo_acao IS 'Ação prevista para o próximo passo (ex: "Ligar para fechar proposta")';
COMMENT ON COLUMN leads_crm.historico_estagios IS 'Histórico de mudanças de estágio: [{id, de, para, timestamp}]';
