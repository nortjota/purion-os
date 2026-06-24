'use client'

/**
 * PURION OS — Store Global (Zustand)
 * Estado centralizado para toda a aplicação.
 * Cada módulo tem seu próprio slice de estado.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ─────────────────────────────────────────────
// TIPOS BASE
// ─────────────────────────────────────────────

export type PerfilUsuario = 'matheus' | 'joao' | 'gabriel'
export type Regiao = 'DF' | 'SP' | 'SC'

export type StatusLead =
  | 'prospecto'
  | 'contato_feito'
  | 'proposta_enviada'
  | 'negociando'
  | 'parceiro_ativo'
  | 'inativo'

export type TierLead = 'A' | 'B' | 'C'

export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'bloqueada'
export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente'
export type RecorrenciaTarefa = 'nenhuma' | 'diaria' | 'semanal' | 'mensal'
export type TipoEstabelecimento = 'estetica' | 'detailer' | 'concessionaria'

export type StatusLote = 'em_producao' | 'controle_qualidade' | 'aprovado' | 'reprovado' | 'estoque'

export type StatusCreator =
  | 'contatado'
  | 'negociando'
  | 'kit_enviado'
  | 'postado'
  | 'pago'
  | 'parceiro_recorrente'
  | 'descartado'
  | 'inativo'

export type StatusReuniaoItem = 'agendada' | 'realizada' | 'cancelada'

export type SKUProduto = 'noir' | 'urban' | 'coastal'
export type StatusPedidoExpedicao = 'aguardando' | 'em_separacao' | 'enviado' | 'entregue' | 'cancelado'
export type FormatoConteudo = 'reels' | 'post' | 'stories' | 'tiktok' | 'youtube' | 'live'
export type StatusConteudo = 'planejado' | 'em_producao' | 'publicado' | 'cancelado'
export type VotoDecisao = 'sim' | 'nao' | 'abstencao' | 'pendente'

// ─────────────────────────────────────────────
// INTERFACES — CRM B2B
// ─────────────────────────────────────────────

export interface Lead {
  id: string
  nomeEmpresa: string
  nomeContato: string
  telefone: string
  email: string
  regiao: Regiao
  cidade: string
  responsavel: PerfilUsuario
  tier: TierLead
  status: StatusLead
  valorMedioMensal: number      // R$ médio de pedidos/mês
  ultimoPedido: string | null   // ISO date
  createdAt: string             // ISO date
  updatedAt: string             // ISO date
  notas: string
  tipoEstabelecimento?: TipoEstabelecimento
  historicoInteracoes?: Array<{ id: string; texto: string; timestamp: string }>
  latitude?: number
  longitude?: number
  tags: string[]
}

// ─────────────────────────────────────────────
// INTERFACES — FINANCEIRO
// ─────────────────────────────────────────────

export type CategoriaReceita =
  | 'venda_b2b'
  | 'venda_b2c'
  | 'nuvemshop'
  | 'marketplace'
  | 'outro'

export type CategoriaDespesa =
  | 'insumos'
  | 'embalagens'
  | 'ads_meta'
  | 'ads_google'
  | 'logistica'
  | 'taxas_impostos'
  | 'pessoal'
  | 'overhead'
  | 'outro'

export interface Receita {
  id: string
  descricao: string
  valor: number
  categoria: CategoriaReceita
  data: string   // ISO date
  regiao: Regiao
  responsavel: PerfilUsuario
  pedidoId?: string
}

export interface Despesa {
  id: string
  descricao: string
  valor: number
  categoria: CategoriaDespesa
  data: string   // ISO date
  regiao: Regiao
  responsavel: PerfilUsuario
  fornecedor?: string
  notaFiscal?: string
}

// ─────────────────────────────────────────────
// INTERFACES — TAREFAS
// ─────────────────────────────────────────────

export interface Subtarefa {
  id: string
  tarefaId: string
  titulo: string
  concluida: boolean
  ordem: number
  createdAt: string
}

export interface Comentario {
  id: string
  tarefaId: string
  autor: string
  texto: string
  createdAt: string
}

export interface Anexo {
  id: string
  tarefaId: string
  nome: string
  url: string
  tipo: string
  tamanhoKb: number
  createdAt: string
}

export interface Tarefa {
  id: string
  titulo: string
  descricao: string
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  responsavel: PerfilUsuario
  modulo: string    // ex: 'crm', 'producao', 'marketing', 'geral'
  dueDate: string | null  // ISO date
  createdAt: string
  completedAt: string | null
  motivoBloqueio?: string
  tags: string[]
  startDate: string | null         // ISO date
  lembreteEm: string | null        // ISO datetime
  recorrencia: RecorrenciaTarefa
  recorrenciaAte: string | null    // ISO date
  ordem: number
  estimativaMin: number | null
  subtarefas: Subtarefa[]
  comentarios: Comentario[]
  anexos: Anexo[]
  googleEventId?: string | null
}

// ─────────────────────────────────────────────
// INTERFACES — PRODUÇÃO / SUPPLY CHAIN
// ─────────────────────────────────────────────

export interface TesteQualidade {
  tipo: 'duracao' | 'mancha' | 'estabilidade_termica' | 'valvula' | 'teste_cego' | 'fixacao' | 'alergenicidade'
  resultado: 'aprovado' | 'reprovado' | 'pendente'
  data: string
  observacoes: string
  fotoUrl?: string
}

export interface Lote {
  id: string
  codigo: string         // ex: 'LOTE-2024-001'
  produto: string        // ex: 'Noir Intense 10ml'
  quantidadeProduzida: number
  quantidadeAprovada: number
  status: StatusLote
  dataInicio: string
  dataConclusao: string | null
  responsavel: PerfilUsuario
  testes: TesteQualidade[]
  insumos: Array<{
    insumoId: string
    nome: string
    quantidadeUsada: number
    unidade: string
  }>
  notas: string
}

export interface ItemEstoque {
  id: string
  nome: string
  tipo: 'essencia' | 'alcool' | 'embalagem' | 'frasco' | 'tampa' | 'rotulo' | 'caixa' | 'outro'
  fornecedor: string
  quantidadeAtual: number
  unidade: string          // 'ml', 'g', 'kg', 'un'
  quantidadeMinima: number // alerta de reposição
  custoUnitario: number
  ultimaEntrada: string
  notas: string
}

// ─────────────────────────────────────────────
// INTERFACES — MARKETING / CREATORS
// ─────────────────────────────────────────────

export type TipoAcordoCreator = 'permuta' | 'pago' | 'afiliado'

export interface Creator {
  id: string
  nome: string
  instagram: string
  tiktok?: string
  youtube?: string
  email?: string
  whatsapp?: string
  cidade?: string
  seguidores: number
  nichoPrincipal: string
  status: StatusCreator
  cacheCombinado: number
  tipoAcordo?: TipoAcordoCreator
  codigoDesconto?: string       // auto-gerado: PURION-XXX-001
  engajamentoMedio?: number     // %
  viewsMedias?: number
  ultimoContato?: string        // ISO date
  produtosEnviados: string[]
  postagens: Array<{
    plataforma: 'instagram' | 'tiktok' | 'youtube'
    url?: string
    data: string
    alcance: number
    engajamento: number
    views?: number
    likes?: number
    comentarios?: number
    codigoCupom?: string
    vendasGeradas: number
    receitaGerada: number
  }>
  roi: number
  createdAt: string
  responsavel: PerfilUsuario
  notas: string
}

export interface CampanhaCreators {
  id: string
  nome: string
  produto: SKUProduto
  dataInicio: string
  dataFim: string
  orcamentoTotal: number
  creatorsIds: string[]
  metaPublicacoes: number
  metaAlcance: number
  metaVendas: number
  publicacoesRealizadas: number
  alcanceReal: number
  vendasPorCodigo: number
  roiFinal: number
  status: 'planejamento' | 'ativa' | 'encerrada' | 'pausada'
  createdAt: string
}

export interface CampanhaAds {
  id: string
  nome: string
  plataforma: 'meta' | 'google' | 'tiktok'
  status: 'ativa' | 'pausada' | 'encerrada'
  orcamentoDiario: number
  gastoTotal: number
  impressoes: number
  cliques: number
  conversoes: number
  receitaGerada: number
  periodo: { inicio: string; fim: string | null }
  responsavel: PerfilUsuario
}

// ─────────────────────────────────────────────
// INTERFACES — REUNIÕES
// ─────────────────────────────────────────────

export interface ReuniaoItem {
  id: string
  titulo: string
  tipo: 'societaria' | 'operacional' | 'parceiro' | 'fornecedor' | 'outro'
  status: StatusReuniaoItem
  data: string       // ISO date
  duracao: number    // minutos
  participantes: PerfilUsuario[]
  pauta: string[]
  ata: string
  decisoes: string[]
  proximosPassos: Array<{
    acao: string
    responsavel: PerfilUsuario
    prazo: string
  }>
  createdAt: string
  googleEventId?: string | null
}

// ─────────────────────────────────────────────
// INTERFACES — PRODUÇÃO (SKUs & Expedição)
// ─────────────────────────────────────────────

export interface ProdutoSKU {
  id: string
  sku: SKUProduto
  nome: string              // ex: 'NOIR Intense'
  unidades: number          // unidades em estoque
  threshold: number         // alerta se abaixo deste valor
  ultimaAtualizacao: string // ISO date
}

export interface PedidoExpedicao {
  id: string
  numeroPedido: string
  destinatario: string
  dataPedido: string        // ISO datetime
  prazoHoras: number        // SLA em horas (padrão: 48)
  status: StatusPedidoExpedicao
  itens: Array<{ sku: SKUProduto; nome: string; quantidade: number }>
  observacoes: string
}

// ─────────────────────────────────────────────
// INTERFACES — MARKETING (Calendário)
// ─────────────────────────────────────────────

export interface ConteudoCalendario {
  id: string
  data: string              // ISO date
  formato: FormatoConteudo
  responsavel: PerfilUsuario
  status: StatusConteudo
  descricao: string
  linkPublicado?: string
}

// ─────────────────────────────────────────────
// INTERFACES — REUNIÕES (Daily & Decisões)
// ─────────────────────────────────────────────

export interface DailyEntry {
  id: string
  socio: PerfilUsuario
  data: string              // ISO date (YYYY-MM-DD)
  ontemFiz: string
  hojeFarei: string
  bloqueadoEm: string
  createdAt: string
}

export interface DecisaoEstrategica {
  id: string
  titulo: string
  descricao: string
  propostoPor: PerfilUsuario
  data: string              // ISO date
  prazoVotacao: string      // ISO datetime — 24h para votar
  votos: {
    matheus: VotoDecisao
    joao: VotoDecisao
    gabriel: VotoDecisao
  }
  status: 'aberta' | 'aprovada' | 'rejeitada'
  createdAt: string
}

// ─────────────────────────────────────────────
// INTERFACES — CENTRAL DE CONHECIMENTO
// ─────────────────────────────────────────────

export type TipoBloco =
  | 'titulo' | 'subtitulo' | 'paragrafo' | 'lista' | 'checklist'
  | 'citacao' | 'divisor' | 'tabela' | 'callout' | 'codigo'

export type ConteudoBloco =
  | { texto: string }                                          // titulo, subtitulo, paragrafo, citacao, codigo
  | { itens: string[] }                                        // lista
  | { itens: Array<{ texto: string; feito: boolean }> }        // checklist
  | { texto: string; emoji: string }                           // callout
  | { colunas: string[]; linhas: string[][] }                  // tabela
  | Record<string, never>                                      // divisor

export interface KbCategoria {
  id: string
  nome: string
  icone: string   // nome do ícone lucide-react
  cor: string
  ordem: number
}

export interface KbDocumento {
  id: string
  categoriaId: string | null
  titulo: string
  emoji: string
  resumo: string
  ordem: number
  favorito: boolean
  atualizadoPor: string | null
  updatedAt: string
}

export interface KbBloco {
  id: string
  documentoId: string
  tipo: TipoBloco
  conteudo: ConteudoBloco
  ordem: number
}

// ─────────────────────────────────────────────
// INTERFACES — CONTAS & ACESSOS
// ─────────────────────────────────────────────

export type CategoriaContaAcesso = 'ads' | 'pagamento' | 'social' | 'infra' | 'banco' | 'legal'
export type StatusContaAcesso = 'ativo' | 'pendente' | 'inativo'

export interface ContaAcesso {
  id: string
  plataforma: string
  categoria: CategoriaContaAcesso
  identificador: string
  url: string
  responsavel: string
  status: StatusContaAcesso
  observacoes: string
  vaultRef: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// INTERFACES — VENDAS (Appmax)
// ─────────────────────────────────────────────

export type StatusVendaAppmax = 'aprovado' | 'pendente' | 'recusado' | 'estornado' | 'reembolsado'
export type MetodoPagamentoVenda = 'pix' | 'cartao' | 'boleto' | 'desconhecido'
export type CanalVenda = 'b2c' | 'b2b'

export interface Venda {
  id: string
  pedidoAppmax: string
  clienteNome: string
  clienteEmail: string
  clienteTelefone: string
  valorBruto: number
  valorLiquido: number
  taxa: number
  status: StatusVendaAppmax
  metodoPagamento: string
  parcelas: number
  canal: CanalVenda
  afiliadoCodigo: string | null
  produto: string
  quantidade: number
  dataVenda: string
  createdAt: string
}

// ─────────────────────────────────────────────
// INTERFACES — CONFIGURAÇÕES
// ─────────────────────────────────────────────

export interface Configuracoes {
  // Precificação
  margemLucro: number            // 0.65 = 65%
  markupPadrao: number           // calculado: 1 / (1 - margem)
  margemMinimaAlvo: number       // 0.65 = 65%
  alertaMargemAbaixoDe: number   // 0.60 = 60%

  // Split de Lucros (%)
  splitEstoque: number           // 0.40
  splitMarketing: number         // 0.30
  splitOperacional: number       // 0.15 — "Caixa"
  splitReserva: number           // 0.10 — "Desenvolvimento"
  splitSocietario: number        // 0.05

  // Metas
  metaReceitaMensal: number
  metaLeadsNovos: number
  metaLotesMes: number
  metaFaturamento90Dias: number  // 30000
  metaFaturamento12Meses: number // 300000
  metaLeadsMes: number           // 15
  metaCreatorsMes: number        // 30
  metaVideosMes: number          // 60

  // Alertas de tráfego
  diasSemPedidoAlerta: number    // padrão: 15
  estoqueMinimoPadrao: number
  roasMinimo: number             // 2.5
  cpaMaximo: number              // 30
  orcamentoDiarioMeta: number    // 80
  orcamentoDiarioGoogle: number  // 50
  orcamentoDiarioTikTok: number  // 30

  // Estoque — thresholds por SKU
  thresholdNoir: number          // 100
  thresholdUrban: number         // 100
  thresholdCoastal: number       // 100
  prazoMaxExpedicaoHoras: number // 48

  // Impostos (Simples Nacional)
  aliquotaSimples: number        // ex: 0.06 = 6%
  faixaFaturamento: string       // ex: 'Até R$ 180.000'

  // Contabilidade Gerencial
  regimeTributario: 'simples_nacional' | 'lucro_presumido'
  cnae: string                   // ex: '4772-5/00'
  aliquotaContabil: number       // sobrescreve aliquotaSimples para estimativa gerencial
}

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────

interface PurionState {
  // Perfil ativo
  perfilAtivo: PerfilUsuario
  setPerfilAtivo: (perfil: PerfilUsuario) => void

  // CRM
  leads: Lead[]
  setLeads: (leads: Lead[]) => void
  adicionarLead: (lead: Lead) => void
  atualizarLead: (id: string, dados: Partial<Lead>) => void
  removerLead: (id: string) => void

  // Financeiro
  receitas: Receita[]
  despesas: Despesa[]
  setReceitas: (receitas: Receita[]) => void
  setDespesas: (despesas: Despesa[]) => void
  adicionarReceita: (receita: Receita) => void
  adicionarDespesa: (despesa: Despesa) => void
  atualizarReceita: (id: string, dados: Partial<Receita>) => void
  atualizarDespesa: (id: string, dados: Partial<Despesa>) => void

  // Tarefas
  tarefas: Tarefa[]
  setTarefas: (tarefas: Tarefa[]) => void
  adicionarTarefa: (tarefa: Tarefa) => void
  atualizarTarefa: (id: string, dados: Partial<Tarefa>) => void
  removerTarefa: (id: string) => void

  // Produção
  lotes: Lote[]
  estoque: ItemEstoque[]
  produtosSKU: ProdutoSKU[]
  pedidosExpedicao: PedidoExpedicao[]
  setLotes: (lotes: Lote[]) => void
  setEstoque: (estoque: ItemEstoque[]) => void
  setProdutosSKU: (produtos: ProdutoSKU[]) => void
  setPedidosExpedicao: (pedidos: PedidoExpedicao[]) => void
  adicionarLote: (lote: Lote) => void
  atualizarLote: (id: string, dados: Partial<Lote>) => void
  atualizarItemEstoque: (id: string, dados: Partial<ItemEstoque>) => void
  atualizarProdutoSKU: (id: string, dados: Partial<ProdutoSKU>) => void
  adicionarPedidoExpedicao: (pedido: PedidoExpedicao) => void
  atualizarPedidoExpedicao: (id: string, dados: Partial<PedidoExpedicao>) => void

  // Marketing
  creators: Creator[]
  campanhasAds: CampanhaAds[]
  campanhasCreators: CampanhaCreators[]
  conteudosCalendario: ConteudoCalendario[]
  setCreators: (creators: Creator[]) => void
  setCampanhasAds: (campanhas: CampanhaAds[]) => void
  setCampanhasCreators: (campanhas: CampanhaCreators[]) => void
  setConteudosCalendario: (conteudos: ConteudoCalendario[]) => void
  adicionarCreator: (creator: Creator) => void
  atualizarCreator: (id: string, dados: Partial<Creator>) => void
  adicionarCampanhaCreators: (campanha: CampanhaCreators) => void
  atualizarCampanhaCreators: (id: string, dados: Partial<CampanhaCreators>) => void
  adicionarConteudo: (conteudo: ConteudoCalendario) => void
  atualizarConteudo: (id: string, dados: Partial<ConteudoCalendario>) => void

  // Reuniões
  reunioes: ReuniaoItem[]
  dailyEntries: DailyEntry[]
  decisoes: DecisaoEstrategica[]
  setReunioes: (reunioes: ReuniaoItem[]) => void
  setDailyEntries: (entries: DailyEntry[]) => void
  setDecisoes: (decisoes: DecisaoEstrategica[]) => void
  adicionarReuniao: (reuniao: ReuniaoItem) => void
  atualizarReuniao: (id: string, dados: Partial<ReuniaoItem>) => void
  adicionarDailyEntry: (entry: DailyEntry) => void
  adicionarDecisao: (decisao: DecisaoEstrategica) => void
  atualizarDecisao: (id: string, dados: Partial<DecisaoEstrategica>) => void

  // Central de Conhecimento
  kbCategorias: KbCategoria[]
  kbDocumentos: KbDocumento[]
  kbBlocos: KbBloco[]
  setKbCategorias: (categorias: KbCategoria[]) => void
  setKbDocumentos: (documentos: KbDocumento[]) => void
  setKbBlocos: (blocos: KbBloco[]) => void
  adicionarKbDocumento: (doc: KbDocumento) => void
  atualizarKbDocumento: (id: string, dados: Partial<KbDocumento>) => void
  removerKbDocumento: (id: string) => void
  adicionarKbBloco: (bloco: KbBloco) => void
  atualizarKbBloco: (id: string, dados: Partial<KbBloco>) => void
  removerKbBloco: (id: string) => void

  // Contas & Acessos
  contasAcessos: ContaAcesso[]
  setContasAcessos: (contas: ContaAcesso[]) => void
  adicionarContaAcesso: (conta: ContaAcesso) => void
  atualizarContaAcesso: (id: string, dados: Partial<ContaAcesso>) => void
  removerContaAcesso: (id: string) => void

  // Vendas (Appmax)
  vendas: Venda[]
  setVendas: (vendas: Venda[]) => void

  // Configurações
  configuracoes: Configuracoes
  setConfiguracoes: (config: Partial<Configuracoes>) => void

  // UI
  sidebarRecolhida: boolean
  setSidebarRecolhida: (recolhida: boolean) => void
  mobileSidebarAberta: boolean
  setMobileSidebarAberta: (v: boolean) => void

  // Focus Mode
  focusMode: boolean
  setFocusMode: (v: boolean) => void

  // Dashboard Widgets
  dashboardWidgets: string[]
  setDashboardWidgets: (ids: string[]) => void
}

// ─────────────────────────────────────────────
// CONFIGURAÇÕES PADRÃO
// ─────────────────────────────────────────────

const configPadrao: Configuracoes = {
  margemLucro: 0.65,
  markupPadrao: 1 / (1 - 0.65), // ≈ 2.857
  margemMinimaAlvo: 0.65,
  alertaMargemAbaixoDe: 0.60,

  splitEstoque: 0.40,
  splitMarketing: 0.30,
  splitOperacional: 0.15,
  splitReserva: 0.10,
  splitSocietario: 0.05,

  metaReceitaMensal: 25000,
  metaLeadsNovos: 8,
  metaLotesMes: 4,
  metaFaturamento90Dias: 30000,
  metaFaturamento12Meses: 300000,
  metaLeadsMes: 15,
  metaCreatorsMes: 30,
  metaVideosMes: 60,

  diasSemPedidoAlerta: 15,
  estoqueMinimoPadrao: 100,
  roasMinimo: 2.5,
  cpaMaximo: 30,
  orcamentoDiarioMeta: 80,
  orcamentoDiarioGoogle: 50,
  orcamentoDiarioTikTok: 30,

  thresholdNoir: 100,
  thresholdUrban: 100,
  thresholdCoastal: 100,
  prazoMaxExpedicaoHoras: 48,

  aliquotaSimples: 0.06,
  faixaFaturamento: 'Até R$ 180.000',

  regimeTributario: 'simples_nacional',
  cnae: '4772-5/00',
  aliquotaContabil: 0.06,
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

export const usePurionStore = create<PurionState>()(
  devtools(
    persist(
      (set) => ({
        // ── Perfil ──
        perfilAtivo: 'matheus',
        setPerfilAtivo: (perfil) => set({ perfilAtivo: perfil }),

        // ── CRM ──
        leads: [],
        setLeads: (leads) => set({ leads }),
        adicionarLead: (lead) =>
          set((s) => ({ leads: [...s.leads, lead] })),
        atualizarLead: (id, dados) =>
          set((s) => ({
            leads: s.leads.map((l) => (l.id === id ? { ...l, ...dados } : l)),
          })),
        removerLead: (id) =>
          set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

        // ── Financeiro ──
        receitas: [],
        despesas: [],
        setReceitas: (receitas) => set({ receitas }),
        setDespesas: (despesas) => set({ despesas }),
        adicionarReceita: (receita) =>
          set((s) => ({ receitas: [...s.receitas, receita] })),
        adicionarDespesa: (despesa) =>
          set((s) => ({ despesas: [...s.despesas, despesa] })),
        atualizarReceita: (id, dados) =>
          set((s) => ({ receitas: s.receitas.map((r) => r.id === id ? { ...r, ...dados } : r) })),
        atualizarDespesa: (id, dados) =>
          set((s) => ({ despesas: s.despesas.map((d) => d.id === id ? { ...d, ...dados } : d) })),

        // ── Tarefas ──
        tarefas: [],
        setTarefas: (tarefas) => set({ tarefas }),
        adicionarTarefa: (tarefa) =>
          set((s) => ({ tarefas: [...s.tarefas, tarefa] })),
        atualizarTarefa: (id, dados) =>
          set((s) => ({
            tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, ...dados } : t)),
          })),
        removerTarefa: (id) =>
          set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),

        // ── Produção ──
        lotes: [],
        estoque: [],
        produtosSKU: [],
        pedidosExpedicao: [],
        setLotes: (lotes) => set({ lotes }),
        setEstoque: (estoque) => set({ estoque }),
        setProdutosSKU: (produtosSKU) => set({ produtosSKU }),
        setPedidosExpedicao: (pedidosExpedicao) => set({ pedidosExpedicao }),
        adicionarLote: (lote) =>
          set((s) => ({ lotes: [...s.lotes, lote] })),
        atualizarLote: (id, dados) =>
          set((s) => ({
            lotes: s.lotes.map((l) => (l.id === id ? { ...l, ...dados } : l)),
          })),
        atualizarItemEstoque: (id, dados) =>
          set((s) => ({
            estoque: s.estoque.map((i) => (i.id === id ? { ...i, ...dados } : i)),
          })),
        atualizarProdutoSKU: (id, dados) =>
          set((s) => ({
            produtosSKU: s.produtosSKU.map((p) => (p.id === id ? { ...p, ...dados } : p)),
          })),
        adicionarPedidoExpedicao: (pedido) =>
          set((s) => ({ pedidosExpedicao: [...s.pedidosExpedicao, pedido] })),
        atualizarPedidoExpedicao: (id, dados) =>
          set((s) => ({
            pedidosExpedicao: s.pedidosExpedicao.map((p) => (p.id === id ? { ...p, ...dados } : p)),
          })),

        // ── Marketing ──
        creators: [],
        campanhasAds: [],
        campanhasCreators: [],
        conteudosCalendario: [],
        setCreators: (creators) => set({ creators }),
        setCampanhasAds: (campanhasAds) => set({ campanhasAds }),
        setCampanhasCreators: (campanhasCreators) => set({ campanhasCreators }),
        setConteudosCalendario: (conteudosCalendario) => set({ conteudosCalendario }),
        adicionarCreator: (creator) =>
          set((s) => ({ creators: [...s.creators, creator] })),
        atualizarCreator: (id, dados) =>
          set((s) => ({
            creators: s.creators.map((c) => (c.id === id ? { ...c, ...dados } : c)),
          })),
        adicionarCampanhaCreators: (campanha) =>
          set((s) => ({ campanhasCreators: [...s.campanhasCreators, campanha] })),
        atualizarCampanhaCreators: (id, dados) =>
          set((s) => ({
            campanhasCreators: s.campanhasCreators.map((c) => (c.id === id ? { ...c, ...dados } : c)),
          })),
        adicionarConteudo: (conteudo) =>
          set((s) => ({ conteudosCalendario: [...s.conteudosCalendario, conteudo] })),
        atualizarConteudo: (id, dados) =>
          set((s) => ({
            conteudosCalendario: s.conteudosCalendario.map((c) => (c.id === id ? { ...c, ...dados } : c)),
          })),

        // ── Reuniões ──
        reunioes: [],
        dailyEntries: [],
        decisoes: [],
        setReunioes: (reunioes) => set({ reunioes }),
        setDailyEntries: (dailyEntries) => set({ dailyEntries }),
        setDecisoes: (decisoes) => set({ decisoes }),
        adicionarReuniao: (reuniao) =>
          set((s) => ({ reunioes: [...s.reunioes, reuniao] })),
        atualizarReuniao: (id, dados) =>
          set((s) => ({
            reunioes: s.reunioes.map((r) => (r.id === id ? { ...r, ...dados } : r)),
          })),
        adicionarDailyEntry: (entry) =>
          set((s) => {
            const all = [...s.dailyEntries, entry]
            // Mantém os últimos 7 entries por sócio
            const result: DailyEntry[] = []
            const socios: PerfilUsuario[] = ['matheus', 'joao', 'gabriel']
            socios.forEach((socio) => {
              const porSocio = all
                .filter((e) => e.socio === socio)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 7)
              result.push(...porSocio)
            })
            return { dailyEntries: result }
          }),
        adicionarDecisao: (decisao) =>
          set((s) => ({ decisoes: [...s.decisoes, decisao] })),
        atualizarDecisao: (id, dados) =>
          set((s) => ({
            decisoes: s.decisoes.map((d) => (d.id === id ? { ...d, ...dados } : d)),
          })),

        // ── Central de Conhecimento ──
        kbCategorias: [],
        kbDocumentos: [],
        kbBlocos: [],
        setKbCategorias: (kbCategorias) => set({ kbCategorias }),
        setKbDocumentos: (kbDocumentos) => set({ kbDocumentos }),
        setKbBlocos: (kbBlocos) => set({ kbBlocos }),
        adicionarKbDocumento: (doc) =>
          set((s) => ({ kbDocumentos: [...s.kbDocumentos, doc] })),
        atualizarKbDocumento: (id, dados) =>
          set((s) => ({
            kbDocumentos: s.kbDocumentos.map((d) => (d.id === id ? { ...d, ...dados } : d)),
          })),
        removerKbDocumento: (id) =>
          set((s) => ({ kbDocumentos: s.kbDocumentos.filter((d) => d.id !== id) })),
        adicionarKbBloco: (bloco) =>
          set((s) => ({ kbBlocos: [...s.kbBlocos, bloco] })),
        atualizarKbBloco: (id, dados) =>
          set((s) => ({
            kbBlocos: s.kbBlocos.map((b) => (b.id === id ? { ...b, ...dados } : b)),
          })),
        removerKbBloco: (id) =>
          set((s) => ({ kbBlocos: s.kbBlocos.filter((b) => b.id !== id) })),

        // ── Contas & Acessos ──
        contasAcessos: [],
        setContasAcessos: (contasAcessos) => set({ contasAcessos }),
        adicionarContaAcesso: (conta) =>
          set((s) => ({ contasAcessos: [...s.contasAcessos, conta] })),
        atualizarContaAcesso: (id, dados) =>
          set((s) => ({
            contasAcessos: s.contasAcessos.map((c) => (c.id === id ? { ...c, ...dados } : c)),
          })),
        removerContaAcesso: (id) =>
          set((s) => ({ contasAcessos: s.contasAcessos.filter((c) => c.id !== id) })),

        // ── Vendas (Appmax) ──
        vendas: [],
        setVendas: (vendas) => set({ vendas }),

        // ── Configurações ──
        configuracoes: configPadrao,
        setConfiguracoes: (config) =>
          set((s) => ({
            configuracoes: { ...s.configuracoes, ...config },
          })),

        // ── UI ──
        sidebarRecolhida: false,
        setSidebarRecolhida: (recolhida) => set({ sidebarRecolhida: recolhida }),
        mobileSidebarAberta: false,
        setMobileSidebarAberta: (v) => set({ mobileSidebarAberta: v }),

        // ── Focus Mode ──
        focusMode: false,
        setFocusMode: (v) => set({ focusMode: v }),

        // ── Dashboard Widgets ──
        dashboardWidgets: [
          'kpis', 'health-score', 'atividade', 'tarefas-board', 'pipeline-top5',
          'estoque', 'creators-top5', 'grafico-financeiro', 'metas-progress',
          'decisoes', 'alertas', 'notas-fixadas',
        ],
        setDashboardWidgets: (ids) => set({ dashboardWidgets: ids }),
      }),
      {
        name: 'purion-os-storage',
        // skipHydration prevents SSR/client mismatch; StoreProvider calls rehydrate() on mount
        skipHydration: true,
        partialize: (state) => ({
          perfilAtivo: state.perfilAtivo,
          configuracoes: state.configuracoes,
          sidebarRecolhida: state.sidebarRecolhida,
          leads: state.leads,
          dashboardWidgets: state.dashboardWidgets,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as object),
          configuracoes: {
            ...configPadrao,
            ...((persisted as { configuracoes?: Partial<Configuracoes> }).configuracoes ?? {}),
          },
        }),
      }
    ),
    { name: 'PURION OS' }
  )
)
