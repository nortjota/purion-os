'use client'

/**
 * PURION OS — Módulo 7: Inteligência Comercial
 * Seções 1-6: rankings, mapa B2B, ticket médio, sazonalidade, insights.
 */

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Receita, Lead, CampanhaAds, ProdutoSKU, Configuracoes } from '@/store'
import type { ProdutoChartData, CanalChartData, SemanalChartData } from './InteligenciaGraficos'

const GraficosInteligencia = dynamic(
  () => import('./InteligenciaGraficos'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center">
        <p className="text-xs text-[#A0A0A0] tracking-widest">Carregando gráficos...</p>
      </div>
    ),
  }
)

// ─────────────────────────────────────────────
// FORMATAÇÃO
// ─────────────────────────────────────────────

const fmtR = (v: number | undefined | null) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ─────────────────────────────────────────────
// CÁLCULOS
// ─────────────────────────────────────────────

function calcularProdutos(totalReceita: number): ProdutoChartData[] {
  const splits  = { NOIR: 0.55, URBAN: 0.30, COASTAL: 0.15 } as const
  const precos  = { NOIR: 79.90, URBAN: 69.90, COASTAL: 84.90 } as const
  const margens = { NOIR: 68, URBAN: 62, COASTAL: 70 } as const
  return (Object.keys(splits) as (keyof typeof splits)[]).map((nome) => ({
    nome,
    receita:  Math.round(totalReceita * splits[nome]),
    unidades: Math.round((totalReceita * splits[nome]) / precos[nome]),
    margem:   margens[nome],
  }))
}

function calcularCanais(receitas: Receita[]): CanalChartData[] {
  const grupos: Record<string, number> = {}
  receitas.forEach((r) => {
    const canal =
      r.categoria === 'nuvemshop'   ? 'Site Próprio' :
      r.categoria === 'venda_b2b'   ? 'B2B' :
      r.categoria === 'marketplace' ? 'Marketplace' : 'Outros'
    grupos[canal] = (grupos[canal] ?? 0) + r.valor
  })
  const total = Object.values(grupos).reduce((s, v) => s + v, 0)
  return Object.entries(grupos)
    .map(([nome, valor]) => ({
      nome, valor: Math.round(valor),
      percentual: Math.round((valor / total) * 100),
    }))
    .sort((a, b) => b.valor - a.valor)
}

function calcularMapaB2B(leads: Lead[]) {
  return (['DF', 'SP', 'SC'] as const).map((regiao) => {
    const grupo    = leads.filter((l) => l.regiao === regiao)
    const fechados = grupo.filter((l) => l.status === 'parceiro_ativo')
    const pipeline = grupo
      .filter((l) => l.status !== 'inativo')
      .reduce((s, l) => s + l.valorMedioMensal, 0)
    const conversao = grupo.length
      ? Math.round((fechados.length / grupo.length) * 100)
      : 0
    return { regiao, total: grupo.length, fechados: fechados.length, pipeline, conversao }
  })
}

function calcularTicketMedio(receitas: Receita[]) {
  const grupos: Record<string, { total: number; count: number }> = {}
  receitas.forEach((r) => {
    const canal =
      r.categoria === 'nuvemshop'   ? 'Site Próprio' :
      r.categoria === 'venda_b2b'   ? 'B2B' :
      r.categoria === 'marketplace' ? 'Marketplace' : 'Outros'
    if (!grupos[canal]) grupos[canal] = { total: 0, count: 0 }
    grupos[canal].total  += r.valor
    grupos[canal].count  += 1
  })
  return Object.entries(grupos)
    .map(([canal, { total, count }]) => ({
      canal,
      ticketMedio: Math.round(total / count),
      pedidos: count,
      receita: Math.round(total),
    }))
    .sort((a, b) => b.receita - a.receita)
}

function calcularSemanal(receitas: Receita[]): SemanalChartData[] {
  const semanas: Record<string, number> = {}
  receitas.forEach((r) => {
    const d = new Date(r.data + 'T12:00:00Z')
    const dia = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() + (dia === 0 ? -6 : 1 - dia))
    const key = d.toISOString().slice(0, 10)
    semanas[key] = (semanas[key] ?? 0) + r.valor
  })
  return Object.entries(semanas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, valor]) => ({
      semana: new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', timeZone: 'UTC',
      }),
      valor: Math.round(valor),
    }))
}

function gerarInsights(
  receitas: Receita[],
  leads: Lead[],
  campanhasAds: CampanhaAds[],
  produtosSKU: ProdutoSKU[],
  configuracoes: Configuracoes,
): Array<{ texto: string; tipo: 'neutro' | 'positivo' | 'alerta' }> {
  const totalReceita = receitas.reduce((s, r) => s + r.valor, 0)
  const receitaNoir  = Math.round(totalReceita * 0.55)
  const pctNoir      = Math.round((receitaNoir / totalReceita) * 100)
  const noirSKU      = produtosSKU.find((p) => p.sku === 'noir')
  const urbanSKU     = produtosSKU.find((p) => p.sku === 'urban')

  const leadsQuentes = leads.filter(
    (l) => l.status === 'negociando' || l.status === 'proposta_enviada'
  )
  const valorPipeline = leadsQuentes.reduce((s, l) => s + l.valorMedioMensal, 0)

  const gastoAds   = campanhasAds.reduce((s, c) => s + c.gastoTotal, 0)
  const conversoes = campanhasAds.reduce((s, c) => s + c.conversoes, 0)
  const cpa        = conversoes > 0 ? Math.round(gastoAds / conversoes) : 0
  const cpaMax      = configuracoes.cpaMaximo ?? 30
  const thrNoir     = configuracoes.thresholdNoir ?? 100
  const thrUrban    = configuracoes.thresholdUrban ?? 100
  const cpaAcima    = cpa > cpaMax
  const urbanAlerta = (urbanSKU?.unidades ?? 0) < thrUrban

  return [
    {
      texto: `NOIR representa ${pctNoir}% da receita total (${fmtR(receitaNoir)}). Estoque atual: ${noirSKU?.unidades ?? 0} unidades. ${(noirSKU?.unidades ?? 0) < thrNoir * 2 ? 'Considere antecipar reposição para não comprometer parceiros.' : 'Nível de estoque saudável para o mês.'}`,
      tipo: (noirSKU?.unidades ?? 0) < thrNoir ? 'alerta' : 'positivo',
    },
    {
      texto: `Canal B2B com ${leadsQuentes.length} leads em negociação/proposta enviada. Valor potencial: ${fmtR(valorPipeline)}/mês. ${urbanAlerta ? `URBAN em nível crítico (${urbanSKU?.unidades ?? 0} un) — não feche novos pedidos antes de repor estoque.` : 'Estoque URBAN suficiente para fechar novos contratos.'}`,
      tipo: urbanAlerta ? 'alerta' : leadsQuentes.length > 0 ? 'positivo' : 'neutro',
    },
    {
      texto: `CPA médio nas campanhas: ${fmtR(cpa)} — ${cpaAcima ? `${Math.round(((cpa - cpaMax) / cpaMax) * 100)}% acima do limite de ${fmtR(cpaMax)} configurado em Alertas. Revisar segmentação de audiência.` : `dentro do limite de ${fmtR(cpaMax)} configurado. Campanha eficiente.`}`,
      tipo: cpaAcima ? 'alerta' : 'positivo',
    },
  ]
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function InteligenciaDashboard() {
  const {
    receitas, leads, campanhasAds, produtosSKU, lotes, configuracoes,
  } = usePurionStore()

  const totalReceita = useMemo(
    () => receitas.reduce((s, r) => s + r.valor, 0),
    [receitas]
  )

  const produtosData = useMemo(() => calcularProdutos(totalReceita),       [totalReceita])
  const canaisData   = useMemo(() => calcularCanais(receitas),             [receitas])
  const mapaB2B      = useMemo(() => calcularMapaB2B(leads),               [leads])
  const ticketData   = useMemo(() => calcularTicketMedio(receitas),        [receitas])
  const semanalData  = useMemo(() => calcularSemanal(receitas),            [receitas])
  const insights     = useMemo(
    () => gerarInsights(receitas, leads, campanhasAds, produtosSKU, configuracoes),
    [receitas, leads, campanhasAds, produtosSKU, configuracoes]
  )

  const lotesAprovados = lotes.filter((l) => l.status === 'aprovado').length
  const lotesEmTestes  = lotes.filter((l) => l.status === 'controle_qualidade').length

  return (
    <div className="page-content section-gap">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Inteligência Comercial</h1>
          <p className="caption mt-1">Rankings, análise de canais, mapa B2B e insights automáticos</p>
        </div>
        <div className="text-right">
          <p className="kpi-label">Receita Total</p>
          <p className="kpi-value mt-1">{fmtR(totalReceita)}</p>
        </div>
      </div>

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Leads Ativos',      valor: leads.filter((l) => l.status !== 'inativo').length, cor: '#C9A84C' },
          { label: 'Parceiros Fechados',valor: leads.filter((l) => l.status === 'parceiro_ativo').length, cor: '#10B981' },
          { label: 'Lotes Aprovados',   valor: lotesAprovados, cor: '#8B5CF6' },
          { label: 'Lotes Em Testes',   valor: lotesEmTestes,  cor: '#F59E0B' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="kpi-card">
            <p className="kpi-label">{label}</p>
            <p className="text-[28px] font-semibold mt-2" style={{ color: cor, letterSpacing: '-0.02em' }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* ══ Seções 1, 2 e 5 — Recharts (carregado via dynamic) ══ */}
      <GraficosInteligencia
        produtosData={produtosData}
        canaisData={canaisData}
        semanalData={semanalData}
      />

      {/* ══ Seções 3 e 4 — lado a lado ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Seção 3 — Mapa B2B */}
        <section>
          <h2 className="text-[11px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-3">
            Seção 3 — Mapa B2B por Estado
          </h2>
          <div className="flex flex-col gap-3">
            {mapaB2B.map(({ regiao, total, fechados, pipeline, conversao }) => {
              const label = regiao === 'DF' ? 'Brasília' : regiao === 'SP' ? 'São Paulo' : 'Santa Catarina'
              const cor   = conversao >= 40 ? '#10B981' : conversao >= 20 ? '#F59E0B' : '#EF4444'
              return (
                <div key={regiao} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#C9A84C] tracking-widest">{regiao}</span>
                      <span className="text-[10px] text-[#A0A0A0]">{label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conversao >= 40
                        ? <TrendingUp size={12} className="text-emerald-400" />
                        : conversao >= 20
                          ? <Minus size={12} className="text-amber-400" />
                          : <TrendingDown size={12} className="text-red-400" />
                      }
                      <span className="text-xs font-bold" style={{ color: cor }}>{conversao}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { label: 'Leads', valor: total, cor: '#FAFAF8' },
                      { label: 'Fechados', valor: fechados, cor: '#10B981' },
                      { label: 'Pipeline', valor: fmtR(pipeline), cor: '#C9A84C' },
                    ].map(({ label: l, valor, cor: c }) => (
                      <div key={l}>
                        <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wide mb-0.5">{l}</p>
                        <p className="text-base font-black" style={{ color: c }}>
                          {typeof valor === 'string' ? <span className="text-sm">{valor}</span> : valor}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, conversao)}%`, backgroundColor: cor }} />
                  </div>
                  <p className="text-[9px] text-[#A0A0A0] mt-1">Taxa de conversão</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Seção 4 — Ticket Médio por Canal */}
        <section>
          <h2 className="text-[11px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-3">
            Seção 4 — Ticket Médio por Canal
          </h2>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-3 px-4 py-2.5 border-b border-[var(--border)]">
              {['Canal', 'Ticket Médio', 'Pedidos', 'Receita Total'].map((h) => (
                <span key={h} className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {ticketData.map((row, idx) => (
              <div
                key={row.canal}
                className="grid grid-cols-4 gap-3 px-4 py-3.5 border-b border-[var(--border)] last:border-0 items-center hover:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <span className="text-[9px] font-bold text-[#C9A84C] bg-[rgba(201,168,76,0.1)] px-1.5 py-0.5 rounded">
                      LÍDER
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{row.canal}</span>
                </div>
                <span className="text-xs font-bold text-[#C9A84C]">{fmtR(row.ticketMedio)}</span>
                <span className="text-xs text-[var(--text-secondary)]">{row.pedidos}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{fmtR(row.receita)}</span>
              </div>
            ))}
          </div>

          {/* Resumo das campanhas */}
          <div className="mt-4">
            <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-2">
              Performance de Campanhas
            </p>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              {campanhasAds.map((c) => {
                const roas = c.gastoTotal > 0 ? (c.receitaGerada / c.gastoTotal).toFixed(1) : '—'
                const roasOk = c.gastoTotal > 0 && c.receitaGerada / c.gastoTotal >= (configuracoes.roasMinimo ?? 2.5)
                return (
                  <div key={c.id} className="px-4 py-3 border-b border-[var(--border)] last:border-0 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.nome}</p>
                      <p className="text-[10px] text-[#B8B8B8]">
                        {c.plataforma.toUpperCase()} · {fmtR(c.gastoTotal)} gasto
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${roasOk ? 'text-emerald-400' : 'text-red-400'}`}>
                        ROAS {roas}×
                      </p>
                      <p className="text-[10px] text-[#B8B8B8]">{c.conversoes} conv.</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ══ Seção 6 — Insights Automáticos ══ */}
      <section>
        <h2 className="text-[11px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-3">
          Seção 6 — Insights Automáticos
        </h2>
        <div className="flex flex-col gap-3">
          {insights.map((insight, i) => {
            const borderColor =
              insight.tipo === 'alerta'   ? '#EF4444' :
              insight.tipo === 'positivo' ? '#10B981' : '#C9A84C'
            const numBg =
              insight.tipo === 'alerta'   ? 'rgba(239,68,68,0.15)' :
              insight.tipo === 'positivo' ? 'rgba(16,185,129,0.15)' :
              'rgba(201,168,76,0.15)'
            return (
              <div
                key={i}
                className="bg-[var(--bg-surface)] rounded-xl px-5 py-4 flex items-start gap-4"
                style={{ borderLeft: `2px solid ${borderColor}` }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                  style={{ backgroundColor: numBg, color: borderColor }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{insight.texto}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
