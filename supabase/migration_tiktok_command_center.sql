-- ═══════════════════════════════════════════════════════════════════════════
-- TikTok Command Center — MVP
-- Idempotente: pode rodar mais de uma vez. Não remove nem renomeia nada existente.
-- tenant_id sempre por DEFAULT public.meu_tenant_id(); RLS por tenant em tudo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Campanhas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_campanhas (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text        NOT NULL,
  tipo               text        NOT NULL DEFAULT 'organica',   -- organica | paga | comercial | creator | shop
  objetivo_id        uuid,                                       -- estrategia_objetivos.id (opcional)
  status             text        NOT NULL DEFAULT 'planejada',  -- planejada | ativa | pausada | encerrada
  inicio             date,
  fim                date,
  orcamento_previsto numeric(12,2) NOT NULL DEFAULT 0,
  publico            text,
  hipotese           text,
  meta_principal     text        NOT NULL DEFAULT 'views',      -- views | cliques | vendas | seguidores
  meta_valor         numeric(14,2),
  utm_campaign       text,
  responsavel        text        NOT NULL DEFAULT 'matheus',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  tenant_id          uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_tt_camp_tipo   CHECK (tipo IN ('organica','paga','comercial','creator','shop')),
  CONSTRAINT chk_tt_camp_status CHECK (status IN ('planejada','ativa','pausada','encerrada'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tt_camp_utm ON public.tt_campanhas (tenant_id, utm_campaign) WHERE utm_campaign IS NOT NULL AND deleted_at IS NULL;

-- ── 2. Colaborações com creators (reusa public.creators como cadastro) ─────
CREATE TABLE IF NOT EXISTS public.tt_colaboracoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     uuid        NOT NULL,                           -- public.creators.id
  campanha_id    uuid        REFERENCES public.tt_campanhas(id) ON DELETE SET NULL,
  etapa          text        NOT NULL DEFAULT 'prospect',
  tipo_acordo    text        NOT NULL DEFAULT 'permuta',         -- permuta | cache | comissao | hibrido
  cache          numeric(12,2) NOT NULL DEFAULT 0,
  comissao_pct   numeric(5,2)  NOT NULL DEFAULT 0,
  cupom          text,
  prazo_entrega  date,
  direitos_uso   text        NOT NULL DEFAULT 'organico',        -- nenhum | organico | ads_30d | ads_90d | ads_ilimitado
  direitos_ate   date,
  contrato_url   text,
  responsavel    text        NOT NULL DEFAULT 'matheus',
  notas          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  tenant_id      uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_tt_colab_etapa CHECK (etapa IN ('prospect','contatado','negociando','fechado','amostra_enviada','produzindo','entregue','pago','encerrado','recusado')),
  CONSTRAINT chk_tt_colab_acordo CHECK (tipo_acordo IN ('permuta','cache','comissao','hibrido')),
  CONSTRAINT chk_tt_colab_direitos CHECK (direitos_uso IN ('nenhum','organico','ads_30d','ads_90d','ads_ilimitado'))
);
CREATE INDEX IF NOT EXISTS idx_tt_colab_creator ON public.tt_colaboracoes (creator_id);

-- ── 3. Vídeos (a ideia já é o vídeo, com status 'ideia') ─────────────────────
CREATE TABLE IF NOT EXISTS public.tt_videos (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                    text,                                  -- TT-0001 (gerado por trigger, por tenant)
  titulo                    text        NOT NULL,
  pilar                     text,                                  -- nome do pilar (social_pilares.nome)
  campanha_id               uuid        REFERENCES public.tt_campanhas(id) ON DELETE SET NULL,
  objetivo_comercial        text        NOT NULL DEFAULT 'awareness',
  publico                   text,
  formato                   text,
  gancho                    text,
  gancho_tipo               text,
  roteiro                   text,
  cta                       text,
  duracao_seg               int,
  status                    text        NOT NULL DEFAULT 'ideia',
  prioridade                text        NOT NULL DEFAULT 'media',  -- alta | media | baixa
  responsavel               text        NOT NULL DEFAULT 'matheus',
  creator_id                uuid,
  colaboracao_id            uuid        REFERENCES public.tt_colaboracoes(id) ON DELETE SET NULL,
  data_gravacao             date,
  data_prevista_publicacao  date,
  thumbnail_path            text,
  direitos_uso              text        NOT NULL DEFAULT 'organico',
  direitos_ate              date,
  custo_producao            numeric(12,2) NOT NULL DEFAULT 0,
  proximas_acoes            text,
  aprendizado               text,
  notas                     text,
  score_ideia               int,
  aprovado_por              text,
  aprovado_em               timestamptz,
  status_desde              timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz,
  tenant_id                 uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_tt_video_status CHECK (status IN ('ideia','roteiro','aprovacao_roteiro','producao','edicao','aprovacao_final','agendado','publicado','analisado','arquivado')),
  CONSTRAINT chk_tt_video_obj CHECK (objetivo_comercial IN ('awareness','consideracao','conversao','recompra','presente')),
  CONSTRAINT chk_tt_video_prio CHECK (prioridade IN ('alta','media','baixa')),
  CONSTRAINT chk_tt_video_direitos CHECK (direitos_uso IN ('nenhum','organico','ads_30d','ads_90d','ads_ilimitado'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tt_video_codigo ON public.tt_videos (tenant_id, codigo);
CREATE INDEX IF NOT EXISTS idx_tt_video_status ON public.tt_videos (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tt_video_data   ON public.tt_videos (data_prevista_publicacao) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.tt_video_historico (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid        NOT NULL REFERENCES public.tt_videos(id) ON DELETE CASCADE,
  de_status   text,
  para_status text,
  autor       text,
  comentario  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid        NOT NULL DEFAULT public.meu_tenant_id()
);
CREATE INDEX IF NOT EXISTS idx_tt_hist_video ON public.tt_video_historico (video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tt_variantes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid        NOT NULL REFERENCES public.tt_videos(id) ON DELETE CASCADE,
  rotulo       text        NOT NULL DEFAULT 'A',
  o_que_muda   text        NOT NULL DEFAULT 'gancho',   -- gancho | thumbnail | cta | duracao | musica | legenda | creator
  descricao    text,
  gancho       text,
  duracao_seg  int,
  status       text        NOT NULL DEFAULT 'planejada', -- planejada | pronta | publicada | descartada
  created_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid        NOT NULL DEFAULT public.meu_tenant_id()
);
CREATE INDEX IF NOT EXISTS idx_tt_var_video ON public.tt_variantes (video_id);

CREATE TABLE IF NOT EXISTS public.tt_assets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      uuid        NOT NULL REFERENCES public.tt_videos(id) ON DELETE CASCADE,
  variante_id   uuid        REFERENCES public.tt_variantes(id) ON DELETE SET NULL,
  tipo          text        NOT NULL DEFAULT 'bruto',   -- bruto | editado | thumbnail | referencia | roteiro | briefing | outro
  nome          text        NOT NULL,
  storage_path  text,                                   -- bucket privado tiktok-midia
  url_externa   text,                                   -- referência (TikTok, Drive)
  mime          text,
  tamanho       bigint,
  enviado_por   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  tenant_id     uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT chk_tt_asset_fonte CHECK (storage_path IS NOT NULL OR url_externa IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_tt_asset_video ON public.tt_assets (video_id);

-- ── 4. Publicações e métricas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_publicacoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        uuid        NOT NULL REFERENCES public.tt_videos(id) ON DELETE CASCADE,
  variante_id     uuid        REFERENCES public.tt_variantes(id) ON DELETE SET NULL,
  conta           text,
  plataforma      text        NOT NULL DEFAULT 'tiktok',
  url             text,
  tiktok_item_id  text,
  publicado_em    timestamptz NOT NULL DEFAULT now(),
  tipo            text        NOT NULL DEFAULT 'organico',  -- organico | spark_ad | ad | creator
  utm_content     text,
  cupom           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  tenant_id       uuid        NOT NULL DEFAULT public.meu_tenant_id()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tt_pub_item ON public.tt_publicacoes (tenant_id, tiktok_item_id) WHERE tiktok_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tt_pub_video ON public.tt_publicacoes (video_id);

CREATE TABLE IF NOT EXISTS public.tt_metricas (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacao_id      uuid        NOT NULL REFERENCES public.tt_publicacoes(id) ON DELETE CASCADE,
  data_referencia    date        NOT NULL DEFAULT CURRENT_DATE,
  views              bigint      NOT NULL DEFAULT 0,
  alcance            bigint,
  likes              bigint      NOT NULL DEFAULT 0,
  comentarios        bigint      NOT NULL DEFAULT 0,
  compartilhamentos  bigint      NOT NULL DEFAULT 0,
  salvos             bigint      NOT NULL DEFAULT 0,
  seguidores_ganhos  int,
  tempo_medio_seg    numeric(8,2),
  retencao_3s        numeric(5,2),
  conclusao_pct      numeric(5,2),
  cliques            bigint,
  gasto              numeric(12,2),
  origem             text        NOT NULL DEFAULT 'manual',  -- manual | csv | api_display | api_marketing | api_shop
  importacao_id      uuid,
  coletado_em        timestamptz NOT NULL DEFAULT now(),
  tenant_id          uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT uq_tt_metrica UNIQUE (publicacao_id, data_referencia, origem)
);

-- ── 5. Entregas de creators ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_entregas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  colaboracao_id  uuid        NOT NULL REFERENCES public.tt_colaboracoes(id) ON DELETE CASCADE,
  video_id        uuid        REFERENCES public.tt_videos(id) ON DELETE SET NULL,
  descricao       text        NOT NULL,
  prazo           date,
  status          text        NOT NULL DEFAULT 'pendente',  -- pendente | recebida | ajuste | aprovada | publicada
  recebida_em     timestamptz,
  link            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  tenant_id       uuid        NOT NULL DEFAULT public.meu_tenant_id()
);
CREATE INDEX IF NOT EXISTS idx_tt_entrega_colab ON public.tt_entregas (colaboracao_id);

-- ── 6. Atribuição de vendas (liga pedidos existentes; nunca duplica pedido) ──
CREATE TABLE IF NOT EXISTS public.tt_atribuicoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id       uuid        NOT NULL,                     -- public.vendas.id
  video_id       uuid        REFERENCES public.tt_videos(id) ON DELETE SET NULL,
  publicacao_id  uuid        REFERENCES public.tt_publicacoes(id) ON DELETE SET NULL,
  campanha_id    uuid        REFERENCES public.tt_campanhas(id) ON DELETE SET NULL,
  creator_id     uuid,
  metodo         text        NOT NULL DEFAULT 'manual',    -- cupom | utm | link_afiliado | tiktok_shop | manual
  modelo         text        NOT NULL DEFAULT 'ultimo_toque',
  peso           numeric(4,3) NOT NULL DEFAULT 1,
  valor          numeric(12,2) NOT NULL DEFAULT 0,
  confianca      text        NOT NULL DEFAULT 'baixa',     -- alta | media | baixa
  autor          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  tenant_id      uuid        NOT NULL DEFAULT public.meu_tenant_id(),
  CONSTRAINT uq_tt_atrib_venda UNIQUE (venda_id, modelo)
);

-- ── 7. Aprendizados e logs de integração ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_aprendizados (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text        NOT NULL,
  descricao       text,
  evidencia       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  escopo          text        NOT NULL DEFAULT 'gancho',
  amostra_n       int         NOT NULL DEFAULT 0,
  confianca       text        NOT NULL DEFAULT 'baixa',
  status          text        NOT NULL DEFAULT 'hipotese',  -- hipotese | validado | descartado
  experimento_id  uuid,
  autor           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  tenant_id       uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

CREATE TABLE IF NOT EXISTS public.integracao_sync_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao       text        NOT NULL,   -- tiktok_display | tiktok_marketing | tiktok_shop | csv | pixel | manual
  operacao         text        NOT NULL,
  status           text        NOT NULL DEFAULT 'ok',  -- ok | parcial | erro
  registros_lidos  int         NOT NULL DEFAULT 0,
  inseridos        int         NOT NULL DEFAULT 0,
  atualizados      int         NOT NULL DEFAULT 0,
  ignorados        int         NOT NULL DEFAULT 0,
  erros            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  cursor           text,
  iniciado_em      timestamptz NOT NULL DEFAULT now(),
  concluido_em     timestamptz,
  autor            text,
  tenant_id        uuid        NOT NULL DEFAULT public.meu_tenant_id()
);

-- ── 8. Extensões de tabelas existentes (só colunas novas, opcionais) ─────────
ALTER TABLE IF EXISTS public.creators            ADD COLUMN IF NOT EXISTS tiktok_handle      text;
ALTER TABLE IF EXISTS public.creators            ADD COLUMN IF NOT EXISTS media_views_tiktok bigint;
ALTER TABLE IF EXISTS public.doacoes_ugc         ADD COLUMN IF NOT EXISTS colaboracao_id     uuid;
ALTER TABLE IF EXISTS public.social_pilares      ADD COLUMN IF NOT EXISTS rede               text;
ALTER TABLE IF EXISTS public.growth_experimentos ADD COLUMN IF NOT EXISTS tt_campanha_id     uuid;
ALTER TABLE IF EXISTS public.growth_experimentos ADD COLUMN IF NOT EXISTS variante_a_id      uuid;
ALTER TABLE IF EXISTS public.growth_experimentos ADD COLUMN IF NOT EXISTS variante_b_id      uuid;
ALTER TABLE IF EXISTS public.growth_experimentos ADD COLUMN IF NOT EXISTS amostra_min        int;
ALTER TABLE IF EXISTS public.financeiro          ADD COLUMN IF NOT EXISTS tt_video_id        uuid;
ALTER TABLE IF EXISTS public.financeiro          ADD COLUMN IF NOT EXISTS tt_campanha_id     uuid;
ALTER TABLE IF EXISTS public.financeiro          ADD COLUMN IF NOT EXISTS creator_id         uuid;
-- tarefas automáticas: a mesma regra para o mesmo item nunca gera duas tarefas
ALTER TABLE IF EXISTS public.tarefas             ADD COLUMN IF NOT EXISTS origem_tipo        text;
ALTER TABLE IF EXISTS public.tarefas             ADD COLUMN IF NOT EXISTS origem_id          text;
ALTER TABLE IF EXISTS public.tarefas             ADD COLUMN IF NOT EXISTS regra              text;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tarefas' AND column_name='tenant_id') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tarefas_regra_origem ON public.tarefas (tenant_id, origem_tipo, origem_id, regra) WHERE regra IS NOT NULL;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tarefas_regra_origem ON public.tarefas (origem_tipo, origem_id, regra) WHERE regra IS NOT NULL;
  END IF;
END $$;

-- ── 9. Código sequencial TT-0001 e histórico de status ──────────────────────
CREATE OR REPLACE FUNCTION public.tt_video_antes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prox int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codigo IS NULL THEN
      PERFORM pg_advisory_xact_lock(hashtext('tt_videos_codigo_' || NEW.tenant_id::text));
      SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::int), 0) + 1 INTO prox
        FROM public.tt_videos WHERE tenant_id = NEW.tenant_id;
      NEW.codigo := 'TT-' || lpad(prox::text, 4, '0');
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_desde := now(); END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tt_video_antes ON public.tt_videos;
CREATE TRIGGER trg_tt_video_antes BEFORE INSERT OR UPDATE ON public.tt_videos
  FOR EACH ROW EXECUTE FUNCTION public.tt_video_antes();

CREATE OR REPLACE FUNCTION public.tt_video_historico_log()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tt_video_historico (video_id, de_status, para_status, autor, tenant_id)
    VALUES (NEW.id, NULL, NEW.status, NEW.responsavel, NEW.tenant_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em THEN
    INSERT INTO public.tt_video_historico (video_id, de_status, para_status, autor, comentario, tenant_id)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.aprovado_por, NEW.responsavel),
            CASE WHEN NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em AND NEW.aprovado_em IS NOT NULL THEN 'aprovado' END,
            NEW.tenant_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tt_video_hist ON public.tt_videos;
CREATE TRIGGER trg_tt_video_hist AFTER INSERT OR UPDATE ON public.tt_videos
  FOR EACH ROW EXECUTE FUNCTION public.tt_video_historico_log();

-- ── 10. RLS por tenant + bloqueio da logística + realtime ───────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tt_campanhas','tt_colaboracoes','tt_videos','tt_video_historico','tt_variantes','tt_assets',
                           'tt_publicacoes','tt_metricas','tt_entregas','tt_atribuicoes','tt_aprendizados','integracao_sync_logs']
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', 'idx_' || t || '_tenant', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I USING (tenant_id = public.meu_tenant_id()) WITH CHECK (tenant_id = public.meu_tenant_id())', 'tenant_' || t, t);
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sou_logistica') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'logistica_bloqueio', t);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.sou_logistica()) WITH CHECK (NOT public.sou_logistica())', 'logistica_bloqueio', t);
    END IF;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- ── 11. Bucket privado para mídia (pasta = tenant_id) ───────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('tiktok-midia', 'tiktok-midia', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "tiktok_midia_tenant_select" ON storage.objects;
CREATE POLICY "tiktok_midia_tenant_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tiktok-midia' AND (storage.foldername(name))[1] = public.meu_tenant_id()::text);
DROP POLICY IF EXISTS "tiktok_midia_tenant_insert" ON storage.objects;
CREATE POLICY "tiktok_midia_tenant_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tiktok-midia' AND (storage.foldername(name))[1] = public.meu_tenant_id()::text);
DROP POLICY IF EXISTS "tiktok_midia_tenant_delete" ON storage.objects;
CREATE POLICY "tiktok_midia_tenant_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tiktok-midia' AND (storage.foldername(name))[1] = public.meu_tenant_id()::text);

-- Conferência rápida (deve listar as 12 tabelas):
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE 'tt\_%' OR table_name='integracao_sync_logs');
