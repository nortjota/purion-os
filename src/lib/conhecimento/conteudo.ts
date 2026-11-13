/**
 * Central de Conhecimento — conteúdo padrão.
 * Mensagens e dados da empresa podem ser editados na tela; a edição fica em kb_guias
 * (por slug) e sobrepõe o padrão daqui. Tom: premium discreto, sem emoji, sem "!!".
 */
import { CUSTO_PRODUCAO_FRASCO, CUSTOS_VARIAVEIS_DETALHE, CUSTOS_VARIAVEIS_FRASCO, PRECO_B2B_OFICIAL, PRECO_B2C_OFICIAL } from '@/lib/precificacao'
import { ESCADA_PADRAO } from '@/lib/escadaProdutos'

export type Canal = 'whatsapp' | 'email' | 'dm' | 'resposta'
export const CANAIS: Record<Canal, string> = { whatsapp: 'WhatsApp', email: 'E-mail', dm: 'DM Instagram/TikTok', resposta: 'Resposta pronta' }

export type Etapa = 'venda' | 'posvenda' | 'creators' | 'b2b' | 'sac'
export const ETAPAS: Record<Etapa, string> = {
  venda: 'Venda e recuperação', posvenda: 'Pós-venda', creators: 'Creators e afiliados', b2b: 'B2B e parcerias', sac: 'SAC e objeções',
}

export interface Modelo {
  slug: string
  titulo: string
  canal: Canal
  etapa: Etapa
  quando: string          // em que situação usar (1 linha)
  assunto?: string        // e-mail
  corpo: string
  personalizado?: boolean // criado pela equipe
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Variáveis aceitas nos modelos: {nome}, {cupom}, {rastreio}, {link}, {valor}, {prazo}, {empresa}, {seu_nome}. */
export const VARIAVEIS: Array<{ chave: string; rotulo: string; padrao: string }> = [
  { chave: 'nome', rotulo: 'Nome do cliente', padrao: '' },
  { chave: 'seu_nome', rotulo: 'Seu nome', padrao: '' },
  { chave: 'cupom', rotulo: 'Cupom', padrao: '' },
  { chave: 'link', rotulo: 'Link', padrao: 'https://puriongt.com.br' },
  { chave: 'rastreio', rotulo: 'Código de rastreio', padrao: '' },
  { chave: 'valor', rotulo: 'Valor', padrao: brl(PRECO_B2C_OFICIAL) },
  { chave: 'prazo', rotulo: 'Prazo', padrao: '' },
  { chave: 'empresa', rotulo: 'Empresa parceira', padrao: '' },
]

export const MODELOS_PADRAO: Modelo[] = [
  // ── Venda e recuperação ──
  { slug: 'wpp-carrinho-pix', titulo: 'Pix expirou', canal: 'whatsapp', etapa: 'venda', quando: 'Pix gerado e não pago (até 24 h depois)',
    corpo: `Oi, {nome}. Aqui é {seu_nome}, da PURION.\n\nVi que o Pix do seu pedido expirou antes do pagamento. Se ainda quiser o seu PURION GT, gerei um link novo:\n{link}\n\nQualquer dúvida sobre a fragrância ou o envio, é só responder por aqui.` },
  { slug: 'wpp-carrinho-cartao', titulo: 'Cartão recusado', canal: 'whatsapp', etapa: 'venda', quando: 'Pagamento não autorizado pelo banco',
    corpo: `Oi, {nome}. Aqui é {seu_nome}, da PURION.\n\nO banco não autorizou o pagamento do seu pedido — isso costuma ser bloqueio de segurança da operadora, não do cartão. Você pode tentar de novo pelo link abaixo ou pagar via Pix:\n{link}\n\nSe preferir, eu acompanho com você por aqui.` },
  { slug: 'email-carrinho', titulo: 'Carrinho abandonado', canal: 'email', etapa: 'venda', quando: 'Até 24 h depois do abandono',
    assunto: 'Seu PURION GT ficou esperando',
    corpo: `Olá, {nome},\n\nSeu pedido ficou pela metade. Guardamos o carrinho para você terminar quando quiser:\n{link}\n\nO PURION GT é uma fragrância criada para o carro: 60 ml, aplicação direta no ambiente, sem o cheiro artificial dos aromatizantes comuns.\n\nSe algo travou no pagamento, responda este e-mail que resolvemos com você.\n\nPURION GT` },
  { slug: 'wpp-cupom-volta', titulo: 'Último lembrete com cupom', canal: 'whatsapp', etapa: 'venda', quando: '48 h depois, só se a pessoa não respondeu',
    corpo: `{nome}, passando uma última vez sobre o seu pedido.\n\nSe fizer sentido agora, o cupom {cupom} vale até {prazo}:\n{link}\n\nNão vou insistir depois deste. Obrigado pelo interesse na PURION.` },
  { slug: 'wpp-kit-upsell', titulo: 'Oferta de kit', canal: 'whatsapp', etapa: 'venda', quando: 'Cliente perguntou por mais de um frasco ou presente',
    corpo: `Para quem quer ter no carro e manter um de reserva — ou presentear — temos os kits:\n\n• 1 frasco: ${brl(ESCADA_PADRAO[0].preco!)}\n• Kit 2: ${brl(ESCADA_PADRAO[1].preco!)} (economia de ${brl(ESCADA_PADRAO[1].economia!)})\n• Kit 3: ${brl(ESCADA_PADRAO[2].preco!)} (economia de ${brl(ESCADA_PADRAO[2].economia!)})\n\nÉ a mesma fragrância em todos. Quer que eu mande o link de algum?` },

  // ── Pós-venda ──
  { slug: 'wpp-pedido-confirmado', titulo: 'Pedido confirmado', canal: 'whatsapp', etapa: 'posvenda', quando: 'Logo após o pagamento aprovado',
    corpo: `{nome}, seu pedido PURION GT está confirmado.\n\nVamos separar e enviar em até {prazo}. Assim que sair, mando o código de rastreio por aqui.\n\nObrigado pela escolha.` },
  { slug: 'wpp-enviado', titulo: 'Pedido enviado', canal: 'whatsapp', etapa: 'posvenda', quando: 'Quando o rastreio é lançado',
    corpo: `{nome}, seu PURION GT saiu para entrega.\n\nRastreio: {rastreio}\nAcompanhe em: https://rastreamento.correios.com.br\n\nQuando chegar, uma dica: borrife a uma distância de um palmo, nos tapetes e no estofado, com o carro ventilado.` },
  { slug: 'email-enviado', titulo: 'Pedido enviado', canal: 'email', etapa: 'posvenda', quando: 'Quando o rastreio é lançado',
    assunto: 'Seu PURION GT está a caminho',
    corpo: `Olá, {nome},\n\nSeu pedido foi enviado.\n\nCódigo de rastreio: {rastreio}\n\nComo usar: borrife a cerca de um palmo de distância, sobre tapetes e estofados, com o carro ventilado. Evite aplicar direto no painel e em telas.\n\nQualquer dúvida, responda este e-mail.\n\nPURION GT` },
  { slug: 'wpp-boas-vindas', titulo: 'Primeira impressão (D+3)', canal: 'whatsapp', etapa: 'posvenda', quando: '3 dias depois da entrega',
    corpo: `Oi, {nome}. Aqui é {seu_nome}, da PURION.\n\nO PURION GT já está no seu carro? Queria saber sua primeira impressão da fragrância — de 0 a 10, quanto você indicaria para um amigo?\n\nSua resposta ajuda a gente a melhorar.` },
  { slug: 'wpp-avaliacao', titulo: 'Pedido de avaliação', canal: 'whatsapp', etapa: 'posvenda', quando: 'Cliente deu nota 9 ou 10',
    corpo: `Que bom saber, {nome}. Obrigado.\n\nSe puder deixar essa avaliação no site, ajuda muito quem ainda está conhecendo a marca:\n{link}\n\nE se postar o carro com o PURION, marca @purionbrasil — a gente reposta.` },
  { slug: 'wpp-reposicao', titulo: 'Reposição (D+40)', canal: 'whatsapp', etapa: 'posvenda', quando: '40 a 45 dias depois da compra (só com opt-in)',
    corpo: `{nome}, faz pouco mais de um mês que o PURION GT chegou. Normalmente é aqui que o frasco começa a pedir reposição.\n\nSe quiser garantir o próximo, o link é este:\n{link}\n\nCom o Kit 2 você fica com um de reserva e paga menos por frasco.` },

  // ── Creators e afiliados ──
  { slug: 'dm-creator-abordagem', titulo: 'Primeira abordagem', canal: 'dm', etapa: 'creators', quando: 'Primeiro contato com creator automotivo',
    corpo: `Oi, {nome}. Sou {seu_nome}, da PURION GT — perfume automotivo premium.\n\nAcompanho seu conteúdo e acho que a nossa fragrância conversa com o seu público. Queria te enviar um frasco, sem compromisso de postagem, para você sentir no seu carro.\n\nSe topar, me passa o endereço por aqui.` },
  { slug: 'dm-creator-proposta', titulo: 'Proposta de parceria', canal: 'dm', etapa: 'creators', quando: 'Creator gostou do produto',
    corpo: `{nome}, que bom que curtiu.\n\nNossa proposta: você recebe um cupom próprio ({cupom}) com desconto para o seu público e ganha comissão em cada venda. Se fizer sentido, combinamos também um vídeo com cachê.\n\nPara anúncios, pedimos autorização de uso do vídeo por {prazo}. Posso te mandar os detalhes?` },
  { slug: 'dm-creator-cobranca', titulo: 'Cobrança gentil de entrega', canal: 'dm', etapa: 'creators', quando: 'Prazo da entrega passou',
    corpo: `Oi, {nome}, tudo bem?\n\nPassando para alinhar o vídeo da PURION que combinamos para {prazo}. Se precisar de mais tempo ou de alguma referência, me fala que a gente ajusta.` },
  { slug: 'wpp-afiliado-boas-vindas', titulo: 'Boas-vindas ao afiliado', canal: 'whatsapp', etapa: 'creators', quando: 'Afiliado cadastrado no CRM',
    corpo: `{nome}, seja bem-vindo ao programa de afiliados PURION.\n\nSeu link: https://puriongt.com.br/{cupom}\nSeu cupom: {cupom}\n\nCada venda pelo link ou cupom entra na sua conta automaticamente. O fechamento das comissões é mensal.` },

  // ── B2B ──
  { slug: 'wpp-b2b-abordagem', titulo: 'Estética / detailer — 1º contato', canal: 'whatsapp', etapa: 'b2b', quando: 'Primeiro contato com estética automotiva',
    corpo: `Bom dia. Aqui é {seu_nome}, da PURION GT.\n\nTrabalhamos com perfume automotivo premium e estamos selecionando estéticas parceiras na região. A ideia é simples: vocês finalizam a higienização com o PURION e oferecem o frasco ao cliente na entrega do carro.\n\nPosso levar uma amostra para vocês testarem?` },
  { slug: 'email-b2b-proposta', titulo: 'Proposta comercial B2B', canal: 'email', etapa: 'b2b', quando: 'Depois da amostra, para formalizar',
    assunto: 'Proposta PURION GT para {empresa}',
    corpo: `Olá, {nome},\n\nObrigado por testar o PURION GT na {empresa}.\n\nCondições para parceiros:\n• Preço por frasco: ${brl(PRECO_B2B_OFICIAL)} (preço sugerido ao cliente: ${brl(PRECO_B2C_OFICIAL)})\n• Pedido mínimo: a combinar\n• Material de ponto de venda incluso\n\nSe estiver de acordo, respondo com o pedido e a previsão de entrega.\n\n{seu_nome}\nPURION GT` },
  { slug: 'wpp-b2b-followup', titulo: 'Follow-up B2B', canal: 'whatsapp', etapa: 'b2b', quando: '5 dias sem resposta depois da amostra',
    corpo: `Oi, {nome}. Conseguiram testar o PURION nos carros da semana? Queria ouvir o que os clientes acharam e ver se faz sentido seguirmos.` },

  // ── SAC e objeções ──
  { slug: 'sac-atraso', titulo: 'Atraso na entrega', canal: 'resposta', etapa: 'sac', quando: 'Cliente reclamou do prazo',
    corpo: `{nome}, peço desculpas pela demora. Verifiquei o rastreio ({rastreio}) e o pedido está em trânsito.\n\nVou acompanhar até a entrega e te aviso por aqui. Se não chegar até {prazo}, me avise que resolvo com você.` },
  { slug: 'sac-avaria', titulo: 'Produto chegou com avaria', canal: 'resposta', etapa: 'sac', quando: 'Frasco vazou ou chegou danificado',
    corpo: `{nome}, sinto muito por isso. Pode me mandar uma foto do frasco e da caixa? Com a foto, já resolvo a troca com você.` },
  { slug: 'sac-arrependimento', titulo: 'Quer devolver (7 dias)', canal: 'resposta', etapa: 'sac', quando: 'Até 7 dias do recebimento',
    corpo: `{nome}, sem problema. Pelo Código de Defesa do Consumidor você tem 7 dias a partir do recebimento para desistir da compra.\n\nVou te mandar as instruções de devolução. Assim que o produto voltar, o reembolso é feito pelo mesmo meio de pagamento.` },
  { slug: 'obj-preco', titulo: '"Está caro"', canal: 'resposta', etapa: 'sac', quando: 'Objeção de preço',
    corpo: `Entendo. O PURION não compete com aromatizante de posto: é uma fragrância desenvolvida como perfume, para o ambiente do carro, em frasco de 60 ml com várias aplicações.\n\nSe quiser começar com menos, o cupom {cupom} dá um desconto na primeira compra.` },
  { slug: 'obj-forte', titulo: '"Não é forte demais?"', canal: 'resposta', etapa: 'sac', quando: 'Medo de enjoar',
    corpo: `A intensidade é você que controla: duas ou três borrifadas nos tapetes já perfumam o carro de forma discreta. Para quem prefere mais presença, aplique também no estofado.` },
  { slug: 'obj-mancha', titulo: '"Mancha o banco?"', canal: 'resposta', etapa: 'sac', quando: 'Dúvida sobre tecido e couro',
    corpo: `Recomendamos aplicar a um palmo de distância, em tapetes e estofados de tecido, e evitar aplicar diretamente em couro, painel e telas. Assim você tem o perfume sem risco para os acabamentos.` },
]

// ── Dados da empresa ──
export interface Fato { slug: string; grupo: string; rotulo: string; valor: string; editavel?: boolean; sensivel?: boolean }

export const FATOS_PADRAO: Fato[] = [
  { slug: 'marca', grupo: 'Marca', rotulo: 'Marca', valor: 'PURION GT' },
  { slug: 'categoria', grupo: 'Marca', rotulo: 'Categoria', valor: 'Perfume automotivo premium' },
  { slug: 'fragrancia', grupo: 'Marca', rotulo: 'Fragrância', valor: 'Uma única fragrância (kits = mais frascos dela)' },
  { slug: 'lancamento', grupo: 'Marca', rotulo: 'Lançamento', valor: '16/06/2026' },
  { slug: 'socios', grupo: 'Marca', rotulo: 'Sócios', valor: 'Matheus e João' },
  { slug: 'site', grupo: 'Canais', rotulo: 'Site', valor: 'https://puriongt.com.br' },
  { slug: 'checkout', grupo: 'Canais', rotulo: 'Checkout', valor: 'https://pay.puriongt.com.br' },
  { slug: 'instagram', grupo: 'Canais', rotulo: 'Instagram', valor: '@purionbrasil' },
  { slug: 'tiktok', grupo: 'Canais', rotulo: 'TikTok', valor: '', editavel: true },
  { slug: 'whatsapp', grupo: 'Canais', rotulo: 'WhatsApp oficial', valor: '', editavel: true },
  { slug: 'email', grupo: 'Canais', rotulo: 'E-mail de contato', valor: '', editavel: true },
  { slug: 'afiliado-link', grupo: 'Canais', rotulo: 'Link de afiliado', valor: 'https://puriongt.com.br/{codigo}' },
  { slug: 'preco-1', grupo: 'Preços', rotulo: '1 frasco 60 ml', valor: brl(PRECO_B2C_OFICIAL) },
  { slug: 'preco-k2', grupo: 'Preços', rotulo: 'Kit 2', valor: brl(ESCADA_PADRAO[1].preco!) },
  { slug: 'preco-k3', grupo: 'Preços', rotulo: 'Kit 3', valor: brl(ESCADA_PADRAO[2].preco!) },
  { slug: 'preco-b2b', grupo: 'Preços', rotulo: 'Preço ao parceiro B2B', valor: brl(PRECO_B2B_OFICIAL) },
  { slug: 'custo', grupo: 'Números internos', rotulo: 'Custo de produção', valor: brl(CUSTO_PRODUCAO_FRASCO), sensivel: true },
  { slug: 'variaveis', grupo: 'Números internos', rotulo: 'Custos variáveis por frasco', valor: `${brl(CUSTOS_VARIAVEIS_FRASCO)} (${CUSTOS_VARIAVEIS_DETALHE.map((c) => `${c.item.toLowerCase()} ${brl(c.valor)}`).join(', ')})`, sensivel: true },
  { slug: 'contribuicao', grupo: 'Números internos', rotulo: 'Sobra por frasco (contribuição)', valor: brl(PRECO_B2C_OFICIAL - CUSTO_PRODUCAO_FRASCO - CUSTOS_VARIAVEIS_FRASCO), sensivel: true },
  { slug: 'cac-max', grupo: 'Números internos', rotulo: 'Máximo pago por venda (anúncio/creator)', valor: `${brl(PRECO_B2C_OFICIAL - CUSTO_PRODUCAO_FRASCO - CUSTOS_VARIAVEIS_FRASCO)} — acima disso a venda dá prejuízo`, sensivel: true },
  { slug: 'razao', grupo: 'Dados legais', rotulo: 'Razão social', valor: '', editavel: true },
  { slug: 'cnpj', grupo: 'Dados legais', rotulo: 'CNPJ', valor: '', editavel: true },
  { slug: 'devolucao', grupo: 'Dados legais', rotulo: 'Endereço para devolução', valor: '', editavel: true },
  { slug: 'logistica', grupo: 'Operação', rotulo: 'Logística', valor: 'Operador terceirizado em Goiânia (perfil Logística no CRM)' },
  { slug: 'arrependimento', grupo: 'Operação', rotulo: 'Direito de arrependimento', valor: '7 dias do recebimento (CDC, art. 49)' },
]

// ── Checklists ──
export interface Checklist { slug: string; titulo: string; quando: string; itens: string[] }

export const CHECKLISTS: Checklist[] = [
  { slug: 'despacho', titulo: 'Despachar um pedido', quando: 'A cada pedido pago', itens: [
    'Conferir pagamento aprovado no CRM (Vendas)', 'Conferir nome, CPF e endereço completos', 'Separar SKU certo (1 frasco, Kit 2 ou Kit 3)',
    'Conferir frasco: tampa, válvula e rótulo', 'Embalar com proteção contra vazamento', 'Gerar etiqueta e lançar rastreio no CRM', 'Enviar mensagem "Pedido enviado"',
  ] },
  { slug: 'video-tiktok', titulo: 'Publicar um vídeo no TikTok', quando: 'Antes de cada publicação', itens: [
    'Gancho nos 3 primeiros segundos', 'Produto aparece até o segundo 8', 'Legenda na tela (muita gente assiste sem som)', 'CTA claro: link na bio ou cupom',
    'Link da bio com utm_content do vídeo (código TT-…)', 'Registrar a publicação no TikTok Command Center', 'Lançar métricas depois de 3 e 7 dias',
  ] },
  { slug: 'creator', titulo: 'Fechar com um creator', quando: 'Quando o creator aceitar', itens: [
    'Criar a colaboração no TikTok → Creators', 'Combinar acordo (permuta, cachê, comissão) e prazo', 'Gerar cupom próprio do creator',
    'Combinar direito de uso para anúncios (prazo por escrito)', 'Registrar a amostra enviada (baixa estoque)', 'Mandar briefing com 2 ou 3 referências', 'Cadastrar as entregas com prazo',
  ] },
  { slug: 'domingo', titulo: 'Fechamento de domingo', quando: 'Toda semana', itens: [
    'Placar: vendas, receita, ticket médio', 'Custo por venda de anúncios e creators', 'Top 3 vídeos da semana e por quê', 'Pedidos atrasados ou com problema',
    'Uma decisão para a próxima semana', 'Metas da semana no CRM',
  ] },
  { slug: 'reclamacao', titulo: 'Atender uma reclamação', quando: 'Qualquer ticket de SAC', itens: [
    'Responder em até 2 horas úteis', 'Pedir foto ou dado que comprove o problema', 'Abrir ticket no SAC do CRM', 'Resolver primeiro, investigar depois',
    'Registrar a causa (transporte, produto, expectativa)', 'Confirmar com o cliente que ficou resolvido',
  ] },
]

// ── Tom de voz ──
export const TOM_DE_VOZ = {
  essencia: 'Premium discreto. Falamos como uma marca de perfumaria (Jo Malone, Aesop, Byredo), não como loja de acessórios automotivos.',
  regras: [
    { sim: 'Frases curtas e sensoriais', nao: 'Textão com adjetivo empilhado' },
    { sim: '"A fragrância fica no estofado"', nao: '"O MELHOR cheirinho do Brasil"' },
    { sim: 'Um ponto final', nao: '"!!" e caixa alta' },
    { sim: 'Sem emoji (ou um, se o canal pedir)', nao: 'Emoji em toda frase' },
    { sim: 'Benefício concreto e verificável', nao: 'Promessa de duração que não testamos' },
    { sim: 'Tratar pelo nome, tom de conversa', nao: '"Prezado cliente", tom de robô' },
  ],
  usamos: ['fragrância', 'presença', 'acabamento', 'ritual', 'interior', 'discreto', 'assinatura'],
  evitamos: ['cheirinho', 'aromatizante', 'barato', 'promoção imperdível', 'top', 'incrível'],
}
