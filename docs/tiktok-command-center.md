# TikTok Command Center — plano de arquitetura

Módulo novo **dentro** do PURION OS (não é um CRM separado). Status: **aguardando aprovação** para o MVP.

---

## 1. Diagnóstico do repositório

| Área | O que existe hoje | Situação para o TikTok |
|---|---|---|
| Stack | Next.js 16.2.3 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind v4 + tokens shadcn, Zustand (`usePurionStore`), recharts, cmdk, framer-motion, zod | Reutiliza tudo. Nenhuma lib nova obrigatória; Vitest entra só para testes. |
| Banco / ORM | Supabase (Postgres) **sem ORM**: hooks `useX` com `supabase.from()` + `dbLog` + realtime por canal de nome único. Migrações SQL manuais em `supabase/`. | Mesmo padrão. Migração única, idempotente (`IF NOT EXISTS`). |
| Multi-tenant | `tenant_id DEFAULT public.meu_tenant_id()` + RLS por tabela. App nunca envia `tenant_id`. Rotas server (webhook/site) usam service role + `PURION_TENANT_ID`. | Todas as tabelas novas seguem a mesma regra. |
| Auth / permissões | Supabase Auth + `perfis.role` (`master`, `admin`, `membro`, `logistica`); `useIsMaster`, `useIsLogistica`; `useSocioAtual` (matheus/joao). `proxy.ts` protege páginas; `/api/` é público por rota. | `logistica` não vê o módulo. Aprovação final e custos/direitos: `master`/`admin`. |
| Marketing existente | `/marketing` (resumo + tráfego), `/trafego` (Meta/Google/**TikTok Ads** via API, só leitura), `/creators` (influencers + Doações UGC), `/afiliados` (cupom, cliques, vendas, pagamentos), `/growth` (experimentos ICE/AARRR), `/estrategias` (objetivos/OKR, aba Social com pilares e calendário semanal fixo), `/inteligencia`. | Já há peças soltas de TikTok, mas nenhuma entidade "vídeo". O módulo novo costura essas peças. |
| Creators | Tabela `creators` com `postagens` em **JSON dentro da linha** (sem histórico, sem entregas, sem direitos de uso). | Reutiliza a tabela como cadastro; colaborações, entregas e métricas viram tabelas próprias. |
| Amostras | `doacoes_ugc` (creator_id, quantidade, rastreio, custo, contrapartida, entregue_conteudo) com baixa de estoque. | **É** o `ProductSample`. Só ganha `colaboracao_id`. |
| Clientes/pedidos/produtos | `vendas` (Appmax + manual; `origem_venda` já tem `tiktok`, `cupom`, `sku_codigo`), `afiliado_vendas`, `produtos_sku`, `estoque_produto`, `leads_site` com UTM. Cliente único por CPF/e-mail (`lib/clientes.ts`). | Atribuição liga vídeo/creator/campanha a `vendas` por cupom, UTM ou manual — sem duplicar pedido. |
| Tarefas / calendário / arquivos | `tarefas` (kanban, lista, timeline, calendário, subtarefas, comentários, anexos no bucket `tarefa-anexos`), `eventos_calendario` (+ Google Calendar), `Meu trabalho`. | Tarefas do TikTok **são** `tarefas` com `modulo='tiktok'` → aparecem em Meu trabalho sem código novo. Mídia ganha bucket próprio privado. |
| APIs / webhooks / jobs | Rotas `api/*` com rate limit (Upstash), `webhook_logs`, cron diário `/api/alertas/check` (vercel.json — **não alterar**), `audit_log` (Configurações → Auditoria). | Automações rodam no cron existente (nova etapa dentro dele) + ao vivo no cliente. Sync log em tabela própria. |
| Testes | **Não há** framework de testes. | Adicionar Vitest para a lógica pura (CSV, deduplicação, regras de automação, inteligência). |

**Riscos encontrados**
- `creators.postagens` em JSON não escala para análise por vídeo → migrar leitura para `tt_publicacoes`, mantendo o JSON intacto (nada existente quebra).
- Calendário social de Estratégias é um gabarito semanal (dia × rede), não um calendário real. Fica como "modelo de semana"; o calendário real nasce das publicações.
- `/api/tiktok-ads` lê a Marketing API com token de ambiente; não grava nada. Mantido como está.

---

## 2. Arquitetura proposta

Uma rota **`/tiktok`** no grupo CRESCIMENTO da sidebar, com abas internas (mesmo padrão `InnerTabs` + `?tab=` + `useEstadoPersistido`):

```
/tiktok?tab=overview | estrategia | studio | calendario | creators | campanhas* | inteligencia* | shop* | acoes
                                                        (* = fase 2/3)
```

```
                ┌──────────────── TikTok Command Center (/tiktok) ────────────────┐
  Estratégia ── objetivos (estrategia_objetivos) · pilares (social_pilares) · campanhas · orçamento
      │
  Studio ────── tt_videos (ideia → … → publicado) ─ variantes ─ assets (bucket tiktok-midia)
      │                │                                   │
  Calendário ───── datas do vídeo/publicação          Creators ── creators ─ tt_colaboracoes ─ entregas
      │                │                                   │            └─ doacoes_ugc (amostras)
  Publicação ── tt_publicacoes ── tt_metricas (snapshot por dia; origem: manual | csv | api)
      │                                   │
  Vendas ─────── tt_atribuicoes ──► vendas / afiliado_vendas (sem duplicar pedido)
      │
  Inteligência ─ lib/tiktok/inteligencia.ts (puro, testado) ─► tt_aprendizados · growth_experimentos
      │
  Action Center ─ regras (lib/tiktok/automacoes.ts) ─► tarefas(modulo='tiktok') + notificacoes
```

**Princípios**
- **Um vídeo = uma entidade do começo ao fim.** A ideia é um `tt_video` com `status='ideia'`; promover para roteiro é mudar o status (zero cópia de dados, histórico contínuo).
- **Reuso antes de tabela nova** (ver seção 3).
- **Origem de todo número**: cada métrica e cada atribuição guarda `origem` (`manual`, `csv`, `api_display`, `api_marketing`, `api_shop`, `cupom`, `utm`) e `importacao_id`.
- **Nada é publicado nem gasto automaticamente.** Automações só criam tarefas, alertas e sugestões.
- Leituras pelo client com RLS (padrão atual). Escritas sensíveis (importação CSV, automações, sync de API) por **route handlers** com `zod`, sessão do usuário (`@supabase/ssr`) e rate limit.

---

## 3. Modelo de dados

### 3.1 Mapeamento das entidades pedidas

| Entidade | Implementação | Tipo |
|---|---|---|
| StrategicObjective | `estrategia_objetivos` (+ `area='tiktok'`) | **reuso** |
| (Pilar editorial) | `social_pilares` (+ `rede`) | **reuso** |
| Campaign | `tt_campanhas` (orgânica, paga, comercial, creator, shop) | nova |
| CreativeIdea | `tt_videos` com `status='ideia'` | nova (unificada) |
| VideoProject | `tt_videos` | nova |
| VideoVariant | `tt_variantes` | nova |
| ContentAsset | `tt_assets` + bucket privado `tiktok-midia` | nova |
| Publication | `tt_publicacoes` | nova |
| ContentPerformanceSnapshot | `tt_metricas` | nova |
| Experiment | `growth_experimentos` (+ `campanha_id`, `variante_a_id`, `variante_b_id`, `amostra_min`, `resultado`) | **reuso** |
| Creator | `creators` (+ `tiktok_handle`, `etapa_funil`, `media_views_tiktok`, `taxa_media`) | **reuso** |
| CreatorCollaboration | `tt_colaboracoes` | nova |
| CreatorDeliverable | `tt_entregas` | nova |
| ProductSample | `doacoes_ugc` (+ `colaboracao_id`) | **reuso** |
| MarketingExpense | `financeiro` (categoria `marketing_tiktok`, + `tt_video_id`, `tt_campanha_id`, `creator_id`) | **reuso** |
| SalesAttribution | `tt_atribuicoes` → `vendas.id` | nova |
| MarketingTask | `tarefas` (`modulo='tiktok'`, + `origem_tipo`, `origem_id`, `regra`) | **reuso** |
| LearningInsight | `tt_aprendizados` | nova |
| IntegrationSyncLog | `integracao_sync_logs` (genérica, serve a outras integrações) | nova |
| (Pedidos TikTok Shop) | `vendas` com `origem_venda='tiktok_shop'` + `tt_shop_pedidos` (taxas/comissão) | fase 3 |
| (Histórico) | `audit_log` existente + `tt_video_historico` (status/aprovações) | reuso + nova |

### 3.2 Tabelas novas (todas com `id uuid`, `tenant_id DEFAULT meu_tenant_id()`, RLS por tenant, `created_at`, `updated_at`, `deleted_at` onde houver lixeira)

**`tt_campanhas`** — nome, tipo (`organica|paga|comercial|creator|shop`), objetivo_id → estrategia_objetivos, status (`planejada|ativa|pausada|encerrada`), inicio, fim, orcamento_previsto, publico, hipotese, meta_principal (`views|cliques|vendas|seguidores`), meta_valor, utm_campaign (único por tenant), responsavel.

**`tt_videos`** — codigo interno (`TT-0001`, sequência por tenant), titulo, pilar_id → social_pilares, campanha_id, objetivo_comercial (`awareness|consideracao|conversao|recompra|presente`), publico, formato (`ugc|lifestyle|produto|tutorial|trend|depoimento|unboxing|bastidor`), gancho, gancho_tipo (`pergunta|choque|antes_depois|pov|prova|lista|historia`), roteiro (texto), cta, duracao_seg, status (`ideia|roteiro|aprovacao_roteiro|producao|edicao|aprovacao_final|agendado|publicado|analisado|arquivado`), prioridade, responsavel, creator_id, colaboracao_id, data_gravacao, data_prevista_publicacao, thumbnail_asset_id, direitos_uso (`organico|ads_30d|ads_90d|ads_ilimitado|nenhum`), direitos_ate, custo_producao, proximas_acoes, notas, score_ideia (ICE 1–10), aprovado_por, aprovado_em.

**`tt_video_historico`** — video_id, de_status, para_status, autor, comentario, created_at (trigger em mudança de status/aprovação).

**`tt_variantes`** — video_id, rotulo (`A`, `B`…), o_que_muda (`gancho|thumbnail|cta|duracao|musica|legenda|creator`), descricao, gancho, duracao_seg, asset_id, status.

**`tt_assets`** — video_id, variante_id, tipo (`bruto|editado|thumbnail|referencia|roteiro|briefing|outro`), storage_path (bucket privado; URL assinada na leitura) **ou** url_externa (referência TikTok/Drive), nome, mime, tamanho, enviado_por.

**`tt_publicacoes`** — video_id, variante_id, conta (`@purion…` ou do creator), plataforma (`tiktok`, extensível), url, tiktok_item_id (único por tenant quando presente), publicado_em, tipo (`organico|spark_ad|ad|creator`), utm_content, cupom.

**`tt_metricas`** — publicacao_id, data_referencia, views, alcance, likes, comentarios, compartilhamentos, salvos, seguidores_ganhos, tempo_medio_seg, retencao_3s, conclusao_pct, cliques, gasto, origem, importacao_id, coletado_em. **Único (publicacao_id, data_referencia, origem)** → reimportar atualiza, não duplica (atualização incremental).

**`tt_colaboracoes`** — creator_id, campanha_id, etapa (`prospect|contatado|negociando|fechado|amostra_enviada|produzindo|entregue|pago|encerrado|recusado`), tipo_acordo (`permuta|cache|comissao|hibrido`), cache, comissao_pct, cupom, prazo_entrega, direitos_uso, direitos_ate, contrato_url, responsavel, notas.

**`tt_entregas`** — colaboracao_id, video_id, descricao, prazo, status (`pendente|recebida|aprovada|ajuste|publicada`), recebida_em, link.

**`tt_atribuicoes`** — venda_id → vendas (**único por venda + modelo**), video_id, publicacao_id, campanha_id, creator_id, metodo (`cupom|utm|link_afiliado|tiktok_shop|manual`), modelo (`ultimo_toque` no MVP), peso (1.0), valor, confianca (`alta` cupom/shop, `media` UTM, `baixa` manual).

**`tt_aprendizados`** — titulo, descricao, evidencia (JSON com ids e números), escopo (`gancho|formato|duracao|creator|pilar|campanha`), amostra_n, confianca, status (`hipotese|validado|descartado`), experimento_id, autor.

**`integracao_sync_logs`** — integracao (`tiktok_display|tiktok_marketing|tiktok_shop|csv|pixel`), operacao, status (`ok|parcial|erro`), registros_lidos, inseridos, atualizados, ignorados, erros (JSON), cursor (para incremental), iniciado_em, concluido_em, autor.

### 3.3 Ficha do vídeo (todos os campos pedidos)
Título e ID → `codigo`, `titulo` · Pilar → `pilar_id` · Objetivo comercial · Público · Gancho → `gancho` + `gancho_tipo` · Roteiro · Versões → `tt_variantes` · Arquivos e thumbnail → `tt_assets` · Creator e responsável · Datas e status (+ histórico) · URL → `tt_publicacoes.url` · Direitos de uso → `direitos_uso` + `direitos_ate` · Métricas → `tt_metricas` · Custos → `custo_producao` + `financeiro` vinculado · Vendas atribuídas → `tt_atribuicoes` · Aprendizados → `tt_aprendizados` · Próximas ações → `proximas_acoes` + tarefas vinculadas.

### 3.4 Economia de referência (configurável, não fixa no código)
Preço-base R$ 97,90 · custo R$ 30,00 → margem bruta R$ 67,90/unidade. Lidos de `produtos_sku`/`configuracoes` (já existentes). Taxa e comissão do TikTok Shop são **campos de configuração** — não são presumidos.

---

## 4. Wireframes textuais

Padrões do app: barra `toolbar` (busca + filtros + `Segmentado` de visão), `MetricStrip` clicável, um único botão verde (`btn-accent`) por tela, ações em lote (`BulkActionsBar`), Esc fecha / Ctrl+Enter salva.

**4.1 Overview**
```
[ Período: 7d | 30d | 90d ]                                        [ + Nova ideia ]
┌ Vídeos publicados │ Views │ Taxa de conclusão │ Vendas atribuídas │ Receita │ Custo/venda ┐  ← clicáveis
┌ Funil de produção (ideia → publicado, gargalo destacado) ┐ ┌ Atenção agora (5 itens) ┐
┌ Top 5 vídeos (views, conclusão, vendas)                   ┐ ┌ Creators com entrega na semana ┐
┌ Views × vendas por semana (barras + linha)                                            ┐
Estado vazio: "Nenhum vídeo publicado no período" + atalho para o Studio.
```

**4.2 Strategy Hub**
```
Objetivos TikTok (cards: meta, atual, % e prazo)          [ + Objetivo ]
Pilares (barra de distribuição planejada × realizada nos últimos 30d)
Campanhas (tabela: nome, tipo, período, orçamento previsto × gasto, meta, status)
Públicos e hipóteses (lista curta por campanha)
```

**4.3 Creative Studio**
```
[ busca ] [ pilar ▾ ] [ status ▾ ] [ creator ▾ ] [ responsável ▾ ]   (Quadro | Lista)   [ + Ideia ]
Quadro: colunas por status, arrastar muda o status (regras de aprovação respeitadas)
  card: código · título · gancho (1 linha) · thumb · creator · data · selos (atrasado, sem roteiro, aguardando aprovação)
Captura rápida: digitar título + Enter cria ideia na coluna "Ideia".
Ficha (drawer lateral, abas): Briefing | Roteiro | Versões | Arquivos | Publicação & métricas | Vendas | Histórico
  ações: Aprovar roteiro / Pedir ajuste (só master/admin) · Duplicar como variante · Arquivar
Lote: mudar status, responsável, pilar, campanha, data; arquivar.
```

**4.4 Content Calendar**
```
(Semana | Mês | Lista | Quadro)  ← < hoje >   [ pilar ▾ ] [ conta ▾ ]
Semana: 7 colunas, card do vídeo no dia previsto; arrastar muda a data.
Mês: grade com pontos por pilar (cor) e contagem; clique abre o dia.
Linha "Modelo da semana" (gabarito de Estratégias → Social) mostra os buracos do plano.
```

**4.5 Creator Network**
```
[ busca ] [ etapa ▾ ] [ campanha ▾ ]   (Funil | Lista)                         [ + Creator ]
Funil: prospect → contatado → negociando → fechado → amostra enviada → produzindo → entregue → pago
  card: @handle · seguidores · views médias · acordo (R$) · próximo prazo · selos (amostra parada, entrega atrasada)
Ficha: Perfil | Colaborações | Entregas | Amostras (doacoes_ugc) | Resultados (views, vendas, custo/venda) | Direitos de uso | Histórico
```

**4.6 Action Center**
```
Hoje (n)   Atrasadas (n)   Esta semana (n)   Sugestões (n)
Lista única, ordenada por prioridade: [ícone] o que fazer · por quê · prazo · [Feito] [Abrir] [Adiar]
Sugestões têm "Criar tarefa" / "Ignorar" e mostram a evidência (ex.: "3 de 4 vídeos com gancho POV acima da mediana, n=12").
```

**Fases seguintes** — Campaign Manager (tabela de campanhas com criativos, UTMs gerados, gasto × resultado, experimentos A/B) · Intelligence (performance por gancho, duração, creator, pilar, campanha; aprendizados) · Shop (pedidos, receita, taxas, comissões, margem por pedido).

---

## 5. Automações (sem publicar nem gastar)

Regras puras em `lib/tiktok/automacoes.ts`, executadas (a) ao vivo no Action Center e (b) no cron diário existente, que grava tarefas idempotentes (`origem_tipo`+`origem_id`+`regra` único → nunca duplica):

| Regra | Gatilho | Ação |
|---|---|---|
| Roteiro aprovado | status → `producao` | tarefa "Gravar TT-0012" para o responsável, prazo = data_gravacao |
| Aguardando aprovação | `aprovacao_*` há > 2 dias | tarefa para master/admin |
| Atrasado | data prevista < hoje e status < `publicado` | alerta + selo vermelho |
| Publicado sem métrica | publicado há ≥ 3 dias sem `tt_metricas` | tarefa "Lançar métricas" |
| Merece revisão | ≥ 7 dias publicado e conclusão/views < P25 do pilar (amostra ≥ 8) | sugestão de análise |
| Merece escalar | views e vendas > P75 com direito de uso para ads | **sugestão** de Spark Ad (só sugestão) |
| Variantes | 2+ variantes com métricas | comparação lado a lado e vencedor só se diferença > limiar e n mínimo |
| Creator | amostra entregue há 7 dias sem conteúdo / entrega vencida / direitos vencendo em 7 dias | tarefa para o responsável |
| Relatório semanal | domingo | resumo gravado e exibido no Overview |
| Novo experimento | aprendizado em `hipotese` com n insuficiente | sugere experimento com amostra necessária |

---

## 6. Integrações

| Fonte | Como | Pré-requisito (não presumido) |
|---|---|---|
| Manual | formulário rápido de métricas na ficha | — (MVP) |
| CSV | upload → pré-visualização → validação zod por linha → upsert por (publicação, data, origem) → `integracao_sync_logs` | — (fase 2) |
| TikTok Display API | OAuth do criador/conta da marca; `video.list` para métricas públicas da própria conta | app aprovado no TikTok for Developers + scopes `user.info.basic`, `video.list` |
| TikTok Marketing API | já há leitura em `/api/tiktok-ads`; passa a gravar snapshot por anúncio ligado a `tt_publicacoes` via `tiktok_item_id` | token e advertiser já configurados? Validar acesso. |
| TikTok Shop Partner API | pedidos, taxas e comissões → `vendas` (`origem_venda='tiktok_shop'`) + `tt_shop_pedidos` | conta Seller + app Partner aprovado |
| Pixel / Events API do site | site dispara eventos com `event_id` = id do pedido para deduplicar browser × servidor | pixel id + token; feito no repositório do site |
| Pedidos do CRM | `tt_atribuicoes` liga `vendas` por cupom → UTM (`utm_content`) → manual | — |

Sem scraping. Deduplicação: `tiktok_item_id` único, métricas únicas por (publicação, data, origem), atribuição única por (venda, modelo), eventos com `event_id`.

---

## 7. Inteligência criativa

`lib/tiktok/inteligencia.ts` (funções puras, testadas):
- Agrupa publicações por dimensão (gancho_tipo, formato, faixa de duração, creator, pilar, campanha) e calcula mediana e P25/P75 de views, conclusão, engajamento e vendas por 1.000 views.
- **Só recomenda com amostra suficiente**: n ≥ 8 por grupo e ≥ 3 publicações em semanas diferentes; caso contrário mostra "amostra insuficiente (n=3 de 8)".
- Comparação de variantes: diferença relativa + regra de amostra; não declara vencedor abaixo do limiar.
- Cada sugestão traz a evidência (ids e números) e vira `tt_aprendizados` com status `hipotese` → `validado` após experimento.

---

## 8. Segurança e qualidade

- RLS por tenant em todas as tabelas novas; bucket `tiktok-midia` privado com policy por tenant e URLs assinadas.
- `logistica` sem acesso ao módulo; aprovar e editar custos/direitos: `master` e `admin`.
- Histórico: `tt_video_historico` (status/aprovações) + `audit_log` existente para alterações.
- Validação server-side com zod nas rotas `/api/tiktok/*` (importação, automações, sync), com sessão e rate limit.
- APIs documentadas em `docs/tiktok-api.md`.
- Migração única idempotente; nenhuma coluna existente removida ou renomeada.
- Testes: Vitest para `inteligencia`, `automacoes`, `csv` e `deduplicacao`; Playwright para o fluxo ideia → publicado.
- Dados demonstrativos só em dev: `supabase/seed_tiktok_demo.sql` marcado DEV, nunca incluído na migração; a UI nunca inventa números.
- Nada existente muda de comportamento: Creators, UGC, Growth, Estratégias e Tarefas continuam como estão; o módulo novo só lê/estende.

---

## 9. Plano por fases

| Fase | Entrega | Inclui |
|---|---|---|
| **1 — MVP** | Overview, Strategy Hub, Creative Studio, Content Calendar, Creator Network, Action Center | migração base, bucket, hooks, ficha do vídeo completa, kanban com arrastar, calendário semana/mês/lista, funil de creators com entregas e amostras, métricas manuais, atribuição manual/por cupom, automações de tarefa e alertas, testes das regras |
| 2 — Medição | Campaign Manager, CSV, Intelligence básica | importação validada com log, UTMs gerados por vídeo, experimentos A/B ligados a variantes, relatórios por gancho/duração/creator/pilar, relatório semanal |
| 3 — APIs | Display API, Marketing API gravando snapshots, TikTok Shop, Events API | OAuth, sync incremental com cursor, Shop com taxas e margem por pedido |

---

## 10. Arquivos (fase 1)

**Criar**
- `supabase/migration_tiktok_command_center.sql`
- `src/app/tiktok/page.tsx`
- `src/components/tiktok/TikTokHub.tsx` (abas)
- `src/components/tiktok/overview/OverviewTikTok.tsx`
- `src/components/tiktok/estrategia/StrategyHub.tsx`, `ModalCampanha.tsx`
- `src/components/tiktok/studio/CreativeStudio.tsx`, `StudioKanban.tsx`, `StudioLista.tsx`, `FichaVideo.tsx` (+ abas), `CapturaRapida.tsx`
- `src/components/tiktok/calendario/CalendarioConteudo.tsx`
- `src/components/tiktok/creators/CreatorNetwork.tsx`, `FichaCreator.tsx`, `ModalColaboracao.tsx`
- `src/components/tiktok/acoes/ActionCenter.tsx`
- `src/hooks/useTikTok.ts` (vídeos, variantes, assets, publicações, métricas), `useTikTokCreators.ts`, `useTikTokCampanhas.ts`
- `src/lib/tiktok/tipos.ts`, `status.ts`, `automacoes.ts`, `inteligencia.ts`, `atribuicao.ts`
- `src/app/api/tiktok/automacoes/route.ts`
- `src/lib/tiktok/__tests__/*.test.ts`, `vitest.config.ts`
- `docs/tiktok-api.md`

**Modificar (mínimo, sem mudar comportamento)**
- `src/components/layout/navConfig.ts` — item "TikTok" em CRESCIMENTO
- `src/lib/acaoRapida.ts` + `ContentHeader.tsx` — "Nova ideia de vídeo" no menu Criar e na paleta
- `src/app/api/alertas/check/route.ts` — chama as regras do TikTok (mesmo cron; `vercel.json` intocado)
- `src/store/index.ts` — tipos novos
- `package.json` — `vitest` (dev) e script `test`

---

## 11. Critérios de aceite (MVP)

1. Item "TikTok" aparece em CRESCIMENTO para master/admin/membro e não aparece para logística.
2. Ideia criada em ≤ 2 interações (título + Enter) e recebe código `TT-0001` sequencial.
3. Arrastar um card no Studio muda o status, grava no histórico e respeita aprovação (membro não aprova).
4. A ficha do vídeo contém **todos** os campos da seção 3.3 e salva cada aba sem perder dados das outras.
5. Upload de vídeo/thumbnail vai para bucket privado; o preview abre por URL assinada; ninguém de outro tenant acessa.
6. Calendário semana/mês/lista mostra os vídeos pela data prevista; arrastar muda a data.
7. Creator Network: funil por etapa, colaboração com entregas e amostras (`doacoes_ugc`), custo e vendas por creator.
8. Métrica manual na publicação aparece no Overview; relançar a mesma data atualiza em vez de duplicar.
9. Venda com cupom do creator/vídeo é atribuída uma única vez; atribuição manual exige escolher a venda existente.
10. Action Center lista atrasados, aprovações paradas, publicações sem métrica e pendências de creators; tarefas automáticas não duplicam ao rodar a regra duas vezes e aparecem em Meu trabalho.
11. Nenhuma sugestão aparece com amostra abaixo do mínimo; nenhuma ação publica conteúdo ou altera orçamento.
12. Estados vazio, carregando e erro em todas as abas; layout utilizável em 375 px.
13. `npm run build` limpo, `npm test` verde, e Creators/UGC/Growth/Estratégias/Tarefas funcionam como antes.
