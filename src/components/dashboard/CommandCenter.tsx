'use client'

/**
 * PURION OS — Command Center (Dashboard Principal)
 * Visão unificada de toda a operação: KPIs, metas, alertas,
 * status dos sócios e feed de atividade recente.
 */

import { useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  ShoppingCart, BarChart2, AlertTriangle, AlertCircle,
  Info, Activity, Clock
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
  type KPIsMes,
} from '@/lib/calculos'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const META_90_DIAS = 30_000
const MESES_PT_COMPLETO: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',    '04': 'Abril',
  '05': 'Maio',    '06': 'Junho',     '07': 'Julho',    '08': 'Agosto',
  '09': 'Setembro','10': 'Outubro',   '11': 'Novembro', '12': 'Dezembro',
}

// Dados fixos dos sócios (cargo/domínio não mudam)
const INFO_SOCIOS = {
  matheus: { nome: 'Matheus',  cidade: 'Brasília · DF', dominio: 'Comercial & CRM',      cor: '#C9A84C', inicial: 'M' },
  gabriel: { nome: 'Gabriel',  cidade: 'São Paulo · SP', dominio: 'Produção & Supply',   cor: '#4CAF7A', inicial: 'G' },
  joao:    { nome: 'João',     cidade: 'Florianópolis · SC', dominio: 'Marketing & Growth', cor: '#5B8FE8', inicial: 'J' },
}

// ─────────────────────────────────────────────
// COMPONENTE KPICARD
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
      rounded-xl border p-5 flex flex-col gap-3
      transition-all duration-200 hover:border-[rgba(201,168,76,0.3)]
      ${destaque
        ? 'bg-[rgba(201,168,76,0.06)] border-[rgba(201,168,76,0.2)]'
        : 'bg-[var(--bg-surface)] border-[var(--border)]'
      }
    `}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#6B6B6B] uppercase tracking-wider">
          {label}
        </span>
        <div className={`
          w-7 h-7 rounded-lg flex items-center justify-center
          ${destaque ? 'bg-[rgba(201,168,76,0.15)]' : 'bg-[#2A2A2A]'}
        `}>
          <Icon size={14} className={destaque ? 'text-[#C9A84C]' : 'text-[#6B6B6B]'} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[28px] font-black leading-none text-[#C9A84C]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {valor}
        </span>
        {tendencia && (
          <span className="mb-1">
            {tendencia === 'up'
              ? <TrendingUp size={14} className="text-[#4CAF7A]" />
              : tendencia === 'down'
              ? <TrendingDown size={14} className="text-[#E85238]" />
              : null
            }
          </span>
        )}
      </div>
      {subvalor && (
        <span className="text-xs text-[#6B6B6B]">{subvalor}</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE META FATURAMENTO
// ─────────────────────────────────────────────

function MetaFaturamento({ receitas, despesas }: { receitas: { valor: number; data: string }[]; despesas: { valor: number; data: string }[] }) {
  // Soma tudo (cumulativo para meta 90 dias)
  const totalReceita = receitas.reduce((s, r) => s + r.valor, 0)
  const percentual = Math.min(100, (totalReceita / META_90_DIAS) * 100)

  // Calcula dias restantes (a partir da data mais recente no seed)
  const dataReferencia = new Date('2024-02-12')
  const dataFim = new Date('2024-04-12') // 90 dias
  const diasRestantes = Math.max(0, Math.ceil((dataFim.getTime() - dataReferencia.getTime()) / 86_400_000))

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#C9A84C]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Meta de Faturamento — 90 dias</span>
        </div>
        <span className="text-lg font-black text-[#C9A84C]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {percentual.toFixed(1)}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentual}%`,
            background: `linear-gradient(90deg, #C9A84C, #E8C870)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
        <span>
          <span className="text-[#C9A84C] font-semibold">{formatarMoeda(totalReceita)}</span>
          {' '}de{' '}
          <span className="text-[var(--text-primary)]">{formatarMoeda(META_90_DIAS)}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {diasRestantes} dias restantes
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE ALERTAS
// ─────────────────────────────────────────────

const COR_ALERTA: Record<Alerta['tipo'], { bg: string; border: string; text: string; icon: React.ElementType }> = {
  danger:  { bg: 'rgba(232,82,56,0.08)',   border: 'rgba(232,82,56,0.3)',   text: '#E85238', icon: AlertTriangle },
  warning: { bg: 'rgba(232,168,56,0.08)',  border: 'rgba(232,168,56,0.3)',  text: '#E8A838', icon: AlertCircle  },
  info:    { bg: 'rgba(91,143,232,0.08)', border: 'rgba(91,143,232,0.3)', text: '#5B8FE8', icon: Info         },
}

function SecaoAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider font-medium flex items-center gap-1.5">
        <AlertTriangle size={11} /> Alertas Automáticos
      </p>
      <div className="flex flex-wrap gap-2">
        {alertas.map((alerta) => {
          const { bg, border, text, icon: Icon } = COR_ALERTA[alerta.tipo]
          return (
            <div
              key={alerta.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs border"
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <Icon size={13} style={{ color: text, marginTop: 1, flexShrink: 0 }} />
              <div>
                <span className="font-semibold" style={{ color: text }}>{alerta.mensagem}</span>
                {alerta.detalhe && (
                  <span className="text-[#6B6B6B] ml-1.5">— {alerta.detalhe}</span>
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
// COMPONENTE STATUS DO SÓCIO
// ─────────────────────────────────────────────

interface SocioCardProps {
  perfilId: 'matheus' | 'gabriel' | 'joao'
  tarefas: import('@/store').Tarefa[]
  leads: import('@/store').Lead[]
  campanhas: import('@/store').CampanhaAds[]
  ativo: boolean
  onClick: () => void
}

function SocioCard({ perfilId, tarefas, campanhas, ativo, onClick }: SocioCardProps) {
  const info = INFO_SOCIOS[perfilId]
  const minhasTarefas = tarefas.filter((t) => t.responsavel === perfilId)

  const abertas      = minhasTarefas.filter((t) => t.status === 'pendente').length
  const emAndamento  = minhasTarefas.filter((t) => t.status === 'em_andamento').length
  const concluidas   = minhasTarefas.filter((t) => t.status === 'concluida').length

  // Última atividade — tarefa concluída mais recente
  const ultimaConcluida = minhasTarefas
    .filter((t) => t.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
    .at(0)

  // Gastos em ads (João)
  const gastoAds = campanhas
    .filter((c) => c.responsavel === perfilId)
    .reduce((s, c) => s + c.gastoTotal, 0)

  return (
    <button
      onClick={onClick}
      className={`
        rounded-xl border p-4 text-left w-full
        transition-all duration-200 hover:border-[rgba(201,168,76,0.3)]
        ${ativo
          ? 'bg-[rgba(201,168,76,0.06)] border-[rgba(201,168,76,0.25)]'
          : 'bg-[var(--bg-surface)] border-[var(--border)]'
        }
      `}
    >
      {/* Header do sócio */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
          style={{ backgroundColor: `${info.cor}20`, color: info.cor, border: `1px solid ${info.cor}40` }}
        >
          {info.inicial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">{info.nome}</span>
            {/* Badge especial para João */}
            {perfilId === 'joao' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2A2A2A] text-[#6B6B6B] font-medium whitespace-nowrap">
                Disponível após 18h
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#6B6B6B]">{info.cidade}</p>
          <p className="text-[11px] text-[#8A8A8A] font-medium">{info.dominio}</p>
        </div>
      </div>

      {/* Stats de tarefas */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: 'Abertas',      valor: abertas,     cor: '#E8A838' },
          { label: 'Andamento',    valor: emAndamento, cor: info.cor  },
          { label: 'Concluídas',   valor: concluidas,  cor: '#4CAF7A' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-[var(--bg-surface-2)] rounded-lg p-2 text-center border border-[var(--border)]">
            <span className="block text-base font-black leading-none mb-0.5" style={{ color: cor }}>
              {valor}
            </span>
            <span className="text-[9px] text-[#6B6B6B] uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="text-[10px] text-[#4A4A4A] flex flex-col gap-0.5">
        {ultimaConcluida && (
          <span>
            Última entrega: <span className="text-[#6B6B6B]">{ultimaConcluida.titulo}</span>
          </span>
        )}
        {perfilId === 'joao' && gastoAds > 0 && (
          <span>
            Ads investidos: <span className="text-[#C9A84C]">{formatarMoeda(gastoAds)}</span>
          </span>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE FEED DE ATIVIDADE
// ─────────────────────────────────────────────

const ICON_MODULO: Record<string, React.ElementType> = {
  tarefas: Activity,
  crm: TrendingUp,
  producao: BarChart2,
  reunioes: Clock,
  financeiro: DollarSign,
}

function FeedAtividade({ items }: { items: AtividadeItem[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2">
        <Activity size={14} className="text-[#C9A84C]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">Atividade Recente</span>
        <span className="ml-auto text-[10px] text-[#4A4A4A] uppercase tracking-wider">
          últimas {items.length} ações
        </span>
      </div>
      <ul className="divide-y divide-[#1E1E1E]">
        {items.map((item, idx) => {
          const ModuloIcon = ICON_MODULO[item.modulo] ?? Activity
          return (
            <li
              key={item.id}
              className={`
                flex items-start gap-3 px-5 py-3
                transition-colors hover:bg-[rgba(255,255,255,0.02)]
                ${idx === 0 ? 'bg-[rgba(201,168,76,0.03)]' : ''}
              `}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${item.corAvatar}20`,
                  color: item.corAvatar,
                  border: `1px solid ${item.corAvatar}30`,
                }}
              >
                {item.inicial}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  <span className="font-semibold" style={{ color: item.corAvatar }}>
                    {item.responsavel}
                  </span>{' '}
                  <span className="text-[#8A8A8A]">{item.acao}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ModuloIcon size={9} className="text-[#4A4A4A]" />
                  <span className="text-[10px] text-[#4A4A4A]">{item.dataFormatada}</span>
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
// HEALTH SCORE BADGE
// ─────────────────────────────────────────────

function HealthScoreBadge({ hs }: { hs: HealthScore }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{
        backgroundColor: `${hs.cor}12`,
        borderColor: `${hs.cor}30`,
      }}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="text-xl font-black" style={{ color: hs.cor, fontFamily: 'Montserrat, sans-serif' }}>
          {hs.score}
        </span>
        <span className="text-[8px] text-[#6B6B6B] uppercase tracking-wider">/10</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-xs font-semibold" style={{ color: hs.cor }}>
          {hs.status}
        </span>
        <span className="text-[9px] text-[#6B6B6B]">Health Score</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function CommandCenter() {
  const {
    receitas, despesas, campanhasAds,
    tarefas, leads, lotes, reunioes, estoque,
    perfilAtivo, setPerfilAtivo,
  } = usePurionStore()

  // Cálculos derivados (memoizados para evitar re-computação)
  const mesAtual = useMemo(() => getMesAtual(receitas), [receitas])
  const kpis = useMemo(
    () => calcularKPIsMes(receitas, despesas, campanhasAds, mesAtual),
    [receitas, despesas, campanhasAds, mesAtual]
  )
  const alertas = useMemo(
    () => calcularAlertas(kpis, estoque),
    [kpis, estoque]
  )
  const healthScore = useMemo(
    () => calcularHealthScore(receitas, despesas, campanhasAds, estoque),
    [receitas, despesas, campanhasAds, estoque]
  )
  const feedAtividade = useMemo(
    () => gerarFeedAtividade(tarefas, leads, lotes, reunioes),
    [tarefas, leads, lotes, reunioes]
  )

  // Label do mês atual
  const [ano, mes] = mesAtual.split('-')
  const nomeMes = `${MESES_PT_COMPLETO[mes] ?? mes} ${ano}`

  // KPI cards configurados
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
      subvalor: kpis.roas === 0 ? 'Sem dados de ads' : kpis.roas < 2.5 ? '⚠ Abaixo de 2.5x' : '✓ Meta atingida',
      icon: TrendingUp,
      tendencia: kpis.roas === 0 ? 'neutral' : kpis.roas >= 2.5 ? 'up' : 'down',
    },
    {
      label: 'CPA Médio',
      valor: kpis.cpa > 0 ? formatarMoeda(kpis.cpa) : '—',
      subvalor: kpis.cpa === 0 ? 'Sem conversões registradas' : kpis.cpa > 30 ? '⚠ Acima de R$ 30,00' : '✓ Dentro do limite',
      icon: ShoppingCart,
      tendencia: kpis.cpa === 0 ? 'neutral' : kpis.cpa <= 30 ? 'up' : 'down',
    },
    {
      label: 'Margem Bruta',
      valor: formatarPercentual(kpis.margemBruta),
      subvalor: `Meta: 65% | Saldo: ${formatarMoeda(kpis.saldo)}`,
      icon: BarChart2,
      tendencia: kpis.margemBruta >= 60 ? 'up' : 'down',
    },
    {
      label: 'Pedidos do Mês',
      valor: String(kpis.pedidos),
      subvalor: `Receita registrada: ${formatarMoeda(kpis.faturamento)}`,
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
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#6B6B6B] uppercase tracking-widest mb-0.5">
            Bem-vindo, {INFO_SOCIOS[perfilAtivo].nome}
          </p>
          <h1
            className="text-2xl font-black text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Command Center
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{nomeMes} · Visão unificada da operação</p>
        </div>
        <HealthScoreBadge hs={healthScore} />
      </div>

      {/* ── Linha 1: KPI Cards 3×2 ── */}
      <div className="grid grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Linha 2: Meta de Faturamento ── */}
      <MetaFaturamento receitas={receitas} despesas={despesas} />

      {/* ── Linha 3: Alertas (aparece só quando há alertas) ── */}
      <SecaoAlertas alertas={alertas} />

      {/* ── Linha 4: Status dos Sócios ── */}
      <div>
        <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
          <Activity size={11} /> Status dos Sócios
        </p>
        <div className="grid grid-cols-3 gap-4">
          {(['matheus', 'gabriel', 'joao'] as const).map((perfil) => (
            <SocioCard
              key={perfil}
              perfilId={perfil}
              tarefas={tarefas}
              leads={leads}
              campanhas={campanhasAds}
              ativo={perfilAtivo === perfil}
              onClick={() => setPerfilAtivo(perfil)}
            />
          ))}
        </div>
      </div>

      {/* ── Linha 5: Feed de Atividade ── */}
      <FeedAtividade items={feedAtividade} />

    </div>
  )
}
