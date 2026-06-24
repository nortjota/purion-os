# Integração Google Calendar — Calendário Central PURION

Estratégia: a conta `puriongt@gmail.com` (acessada pelos 3 sócios) é o **calendário
central**. O CRM cria/atualiza/remove eventos nela quando uma reunião é agendada
no módulo Reuniões. Cada sócio assina esse calendário no seu Gmail pessoal e vê
tudo automaticamente — sem precisar conectar 3 contas separadas ao CRM.

---

## 1. Criar o projeto no Google Cloud Console e ativar a Calendar API

1. Acesse https://console.cloud.google.com/ **logado como `puriongt@gmail.com`**.
2. Crie um novo projeto (ex: "PURION OS").
3. No menu lateral, vá em **APIs e serviços → Biblioteca**, busque **Google Calendar API** e clique em **Ativar**.
4. Vá em **APIs e serviços → Tela de consentimento OAuth**:
   - Tipo de usuário: **Externo** (ou Interno, se a conta for Google Workspace).
   - Preencha nome do app, e-mail de suporte.
   - Em "Escopos", não precisa adicionar nada aqui (o escopo é pedido na hora de gerar o token).
   - Em "Usuários de teste" (se o app ficar em modo de teste), adicione `puriongt@gmail.com`.
5. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - URI de redirecionamento autorizado: `https://developers.google.com/oauthplayground` (usado só para gerar o refresh token manualmente — ver passo 2).
   - Anote o **Client ID** e o **Client Secret** gerados.

## 2. Gerar o refresh token da conta puriongt@gmail.com (passo manual, uma vez)

A forma mais simples é usar o **OAuth 2.0 Playground** do Google:

1. Acesse https://developers.google.com/oauthplayground/
2. Clique na engrenagem (⚙️) no canto superior direito → marque **"Use your own OAuth credentials"** → cole o **Client ID** e **Client Secret** do passo 1.
3. Na lista de escopos à esquerda, busque e selecione:
   - `https://www.googleapis.com/auth/calendar` (acesso completo ao calendário)
4. Clique em **Authorize APIs** → faça login **com a conta `puriongt@gmail.com`** → autorize.
5. Você será redirecionado de volta ao Playground com um código de autorização. Clique em **Exchange authorization code for tokens**.
6. O Playground vai mostrar um **Refresh token** — copie esse valor. Ele não expira até ser revogado manualmente.

⚠️ Esse refresh token dá acesso ao calendário da conta central. Trate-o como uma senha — nunca cole em chat, print ou repositório público.

## 3. Descobrir o GOOGLE_CALENDAR_ID

Para a conta principal, o Calendar ID é o próprio e-mail: `puriongt@gmail.com`.
Para confirmar: acesse https://calendar.google.com/ logado como `puriongt@gmail.com`
→ Configurações → clique no calendário "Default" → role até "Integrar agenda" →
o campo **ID da agenda** mostra o valor exato a usar.

## 4. Variáveis de ambiente a criar na Vercel

No painel da Vercel → Settings → Environment Variables, adicione (Production + Preview):

| Variável | Valor | Onde encontrar |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Client ID OAuth | Google Cloud Console → Credenciais |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth | Google Cloud Console → Credenciais |
| `GOOGLE_REFRESH_TOKEN` | Refresh token gerado no passo 2 | OAuth Playground |
| `GOOGLE_CALENDAR_ID` | `puriongt@gmail.com` (ou o ID exato do passo 3) | Google Calendar → Configurações |

**Nunca** prefixe essas variáveis com `NEXT_PUBLIC_` — elas são usadas exclusivamente
em rotas server-side (`src/lib/google/calendar.ts`, `src/app/api/calendar/*`) e o
token de acesso ao calendário nunca chega ao navegador.

Depois de criar as 4 variáveis, faça um **redeploy** para que entrem em vigor.

## 5. Como cada sócio assina o calendário central no Gmail pessoal

1. No módulo **Reuniões** do CRM, clique no botão **"Adicionar ao meu Google"** no topo da página — ele abre automaticamente a tela de assinatura.
2. Ou, manualmente: cada sócio acessa https://calendar.google.com/, em "Outras agendas" clica no **+** → **Inscrever-se usando URL** ou **Procurar agendas de pessoas** → digita `puriongt@gmail.com`.
3. A partir daí, todo evento criado pelo CRM nesse calendário aparece automaticamente no Gmail/celular de cada sócio.

## 6. O que foi implementado no CRM

- `src/lib/google/calendar.ts` — helper server-side (`criarEvento`, `atualizarEvento`, `deletarEvento`, `listarEventos`, `linkAssinarCalendario`). Usa a lib `googleapis`. **Nunca importar este arquivo em componentes `'use client'`.**
- `/api/calendar/sync` (POST) — ponte segura entre o client e o Google: recebe os dados da reunião/tarefa, chama o helper, persiste `google_event_id` no Supabase via service_role. Exige sessão autenticada. **Sync é best-effort**: se o Google falhar ou as variáveis não estiverem configuradas, a reunião/tarefa continua salva normalmente no CRM — só a sincronização é pulada.
- `/api/calendar/link` (GET) — expõe o link público de assinatura do calendário (sem nenhum segredo).
- Coluna `google_event_id` adicionada em `reunioes` e `tarefas` (migration `supabase/migration_google_calendar.sql`).
- Módulo **Reuniões**: criar/editar reunião cria/atualiza o evento no Google; marcar como cancelada ou excluir remove o evento; mini-calendário mensal com indicador de quantas reuniões há em cada dia (clicável para filtrar a lista); ícone verde (sincronizado) ou cinza (apenas local) em cada reunião.
- **Tarefas com prazo** (`due_date`): ao criar/editar uma tarefa com prazo, um evento de dia inteiro ("Prazo: {título}") é criado no calendário central; ao concluir, cancelar ou excluir a tarefa, o evento é removido.

## 7. Teste rápido após configurar

1. Crie uma reunião no CRM com data/hora futura.
2. Confira em https://calendar.google.com/ (logado como `puriongt@gmail.com`) se o evento apareceu.
3. Edite a reunião (altere o título ou horário) e confirme que o evento no Google foi atualizado, não duplicado.
4. Marque a reunião como "Cancelada" e confirme que o evento desaparece do Google.
5. Se algo não sincronizar, veja os logs da função no painel da Vercel (`Functions → /api/calendar/sync`) — a rota nunca derruba o app, mas registra o erro no console.
