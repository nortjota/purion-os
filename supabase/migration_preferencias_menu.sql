-- ─────────────────────────────────────────────
-- PREFERÊNCIAS DE MENU — cada usuário pode ocultar/reexibir abas
-- da navegação. Só afeta o que aparece no menu daquele usuário;
-- não apaga páginas, rotas nem dados, e não afeta outros sócios.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.preferencias_menu (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid(),
  aba_key     text NOT NULL,
  oculta      boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid NOT NULL DEFAULT public.meu_tenant_id(),
  UNIQUE (user_id, aba_key)
);

CREATE INDEX IF NOT EXISTS idx_preferencias_menu_user ON public.preferencias_menu(user_id);

ALTER TABLE public.preferencias_menu ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preferencias_menu' AND policyname = 'proprio_usuario_preferencias_menu') THEN
    CREATE POLICY proprio_usuario_preferencias_menu ON public.preferencias_menu
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
