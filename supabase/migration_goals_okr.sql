-- ─────────────────────────────────────────────
-- GOALS ESTILO ASANA — estende estrategia_objetivos / estrategia_resultados
-- ─────────────────────────────────────────────
-- Tabelas estrategia_fases/objetivos/resultados/decisoes já existem em produção
-- (criadas fora do repo). Este script apenas ALTERA (idempotente via IF NOT EXISTS).

-- ── estrategia_objetivos: status, progresso, dono, prazo, hierarquia ──
ALTER TABLE public.estrategia_objetivos
  ADD COLUMN IF NOT EXISTS descricao      text,
  ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'em_dia',
  ADD COLUMN IF NOT EXISTS status_manual  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS progresso      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsavel    text,
  ADD COLUMN IF NOT EXISTS equipe         text,
  ADD COLUMN IF NOT EXISTS data_alvo      date,
  ADD COLUMN IF NOT EXISTS parent_id      uuid REFERENCES public.estrategia_objetivos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo           text NOT NULL DEFAULT 'objetivo',
  ADD COLUMN IF NOT EXISTS created_at     timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estrategia_objetivos_status_check'
  ) THEN
    ALTER TABLE public.estrategia_objetivos
      ADD CONSTRAINT estrategia_objetivos_status_check
      CHECK (status IN ('em_dia','em_risco','em_atraso','concluido','pausado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_estrategia_objetivos_parent_id ON public.estrategia_objetivos(parent_id);

-- ── estrategia_resultados: progresso automático puxado do CRM ──
ALTER TABLE public.estrategia_resultados
  ADD COLUMN IF NOT EXISTS fonte_auto text;

-- ── tarefas: link opcional a um objetivo estratégico ──
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS objetivo_id uuid REFERENCES public.estrategia_objetivos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_objetivo_id ON public.tarefas(objetivo_id);

-- ── histórico de progresso (snapshot a cada mudança relevante) ──
CREATE TABLE IF NOT EXISTS public.estrategia_progresso_historico (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id  uuid NOT NULL REFERENCES public.estrategia_objetivos(id) ON DELETE CASCADE,
  progresso    numeric NOT NULL,
  status       text NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE INDEX IF NOT EXISTS idx_estrategia_progresso_historico_objetivo ON public.estrategia_progresso_historico(objetivo_id, registrado_em);

ALTER TABLE public.estrategia_progresso_historico ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'estrategia_progresso_historico' AND policyname = 'tenant_estrategia_progresso_historico'
  ) THEN
    CREATE POLICY tenant_estrategia_progresso_historico ON public.estrategia_progresso_historico
      USING (tenant_id = public.meu_tenant_id())
      WITH CHECK (tenant_id = public.meu_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'estrategia_progresso_historico'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estrategia_progresso_historico;
  END IF;
END $$;
