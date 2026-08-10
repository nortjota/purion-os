-- ============================================================
-- PURION OS — Calendário nativo do CRM (eventos_calendario)
-- Agrega reuniões, prazos de tarefas, follow-ups B2B, datas
-- importantes e eventos manuais num só lugar, com lembretes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.eventos_calendario (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            text        NOT NULL,
  descricao         text,
  data_inicio       timestamptz NOT NULL,
  data_fim          timestamptz,
  dia_inteiro       boolean     NOT NULL DEFAULT false,
  tipo              text        NOT NULL DEFAULT 'outro',
  origem_tabela     text,
  origem_id         uuid,
  cor               text,
  responsavel       text,
  lembrete_minutos  int         DEFAULT 60,
  google_event_id   text,
  concluido         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  tenant_id         uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_evento_tipo CHECK (
    tipo IN ('reuniao', 'tarefa', 'followup', 'data_importante', 'post', 'outro')
  )
);

CREATE INDEX IF NOT EXISTS idx_eventos_calendario_data   ON public.eventos_calendario (data_inicio) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_tenant ON public.eventos_calendario (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_eventos_calendario" ON public.eventos_calendario;
CREATE POLICY "tenant_eventos_calendario" ON public.eventos_calendario
  USING (tenant_id = public.meu_tenant_id());

-- ── Realtime ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_calendario;
