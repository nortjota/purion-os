-- ============================================================
-- PURION OS — Motor de Pós-venda (jornada de follow-up do Playbook 360)
-- Ao confirmar a ENTREGA de um pedido (vendas.status_entrega = 'entregue'),
-- gera as tarefas de follow-up em follow_up_tarefas, respeitando supressão.
-- Idempotente (1 tarefa por pedido + tipo). Rodar no SQL Editor do Supabase.
-- ============================================================

-- ── 1. Sinais do cliente no pedido (consentimentos, contexto, feedback) ──
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS opt_in_pesquisa            boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS opt_in_marketing           boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS opt_out_whatsapp_marketing boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS compra_presente            boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS participa_estudo           boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS satisfacao                 smallint CHECK (satisfacao BETWEEN 1 AND 5);
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS feedback_em                timestamptz;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS sinal_reposicao            boolean NOT NULL DEFAULT false;

-- ── 2. Tabela de follow-ups ──
CREATE TABLE IF NOT EXISTS public.follow_up_tarefas (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id                 uuid        NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  cliente_nome              text,
  cliente_telefone          text,
  cliente_email             text,
  tipo                      text        NOT NULL,   -- boas_vindas | pesquisa_satisfacao | estudo_consumo_d30 | estudo_consumo_d45 | avaliacao_ugc | reposicao
  gatilho                   text        NOT NULL,   -- descrição legível do gatilho (ex.: 'D+3 após entrega')
  data_prevista             date        NOT NULL,
  janela_fim                date,
  canal                     text        NOT NULL DEFAULT 'whatsapp',  -- whatsapp | email | telefone
  status                    text        NOT NULL DEFAULT 'pendente',
  motivo_supressao          text,
  mensagem_sugerida_codigo  text,                   -- M04, M05, M06, M07, M08...
  comercial                 boolean     NOT NULL DEFAULT false,  -- M08/M10: exige opt-in de marketing
  lembretes                 int         NOT NULL DEFAULT 0,      -- no máximo 1 lembrete sem resposta
  responsavel               text        NOT NULL DEFAULT 'matheus',
  concluido_em              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  tenant_id                 uuid        NOT NULL DEFAULT public.meu_tenant_id(),

  CONSTRAINT chk_followup_status CHECK (status IN ('pendente', 'feito', 'suprimido')),
  CONSTRAINT chk_followup_canal  CHECK (canal  IN ('whatsapp', 'email', 'telefone')),
  CONSTRAINT uq_followup_pedido_tipo UNIQUE (pedido_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_followup_fila   ON public.follow_up_tarefas (status, data_prevista);
CREATE INDEX IF NOT EXISTS idx_followup_tenant ON public.follow_up_tarefas (tenant_id);

ALTER TABLE public.follow_up_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_follow_up_tarefas" ON public.follow_up_tarefas;
CREATE POLICY "tenant_follow_up_tarefas" ON public.follow_up_tarefas
  USING (tenant_id = public.meu_tenant_id())
  WITH CHECK (tenant_id = public.meu_tenant_id());

-- perfil 'logistica' não acessa pós-venda (se a migration de despacho já rodou)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sou_logistica') THEN
    DROP POLICY IF EXISTS "logistica_bloqueio" ON public.follow_up_tarefas;
    CREATE POLICY "logistica_bloqueio" ON public.follow_up_tarefas AS RESTRICTIVE FOR ALL TO authenticated
      USING (NOT public.sou_logistica()) WITH CHECK (NOT public.sou_logistica());
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_tarefas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Supressão: reclamação / troca / devolução em aberto para o pedido ou cliente ──
CREATE OR REPLACE FUNCTION public.pedido_tem_reclamacao_aberta(p_venda public.vendas)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tel text := regexp_replace(COALESCE(p_venda.cliente_telefone, ''), '\D', '', 'g');
  v_tem boolean := false;
BEGIN
  IF p_venda.status_entrega = 'devolvido' THEN
    RETURN true;
  END IF;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.tickets_sac t
       WHERE t.tenant_id = p_venda.tenant_id
         AND t.tipo IN ('reclamacao', 'troca', 'devolucao')
         AND t.status IN ('aberto', 'em_atendimento', 'aguardando_cliente')
         AND (
              t.pedido_ref = p_venda.id::text
           OR (p_venda.pedido_appmax IS NOT NULL AND t.pedido_ref = p_venda.pedido_appmax)
           OR (COALESCE(p_venda.cliente_email, '') <> '' AND lower(t.cliente_email) = lower(p_venda.cliente_email))
           OR (length(v_tel) >= 8 AND right(regexp_replace(COALESCE(t.cliente_whatsapp, ''), '\D', '', 'g'), 8) = right(v_tel, 8))
         )
    ) INTO v_tem;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_tem := false; -- SAC ainda não configurado: não bloqueia a geração
  END;
  RETURN v_tem;
END $$;

-- ── 4. Geração da jornada (idempotente) ──
CREATE OR REPLACE FUNCTION public.gerar_followups_pos_venda(p_venda_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v            public.vendas;
  d0           date;
  hoje         date := current_date;
  reclamacao   boolean;
  canal_padrao text;
  canal_com    text;
  fn_ins       text;
BEGIN
  SELECT * INTO v FROM public.vendas WHERE id = p_venda_id;
  IF NOT FOUND OR v.deleted_at IS NOT NULL OR v.status_entrega <> 'entregue' THEN
    RETURN; -- sem confirmação de entrega, nada é gerado
  END IF;

  d0 := COALESCE(v.data_entrega_realizada::date, hoje);
  reclamacao := public.pedido_tem_reclamacao_aberta(v);
  canal_padrao := CASE WHEN COALESCE(v.cliente_telefone, '') <> '' THEN 'whatsapp'
                       WHEN COALESCE(v.cliente_email, '') <> '' THEN 'email'
                       ELSE 'telefone' END;

  -- D+2 a D+4 · Boas-vindas / 1ª impressão (M04) — NÃO gerar com troca/reclamação aberta
  IF NOT reclamacao AND hoje <= d0 + 4 THEN
    INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
      data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
    VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'boas_vindas',
      CASE WHEN v.compra_presente THEN 'D+2 a D+4 · 1ª impressão do presente' ELSE 'D+2 a D+4 · boas-vindas / 1ª impressão' END,
      GREATEST(d0 + 2, hoje), d0 + 4, canal_padrao, 'M04', false, v.tenant_id)
    ON CONFLICT (pedido_id, tipo) DO NOTHING;
  END IF;

  -- D+10 a D+20 · Pesquisa de satisfação (M05) — só com opt-in; presente pesquisa a EXPERIÊNCIA DE COMPRA
  IF v.opt_in_pesquisa AND NOT reclamacao AND hoje <= d0 + 20 THEN
    INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
      data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
    VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'pesquisa_satisfacao',
      CASE WHEN v.compra_presente THEN 'D+10 a D+20 · pesquisa da experiência de compra (presente)'
           ELSE 'D+10 a D+20 · pesquisa de satisfação' END,
      GREATEST(d0 + 10, hoje), d0 + 20, canal_padrao, 'M05', false, v.tenant_id)
    ON CONFLICT (pedido_id, tipo) DO NOTHING;
  END IF;

  -- D+30 e D+45 · Estudo de consumo (M06) — só participantes; nunca para presente (não pesquisa consumo)
  IF v.participa_estudo AND NOT v.compra_presente THEN
    IF hoje <= d0 + 37 THEN
      INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
        data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
      VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'estudo_consumo_d30', 'D+30 · estudo de consumo',
        GREATEST(d0 + 30, hoje), d0 + 37, canal_padrao, 'M06', false, v.tenant_id)
      ON CONFLICT (pedido_id, tipo) DO NOTHING;
    END IF;
    IF hoje <= d0 + 52 THEN
      INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
        data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
      VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'estudo_consumo_d45', 'D+45 · estudo de consumo',
        GREATEST(d0 + 45, hoje), d0 + 52, canal_padrao, 'M06', false, v.tenant_id)
      ON CONFLICT (pedido_id, tipo) DO NOTHING;
    END IF;
  END IF;

  -- Avaliação / UGC (M07) — só após feedback POSITIVO (4-5); nunca com cliente insatisfeito ou reclamação aberta
  IF v.satisfacao IS NOT NULL AND v.satisfacao >= 4 AND NOT reclamacao THEN
    INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
      data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
    VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'avaliacao_ugc',
      format('Feedback positivo (%s/5) · pedir avaliação/UGC', v.satisfacao),
      GREATEST(COALESCE(v.feedback_em::date, hoje) + 1, hoje), COALESCE(v.feedback_em::date, hoje) + 10,
      canal_padrao, 'M07', false, v.tenant_id)
    ON CONFLICT (pedido_id, tipo) DO NOTHING;
  END IF;

  -- Reposição (M08, COMERCIAL) — sinal de consumo + opt-in de marketing; opt-out de WhatsApp => só e-mail
  IF v.sinal_reposicao AND v.opt_in_marketing AND NOT reclamacao
     AND (v.satisfacao IS NULL OR v.satisfacao >= 3) THEN
    canal_com := CASE WHEN COALESCE(v.cliente_telefone, '') <> '' AND NOT v.opt_out_whatsapp_marketing THEN 'whatsapp'
                      WHEN COALESCE(v.cliente_email, '') <> '' THEN 'email'
                      ELSE NULL END;
    IF canal_com IS NOT NULL THEN
      INSERT INTO public.follow_up_tarefas (pedido_id, cliente_nome, cliente_telefone, cliente_email, tipo, gatilho,
        data_prevista, janela_fim, canal, mensagem_sugerida_codigo, comercial, tenant_id)
      VALUES (v.id, v.cliente_nome, v.cliente_telefone, v.cliente_email, 'reposicao',
        'Sinal de consumo (frasco no fim) + opt-in de marketing', hoje, hoje + 7, canal_com, 'M08', true, v.tenant_id)
      ON CONFLICT (pedido_id, tipo) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ── 5. Trigger: dispara na entrega e quando mudam os sinais do cliente ──
CREATE OR REPLACE FUNCTION public.trg_vendas_followups()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status_entrega = 'entregue' THEN
    PERFORM public.gerar_followups_pos_venda(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vendas_followups ON public.vendas;
CREATE TRIGGER vendas_followups
  AFTER INSERT OR UPDATE OF status_entrega, opt_in_pesquisa, opt_in_marketing, opt_out_whatsapp_marketing,
                            compra_presente, participa_estudo, satisfacao, sinal_reposicao
  ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.trg_vendas_followups();

-- ── 6. (Opcional) gerar para pedidos JÁ entregues nos últimos 60 dias ──
-- SELECT public.gerar_followups_pos_venda(id) FROM public.vendas
--  WHERE status_entrega = 'entregue' AND deleted_at IS NULL
--    AND data_entrega_realizada >= now() - interval '60 days';
