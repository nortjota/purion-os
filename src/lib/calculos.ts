/**
 * PURION OS — Funções de Cálculo e Formatação
 * Utilitários puros sem dependência de React.
 * Todos os valores monetários em R$ (BRL).
 */

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  Receita,
  Despesa,
  CampanhaAds,
  Tarefa,
  Lead,
  Lote,
  ReuniaoItem,
  ItemEstoque,
} from '@/store'

// ─────────────────────────────────────────────
// FORMATADORES
// ─────────────────────────────────────────────

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarMoedaCompacta(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(1)}k`
  return formatarMoeda(valor)
}

export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas)}%`
}

export function formatarDataCurta(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM 'às' HH:mm", { locale: ptBR })
  } catch {
    return iso
  }
}

export function formatarDataBR(data: string | null | undefined): string {
  if (!data) return '—'
  try {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return data
  }
}

export function formatarDataRelativa(data: string | null | undefined): string {
  if (!data) return ''
  try {
    const alvo = parseISO(data)
    const hoje = new Date()
    const alvoDia = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate())
    const hojeDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const diffDias = Math.round((alvoDia.getTime() - hojeDia.getTime()) / 86_400_000)

    if (diffDias === 0) return 'hoje'
    if (diffDias === 1) return 'amanhã'
    if (diffDias === -1) return 'ontem'
    if (diffDias > 1 && diffDias <= 6) return `em ${diffDias} dias`
    if (diffDias < -1 && diffDias >= -6) return `há ${Math.abs(diffDias)} dias`
    if (diffDias > 6) return `em ${Math.round(diffDias / 7)} semana${Math.round(diffDias / 7) > 1 ? 's' : ''}`
    return `há ${Math.round(Math.abs(diffDias) / 7)} semana${Math.round(Math.abs(diffDias) / 7) > 1 ? 's' : ''}`
  } catch {
    return ''
  }
}

export function formatarMesLabel(mesKey: string): string {
  const MESES: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  }
  const partes = mesKey.split('-')
  return MESES[partes[1]] ?? mesKey
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

function getMesAnterior(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  if (m === 1) return `${ano - 1}-12`
  return `${ano}-${String(m - 1).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// MÊS MAIS RECENTE NOS DADOS
// ─────────────────────────────────────────────

export function getMesAtual(receitas: Receita[]): string {
  if (receitas.length === 0) return new Date().toISOString().substring(0, 7)
  const sorted = [...receitas].sort((a, b) => b.data.localeCompare(a.data))
  return sorted[0].data.substring(0, 7)
}

// ─────────────────────────────────────────────
// KPIs DO MÊS
// ─────────────────────────────────────────────

export interface KPIsMes {
  faturamento: number
  despesaTotal: number
  margemBruta: number   // %
  pedidos: number
  ticketMedio: number
  roas: number
  cpa: number
  saldo: number
}

export function calcularKPIsMes(
  receitas: Receita[],
  despesas: Despesa[],
  campanhas: CampanhaAds[],
  mes: string
): KPIsMes {
  const receitasMes = receitas.filter((r) => r.data.startsWith(mes))
  const despesasMes = despesas.filter((d) => d.data.startsWith(mes))

  const faturamento = receitasMes.reduce((s, r) => s + r.valor, 0)
  const despesaTotal = despesasMes.reduce((s, d) => s + d.valor, 0)
  const saldo = faturamento - despesaTotal
  const margemBruta = faturamento > 0 ? ((faturamento - despesaTotal) / faturamento) * 100 : 0
  const pedidos = receitasMes.length
  const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0

  // ROAS e CPA calculados a partir das campanhas ativas no mês
  const campsMes = campanhas.filter(
    (c) =>
      c.periodo.inicio.startsWith(mes) ||
      (c.periodo.fim && c.periodo.fim.startsWith(mes))
  )
  const gastoAds = campsMes.reduce((s, c) => s + c.gastoTotal, 0)
  const receitaAds = campsMes.reduce((s, c) => s + c.receitaGerada, 0)
  const conversoes = campsMes.reduce((s, c) => s + c.conversoes, 0)

  const roas = gastoAds > 0 ? receitaAds / gastoAds : 0
  const cpa = conversoes > 0 ? gastoAds / conversoes : 0

  return { faturamento, despesaTotal, margemBruta, pedidos, ticketMedio, roas, cpa, saldo }
}

// ─────────────────────────────────────────────
// KPIs POR PERÍODO (seletor Hoje/Semana/Mês/Trimestre)
// ─────────────────────────────────────────────

export type PeriodoDashboard = 'hoje' | 'semana' | 'mes' | 'trimestre'

/** Range [inicio, fim] em ISO (yyyy-MM-dd) para cada opção do seletor de período. */
export function rangePeriodoDashboard(periodo: PeriodoDashboard, referencia: Date = new Date()): [string, string] {
  const fim = referencia.toISOString().slice(0, 10)
  if (periodo === 'hoje') return [fim, fim]
  if (periodo === 'semana') {
    const inicio = new Date(referencia)
    inicio.setDate(inicio.getDate() - 6)
    return [inicio.toISOString().slice(0, 10), fim]
  }
  if (periodo === 'mes') {
    const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1)
    return [inicio.toISOString().slice(0, 10), fim]
  }
  // trimestre — últimos 90 dias
  const inicio = new Date(referencia)
  inicio.setDate(inicio.getDate() - 89)
  return [inicio.toISOString().slice(0, 10), fim]
}

/** Range imediatamente anterior, com a mesma duração — usado para calcular variação (tendência). */
export function rangePeriodoAnterior(periodo: PeriodoDashboard, referencia: Date = new Date()): [string, string] {
  if (periodo === 'hoje') {
    const ontem = new Date(referencia); ontem.setDate(ontem.getDate() - 1)
    const d = ontem.toISOString().slice(0, 10)
    return [d, d]
  }
  if (periodo === 'semana') {
    const fim = new Date(referencia); fim.setDate(fim.getDate() - 7)
    const inicio = new Date(referencia); inicio.setDate(inicio.getDate() - 13)
    return [inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)]
  }
  if (periodo === 'mes') {
    const mesAnteriorRef = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 1)
    const inicio = new Date(mesAnteriorRef.getFullYear(), mesAnteriorRef.getMonth(), 1)
    const fim = new Date(mesAnteriorRef.getFullYear(), mesAnteriorRef.getMonth() + 1, 0)
    return [inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)]
  }
  const fim = new Date(referencia); fim.setDate(fim.getDate() - 90)
  const inicio = new Date(referencia); inicio.setDate(inicio.getDate() - 179)
  return [inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)]
}

export function calcularKPIsPeriodo(
  receitas: Receita[],
  despesas: Despesa[],
  campanhas: CampanhaAds[],
  dataInicio: string,
  dataFim: string
): KPIsMes {
  const dentro = (data: string) => data.slice(0, 10) >= dataInicio && data.slice(0, 10) <= dataFim

  const receitasPeriodo = receitas.filter((r) => dentro(r.data))
  const despesasPeriodo = despesas.filter((d) => dentro(d.data))

  const faturamento = receitasPeriodo.reduce((s, r) => s + r.valor, 0)
  const despesaTotal = despesasPeriodo.reduce((s, d) => s + d.valor, 0)
  const saldo = faturamento - despesaTotal
  const margemBruta = faturamento > 0 ? ((faturamento - despesaTotal) / faturamento) * 100 : 0
  const pedidos = receitasPeriodo.length
  const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0

  const campsPeriodo = campanhas.filter(
    (c) => dentro(c.periodo.inicio) || (c.periodo.fim && dentro(c.periodo.fim))
  )
  const gastoAds = campsPeriodo.reduce((s, c) => s + c.gastoTotal, 0)
  const receitaAds = campsPeriodo.reduce((s, c) => s + c.receitaGerada, 0)
  const conversoes = campsPeriodo.reduce((s, c) => s + c.conversoes, 0)

  const roas = gastoAds > 0 ? receitaAds / gastoAds : 0
  const cpa = conversoes > 0 ? gastoAds / conversoes : 0

  return { faturamento, despesaTotal, margemBruta, pedidos, ticketMedio, roas, cpa, saldo }
}

// ─────────────────────────────────────────────
// KPIs GLOBAIS (todos os meses)
// ─────────────────────────────────────────────

export interface KPIsGlobais {
  receitaTotal: number
  despesaTotal: number
  saldoTotal: number
  margemMedia: number
}

export function calcularKPIsGlobais(receitas: Receita[], despesas: Despesa[]): KPIsGlobais {
  const receitaTotal = receitas.reduce((s, r) => s + r.valor, 0)
  const despesaTotal = despesas.reduce((s, d) => s + d.valor, 0)
  const saldoTotal = receitaTotal - despesaTotal
  const margemMedia = receitaTotal > 0 ? ((receitaTotal - despesaTotal) / receitaTotal) * 100 : 0
  return { receitaTotal, despesaTotal, saldoTotal, margemMedia }
}

// ─────────────────────────────────────────────
// DADOS PARA GRÁFICO (6 meses)
// ─────────────────────────────────────────────

export interface MesGrafico {
  mes: string     // label curto: 'Set', 'Out' …
  mesKey: string  // 'YYYY-MM'
  receita: number
  despesa: number
  margem: number  // %
}

// Histórico sintético para completar 6 meses quando só há 2 no seed
const HISTORICO_SINTETICO: Array<{ mes: string; receita: number; despesa: number }> = [
  { mes: '2023-09', receita: 7_800,  despesa: 5_100 },
  { mes: '2023-10', receita: 9_200,  despesa: 5_600 },
  { mes: '2023-11', receita: 11_400, despesa: 6_200 },
  { mes: '2023-12', receita: 14_200, despesa: 7_800 },
]

export function calcularGrafico6Meses(
  receitas: Receita[],
  despesas: Despesa[]
): MesGrafico[] {
  // Meses únicos do seed
  const mesesSeed = new Set<string>()
  ;[...receitas, ...despesas].forEach((item) => mesesSeed.add(item.data.substring(0, 7)))

  // Agrega valores por mês real
  const mesesReais = [...mesesSeed].sort().map((mesKey) => ({
    mes: mesKey,
    receita: receitas
      .filter((r) => r.data.startsWith(mesKey))
      .reduce((s, r) => s + r.valor, 0),
    despesa: despesas
      .filter((d) => d.data.startsWith(mesKey))
      .reduce((s, d) => s + d.valor, 0),
  }))

  // Combina histórico + reais e pega últimos 6
  const todos = [...HISTORICO_SINTETICO, ...mesesReais]
  const ultimos6 = todos.slice(-6)

  return ultimos6.map(({ mes, receita, despesa }) => ({
    mes: formatarMesLabel(mes),
    mesKey: mes,
    receita,
    despesa,
    margem: receita > 0 ? Math.round(((receita - despesa) / receita) * 100) : 0,
  }))
}

// ─────────────────────────────────────────────
// PROJEÇÃO 30 / 60 / 90 DIAS
// ─────────────────────────────────────────────

export interface ProjecaoDias {
  dias: 30 | 60 | 90
  receitaProjetada: number
  despesaProjetada: number
  margemProjetada: number
}

export function calcularProjecoes(receitas: Receita[], despesas: Despesa[]): ProjecaoDias[] {
  const mesAtual = getMesAtual(receitas)
  const mesAnterior = getMesAnterior(mesAtual)

  const r1 = receitas.filter((r) => r.data.startsWith(mesAtual)).reduce((s, r) => s + r.valor, 0)
  const r2 = receitas.filter((r) => r.data.startsWith(mesAnterior)).reduce((s, r) => s + r.valor, 0)
  const d1 = despesas.filter((d) => d.data.startsWith(mesAtual)).reduce((s, d) => s + d.valor, 0)
  const d2 = despesas.filter((d) => d.data.startsWith(mesAnterior)).reduce((s, d) => s + d.valor, 0)

  const mediaReceita = (r1 + r2) / 2
  const mediaDespesa = (d1 + d2) / 2

  return ([30, 60, 90] as const).map((dias) => {
    const fator = dias / 30
    const receitaProjetada = Math.round(mediaReceita * fator)
    const despesaProjetada = Math.round(mediaDespesa * fator)
    const margemProjetada =
      receitaProjetada > 0
        ? Math.round(((receitaProjetada - despesaProjetada) / receitaProjetada) * 100)
        : 0
    return { dias, receitaProjetada, despesaProjetada, margemProjetada }
  })
}

// ─────────────────────────────────────────────
// ALERTAS AUTOMÁTICOS
// ─────────────────────────────────────────────

export interface Alerta {
  id: string
  tipo: 'danger' | 'warning' | 'info'
  mensagem: string
  detalhe?: string
}

export function calcularAlertas(kpis: KPIsMes, estoque: ItemEstoque[]): Alerta[] {
  const alertas: Alerta[] = []

  if (kpis.roas > 0 && kpis.roas < 2.5) {
    alertas.push({
      id: 'roas-baixo',
      tipo: 'danger',
      mensagem: 'ROAS abaixo do mínimo',
      detalhe: `Atual: ${kpis.roas.toFixed(2)}x (mínimo: 2.5x)`,
    })
  }

  if (kpis.cpa > 30) {
    alertas.push({
      id: 'cpa-alto',
      tipo: 'warning',
      mensagem: 'CPA acima do limite',
      detalhe: `Atual: ${formatarMoeda(kpis.cpa)} (limite: R$ 30,00)`,
    })
  }

  estoque
    .filter((i) => i.quantidadeAtual < i.quantidadeMinima)
    .forEach((i) => {
      alertas.push({
        id: `estoque-${i.id}`,
        tipo: 'info',
        mensagem: `Estoque baixo: ${i.nome}`,
        detalhe: `${i.quantidadeAtual} ${i.unidade} (mín: ${i.quantidadeMinima})`,
      })
    })

  return alertas
}

// ─────────────────────────────────────────────
// FEED DE ATIVIDADE RECENTE
// ─────────────────────────────────────────────

export interface AtividadeItem {
  id: string
  responsavel: string
  inicial: string
  corAvatar: string
  acao: string
  data: string    // ISO date
  dataFormatada: string
  modulo: string
}

// Cor de avatar por sócio
const COR_AVATAR: Record<string, string> = {
  matheus: '#C9A84C',
  gabriel: '#22C55E',
  joao:    '#5B8FE8',
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function gerarFeedAtividade(
  tarefas: Tarefa[],
  leads: Lead[],
  lotes: Lote[],
  reunioes: ReuniaoItem[]
): AtividadeItem[] {
  const atividades: AtividadeItem[] = []

  // Tarefas concluídas
  tarefas
    .filter((t) => t.completedAt)
    .forEach((t) => {
      atividades.push({
        id: `concluiu-${t.id}`,
        responsavel: capitalize(t.responsavel),
        inicial: t.responsavel.charAt(0).toUpperCase(),
        corAvatar: COR_AVATAR[t.responsavel] ?? '#B8B8B8',
        acao: `concluiu "${t.titulo}"`,
        data: t.completedAt!,
        dataFormatada: formatarDataCurta(t.completedAt!),
        modulo: 'tarefas',
      })
    })

  // Tarefas criadas (não concluídas)
  tarefas
    .filter((t) => !t.completedAt)
    .forEach((t) => {
      atividades.push({
        id: `criou-tar-${t.id}`,
        responsavel: capitalize(t.responsavel),
        inicial: t.responsavel.charAt(0).toUpperCase(),
        corAvatar: COR_AVATAR[t.responsavel] ?? '#B8B8B8',
        acao: `criou tarefa "${t.titulo}"`,
        data: t.createdAt,
        dataFormatada: formatarDataCurta(t.createdAt),
        modulo: 'tarefas',
      })
    })

  // Leads atualizados
  leads.forEach((l) => {
    atividades.push({
      id: `lead-${l.id}`,
      responsavel: capitalize(l.responsavel),
      inicial: l.responsavel.charAt(0).toUpperCase(),
      corAvatar: COR_AVATAR[l.responsavel] ?? '#B8B8B8',
      acao: `atualizou lead ${l.nomeEmpresa} (${l.status.replace(/_/g, ' ')})`,
      data: l.updatedAt,
      dataFormatada: formatarDataCurta(l.updatedAt),
      modulo: 'crm',
    })
  })

  // Lotes iniciados
  lotes.forEach((l) => {
    const dataInicio = l.dataInicio + 'T10:00:00Z'
    atividades.push({
      id: `lote-${l.id}`,
      responsavel: capitalize(l.responsavel),
      inicial: l.responsavel.charAt(0).toUpperCase(),
      corAvatar: COR_AVATAR[l.responsavel] ?? '#B8B8B8',
      acao: `iniciou ${l.codigo} — ${l.produto}`,
      data: dataInicio,
      dataFormatada: formatarDataCurta(dataInicio),
      modulo: 'producao',
    })
  })

  // Reuniões agendadas
  reunioes.forEach((r) => {
    const resp = r.participantes[0] ?? 'matheus'
    atividades.push({
      id: `reu-${r.id}`,
      responsavel: capitalize(resp),
      inicial: resp.charAt(0).toUpperCase(),
      corAvatar: COR_AVATAR[resp] ?? '#B8B8B8',
      acao: `agendou "${r.titulo}"`,
      data: r.createdAt,
      dataFormatada: formatarDataCurta(r.createdAt),
      modulo: 'reunioes',
    })
  })

  return atividades
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 10)
}

// ─────────────────────────────────────────────
// CALCULADORA DE PRECIFICAÇÃO
// ─────────────────────────────────────────────

export interface ResultadoPrecificacao {
  precoVenda: number
  margemBruta: number   // fixo 65%
  lucroLiquido: number
  markup: number
}

export function calcularPrecificacao(custo: number): ResultadoPrecificacao {
  const precoVenda = custo / 0.35
  const lucroLiquido = precoVenda - custo
  const markup = custo > 0 ? precoVenda / custo : 0
  return { precoVenda, margemBruta: 65, lucroLiquido, markup }
}

// ─────────────────────────────────────────────
// SPLIT DE LUCROS
// ─────────────────────────────────────────────

export interface SplitItem {
  categoria: string
  percentual: number
  valor: number
  cor: string
  emoji: string
}

interface ConfigSplit {
  splitEstoque: number
  splitMarketing: number
  splitOperacional: number
  splitReserva: number
  splitSocietario: number
}

export function calcularSplit(valor: number, config: ConfigSplit): SplitItem[] {
  return [
    {
      categoria: 'Estoque',
      percentual: config.splitEstoque * 100,
      valor: valor * config.splitEstoque,
      cor: '#4CAF7A',
      emoji: '📦',
    },
    {
      categoria: 'Marketing',
      percentual: config.splitMarketing * 100,
      valor: valor * config.splitMarketing,
      cor: '#5B8FE8',
      emoji: '📣',
    },
    {
      categoria: 'Caixa / Operacional',
      percentual: config.splitOperacional * 100,
      valor: valor * config.splitOperacional,
      cor: '#C9A84C',
      emoji: '💰',
    },
    {
      categoria: 'Desenvolvimento',
      percentual: config.splitReserva * 100,
      valor: valor * config.splitReserva,
      cor: '#E8A838',
      emoji: '🚀',
    },
    {
      categoria: 'Reserva Societária',
      percentual: config.splitSocietario * 100,
      valor: valor * config.splitSocietario,
      cor: '#8B5CF6',
      emoji: '🏛️',
    },
  ]
}

// ─────────────────────────────────────────────
// HEALTH SCORE DA OPERAÇÃO (0–10)
// ─────────────────────────────────────────────

export interface HealthScore {
  score: number   // 0-10
  status: 'Crítico' | 'Atenção' | 'Saudável' | 'Excelente'
  cor: string
  componentes: {
    margem: number
    roas: number
    estoque: number
    crescimento: number
  }
}

export function calcularHealthScore(
  receitas: Receita[],
  despesas: Despesa[],
  campanhas: CampanhaAds[],
  estoque: ItemEstoque[]
): HealthScore {
  const mesAtual = getMesAtual(receitas)
  const kpis = calcularKPIsMes(receitas, despesas, campanhas, mesAtual)

  // Margem (peso 30%) — ideal >= 65%
  const scoreMargem = Math.min(10, Math.max(0, (kpis.margemBruta / 65) * 10))

  // ROAS (peso 30%) — ideal >= 5x
  const scoreROAS = Math.min(10, Math.max(0, (kpis.roas / 5) * 10))

  // Estoque saudável (peso 20%)
  const itensAbaixo = estoque.filter((i) => i.quantidadeAtual < i.quantidadeMinima).length
  const scoreEstoque =
    estoque.length > 0 ? Math.max(0, 10 - (itensAbaixo / estoque.length) * 10) : 8

  // Crescimento vs mês anterior (peso 20%)
  const mesAnterior = getMesAnterior(mesAtual)
  const recMesAnt = receitas
    .filter((r) => r.data.startsWith(mesAnterior))
    .reduce((s, r) => s + r.valor, 0)
  const crescimento = recMesAnt > 0 ? ((kpis.faturamento - recMesAnt) / recMesAnt) * 100 : 0
  const scoreCrescimento = Math.min(10, Math.max(0, 5 + crescimento / 20))

  const score = Math.round(
    scoreMargem * 0.3 +
    scoreROAS * 0.3 +
    scoreEstoque * 0.2 +
    scoreCrescimento * 0.2
  )

  const status =
    score >= 8 ? 'Excelente' :
    score >= 6 ? 'Saudável' :
    score >= 4 ? 'Atenção' :
    'Crítico'

  const cor =
    score >= 8 ? '#4CAF7A' :
    score >= 6 ? '#C9A84C' :
    score >= 4 ? '#E8A838' :
    '#E85238'

  return {
    score,
    status,
    cor,
    componentes: {
      margem: Math.round(scoreMargem),
      roas: Math.round(scoreROAS),
      estoque: Math.round(scoreEstoque),
      crescimento: Math.round(scoreCrescimento),
    },
  }
}

// ─────────────────────────────────────────────
// LABELS LEGÍVEIS
// ─────────────────────────────────────────────

export const LABEL_CATEGORIA_RECEITA: Record<string, string> = {
  venda_b2b: 'Venda B2B',
  venda_b2c: 'Venda B2C',
  nuvemshop: 'Nuvemshop',
  marketplace: 'Marketplace',
  outro: 'Outro',
}

export const LABEL_CATEGORIA_DESPESA: Record<string, string> = {
  insumos: 'Insumos',
  embalagens: 'Embalagens',
  ads_meta: 'Ads Meta',
  ads_google: 'Ads Google',
  logistica: 'Logística',
  taxas_impostos: 'Taxas & Impostos',
  pessoal: 'Pessoal',
  overhead: 'Overhead',
  outro: 'Outro',
}

export const LABEL_STATUS_LEAD: Record<string, string> = {
  prospecto: 'Prospecto',
  contato_feito: 'Contato feito',
  proposta_enviada: 'Proposta enviada',
  negociando: 'Negociando',
  parceiro_ativo: 'Parceiro ativo',
  inativo: 'Inativo',
}
