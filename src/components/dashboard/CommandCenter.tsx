'use client'

import { useMemo } from 'react'
import { useMobile } from '@/hooks/useMobile'
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  ShoppingCart, BarChart2, AlertTriangle, AlertCircle,
  Info, Activity, Clock,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import {
  getMesAtual,
  calcularKPIsMes,
  calcularAlertas,
  calcularHealthScore,
  gerarFeedAtividade,
  formatarMoeda,
  formatarPercentual,
  type Alerta,
  type AtividadeItem,
  type HealthScore,
} from '@/lib/calculos'
import { DashboardBanner } from '@/components/dashboard/DashboardBanner'
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer'

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

      <div className="grid grid-cols-3 gap-2 mb-3">
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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function CommandCenter() {
  const isMobile = useMobile()
  const {
    receitas, despesas, campanhasAds,
    tarefas, leads, lotes, reunioes, estoque,
    perfilAtivo, setPerfilAtivo,
    dashboardWidgets,
  } = usePurionStore()

  const showWidget = (id: string) => dashboardWidgets.includes(id)

  const mesAtual     = useMemo(() => getMesAtual(receitas), [receitas])
  const kpis         = useMemo(() => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual), [receitas, despesas, campanhasAds, mesAtual])
  const alertas      = useMemo(() => calcularAlertas(kpis, estoque), [kpis, estoque])
  const healthScore  = useMemo(() => calcularHealthScore(receitas, despesas, campanhasAds, estoque), [receitas, despesas, campanhasAds, estoque])
  const feedAtividade = useMemo(() => gerarFeedAtividade(tarefas, leads, lotes, reunioes), [tarefas, leads, lotes, reunioes])

  const [ano, mes] = mesAtual.split('-')
  const nomeMes    = `${MESES_PT[mes] ?? mes} ${ano}`

  const kpiCards: KPICardProps[] = [
    {
      label: 'Faturamento do Mês',
      valor: formatarMoeda(kpis.faturamento),
      subvalor: `${kpis.pedidos} pedidos registrados`,
      icon: DollarSign,
      tendencia: 'up',
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
      valor: String(kpis.pedidos),
      subvalor: `Receita: ${formatarMoeda(kpis.faturamento)}`,
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

      {/* ── Meta de Faturamento ── */}
      {showWidget('metas-progress') && <MetaFaturamento receitas={receitas} />}

      {/* ── Alertas ── */}
      {showWidget('alertas') && <SecaoAlertas alertas={alertas} />}

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

      {/* ── Feed de Atividade — mobile: 5 items max ── */}
      {showWidget('atividade') && (
        <FeedAtividade items={isMobile ? feedAtividade.slice(0, 5) : feedAtividade} />
      )}

    </div>
  )
}
