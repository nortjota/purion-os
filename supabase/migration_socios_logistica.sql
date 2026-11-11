-- ============================================================
-- PURION OS — Nova estrutura: 2 sócios (matheus, joao) + perfil 'logistica'
-- Idempotente. Rodar no SQL Editor do Supabase.
-- ============================================================

-- 1. Permite o papel 'logistica' em perfis.role (mantém master/admin/membro)
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'perfis' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.perfis DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.perfis
  ADD CONSTRAINT perfis_role_check CHECK (role IN ('master', 'admin', 'membro', 'logistica'));

-- 2. Helper para políticas RLS: o usuário logado é o operador de logística?
CREATE OR REPLACE FUNCTION public.sou_logistica()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'logistica');
$$;

-- 3. Gabriel arquivado: nada é apagado. Tarefas ABERTAS dele passam para o Matheus
--    (histórico concluído/cancelado continua atribuído a 'gabriel').
UPDATE public.tarefas
   SET responsavel = 'matheus'
 WHERE responsavel = 'gabriel'
   AND status NOT IN ('concluida', 'cancelada')
   AND deleted_at IS NULL;

-- Metas diárias recorrentes do Gabriel deixam de se repetir (histórico preservado)
UPDATE public.metas_diarias
   SET recorrente = false
 WHERE responsavel = 'gabriel' AND recorrente = true;

-- 4. Promover o usuário da Logística (troque o e-mail e rode depois que ele aceitar o convite):
-- UPDATE public.perfis SET role = 'logistica', cargo = 'Logística · Goiânia' WHERE email = 'EMAIL_DA_LOGISTICA@exemplo.com';
