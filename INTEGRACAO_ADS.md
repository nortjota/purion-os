# Ads (Meta/TikTok — leitura) + Notificações Internas

## O que já existia (descoberto na Fase 0)

As rotas `/api/meta-ads` e `/api/tiktok-ads`, a tela `/trafego`
(`TrafegoDashboard.tsx`), o sino de notificações (`NotificationBell.tsx`,
já no header) e o cron diário (`/api/alertas/check`, `0 11 * * *` no
`vercel.json`) **já existiam** e já seguiam a regra de segurança correta:
toda chamada à Meta/TikTok é 100% server-side, token só em env sem
`NEXT_PUBLIC_`, o front só recebe os números calculados.

## O que foi adicionado nesta etapa

1. **Snapshot diário de campanhas** (`src/lib/ads/snapshot.ts`) — busca
   campanhas Meta + TikTok do mês e grava/atualiza em `campanhas_ads`
   (1 linha por campanha, sem acumular histórico infinito). Chamado pelo
   cron já existente — **nenhum cron novo foi criado** (plano Hobby = 1/dia).
2. **Bug corrigido**: o cron consultava `configuracoes` como se `roas_minimo`/
   `cpa_maximo` fossem colunas da tabela, mas `configuracoes` é uma tabela
   chave/valor (`chave`, `valor`) — os alertas de ROAS/CPA nunca disparavam
   antes desta correção.
3. **Metas padrão**: ROAS mínimo 2,5× e CPA máximo R$45 (configuráveis em
   Configurações → Metas; o cron e a tela `/trafego` usam o mesmo valor).
4. **Coluna `papel`** em `notificacoes` (`matheus` | `joao` | `gabriel` | `null`
   para geral) — o sino agora filtra por isso, combinado ao seletor de perfil
   ativo já existente no app.
5. **Novos gatilhos em tempo real** (antes só existia o lote diário do cron):
   - Nova venda aprovada (webhook Appmax) → papel `matheus`
   - Lead B2B muda de status → papel `matheus`
   - Creator sai de "contatado" para outro status (= respondeu) → papel `joao`
   - CPA estourado / ROAS baixo, estoque baixo, tarefa atrasada, follow-up
     de lead → já cobertos pelo cron diário, agora com `papel` correto
6. **Resumo diário** (Fase 4) — o mesmo cron gera uma notificação
   `resumo_diario` consolidando vendas, gasto em ads, novos leads e tarefas
   atrasadas; exibida no Dashboard (Command Center) como card "Resumo de hoje".

## Env vars necessárias

| Variável | Onde pegar |
|---|---|
| `META_ACCESS_TOKEN` | Meta Business Suite → Configurações do negócio → Usuários do sistema → gerar token com permissão `ads_read` para a conta de anúncios |
| `META_AD_ACCOUNT_ID` | Gerenciador de Anúncios → ID da conta (sem o prefixo `act_`) |
| `TIKTOK_ACCESS_TOKEN` | TikTok for Business → TikTok Ads API → criar app → gerar Access Token |
| `TIKTOK_ADVERTISER_ID` | TikTok Ads Manager → ID do anunciante (canto superior direito) |

Essas 4 variáveis **já existem como chaves no `.env.local`** mas ainda estão
vazias (sem campanhas rodando ainda) — confirmado durante esta implementação.
Quando as campanhas começarem, preencha os valores reais na Vercel
(Production + Preview) e nunca com prefixo `NEXT_PUBLIC_`.

## Comportamento sem credenciais/dados

Testado e confirmado: sem as 4 env vars preenchidas, `/trafego` mostra o
banner "sem credenciais" por plataforma (sem quebrar a tela), e o snapshot
diário simplesmente grava 0 campanhas. Tudo funciona normalmente até lá.

## Nota sobre o teste desta implementação

Para validar a correção do bug, o cron `/api/alertas/check` foi executado
manualmente uma vez durante o desenvolvimento — isso gerou notificações
reais (não fictícias) baseadas no estado atual dos dados (leads sem contato,
tarefas atrasadas etc.). Nenhum dado foi inventado; são alertas verdadeiros
que já deveriam ter sido disparados antes da correção do bug.
