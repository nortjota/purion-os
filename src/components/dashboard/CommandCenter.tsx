'use client'

import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useMemo, useState, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { ResumoDiario } from './ResumoDiario'
import {
  TrendingUp, DollarSign, Target,
  ShoppingCart, BarChart2, AlertTriangle,
  Activity, Clock, Calendar, Users, FlaskConical, Compass,
  Package, ListChecks, RotateCcw,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { MetaDiaria } from '@/store'
import {
  getMesAtual,
  calcularKPIsMes,
  calcularKPIsPeriodo,
  rangePeriodoDashboard,
  rangePeriodoAnterior,
  calcularAlertas,
  calcularHealthScore,
  gerarFeedAtividade,
  formatarMoeda,
  formatarDataBR,
  type Alerta,
  type AtividadeItem,
  type HealthScore,
  type PeriodoDashboard,
} from '@/lib/calculos'
import Link from 'next/link'
import { useGrowth } from '@/hooks/useGrowth'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { useEventosCalendario } from '@/hooks/useEventosCalendario'
import { useEstoque } from '@/hooks/useEstoque'
import { useInsumos } from '@/hooks/useInsumosBOM'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Proximos7Dias } from '@/components/calendario/Proximos7Dias'
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { WidgetDonut, WidgetBarras, WidgetLinha, WidgetLista, WidgetFunil, type ItemLista } from '@/components/dashboard/widgets'
import { PainelMetasG4 } from '@/components/dashboard/PainelMetasG4'
import { type Periodo, inicioPeriodo } from '@/components/dashboard/widgets/widgetHelpers'
import { estagioNormalizado, ESTAGIOS_ATIVOS, ESTAGIOS_GANHOS } from '@/components/crm/crmHelpers'
import { STATUS_OBJETIVO_COR, STATUS_OBJETIVO_LABEL } from '@/components/estrategias/metas/metasHelpers'
import { PERFIS_INFO, SOCIOS_ATIVOS, SOCIOS_ATIVOS_IDS, corPerfil, type SocioAtivo } from '@/lib/socios'
import { KpisPlaybook, NorthStar, useKpisPlaybook } from './KpisPlaybook'
import { FilaDeAcao, type ItemAcao } from './FilaDeAcao'
import { Secao, Segmentado } from './Secao'
import { useDashboardLayout } from './useDashboardLayout'
import { WidgetShell } from '@/components/dashboard/widgets/WidgetShell'
import { aguardandoDespacho, despachoAtrasado } from '@/hooks/useDespacho'
import { frascosDaVenda } from '@/lib/escadaProdutos'
import { CountCard, Stagger, StaggerItem, ProgressRing, AnimatedNumber, STATUS } from '@/components/motion'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const PERIODOS: ReadonlyArray<{ id: Periodo; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes', label: 'Mês' },
  { id: 'trimestre', label: '90 dias' },
]
const DIAS_PLAYBOOK: ReadonlyArray<{ id: 30 | 90; label: string }> = [{ id: 30, label: '30 dias' }, { id: 90, label: '90 dias' }]

/** Para onde cada alerta automático leva. */
function hrefDoAlerta(id: string): string {
  if (id.startsWith('roas') || id.startsWith('cpa')) return '/marketing'
  if (id.startsWith('estoque') || id.startsWith('lote')) return '/producao'
  return '/financeiro'
}

const PERIODO_LABEL_LONGO: Record<PeriodoDashboard, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Mês atual',
  trimestre: 'Últimos 90 dias',
}

const INFO_SOCIOS = {
  matheus: { nome: PERFIS_INFO.matheus.nome, cidade: PERFIS_INFO.matheus.cidade, dominio: PERFIS_INFO.matheus.eixo, cor: PERFIS_INFO.matheus.cor, inicial: 'M' },
  joao:    { nome: PERFIS_INFO.joao.nome,    cidade: PERFIS_INFO.joao.cidade,    dominio: PERFIS_INFO.joao.eixo,    cor: PERFIS_INFO.joao.cor,    inicial: 'J' },
}

// ─────────────────────────────────────────────
// SÓCIO CARD
// ─────────────────────────────────────────────

function SocioCard({
  perfilId, tarefas, campanhas, ativo, onClick,
}: {
  perfilId: SocioAtivo
  tarefas: import('@/store').Tarefa[]
  campanhas: import('@/store').CampanhaAds[]
  ativo: boolean
  onClick: () => void
}) {
  const info         = INFO_SOCIOS[perfilId]
  const minhasTarefas = tarefas.filter((t) => t.responsavel === perfilId)
  const abertas      = minhasTarefas.filter((t) => t.status === 'pendente').length
  const emAndamento  = minhasTarefas.filter((t) => t.status === 'em_andamento').length
  const concluidas   = minhasTarefas.filter((t) => t.status === 'concluida').length
  const hoje         = new Date().toISOString().slice(0, 10)
  const atrasadas    = minhasTarefas.filter(
    (t) => t.dueDate && t.dueDate < hoje && t.status !== 'concluida'
  ).length
  const ultimaConcluida = minhasTarefas
    .filter((t) => t.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
    .at(0)
  const gastoAds = campanhas
    .filter((c) => c.responsavel === perfilId)
    .reduce((s, c) => s + c.gastoTotal, 0)

  return (
    <button
      onClick={onClick}
      className={`
        rounded-xl border p-5 text-left w-full
        transition-all duration-150
        ${ativo
          ? 'bg-[rgba(212,252,60,0.04)] border-[rgba(212,252,60,0.25)] shadow-[0_0_0_1px_rgba(212,252,60,0.15)]'
          : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[rgba(212,252,60,0.2)]'
        }
      `}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 select-none"
          style={{ backgroundColor: `${info.cor}18`, color: info.cor, border: `1px solid ${info.cor}30` }}
        >
          {info.inicial}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-[500] text-[var(--text-primary)]">{info.nome}</span>
            {perfilId === 'joao' && (
              <span className="badge badge-neutral text-[10px]">Após 18h</span>
            )}
          </div>
          <p className="caption">{info.cidade}</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{info.dominio}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {[
          { label: 'Abertas',    valor: abertas,    cor: '#D4FC3C' },
          { label: 'Andamento',  valor: emAndamento, cor: info.cor  },
          { label: 'Concluídas', valor: concluidas,  cor: '#8FD14F' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-[var(--bg-surface-2)] rounded-lg p-2.5 text-center border border-[var(--border)]">
            <span className="block text-[18px] font-semibold leading-none mb-1" style={{ color: cor }}>
              {valor}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase" style={{ letterSpacing: '0.06em' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {atrasadas > 0 && (
        <div className="mb-2 flex items-center gap-1.5 text-[12px] text-[var(--status-danger)]">
          <AlertTriangle size={11} />
          {atrasadas} tarefa{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}
        </div>
      )}
      <div className="caption flex flex-col gap-0.5">
        {ultimaConcluida && (
          <span>Última entrega: <span className="text-[var(--text-primary)]">{ultimaConcluida.titulo}</span></span>
        )}
        {perfilId === 'joao' && gastoAds > 0 && (
          <span>Ads investidos: <span className="text-[var(--text-primary)]">{formatarMoeda(gastoAds)}</span></span>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────
// FEED DE ATIVIDADE
// ─────────────────────────────────────────────

const ICON_MODULO: Record<string, React.ElementType> = {
  tarefas:    Activity,
  crm:        TrendingUp,
  producao:   BarChart2,
  reunioes:   Clock,
  financeiro: DollarSign,
}

function FeedAtividade({ items }: { items: AtividadeItem[] }) {
  if (items.length === 0) return (
    <div className="card-purion">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[var(--text-primary)]" />
          <span className="section-title text-[15px]">Atividade Recente</span>
        </div>
      </div>
      <div className="empty-state">
        <Activity size={40} className="empty-state-icon" />
        <p className="empty-state-title">Nenhuma atividade ainda</p>
        <p className="empty-state-subtitle">As ações do sistema aparecerão aqui</p>
      </div>
    </div>
  )

  return (
    <div className="card-purion overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[var(--text-primary)]" />
          <span className="section-title text-[15px]">Atividade Recente</span>
        </div>
        <span className="caption uppercase" style={{ letterSpacing: '0.06em' }}>
          {items.length} ações
        </span>
      </div>
      <ul>
        {items.map((item, idx) => {
          const ModuloIcon = ICON_MODULO[item.modulo] ?? Activity
          return (
            <li
              key={item.id}
              className={`
                flex items-start gap-3 px-6 py-3 border-b border-[var(--border)] last:border-0
                transition-colors duration-150 hover:bg-[var(--bg-surface-2)]
                ${idx === 0 ? 'bg-[rgba(212,252,60,0.02)]' : ''}
              `}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5 select-none"
                style={{
                  backgroundColor: `${item.corAvatar}18`,
                  color: item.corAvatar,
                  border: `1px solid ${item.corAvatar}25`,
                }}
              >
                {item.inicial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                  <span className="font-[500]" style={{ color: item.corAvatar }}>{item.responsavel}</span>
                  {' '}
                  <span className="text-[var(--text-secondary)]">{item.acao}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ModuloIcon size={10} className="text-[var(--text-secondary)] opacity-50" />
                  <span className="caption">{item.dataFormatada}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────
// SAÚDE DO NEGÓCIO (chip compacto)
// ─────────────────────────────────────────────

function ChipSaude({ hs }: { hs: HealthScore }) {
  return (
    <span
      className="chip-saude"
      style={{ ['--tom' as string]: hs.cor }}
      title="Saúde do negócio (0–10): resultado sobre a receita 30% (alvo 65%) · ROAS 30% · estoque 20% · crescimento vs mês anterior 20%."
    >
      <span className="chip-saude-ponto" aria-hidden />
      <span className="tnum"><strong>{hs.score}</strong><span style={{ opacity: 0.6 }}>/10</span></span>
      <span style={{ color: 'var(--text-secondary)' }}>{hs.status}</span>
    </span>
  )
}

// ─────────────────────────────────────────────
// ÚLTIMOS DAILY UPDATES
// ─────────────────────────────────────────────

function UltimosDailies({ entries }: { entries: import('@/store').DailyEntry[] }) {
  const ultimos = [...entries]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  if (ultimos.length === 0) return null


  return (
    <div className="card-purion overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-primary)]" />
          <span className="section-title text-[15px]">Últimos Daily Updates</span>
        </div>
      </div>
      <ul>
        {ultimos.map((entry) => {
          const cor = corPerfil(entry.socio)
          return (
            <li
              key={entry.id}
              className="flex items-start gap-3 px-6 py-3 border-b border-[var(--border)] last:border-0"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5 select-none"
                style={{
                  backgroundColor: `${cor}18`,
                  color: cor,
                  border: `1px solid ${cor}25`,
                }}
              >
                {entry.socio.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-[500] text-[var(--text-primary)] capitalize">{entry.socio}</span>
                  <span className="caption">— {formatarDataBR(entry.data)}</span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2">{entry.hojeFarei}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// WIDGET — METAS DE HOJE
// ─────────────────────────────────────────────

function CardMetasHoje({ metas }: { metas: MetaDiaria[] }) {
  const hj = new Date().toISOString().slice(0, 10)
  const metasHoje = metas.filter((m) => m.data === hj)
  const total     = metasHoje.length
  const conc      = metasHoje.filter((m) => m.concluida).length
  const pctGeral  = total > 0 ? Math.round((conc / total) * 100) : null

  const socios = SOCIOS_ATIVOS.map((s) => ({ id: s.id, label: s.nome, cor: s.cor }))

  return (
    <Link href="/metas" className="block no-underline h-full">
      <section className="card-purion lift p-4 cursor-pointer h-full">
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label flex items-center gap-1.5">
            <Target size={11} /> Metas de hoje
          </p>
          {pctGeral !== null && (
            <ProgressRing value={pctGeral} size={44} stroke={4} labelSize={11}
              color={pctGeral === 100 ? STATUS.ok : undefined} glow={pctGeral >= 80} />
          )}
        </div>
        {total === 0 ? (
          <p className="text-[12px] text-[var(--text-secondary)]">Nenhuma meta configurada para hoje.</p>
        ) : (
          <div className="space-y-2">
            {socios.map(({ id, label, cor }) => {
              const mine = metasHoje.filter((m) => m.responsavel === id || (m.escopo === 'time'))
              const mineConc = mine.filter((m) => m.concluida).length
              const p = mine.length > 0 ? Math.round((mineConc / mine.length) * 100) : null
              if (p === null) return null
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
                    <span className="text-[11px] font-semibold" style={{ color: p === 100 ? 'var(--status-ok)' : cor }}>{p}%</span>
                  </div>
                  <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: '100%', transform: `scaleX(${p / 100})`, transformOrigin: 'left center',
                      background: p === 100 ? 'var(--status-ok)' : cor, transition: 'transform var(--dur-slow) var(--ease-expo)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </Link>
  )
}

export function CommandCenter() {
  const isMobile = useMobile()
  const {
    receitas, despesas, campanhasAds,
    tarefas, leads, lotes, reunioes,
    dailyEntries, vendas, doacoesUGC, metasDiarias,
    perfilAtivo, setPerfilAtivo,
    estoqueProduto,
    dashboardContadoresOrdem, setDashboardContadoresOrdem,
  } = usePurionStore()
  const { experimentos } = useGrowth()
  const { fases, objetivos } = useEstrategiaRoadmap()
  const { eventos } = useEventosCalendario()
  const { perfil } = useAuthContext()
  const { insumos } = useInsumos()
  useEstoque()
  const faseAtual = fases.find((f) => f.status === 'atual')

  const [periodo, setPeriodo] = useEstadoPersistido<Periodo>('inicio.periodo', 'mes')
  const [diasPlaybook, setDiasPlaybook] = useState<30 | 90>(30)
  const kPlaybook = useKpisPlaybook(diasPlaybook)
  const layout = useDashboardLayout()

  const saudacao = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  const dataExtenso = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
    []
  )

  // Alertas e health score ficam ancorados no mês corrente (thresholds mensais) —
  // não mudam com o seletor de período abaixo, que é só para os KPIs/gráficos visíveis.
  const mesAtual     = useMemo(() => getMesAtual(receitas), [receitas])
  const kpis         = useMemo(() => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual), [receitas, despesas, campanhasAds, mesAtual])
  const alertas      = useMemo(() => calcularAlertas(kpis, insumos), [kpis, insumos])
  const healthScore  = useMemo(() => calcularHealthScore(receitas, despesas, campanhasAds, insumos), [receitas, despesas, campanhasAds, insumos])
  const feedAtividade = useMemo(() => gerarFeedAtividade(tarefas, leads, lotes, reunioes), [tarefas, leads, lotes, reunioes])

  // ── Seletor de período: Hoje / Semana / Mês / Trimestre ──
  // (o estado `periodo` já foi declarado acima, junto dos demais estados do componente)
  const [dataInicioPeriodo, dataFimPeriodo] = useMemo(() => rangePeriodoDashboard(periodo), [periodo])
  const [dataInicioAnterior, dataFimAnterior] = useMemo(() => rangePeriodoAnterior(periodo), [periodo])

  const kpisPeriodo = useMemo(
    () => calcularKPIsPeriodo(receitas, despesas, campanhasAds, dataInicioPeriodo, dataFimPeriodo),
    [receitas, despesas, campanhasAds, dataInicioPeriodo, dataFimPeriodo]
  )
  const kpisPeriodoAnterior = useMemo(
    () => calcularKPIsPeriodo(receitas, despesas, campanhasAds, dataInicioAnterior, dataFimAnterior),
    [receitas, despesas, campanhasAds, dataInicioAnterior, dataFimAnterior]
  )
  const variacaoFaturamento = useMemo(
    () => kpisPeriodoAnterior.faturamento > 0
      ? ((kpisPeriodo.faturamento - kpisPeriodoAnterior.faturamento) / kpisPeriodoAnterior.faturamento) * 100
      : null,
    [kpisPeriodo.faturamento, kpisPeriodoAnterior.faturamento]
  )

  const vendasDiarias = useMemo(() => {
    const inicio = new Date(`${dataInicioPeriodo}T00:00:00`)
    const fim = new Date(`${dataFimPeriodo}T00:00:00`)
    const totalDias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1)
    const dias: { name: string; valor: number }[] = []
    for (let i = totalDias - 1; i >= 0; i--) {
      const d = new Date(fim)
      d.setDate(d.getDate() - i)
      const chave = d.toISOString().slice(0, 10)
      const valor = vendas
        .filter((v) => v.statusPagamento === 'pago' && v.dataVenda.slice(0, 10) === chave)
        .reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
      dias.push({ name: `${chave.slice(8, 10)}/${chave.slice(5, 7)}`, valor })
    }
    return dias
  }, [vendas, dataInicioPeriodo, dataFimPeriodo])

  const lotesAlerta = useMemo<Alerta[]>(
    () => lotes
      .filter((l) => l.status === 'controle_qualidade')
      .map((l) => ({
        id: `lote-qc-${l.id}`,
        tipo: 'warning' as const,
        mensagem: `Lote em controle de qualidade: ${l.codigo}`,
        detalhe: l.produto,
      })),
    [lotes]
  )

  const todosAlertas = useMemo(() => [...alertas, ...lotesAlerta], [alertas, lotesAlerta])

  const resumoFrascosPeriodo = useMemo(() => {
    const vendasPeriodo = vendas.filter((v) =>
      v.dataVenda.slice(0, 10) >= dataInicioPeriodo && v.dataVenda.slice(0, 10) <= dataFimPeriodo && v.statusPagamento === 'pago'
    )
    const pedidos = vendasPeriodo.length
    const frascos = vendasPeriodo.reduce((s, v) => s + frascosDaVenda(v), 0)
    const despachados = vendasPeriodo.filter((v) => ['postado', 'em_transito', 'entregue'].includes(v.statusEntrega)).reduce((s, v) => s + frascosDaVenda(v), 0)
    const ugc = doacoesUGC
      .filter((d) => d.dataEnvio.slice(0, 10) >= dataInicioPeriodo && d.dataEnvio.slice(0, 10) <= dataFimPeriodo && ['postado', 'entregue'].includes(d.statusEnvio))
      .reduce((s, d) => s + d.quantidade, 0)
    return { pedidos, frascos, despachados, ugc }
  }, [vendas, doacoesUGC, dataInicioPeriodo, dataFimPeriodo])

  const periodoLabel = PERIODO_LABEL_LONGO[periodo]

  // ── LINHA 1 — Contadores grandes ──
  const leadsB2BAtivos = useMemo(
    () => leads.filter((l) => ESTAGIOS_ATIVOS.includes(estagioNormalizado(l.status))).length,
    [leads]
  )
  const alertaEstoque = estoqueProduto ? estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima : false

  const [dragContadorId, setDragContadorId] = useState<string | null>(null)

  // Sparklines (só leitura dos dados já carregados — tendência diária do período)
  const sparkFaturamento = useMemo(() => vendasDiarias.map((d) => d.valor), [vendasDiarias])
  const sparkFrascos = useMemo(() => {
    const porDia = new Map<string, number>()
    vendas.forEach((v) => {
      if (v.statusPagamento !== 'pago') return
      const dia = v.dataVenda.slice(0, 10)
      if (dia < dataInicioPeriodo || dia > dataFimPeriodo) return
      porDia.set(dia, (porDia.get(dia) ?? 0) + frascosDaVenda(v))
    })
    // mesmos dias do gráfico de vendas por dia
    const fim = new Date(`${dataFimPeriodo}T00:00:00`)
    return vendasDiarias.map((_, i) => {
      const d = new Date(fim)
      d.setDate(d.getDate() - (vendasDiarias.length - 1 - i))
      return porDia.get(d.toISOString().slice(0, 10)) ?? 0
    })
  }, [vendas, vendasDiarias, dataInicioPeriodo, dataFimPeriodo])

  const contadoresMap = useMemo(() => ({
    faturamento: (
      <CountCard
        label="Faturamento" icon={<DollarSign size={12} aria-hidden />} live
        value={kpisPeriodo.faturamento} prefix="R$ " decimals={2}
        delta={variacaoFaturamento} deltaLabel="vs período anterior"
        sub={`${resumoFrascosPeriodo.pedidos} pedidos pagos`}
        sparkline={sparkFaturamento}
        color="#D4FC3C"
      />
    ),
    frascos: (
      <CountCard
        label="Frascos vendidos" icon={<Package size={12} aria-hidden />}
        value={resumoFrascosPeriodo.frascos}
        sub={`${resumoFrascosPeriodo.despachados} despachados · ${resumoFrascosPeriodo.ugc} doados UGC`}
        sparkline={sparkFrascos}
      />
    ),
    estoque: (
      <CountCard
        label="Estoque de prontos" icon={<Package size={12} aria-hidden />}
        value={estoqueProduto ? estoqueProduto.quantidadeAtual : 0}
        color={alertaEstoque ? STATUS.danger : undefined}
        sub={estoqueProduto ? (alertaEstoque ? `Abaixo do mínimo (${estoqueProduto.quantidadeMinima})` : `Mínimo: ${estoqueProduto.quantidadeMinima} · OK`) : 'Sem dados'}
        href="/producao"
      />
    ),
    'leads-b2b': (
      <CountCard
        label="Leads B2B ativos" icon={<Users size={12} aria-hidden />}
        value={leadsB2BAtivos}
        sub="no pipeline comercial"
        href="/crm"
      />
    ),
  }), [periodoLabel, kpisPeriodo.faturamento, variacaoFaturamento, resumoFrascosPeriodo, alertaEstoque, estoqueProduto, leadsB2BAtivos, sparkFaturamento, sparkFrascos])

  const contadoresOrdenados = useMemo(() => {
    const ids = dashboardContadoresOrdem.filter((id) => id in contadoresMap)
    const faltantes = Object.keys(contadoresMap).filter((id) => !ids.includes(id))
    return [...ids, ...faltantes].map((id) => ({ id, node: contadoresMap[id as keyof typeof contadoresMap] }))
  }, [dashboardContadoresOrdem, contadoresMap])

  function handleDropContador(alvoId: string) {
    if (!dragContadorId || dragContadorId === alvoId) { setDragContadorId(null); return }
    const atual = contadoresOrdenados.map((c) => c.id)
    const semArrastado = atual.filter((id) => id !== dragContadorId)
    const idx = semArrastado.indexOf(alvoId)
    semArrastado.splice(idx, 0, dragContadorId)
    setDashboardContadoresOrdem(semArrastado)
    setDragContadorId(null)
  }

  // ── LINHA 2 — Gráficos ──
  const vendasPorCanal = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    const pagas = vendas.filter((v) => v.statusPagamento === 'pago' && (v.valorTotal ?? v.valorLiquido) > 0 && new Date(v.dataVenda) >= inicio)
    const b2c = pagas.filter((v) => v.canal === 'b2c').reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const b2b = pagas.filter((v) => v.canal === 'b2b').reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    return [
      { name: 'B2C', value: b2c, cor: '#D4FC3C' },
      { name: 'B2B', value: b2b, cor: '#9CC3DB' },
    ]
  }, [vendas, periodo])

  const funilB2BEtapas = useMemo(() => {
    const norm = leads.map((l) => estagioNormalizado(l.status))
    return [
      { label: 'Abordagens',    valor: norm.filter((s) => s === 'prospecto' || s === 'abordado').length, cor: '#9CC3DB' },
      { label: 'Reuniões',      valor: norm.filter((s) => s === 'reuniao_agendada').length, cor: '#D4FC3C' },
      { label: 'Oportunidades', valor: norm.filter((s) => s === 'oportunidade').length, cor: '#E6C374' },
      { label: 'Ganhos',        valor: norm.filter((s) => ESTAGIOS_GANHOS.includes(s)).length, cor: '#8FD14F' },
    ]
  }, [leads])

  const metasPorStatus = useMemo(() => {
    const topo = objetivos.filter((o) => !o.parentId)
    const statusList: Array<'em_dia' | 'em_risco' | 'em_atraso' | 'concluido' | 'pausado'> = ['em_dia', 'em_risco', 'em_atraso', 'concluido', 'pausado']
    return statusList
      .map((s) => ({ name: STATUS_OBJETIVO_LABEL[s], value: topo.filter((o) => o.status === s).length, cor: STATUS_OBJETIVO_COR[s] }))
      .filter((d) => d.value > 0)
  }, [objetivos])

  // ── LINHA 3 — Listas rápidas ──
  const northStarItems: ItemLista[] = useMemo(() => {
    const itens: ItemLista[] = []
    if (faseAtual) {
      itens.push({
        id: 'fase-atual', titulo: faseAtual.nome, subtitulo: 'Fase atual do roadmap',
        valor: `${faseAtual.percentualConclusao}%`, cor: '#D4FC3C',
      })
    }
    return itens
  }, [faseAtual])

  const tarefasListaItems: ItemLista[] = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const emAberto = tarefas.filter((t) => t.status !== 'concluida' && t.status !== 'cancelada' && t.dueDate)
    const atrasadas = emAberto.filter((t) => t.dueDate! < hoje).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    const proximas = emAberto.filter((t) => t.dueDate! >= hoje).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    return [...atrasadas, ...proximas].slice(0, 5).map((t) => {
      const atrasada = t.dueDate! < hoje
      const dias = Math.round(Math.abs(new Date(t.dueDate!).getTime() - new Date(hoje).getTime()) / 86_400_000)
      return {
        id: t.id, titulo: t.titulo, subtitulo: t.responsavel,
        badge: atrasada ? `${dias}d atrasada` : dias === 0 ? 'Hoje' : `em ${dias}d`,
        cor: atrasada ? '#E5544B' : dias <= 2 ? '#E6C374' : '#8FD14F',
      }
    })
  }, [tarefas])

  const reposicoesItems: ItemLista[] = useMemo(() => {
    return leads
      .filter((l) => {
        if (!ESTAGIOS_GANHOS.includes(estagioNormalizado(l.status))) return false
        const dias = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000)
        return dias >= 14 && dias <= 35
      })
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, 5)
      .map((l) => {
        const dias = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000)
        return { id: l.id, titulo: l.nomeEmpresa, subtitulo: `${l.cidade} · ${l.regiao}`, badge: `D+${dias}`, cor: dias >= 21 ? '#E6C374' : '#8FD14F' }
      })
  }, [leads])

  const proximoICEItems: ItemLista[] = useMemo(() => {
    return experimentos
      .filter((e) => e.status === 'backlog')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((e) => ({ id: e.id, titulo: e.nome, subtitulo: e.etapa, valor: e.score.toFixed(1), cor: '#D4FC3C' }))
  }, [experimentos])

  // ── Fila de ação: pendências + alertas automáticos, com link para resolver ──
  const filaDeAcao = useMemo<ItemAcao[]>(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const abertas = tarefas.filter((t) => t.status !== 'concluida' && t.status !== 'cancelada' && t.dueDate)
    const atrasadas = abertas.filter((t) => t.dueDate! < hoje).length
    const paraHoje = abertas.filter((t) => t.dueDate === hoje).length
    const fila = vendas.filter(aguardandoDespacho)
    const despAtrasados = fila.filter((v) => despachoAtrasado(v)).length
    const metasHoje = metasDiarias.filter((m) => m.data === hoje)
    const metasPendentes = metasHoje.filter((m) => !m.concluida).length

    const itens: ItemAcao[] = []
    if (atrasadas > 0) itens.push({ id: 'tarefas-atrasadas', valor: atrasadas, titulo: `Tarefa${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''}`, detalhe: 'prazo vencido', tom: 'danger', href: '/tarefas' })
    if (despAtrasados > 0) itens.push({ id: 'despacho-atrasado', valor: despAtrasados, titulo: `Despacho${despAtrasados > 1 ? 's' : ''} há +48h`, detalhe: 'pago e ainda não enviado', tom: 'danger', href: '/despacho' })
    if (fila.length - despAtrasados > 0) itens.push({ id: 'despacho-fila', valor: fila.length - despAtrasados, titulo: 'Na fila de despacho', detalhe: 'pedidos pagos aguardando envio', tom: 'warning', href: '/despacho' })
    if (alertaEstoque && estoqueProduto) itens.push({ id: 'estoque-prontos', valor: estoqueProduto.quantidadeAtual, titulo: 'Frascos prontos em estoque', detalhe: `abaixo do mínimo (${estoqueProduto.quantidadeMinima})`, tom: 'danger', href: '/producao' })
    if (reposicoesItems.length > 0) itens.push({ id: 'reposicoes', valor: reposicoesItems.length, titulo: `Reposiç${reposicoesItems.length > 1 ? 'ões' : 'ão'} B2B a oferecer`, detalhe: 'parceiros entre D+14 e D+35', tom: 'warning', href: '/crm' })
    if (paraHoje > 0) itens.push({ id: 'tarefas-hoje', valor: paraHoje, titulo: `Tarefa${paraHoje > 1 ? 's' : ''} para hoje`, tom: 'neutral', href: '/tarefas' })
    if (metasPendentes > 0) itens.push({ id: 'metas-hoje', valor: metasPendentes, titulo: `Meta${metasPendentes > 1 ? 's' : ''} de hoje em aberto`, detalhe: `${metasHoje.length - metasPendentes}/${metasHoje.length} concluídas`, tom: 'neutral', href: '/metas' })
    todosAlertas
      // estoque de frascos prontos já entra acima com número; aqui ficam ROAS/CPA/insumos/lotes
      .forEach((a) => itens.push({ id: a.id, titulo: a.mensagem, detalhe: a.detalhe, tom: a.tipo, href: hrefDoAlerta(a.id) }))
    return itens
  }, [tarefas, vendas, metasDiarias, alertaEstoque, estoqueProduto, reposicoesItems, todosAlertas])

  return (
    <div className="page-content dash">

      {/* ── Cabeçalho: saudação + controles globais da tela ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="kpi-label mb-1">{dataExtenso}</p>
          <h1 className="page-title">{saudacao}{perfil?.nome ? `, ${perfil.nome.split(' ')[0]}` : ''}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ChipSaude hs={healthScore} />
          <Segmentado opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} rotulo="Período dos resultados" />
          <WidgetCustomizer />
        </div>
      </div>

      {/* ── Onboarding (some sozinho quando concluído) ── */}
      <OnboardingChecklist />
      <OnboardingTour />

      {/* ── 1. Precisa de você ── */}
      {layout.visivel('fila') && <FilaDeAcao itens={filaDeAcao} rodape={<ResumoDiario />} />}

      {/* ── 2. Resultado do período ── */}
      {layout.visivel('resultado') && (
        <Secao titulo="Resultado" sub={periodoLabel} recolhida={layout.recolhida('resultado')} onAlternar={() => layout.alternarRecolhida('resultado')}>
          <div className="flex flex-col gap-4">
            {/* contadores (arraste para reordenar) */}
            <Stagger className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {contadoresOrdenados.map(({ id, node }) => (
                <StaggerItem key={id} style={{ height: '100%' }}>
                  <div
                    draggable
                    onDragStart={() => setDragContadorId(id)}
                    onDragEnd={() => setDragContadorId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropContador(id)}
                    style={{ opacity: dragContadorId === id ? 0.4 : 1, height: '100%' }}
                    title="Arraste para reordenar"
                  >
                    {node}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <Stagger className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} delay={0.1}>
              <StaggerItem style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
                <WidgetLinha title="Vendas por dia" icon={Activity} data={vendasDiarias} formatarValor={(v) => formatarMoeda(v)} />
              </StaggerItem>
              <StaggerItem>
                <WidgetDonut title="Vendas por canal" icon={ShoppingCart} data={vendasPorCanal} formatarValor={(v) => formatarMoeda(v)} href="/vendas" />
              </StaggerItem>
              <StaggerItem>
                <WidgetFunil title="Funil B2B" icon={TrendingUp} etapas={funilB2BEtapas} href="/crm" />
              </StaggerItem>
            </Stagger>
          </div>
        </Secao>
      )}

      {/* ── 3. KPIs oficiais (Playbook 360) ── */}
      {layout.visivel('playbook') && (
        <Secao
          titulo="KPIs do Playbook 360"
          recolhida={layout.recolhida('playbook')} onAlternar={() => layout.alternarRecolhida('playbook')}
          acao={<Segmentado opcoes={DIAS_PLAYBOOK} valor={diasPlaybook} onChange={setDiasPlaybook} rotulo="Janela dos KPIs" />}
        >
          <div className="flex flex-col gap-4">
            <NorthStar k={kPlaybook} />
            <KpisPlaybook k={kPlaybook} dias={diasPlaybook} />
          </div>
        </Secao>
      )}

      {/* ── 4. Execução: o que fazer agora ── */}
      {layout.visivel('execucao') && (
        <Secao titulo="Execução" recolhida={layout.recolhida('execucao')} onAlternar={() => layout.alternarRecolhida('execucao')}>
          <Stagger className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <StaggerItem>
              <WidgetLista title="Tarefas atrasadas / próximas" icon={ListChecks} items={tarefasListaItems} href="/tarefas" emptyMessage="Nenhuma tarefa com prazo" />
            </StaggerItem>
            <StaggerItem>
              <WidgetLista title="Reposições B2B (D+21)" icon={RotateCcw} items={reposicoesItems} href="/crm" emptyMessage="Nenhuma reposição esta semana" />
            </StaggerItem>
            <StaggerItem>
              <WidgetShell title="Próximos 7 dias" icon={Calendar} href="/calendario">
                <Proximos7Dias eventos={eventos} limite={4} />
              </WidgetShell>
            </StaggerItem>
            <StaggerItem>
              <CardMetasHoje metas={metasDiarias} />
            </StaggerItem>
          </Stagger>
        </Secao>
      )}

      {/* ── 5. Estratégia: para onde estamos indo ── */}
      {layout.visivel('estrategia') && (
        <Secao titulo="Estratégia" recolhida={layout.recolhida('estrategia')} onAlternar={() => layout.alternarRecolhida('estrategia')}>
          <div className="flex flex-col gap-4">
            <PainelMetasG4 />
            <Stagger className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <StaggerItem>
                <WidgetDonut title="Metas por status" icon={Target} data={metasPorStatus} href="/estrategias" />
              </StaggerItem>
              <StaggerItem>
                <WidgetLista title="Fase do roadmap" icon={Compass} items={northStarItems} href="/estrategias" emptyMessage="Nenhuma fase cadastrada" />
              </StaggerItem>
              <StaggerItem>
                <WidgetLista title="Próximo experimento (maior ICE)" icon={FlaskConical} items={proximoICEItems} href="/growth" emptyMessage="Backlog de growth vazio" />
              </StaggerItem>
            </Stagger>
          </div>
        </Secao>
      )}

      {/* ── 6. Time & atividade (recolhido por padrão) ── */}
      {layout.visivel('time') && (
        <Secao titulo="Time & atividade" recolhida={layout.recolhida('time')} onAlternar={() => layout.alternarRecolhida('time')}>
          <div className="flex flex-col gap-4">
            <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: `repeat(${SOCIOS_ATIVOS_IDS.length}, minmax(0, 1fr))` }}>
              {SOCIOS_ATIVOS_IDS.map((perfil) => (
                <SocioCard
                  key={perfil}
                  perfilId={perfil}
                  tarefas={tarefas}
                  campanhas={campanhasAds}
                  ativo={perfilAtivo === perfil}
                  onClick={() => setPerfilAtivo(perfil)}
                />
              ))}
            </div>
            <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <FeedAtividade items={feedAtividade.slice(0, isMobile ? 5 : 8)} />
              <UltimosDailies entries={dailyEntries} />
            </div>
          </div>
        </Secao>
      )}

    </div>
  )
}
