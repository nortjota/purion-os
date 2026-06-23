# Integração Appmax — PURION OS

Este documento explica o que **você precisa fazer manualmente** para a integração
de vendas via Appmax funcionar em produção. Todo o código (webhook, tabela de
vendas, módulo Vendas, sistema de afiliados ligado aos Creators) já está pronto
e no `master`.

---

## 1. Variáveis de ambiente na Vercel

Acesse **Vercel → seu projeto → Settings → Environment Variables** e crie:

| Variável | Onde pegar no painel Appmax | Observação |
|---|---|---|
| `APPMAX_API_KEY` | Appmax → **Configurações → Integrações → API** → "Chave de API" / "Access Token" | Usada se/quando o CRM precisar **consultar** pedidos via API da Appmax (hoje o webhook não precisa dela, mas já deixe configurada para uso futuro) |
| `APPMAX_WEBHOOK_SECRET` | Você mesmo define um valor secreto (ex: gere uma string aleatória longa) e cadastra **o mesmo valor** no campo de segredo/token ao criar o webhook (passo 2) | É o que protege a rota contra chamadas falsas — **nunca** coloque com prefixo `NEXT_PUBLIC_` |

⚠️ **Nunca** prefixe essas variáveis com `NEXT_PUBLIC_` — isso as exporia no
JavaScript do navegador. O código do webhook (`src/app/api/webhook/appmax/route.ts`)
já está escrito para ler `process.env.APPMAX_WEBHOOK_SECRET` apenas no servidor.

Depois de criar as variáveis, faça um **redeploy** na Vercel (Settings → Deployments
→ "Redeploy" no último deploy) para que elas entrem em vigor.

---

## 2. Cadastrar o webhook no painel Appmax

1. Entre no painel da Appmax → **Configurações → Apphooks (Webhooks) → Novo Webhook**
2. **URL do webhook**: `https://puriongt.com.br/api/webhook/appmax`
   *(se o webhook for recebido por este mesmo repositório/deploy do CRM — confirme
   com quem administra o domínio se `puriongt.com.br` aponta para este projeto
   Vercel ou para outro repositório da loja; se for outro repositório, o código
   da rota precisa ser copiado para lá também)*
3. **Segredo/Token**: cole o mesmo valor que você definiu em `APPMAX_WEBHOOK_SECRET`
4. **Eventos a selecionar** (eventos de Pedido): marque todos os relacionados a
   mudança de status de pedido — tipicamente:
   - Pedido Aprovado / Pago / Pago via Pix
   - Pedido Pendente / Pix Gerado / Boleto Gerado
   - Pedido Recusado
   - Pedido Reembolsado / Estornado
   - Chargeback

   > Os nomes exatos dos eventos variam por versão do painel Appmax. Selecione
   > **todos os eventos de Pedido disponíveis** — o webhook já trata os
   > principais nomes conhecidos e qualquer evento não mapeado simplesmente
   > cai como `status: 'pendente'` e fica registrado em `webhook_logs` para
   > você revisar e eu ajustar o mapeamento se necessário.
5. Salve o webhook.

---

## 3. Testar no sandbox antes de produção

1. Verifique se a Appmax tem um **modo sandbox/teste** no seu plano — se sim, ative-o
   e gere um pedido de teste lá, usando os métodos pix/cartão/boleto de teste
   fornecidos pela própria Appmax.
2. Depois do pedido de teste, confira no Supabase (SQL Editor ou no CRM em
   **Vendas**) se:
   - Uma linha apareceu em `vendas` com o `pedido_appmax` correto
   - Uma linha apareceu em `webhook_logs` com `status_processamento = 'processado'`
   - Se o pedido foi marcado como aprovado, uma linha de receita apareceu em
     `financeiro`
3. Se algo não aparecer como esperado, **abra a linha em `webhook_logs`** — o
   campo `payload` tem o JSON bruto que a Appmax enviou. Me envie esse payload
   e eu ajusto o mapeamento de campos no `route.ts` (a Appmax pode nomear campos
   de forma diferente do que assumi no código).
4. Só depois de confirmar que um pedido de teste foi processado corretamente,
   ative o webhook para os pedidos reais (produção).

---

## 4. Sistema de afiliados — como funciona

- Cada **Creator** (Hub de Creators → aba **Vendas & Afiliados**) tem um código
  único no formato `PURION-XXX-001`, reaproveitando o campo `codigo_desconto`
  que já existia na tabela `creators` (não criei uma coluna `codigo_afiliado`
  nova — o campo `codigo_desconto` já existia, estava vazio, e cumpre exatamente
  esse papel; populei os 205 creators existentes com códigos únicos).
- O link de afiliado de cada creator é `https://puriongt.com.br/?ref=CODIGO`
  (botão "Copiar link" na aba Vendas & Afiliados e no perfil do creator).
- **Pendência do seu lado (site da loja):** o checkout do site precisa:
  1. Capturar o parâmetro `?ref=` na URL quando o visitante chega
  2. Guardar esse código (cookie ou sessão) durante a navegação
  3. No momento da compra, enviar esse código para a Appmax — geralmente em
     um campo de metadata/tracking do pedido, ou em uma observação de texto
     contendo `PURION-XXX-001`
  4. O webhook já tenta ler esse código em `tracking`, `ref`, `affiliate_code`,
     `utm_content`, ou em qualquer texto livre que contenha o padrão
     `PURION-XXX-001` — mas só funciona se o checkout realmente repassar essa
     informação para a Appmax de alguma forma.
- Comissão padrão: **R$ 25,00 por venda aprovada**, editável diretamente na
  aba Vendas & Afiliados do Hub de Creators (campo numérico no topo da tela).

---

## 5. O que já existe vs. o que é novo (para evitar confusão)

Este projeto já tinha um sistema de afiliados **anterior**, separado, ligado à
Nuvemshop (tabelas `afiliados`, `afiliado_vendas`, `afiliado_cliques`, rotas
`/api/afiliados/*`, tela `/afiliados` no CRM). Esse sistema **não foi tocado**
e continua funcionando como antes, caso ainda esteja em uso.

A integração desta sessão é **paralela e independente**: tabela `vendas` nova,
webhook novo em `/api/webhook/appmax`, e o ranking de afiliados agora vive
dentro do **Hub de Creators** (aba "Vendas & Afiliados"), não na tela `/afiliados`
antiga. Se a loja migrou definitivamente de Nuvemshop para o checkout próprio
+ Appmax, recomendo conversarmos sobre descontinuar o sistema antigo para não
manter dois fluxos de afiliados em paralelo.
