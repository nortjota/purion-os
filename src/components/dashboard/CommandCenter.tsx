'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useMobile } from '@/hooks/useMobile'
import { ResumoDiario } from './ResumoDiario'

const GraficoVendasDiarias = dynamic(() => import('./GraficoVendasDiarias'), { ssr: false })
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  ShoppingCart, BarChart2, AlertTriangle, AlertCircle,
  Info, Activity, Clock, Calendar, Users, FlaskConical,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { MetaDiaria } from '@/store'
import {
  getMesAtual,
  calcularKPIsMes,
  calcularAlertas,
  calcularHealthScore,
  gerarFeedAtividade,
  formatarMoeda,
  formatarPercentual,
  formatarDataBR,
  LABEL_STATUS_LEAD,
  type Alerta,
  type AtividadeItem,
  type HealthScore,
} from '@/lib/calculos'
import Link from 'next/link'
import { DashboardBanner } from '@/components/dashboard/DashboardBanner'
import { useGrowth } from '@/hooks/useGrowth'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const META_90_DIAS = 30_000

const MESES_PT: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',    '04': 'Abril',
  '05': 'Maio',    '06': 'Junho',     '07': 'Julho',    '08': 'Agosto',
  '09': 'Setembro','10': 'Outubro',   '11': 'Novembro', '12': 'Dezembro',
}

const INFO_SOCIOS = {
  matheus: { nome: 'Matheus',  cidade: 'Brasília · DF',        dominio: 'Comercial & CRM',    cor: '#C9A84C', inicial: 'M' },
  gabriel: { nome: 'Gabriel',  cidade: 'São Paulo · SP',        dominio: 'Produção & Supply',  cor: '#22C55E', inicial: 'G' },
  joao:    { nome: 'João',     cidade: 'Florianópolis · SC',    dominio: 'Marketing & Growth', cor: '#5B8FE8', inicial: 'J' },
}

// ─────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────

interface KPICardProps {
  label: string
  valor: string
  subvalor?: string
  icon: React.ElementType
  tendencia?: 'up' | 'down' | 'neutral'
  destaque?: boolean
}

function KPICard({ label, valor, subvalor, icon: Icon, tendencia, destaque }: KPICardProps) {
  return (
    <div className={`
      kpi-card flex flex-col gap-4
      ${destaque ? 'border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.04)]' : ''}
    `}>
      <div className="flex items-start justify-between">
        <span className="kpi-label">{label}</span>
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${destaque
            ? 'bg-[rgba(201,168,76,0.12)]'
            : 'bg-[var(--bg-surface-2)]'
          }
        `}>
          <Icon
            size={16}
            className={destaque ? 'text-[#C9A84C] opacity-70' : 'text-[var(--text-secondary)] opacity-60'}
          />
        </div>
      </div>

      <div>
        <div className="flex items-end gap-2 mb-1">
          <span className="kpi-value">{valor}</span>
          {tendencia === 'up' && <TrendingUp size={14} className="text-[#22C55E] mb-0.5 shrink-0" />}
          {tendencia === 'down' && <TrendingDown size={14} className="text-[#EF4444] mb-0.5 shrink-0" />}
        </div>
        {subvalor && (
          <p className="caption">{subvalor}</p>
        )}
      </div>
    </div>
  )
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
    { id: 'joao'    as const, label: 'João',    cor: '#3B82F6' },
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
  } = usePurionStore()
  const { experimentos } = useGrowth()
  const { fases } = useEstrategiaRoadmap()
  const faseAtual = fases.find((f) => f.status === 'atual')

  const showWidget = (id: string) => dashboardWidgets.includes(id)

  const mesAtual     = useMemo(() => getMesAtual(receitas), [receitas])
  const kpis         = useMemo(() => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual), [receitas, despesas, campanhasAds, mesAtual])
  const alertas      = useMemo(() => calcularAlertas(kpis, estoque), [kpis, estoque])
  const healthScore  = useMemo(() => calcularHealthScore(receitas, despesas, campanhasAds, estoque), [receitas, despesas, campanhasAds, estoque])
  const feedAtividade = useMemo(() => gerarFeedAtividade(tarefas, leads, lotes, reunioes), [tarefas, leads, lotes, reunioes])

  const vendasDiarias = useMemo(() => {
    const dias: { data: string; valor: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const chave = d.toISOString().slice(0, 10)
      const valor = vendas
        .filter((v) => v.statusPagamento === 'pago' && v.dataVenda.slice(0, 10) === chave)
        .reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
      dias.push({ data: `${chave.slice(8, 10)}/${chave.slice(5, 7)}`, valor })
    }
    return dias
  }, [vendas])

  const mesAnterior = useMemo(() => {
    const [a, m] = mesAtual.split('-').map(Number)
    return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
  }, [mesAtual])

  const kpisAnterior = useMemo(
    () => calcularKPIsMes(receitas, despesas, campanhasAds, mesAnterior),
    [receitas, despesas, campanhasAds, mesAnterior]
  )

  const variacaoFaturamento = useMemo(
    () => kpisAnterior.faturamento > 0
      ? ((kpis.faturamento - kpisAnterior.faturamento) / kpisAnterior.faturamento) * 100
      : null,
    [kpis.faturamento, kpisAnterior.faturamento]
  )

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

  const resumoFrascosMes = useMemo(() => {
    const vendasMes = vendas.filter((v) => v.dataVenda.startsWith(mesAtual) && v.statusPagamento === 'pago')
    const pedidos = vendasMes.length
    const frascos = vendasMes.reduce((s, v) => s + v.quantidade, 0)
    const despachados = vendasMes.filter((v) => ['postado', 'em_transito', 'entregue'].includes(v.statusEntrega)).reduce((s, v) => s + v.quantidade, 0)
    const ugc = doacoesUGC.filter((d) => d.dataEnvio.startsWith(mesAtual) && ['postado', 'entregue'].includes(d.statusEnvio)).reduce((s, d) => s + d.quantidade, 0)
    return { pedidos, frascos, despachados, ugc }
  }, [vendas, doacoesUGC, mesAtual])

  const [ano, mes] = mesAtual.split('-')
  const nomeMes    = `${MESES_PT[mes] ?? mes} ${ano}`

  const kpiCards: KPICardProps[] = [
    {
      label: 'Faturamento do Mês',
      valor: formatarMoeda(kpis.faturamento),
      subvalor: variacaoFaturamento !== null
        ? `${variacaoFaturamento >= 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}% vs mês anterior`
        : `${kpis.pedidos} pedidos registrados`,
      icon: DollarSign,
      tendencia: variacaoFaturamento === null || variacaoFaturamento >= 0 ? 'up' : 'down',
      destaque: true,
    },
    {
      label: 'ROAS Atual',
      valor: kpis.roas > 0 ? `${kpis.roas.toFixed(2)}x` : '—',
      subvalor: kpis.roas === 0 ? 'Sem dados de ads' : kpis.roas < 2.5 ? 'Abaixo de 2.5x' : 'Meta atingida',
      icon: TrendingUp,
      tendencia: kpis.roas === 0 ? 'neutral' : kpis.roas >= 2.5 ? 'up' : 'down',
    },
    {
      label: 'CPA Médio',
      valor: kpis.cpa > 0 ? formatarMoeda(kpis.cpa) : '—',
      subvalor: kpis.cpa === 0 ? 'Sem conversões' : kpis.cpa > 30 ? 'Acima de R$ 30,00' : 'Dentro do limite',
      icon: ShoppingCart,
      tendencia: kpis.cpa === 0 ? 'neutral' : kpis.cpa <= 30 ? 'up' : 'down',
    },
    {
      label: 'Margem Bruta',
      valor: formatarPercentual(kpis.margemBruta),
      subvalor: `Meta 65% · Saldo ${formatarMoeda(kpis.saldo)}`,
      icon: BarChart2,
      tendencia: kpis.margemBruta >= 60 ? 'up' : 'down',
    },
    {
      label: 'Pedidos do Mês',
      valor: String(resumoFrascosMes.pedidos),
      subvalor: `${resumoFrascosMes.frascos} frascos vendidos`,
      icon: Activity,
      tendencia: 'neutral',
    },
    {
      label: 'Ticket Médio',
      valor: formatarMoeda(kpis.ticketMedio),
      subvalor: `Despesa total: ${formatarMoeda(kpis.despesaTotal)}`,
      icon: Target,
      tendencia: 'neutral',
    },
  ]

  return (
    <div className="page-content section-gap">

      {/* ── Onboarding ── */}
      <OnboardingChecklist />
      <OnboardingTour />

      {/* ── Banner ── */}
      <DashboardBanner isAdmin={true} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="caption uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
            {nomeMes} · Visão unificada
          </p>
          <h1 className="page-title">Command Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <WidgetCustomizer />
          {showWidget('health-score') && <HealthScoreBadge hs={healthScore} />}
        </div>
      </div>

      {/* ── Resumo de hoje ── */}
      <ResumoDiario />

      {/* ── KPI Cards ── */}
      {showWidget('kpis') && (
        <section>
          <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {kpiCards.map((card) => (
              <KPICard key={card.label} {...card} />
            ))}
          </div>
        </section>
      )}

      {/* ── Resumo Pedidos vs Frascos ── */}
      {resumoFrascosMes.pedidos > 0 && (
        <div className="card-purion" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {nomeMes}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong>{resumoFrascosMes.pedidos}</strong> pedidos pagos
            <span style={{ color: 'var(--text-secondary)' }}> = </span>
            <strong style={{ color: '#5B8FE8' }}>{resumoFrascosMes.frascos}</strong> frascos vendidos
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <strong style={{ color: '#22C55E' }}>{resumoFrascosMes.despachados}</strong>
            <span style={{ color: 'var(--text-secondary)' }}> despachados · </span>
            <strong style={{ color: '#A855F7' }}>{resumoFrascosMes.ugc}</strong>
            <span style={{ color: 'var(--text-secondary)' }}> doados UGC</span>
          </span>
        </div>
      )}

      {/* ── Growth: North Star + próximo ICE + funil B2B ── */}
      {(() => {
        const proxICE = experimentos.filter((e) => e.status === 'backlog').sort((a, b) => b.score - a.score)[0]
        const rodando = experimentos.filter((e) => e.status === 'rodando').length
        const parceiros = leads.filter((l) => ['parceiro_ativo', 'pago', 'parceiro_recorrente'].includes(l.status)).length
        const reposicoes = leads.filter((l) => {
          if (!['parceiro_ativo', 'pago'].includes(l.status)) return false
          const dias = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000)
          return dias >= 14 && dias <= 35
        }).length
        return (
          <Link href="/estrategias" style={{ textDecoration: 'none' }}>
            <div className="card-purion" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.12)' }}>
                <FlaskConical size={16} style={{ color: '#C9A84C' }} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block' }}>
                  ⭐ North Star · recompra{faseAtual && ` · fase: ${faseAtual.nome}`}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {parceiros} parceiro{parceiros !== 1 ? 's' : ''} ativo{parceiros !== 1 ? 's' : ''}
                  {reposicoes > 0 && <span style={{ color: '#E8A838', marginLeft: 8 }}>{reposicoes} reposição D+21</span>}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {proxICE && (
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Próximo ICE</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{proxICE.nome.slice(0, 30)}{proxICE.nome.length > 30 ? '…' : ''}</span>
                    <span style={{ fontSize: 10, color: '#C9A84C', marginLeft: 6 }}>score {proxICE.score.toFixed(1)}</span>
                  </div>
                )}
                {rodando > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Rodando</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#5B8FE8' }}>{rodando}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── Card Estoque Produto ── */}
      {estoqueProduto && (() => {
        const alerta = estoqueProduto.quantidadeAtual < estoqueProduto.quantidadeMinima
        return (
          <Link href="/vendas" style={{ textDecoration: 'none' }}>
            <div className="card-purion" style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
              border: alerta ? '1px solid rgba(239,68,68,0.35)' : undefined,
              background: alerta ? 'rgba(239,68,68,0.04)' : undefined,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: alerta ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                color: alerta ? '#EF4444' : '#22C55E',
              }}>
                <AlertTriangle size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>Estoque Produto Pronto</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: alerta ? '#EF4444' : '#22C55E' }}>
                  {estoqueProduto.quantidadeAtual} unidades
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {alerta ? `⚠️ Abaixo do mínimo (${estoqueProduto.quantidadeMinima})` : `Mínimo: ${estoqueProduto.quantidadeMinima} · OK`}
                </span>
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── Meta de Faturamento ── */}
      {showWidget('metas-progress') && <MetaFaturamento receitas={receitas} />}

      {/* ── Metas de Hoje ── */}
      {showWidget('metas-diarias') && <CardMetasHoje metas={metasDiarias} />}

      {/* ── Vendas por dia ── */}
      <section className="card-purion p-4">
        <p className="kpi-label flex items-center gap-1.5 mb-3">Vendas pagas — últimos 14 dias</p>
        <GraficoVendasDiarias data={vendasDiarias} />
      </section>

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
