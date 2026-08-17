'use client'

import { useMemo, useState, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { ResumoDiario } from './ResumoDiario'
import {
  TrendingUp, DollarSign, Target,
  ShoppingCart, BarChart2, AlertTriangle, AlertCircle,
  Info, Activity, Clock, Calendar, Users, FlaskConical, Compass,
  Package, RefreshCw, ListChecks, RotateCcw,
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
  LABEL_STATUS_LEAD,
  type Alerta,
  type AtividadeItem,
  type HealthScore,
  type PeriodoDashboard,
} from '@/lib/calculos'
import Link from 'next/link'
import { DashboardBanner } from '@/components/dashboard/DashboardBanner'
import { useGrowth } from '@/hooks/useGrowth'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { useEventosCalendario } from '@/hooks/useEventosCalendario'
import { useEstoque } from '@/hooks/useEstoque'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Proximos7Dias } from '@/components/calendario/Proximos7Dias'
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { WidgetContador, WidgetDonut, WidgetBarras, WidgetLinha, WidgetLista, WidgetFunil, type ItemLista } from '@/components/dashboard/widgets'
import { PainelMetasG4 } from '@/components/dashboard/PainelMetasG4'
import { PERIODO_OPCOES, type Periodo, inicioPeriodo } from '@/components/dashboard/widgets/widgetHelpers'
import { estagioNormalizado, ESTAGIOS_ATIVOS, ESTAGIOS_GANHOS } from '@/components/crm/crmHelpers'
import { STATUS_OBJETIVO_COR, STATUS_OBJETIVO_LABEL } from '@/components/estrategias/metas/metasHelpers'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const META_90_DIAS = 30_000

const MESES_PT: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',    '04': 'Abril',
  '05': 'Maio',    '06': 'Junho',     '07': 'Julho',    '08': 'Agosto',
  '09': 'Setembro','10': 'Outubro',   '11': 'Novembro', '12': 'Dezembro',
}

const PERIODO_LABEL_LONGO: Record<PeriodoDashboard, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Mês atual',
  trimestre: 'Últimos 90 dias',
}

const INFO_SOCIOS = {
  matheus: { nome: 'Matheus',  cidade: 'Brasília · DF',        dominio: 'Comercial & CRM',    cor: '#C9A84C', inicial: 'M' },
  gabriel: { nome: 'Gabriel',  cidade: 'São Paulo · SP',        dominio: 'Produção & Supply',  cor: '#22C55E', inicial: 'G' },
  joao:    { nome: 'João',     cidade: 'Florianópolis · SC',    dominio: 'Marketing & Growth', cor: '#5B8FE8', inicial: 'J' },
}

// ─────────────────────────────────────────────
// META FATURAMENTO
// ─────────────────────────────────────────────

function MetaFaturamento({ receitas }: { receitas: { valor: number }[] }) {
  const totalReceita = receitas.reduce((s, r) => s + r.valor, 0)
  const percentual   = Math.min(100, (totalReceita / META_90_DIAS) * 100)
  const diasRestantes = 59

  return (
    <div className="card-purion card-section">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-[#C9A84C]" />
          <span className="section-title text-[15px]">Meta de Faturamento — 90 dias</span>
        </div>
        <span className="kpi-value text-[22px]">{percentual.toFixed(1)}%</span>
      </div>

      <div className="progress-bar mb-4">
        <div className="progress-fill" style={{ width: `${percentual}%` }} />
      </div>

      <div className="flex items-center justify-between caption">
        <span>
          <span className="text-[#C9A84C] font-[500]">{formatarMoeda(totalReceita)}</span>
          {' '}de{' '}
          <span className="text-[var(--text-primary)]">{formatarMoeda(META_90_DIAS)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={11} />
          {diasRestantes} dias restantes
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────────

const COR_ALERTA: Record<Alerta['tipo'], {
  bg: string; border: string; text: string; icon: React.ElementType
}> = {
  danger:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#EF4444', icon: AlertTriangle },
  warning: { bg: 'rgba(201,168,76,0.08)',  border: 'rgba(201,168,76,0.2)',  text: '#C9A84C', icon: AlertCircle  },
  info:    { bg: 'rgba(91,143,232,0.08)',  border: 'rgba(91,143,232,0.2)',  text: '#5B8FE8', icon: Info         },
}

function SecaoAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  return (
    <div>
      <p className="kpi-label flex items-center gap-1.5 mb-3">
        <AlertTriangle size={11} /> Alertas Automáticos
      </p>
      <div className="flex flex-wrap gap-2 alerts-flex">
        {alertas.map((alerta) => {
          const { bg, border, text, icon: Icon } = COR_ALERTA[alerta.tipo]
          return (
            <div
              key={alerta.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-[13px] border"
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <Icon size={13} style={{ color: text, marginTop: 1, flexShrink: 0 }} />
              <div>
                <span className="font-[500]" style={{ color: text }}>{alerta.mensagem}</span>
                {alerta.detalhe && (
                  <span className="text-[var(--text-secondary)] ml-1.5">— {alerta.detalhe}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SÓCIO CARD
// ─────────────────────────────────────────────

function SocioCard({
  perfilId, tarefas, campanhas, ativo, onClick,
}: {
  perfilId: 'matheus' | 'gabriel' | 'joao'
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
          ? 'bg-[rgba(201,168,76,0.04)] border-[rgba(201,168,76,0.25)] shadow-[0_0_0_1px_rgba(201,168,76,0.15)]'
          : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[rgba(201,168,76,0.2)]'
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
          { label: 'Abertas',    valor: abertas,    cor: '#C9A84C' },
          { label: 'Andamento',  valor: emAndamento, cor: info.cor  },
          { label: 'Concluídas', valor: concluidas,  cor: '#22C55E' },
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
        <div className="mb-2 flex items-center gap-1.5 text-[12px] text-[#EF4444]">
          <AlertTriangle size={11} />
          {atrasadas} tarefa{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}
        </div>
      )}
      <div className="caption flex flex-col gap-0.5">
        {ultimaConcluida && (
          <span>Última entrega: <span className="text-[var(--text-primary)]">{ultimaConcluida.titulo}</span></span>
        )}
        {perfilId === 'joao' && gastoAds > 0 && (
          <span>Ads investidos: <span className="text-[#C9A84C]">{formatarMoeda(gastoAds)}</span></span>
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
          <Activity size={14} className="text-[#C9A84C]" />
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
          <Activity size={14} className="text-[#C9A84C]" />
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
                ${idx === 0 ? 'bg-[rgba(201,168,76,0.02)]' : ''}
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
// HEALTH SCORE
// ─────────────────────────────────────────────

function HealthScoreBadge({ hs }: { hs: HealthScore }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
      style={{ backgroundColor: `${hs.cor}0D`, borderColor: `${hs.cor}25` }}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="text-[22px] font-semibold" style={{ color: hs.cor }}>
          {hs.score}
        </span>
        <span className="caption text-[10px] mt-0.5">/10</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[13px] font-[500]" style={{ color: hs.cor }}>{hs.status}</span>
        <span className="caption text-[11px]">Health Score</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FUNIL DE LEADS
// ─────────────────────────────────────────────

function LeadsFunil({ leads }: { leads: import('@/store').Lead[] }) {
  const ESTAGIOS = Object.entries(LABEL_STATUS_LEAD).filter(([k]) => k !== 'inativo')
  const ativos = leads.filter((l) => l.status !== 'inativo')

  return (
    <div className="card-purion">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#C9A84C]" />
          <span className="section-title text-[15px]">Funil de Leads</span>
        </div>
        <span className="caption">{ativos.length} ativos</span>
      </div>
      <div className="px-6 pb-6 flex flex-col gap-3">
        {ESTAGIOS.map(([key, label]) => {
          const count = leads.filter((l) => l.status === key).length
          const pct = ativos.length > 0 ? Math.round((count / ativos.length) * 100) : 0
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[12px] text-[var(--text-secondary)] w-36 shrink-0 truncate">{label}</span>
              <div className="flex-1 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: '#C9A84C' }}
                />
              </div>
              <span className="text-[13px] font-[500] text-[var(--text-primary)] w-5 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
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

  const COR_SOCIO: Record<string, string> = {
    matheus: '#C9A84C',
    gabriel: '#22C55E',
    joao:    '#5B8FE8',
  }

  return (
    <div className="card-purion overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#C9A84C]" />
          <span className="section-title text-[15px]">Últimos Daily Updates</span>
        </div>
      </div>
      <ul>
        {ultimos.map((entry) => {
          const cor = COR_SOCIO[entry.socio] ?? '#6B6B6B'
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

  const socios = [
    { id: 'matheus' as const, label: 'Matheus', cor: '#C9A84C' },
    { id: 'gabriel' as const, label: 'Gabriel', cor: '#22C55E' },
    { id: 'joao'    as const, label: 'João',    cor: '#5B8FE8' },
  ]

  return (
    <Link href="/metas" className="block no-underline">
      <section className="card-purion p-4 hover:border-[rgba(201,168,76,0.35)] transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label flex items-center gap-1.5">
            <Target size={11} /> Metas de hoje
          </p>
          {pctGeral !== null && (
            <span
              className="text-[13px] font-black"
              style={{ fontFamily: 'Montserrat, sans-serif', color: pctGeral === 100 ? '#4CAF7A' : '#C9A84C' }}
            >
              {pctGeral}%
            </span>
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
                    <span className="text-[11px] font-semibold" style={{ color: p === 100 ? '#4CAF7A' : cor }}>{p}%</span>
                  </div>
                  <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: p === 100 ? '#4CAF7A' : cor }} />
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
    tarefas, leads, lotes, reunioes, estoque,
    dailyEntries, vendas, doacoesUGC, metasDiarias,
    perfilAtivo, setPerfilAtivo,
    dashboardWidgets, estoqueProduto,
    dashboardContadoresOrdem, setDashboardContadoresOrdem,
  } = usePurionStore()
  const { experimentos } = useGrowth()
  const { fases, objetivos } = useEstrategiaRoadmap()
  const { eventos } = useEventosCalendario()
  const { perfil } = useAuthContext()
  useEstoque()
  const faseAtual = fases.find((f) => f.status === 'atual')

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(() => new Date())

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

  // Dados chegam em tempo real via Supabase Realtime — o carimbo acompanha qualquer mudança.
  useEffect(() => { setUltimaAtualizacao(new Date()) }, [vendas, receitas, leads, tarefas, estoqueProduto])

  const showWidget = (id: string) => dashboardWidgets.includes(id)

  // Alertas e health score ficam ancorados no mês corrente (thresholds mensais) —
  // não mudam com o seletor de período abaixo, que é só para os KPIs/gráficos visíveis.
  const mesAtual     = useMemo(() => getMesAtual(receitas), [receitas])
  const kpis         = useMemo(() => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual), [receitas, despesas, campanhasAds, mesAtual])
  const alertas      = useMemo(() => calcularAlertas(kpis, estoque), [kpis, estoque])
  const healthScore  = useMemo(() => calcularHealthScore(receitas, despesas, campanhasAds, estoque), [receitas, despesas, campanhasAds, estoque])
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
    const frascos = vendasPeriodo.reduce((s, v) => s + v.quantidade, 0)
    const despachados = vendasPeriodo.filter((v) => ['postado', 'em_transito', 'entregue'].includes(v.statusEntrega)).reduce((s, v) => s + v.quantidade, 0)
    const ugc = doacoesUGC
      .filter((d) => d.dataEnvio.slice(0, 10) >= dataInicioPeriodo && d.dataEnvio.slice(0, 10) <= dataFimPeriodo && ['postado', 'entregue'].includes(d.statusEnvio))
      .reduce((s, d) => s + d.quantidade, 0)
    return { pedidos, frascos, despachados, ugc }
  }, [vendas, doacoesUGC, dataInicioPeriodo, dataFimPeriodo])

  const [ano, mes] = mesAtual.split('-')
  const nomeMes    = `${MESES_PT[mes] ?? mes} ${ano}`
  const periodoLabel = PERIODO_LABEL_LONGO[periodo]

  // ── LINHA 1 — Contadores grandes ──
  const leadsB2BAtivos = useMemo(
    () => leads.filter((l) => ESTAGIOS_ATIVOS.includes(estagioNormalizado(l.status))).length,
    [leads]
  )
  const alertaEstoque = estoqueProduto ? estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima : false

  const [dragContadorId, setDragContadorId] = useState<string | null>(null)

  const contadoresMap = useMemo(() => ({
    faturamento: (
      <WidgetContador
        label={`Faturamento — ${periodoLabel}`} icon={DollarSign} destaque
        valor={formatarMoeda(kpisPeriodo.faturamento)}
        variacao={variacaoFaturamento}
        variacaoLabel="vs período anterior"
        subvalor={`${resumoFrascosPeriodo.pedidos} pedidos pagos`}
      />
    ),
    frascos: (
      <WidgetContador
        label="Frascos vendidos" icon={Package}
        valor={String(resumoFrascosPeriodo.frascos)}
        subvalor={`${resumoFrascosPeriodo.pedidos} pedido${resumoFrascosPeriodo.pedidos !== 1 ? 's' : ''} — ${periodoLabel}`}
      />
    ),
    estoque: (
      <WidgetContador
        label="Estoque de prontos" icon={Package} alerta={alertaEstoque}
        valor={estoqueProduto ? String(estoqueProduto.quantidadeAtual) : '—'}
        subvalor={estoqueProduto ? (alertaEstoque ? `Abaixo do mínimo (${estoqueProduto.quantidadeMinima})` : `Mínimo: ${estoqueProduto.quantidadeMinima} · OK`) : 'Sem dados'}
        href="/producao"
      />
    ),
    'leads-b2b': (
      <WidgetContador
        label="Leads B2B ativos" icon={Users}
        valor={String(leadsB2BAtivos)}
        subvalor="no pipeline comercial"
        href="/crm"
      />
    ),
  }), [periodoLabel, kpisPeriodo.faturamento, variacaoFaturamento, resumoFrascosPeriodo, alertaEstoque, estoqueProduto, leadsB2BAtivos])

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
      { name: 'B2C', value: b2c, cor: '#C9A84C' },
      { name: 'B2B', value: b2b, cor: '#5B8FE8' },
    ]
  }, [vendas, periodo])

  const funilB2BEtapas = useMemo(() => {
    const norm = leads.map((l) => estagioNormalizado(l.status))
    return [
      { label: 'Abordagens',    valor: norm.filter((s) => s === 'prospecto' || s === 'abordado').length, cor: '#5B8FE8' },
      { label: 'Reuniões',      valor: norm.filter((s) => s === 'reuniao_agendada').length, cor: '#C9A84C' },
      { label: 'Oportunidades', valor: norm.filter((s) => s === 'oportunidade').length, cor: '#E8A838' },
      { label: 'Ganhos',        valor: norm.filter((s) => ESTAGIOS_GANHOS.includes(s)).length, cor: '#4CAF7A' },
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
    const itens: ItemLista[] = [{
      id: 'north-star', titulo: 'Clientes e parceiros ativos que recompram', subtitulo: 'North Star da PURION', cor: '#C9A84C',
    }]
    if (faseAtual) {
      itens.push({
        id: 'fase-atual', titulo: faseAtual.nome, subtitulo: 'Fase atual do roadmap',
        valor: `${faseAtual.percentualConclusao}%`, cor: '#5B8FE8',
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
        cor: atrasada ? '#EF4444' : dias <= 2 ? '#E8A838' : '#4CAF7A',
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
        return { id: l.id, titulo: l.nomeEmpresa, subtitulo: `${l.cidade} · ${l.regiao}`, badge: `D+${dias}`, cor: dias >= 21 ? '#E8A838' : '#4CAF7A' }
      })
  }, [leads])

  const proximoICEItems: ItemLista[] = useMemo(() => {
    return experimentos
      .filter((e) => e.status === 'backlog')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((e) => ({ id: e.id, titulo: e.nome, subtitulo: e.etapa, valor: e.score.toFixed(1), cor: '#C9A84C' }))
  }, [experimentos])

  return (
    <div className="page-content section-gap">

      {/* ── Onboarding ── */}
      <OnboardingChecklist />
      <OnboardingTour />

      {/* ── Banner ── */}
      <DashboardBanner isAdmin={true} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="caption uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
            {dataExtenso} · {nomeMes}
          </p>
          <h1 className="page-title">{saudacao}{perfil?.nome ? `, ${perfil.nome.split(' ')[0]}` : ''}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-0.5 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
            {PERIODO_OPCOES.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={periodo === p.id ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUltimaAtualizacao(new Date())}
            title="Os dados já são sincronizados em tempo real — atualiza o carimbo de horário"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={12} />
            Atualizado {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </button>
          <WidgetCustomizer />
          {showWidget('health-score') && <HealthScoreBadge hs={healthScore} />}
        </div>
      </div>

      {/* ── Resumo de hoje ── */}
      <ResumoDiario />

      {/* ══════════════════════════════════════════════════════════
          PAINEL EXECUTIVO — estilo Asana
      ══════════════════════════════════════════════════════════ */}
      {showWidget('kpis') && (
        <section className="flex flex-col gap-4">
          {/* Linha 1 — contadores grandes (arraste para reordenar) */}
          <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {contadoresOrdenados.map(({ id, node }) => (
              <div
                key={id}
                draggable
                onDragStart={() => setDragContadorId(id)}
                onDragEnd={() => setDragContadorId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropContador(id)}
                style={{ opacity: dragContadorId === id ? 0.4 : 1, cursor: 'grab' }}
                title="Arraste para reordenar"
              >
                {node}
              </div>
            ))}
          </div>

          {/* Linha 2 — gráficos */}
          <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
              <WidgetLinha title={`Vendas por dia — ${periodoLabel}`} icon={Activity} data={vendasDiarias} formatarValor={(v) => formatarMoeda(v)} />
            </div>
            <WidgetDonut title="Vendas por canal" icon={ShoppingCart} data={vendasPorCanal} formatarValor={(v) => formatarMoeda(v)} href="/vendas" />
            <WidgetFunil title="Funil B2B" icon={TrendingUp} etapas={funilB2BEtapas} href="/crm" />
          </div>
          <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <WidgetDonut title="Metas por status" icon={Target} data={metasPorStatus} href="/estrategias" />

            {/* Linha 3 — listas rápidas */}
            <WidgetLista title="North Star & Estratégia" icon={Compass} items={northStarItems} href="/estrategias" emptyMessage="Nenhuma fase cadastrada" />
            <WidgetLista title="Tarefas atrasadas / próximas" icon={ListChecks} items={tarefasListaItems} href="/tarefas" emptyMessage="Nenhuma tarefa com prazo" />
            <WidgetLista title="Reposições B2B (D+21)" icon={RotateCcw} items={reposicoesItems} href="/crm" emptyMessage="Nenhuma reposição esta semana" />
          </div>
          <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <WidgetLista title="Próximo experimento (maior ICE)" icon={FlaskConical} items={proximoICEItems} href="/growth" emptyMessage="Backlog de growth vazio" />
          </div>
        </section>
      )}

      {/* ── Resumo Pedidos vs Frascos ── */}
      {resumoFrascosPeriodo.pedidos > 0 && (
        <div className="card-purion" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {periodoLabel}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong>{resumoFrascosPeriodo.pedidos}</strong> pedidos pagos
            <span style={{ color: 'var(--text-secondary)' }}> = </span>
            <strong style={{ color: '#5B8FE8' }}>{resumoFrascosPeriodo.frascos}</strong> frascos vendidos
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong style={{ color: '#22C55E' }}>{resumoFrascosPeriodo.despachados}</strong>
            <span style={{ color: 'var(--text-secondary)' }}> despachados · </span>
            <strong style={{ color: '#A855F7' }}>{resumoFrascosPeriodo.ugc}</strong>
            <span style={{ color: 'var(--text-secondary)' }}> doados UGC</span>
          </span>
        </div>
      )}

      {/* ── Card Próximos Eventos ── */}
      <div className="card-purion" style={{ padding: '14px 16px' }}>
        <Link href="/calendario" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Calendar size={14} style={{ color: '#C9A84C' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Próximos eventos</span>
        </Link>
        <Proximos7Dias eventos={eventos} limite={3} />
      </div>

      {/* ── Painel de Metas do Ano — G4 ── */}
      <PainelMetasG4 />

      {/* ── Meta de Faturamento ── */}
      {showWidget('metas-progress') && <MetaFaturamento receitas={receitas} />}

      {/* ── Metas de Hoje ── */}
      {showWidget('metas-diarias') && <CardMetasHoje metas={metasDiarias} />}

      {/* ── Alertas ── */}
      {showWidget('alertas') && <SecaoAlertas alertas={todosAlertas} />}

      {/* ── Status dos Sócios ── */}
      <section>
        <p className="kpi-label flex items-center gap-1.5 mb-4">
          <Activity size={11} /> Status dos Sócios
        </p>
        <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(['matheus', 'gabriel', 'joao'] as const).map((perfil) => (
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
      </section>

      {/* ── Funil de Leads + Daily Updates ── */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <LeadsFunil leads={leads} />
        <UltimosDailies entries={dailyEntries} />
      </div>

      {/* ── Feed de Atividade — mobile: 5 items max ── */}
      {showWidget('atividade') && (
        <FeedAtividade items={isMobile ? feedAtividade.slice(0, 5) : feedAtividade} />
      )}

    </div>
  )
}
