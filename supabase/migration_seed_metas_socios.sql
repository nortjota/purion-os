-- ============================================================
-- PURION OS — Seed: metas diárias recorrentes por sócio (matheus, joao) + time
-- Idempotente: não duplica meta de mesmo título + responsável + escopo já existente HOJE.
-- A partir de amanhã o app clona sozinho as metas recorrentes (useMetas → verificarRecorrencia).
--
-- Sobre tenant_id: o app NUNCA envia tenant_id (DEFAULT public.meu_tenant_id()).
-- Porém no SQL Editor não há usuário logado, então meu_tenant_id() retorna NULL.
-- Por isso este script resolve o tenant explicitamente: usa meu_tenant_id() quando houver
-- sessão e, senão, o tenant da PURION (mesmo id usado em /api/notificacoes/enviar).
-- ============================================================

DO $$
DECLARE
  v_tenant uuid := COALESCE(public.meu_tenant_id(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid);
  m        jsonb;
  v_meta   uuid;
  v_ordem  int;
  v_item   text;
  v_metas  jsonb := '[
    {"titulo":"Abordagens B2B novas","resp":"matheus","escopo":"individual","cat":"b2b","tipo":"numerica","alvo":4,"unidade":"estéticas"},
    {"titulo":"Follow-ups B2B (D+21 e pipeline)","resp":"matheus","escopo":"individual","cat":"b2b","tipo":"numerica","alvo":3,"unidade":"contatos"},
    {"titulo":"Rotina pós-venda (fila entregas + tickets)","resp":"matheus","escopo":"individual","cat":"posvenda","tipo":"checklist",
     "itens":["Abrir fila de entregas de ontem","Responder tickets abertos","Registrar feedbacks do dia","Disparar pesquisas elegíveis (D+14/D+30)","Revisar sinais de reposição"]},
    {"titulo":"Conferir caixa e contribuição do dia","resp":"matheus","escopo":"individual","cat":"financeiro","tipo":"checklist",
     "itens":["Conferir pedidos pagos","Conferir contribuição/margem","Reconciliar com extrato"]},
    {"titulo":"Coordenar despacho com Logística (Goiânia)","resp":"matheus","escopo":"individual","cat":"logistica","tipo":"checklist",
     "itens":["Passar pedidos a despachar","Receber códigos de rastreio","Lançar rastreio no CRM"]},
    {"titulo":"Fechar oportunidades (ligações/propostas)","resp":"matheus","escopo":"individual","cat":"vendas","tipo":"numerica","alvo":2,"unidade":"contatos"},

    {"titulo":"Criativo novo produzido","resp":"joao","escopo":"individual","cat":"conteudo","tipo":"numerica","alvo":1,"unidade":"criativo"},
    {"titulo":"DMs para creators","resp":"joao","escopo":"individual","cat":"creators","tipo":"numerica","alvo":5,"unidade":"DMs"},
    {"titulo":"Posts/stories publicados","resp":"joao","escopo":"individual","cat":"conteudo","tipo":"numerica","alvo":2,"unidade":"posts"},
    {"titulo":"Gerir tráfego (ler métricas + ajustar)","resp":"joao","escopo":"individual","cat":"ads","tipo":"checklist",
     "itens":["Ler ROAS/CPA por campanha","Cortar/escalar criativo","Conferir UTMs","Revisar experimento ICE ativo"]},
    {"titulo":"Site & conversão","resp":"joao","escopo":"individual","cat":"growth","tipo":"checklist",
     "itens":["Checar funil (sessão→carrinho→compra)","Recuperação de carrinho","1 melhoria na página de produto"]},

    {"titulo":"Vendas pagas do dia","resp":null,"escopo":"time","cat":"vendas","tipo":"numerica","alvo":3,"unidade":"pedidos"},
    {"titulo":"Daily assíncrono preenchido","resp":null,"escopo":"time","cat":"gestao","tipo":"checklist",
     "itens":["Matheus: ontem/hoje/travado","João: ontem/hoje/travado"]}
  ]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
    RAISE EXCEPTION 'Tenant % não encontrado em public.tenants — ajuste v_tenant no topo do script.', v_tenant;
  END IF;

  FOR m IN SELECT * FROM jsonb_array_elements(v_metas) LOOP
    -- não duplicar: mesmo título + responsável + escopo já existente hoje
    IF EXISTS (
      SELECT 1 FROM public.metas_diarias
       WHERE tenant_id = v_tenant
         AND titulo = m->>'titulo'
         AND responsavel IS NOT DISTINCT FROM (m->>'resp')
         AND escopo = m->>'escopo'
         AND data = current_date
         AND deleted_at IS NULL
    ) THEN
      RAISE NOTICE 'já existe, pulando: % (%)', m->>'titulo', COALESCE(m->>'resp', 'time');
      CONTINUE;
    END IF;

    INSERT INTO public.metas_diarias
      (titulo, tipo, escopo, responsavel, categoria, valor_alvo, valor_atual, unidade, data, recorrente, concluida, tenant_id)
    VALUES
      (m->>'titulo', m->>'tipo', m->>'escopo', m->>'resp', m->>'cat',
       CASE WHEN m->>'tipo' = 'numerica' THEN (m->>'alvo')::numeric ELSE NULL END,
       0,
       CASE WHEN m->>'tipo' = 'numerica' THEN m->>'unidade' ELSE NULL END,
       current_date, true, false, v_tenant)
    RETURNING id INTO v_meta;

    IF m->>'tipo' = 'checklist' THEN
      v_ordem := 0;
      FOR v_item IN SELECT * FROM jsonb_array_elements_text(m->'itens') LOOP
        INSERT INTO public.meta_checklist_itens (meta_id, texto, feito, ordem, tenant_id)
        VALUES (v_meta, v_item, false, v_ordem, v_tenant);
        v_ordem := v_ordem + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;
