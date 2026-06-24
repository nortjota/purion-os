-- ============================================================
-- PURION OS — INTEGRAÇÃO GOOGLE CALENDAR
-- Adiciona vínculo entre reuniões/tarefas e eventos do Google Calendar
-- Seguro: IF NOT EXISTS, não apaga nada.
-- ============================================================

ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE public.tarefas  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE INDEX IF NOT EXISTS idx_reunioes_google_event_id ON public.reunioes(google_event_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_google_event_id  ON public.tarefas(google_event_id);

SELECT 'coluna google_event_id criada em reunioes e tarefas' AS status;
