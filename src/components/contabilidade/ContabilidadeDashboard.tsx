'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { FileText, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { FluxoSemanaData, CentroCustoData } from './ContabilidadeGraficos'

const GraficoFluxoCaixa  = dynamic(() => import('./ContabilidadeGraficos').then((m) => ({ default: m.GraficoFluxoCaixa })),  { ssr: false })
const GraficoCentroCustos = dynamic(() => import('./ContabilidadeGraficos').then((m) => ({ default: m.GraficoCentroCustos })), { ssr: false })

const DATA_REF = new Date('2024-02-12T12:00:00Z')
const MES_ATUAL   = '2024-02'
const MES_ANTERIOR = '2024-01'

const CPV_CATS         = ['insumos', 'embalagens']
const MARKETING_CATS   = ['ads_meta', 'ads_google']
const OPERACIONAL_CATS = ['logistica', 'overhead', 'pessoal']
const SOCIETARIO_CATS  = ['taxas_impostos']

const CATEGORIAS_DESPESA = [
  { value: 'insumos',       label: 'Insumos' },
  { value: 'embalagens',    label: 'Embalagens' },
  { value: 'ads_meta',      label: 'Ads Meta' },
  { value: 'ads_google',    label: 'Ads Google' },
  { value: 'logistica',     label: 'Logística' },
  { value: 'taxas_impostos', label: 'Taxas / Impostos' },
  { value: 'pessoal',       label: 'Pessoal' },
  { value: 'overhead',      label: 'Overhead' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

function VarBadge({ v }: { v: number | null; positiveIsGood?: boolean }) {
  if (v === null) return <span className="caption">—</span>
  const good = v >= 0
  return (
    <span className={`text-[11px] font-medium ${good ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {v > 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

function VarBadgeCusto({ v }: { v: number | null }) {
  if (v === null) return <span className="caption">—</span>
  const good = v <= 0
  return (
    <span className={`text-[11px] font-medium ${good ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {v > 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  )
}

export default function ContabilidadeDashboard() {
  const { receitas, despesas, configuracoes, atualizarDespesa } = usePurionStore()
  const [categorizando, setCategorizando] = useState<string | null>(null)
  const [novaCategoria, setNovaCategoria] = useState<string>('insumos')

  // ── DRE ──────────────────────────────────────────────────────────────────
  const dre = useMemo(() => {
    function calc(mes: string) {
      const rec = receitas.filter((r) => r.data.startsWith(mes))
      const desp = despesas.filter((d) => d.data.startsWith(mes))

      const receitaBruta     = rec.reduce((s, r) => s + r.valor, 0)
      const devolucoes       = 0
      const receitaLiquida   = receitaBruta - devolucoes
      const cpv              = desp.filter((d) => CPV_CATS.includes(d.categoria)).reduce((s, d) => s + d.valor, 0)
      const lucroBruto       = receitaLiquida - cpv
      const despMarketing    = desp.filter((d) => MARKETING_CATS.includes(d.categoria)).reduce((s, d) => s + d.valor, 0)
      const despOperacional  = desp.filter((d) => OPERACIONAL_CATS.includes(d.categoria)).reduce((s, d) => s + d.valor, 0)
      const despSocietario   = desp.filter((d) => SOCIETARIO_CATS.includes(d.categoria)).reduce((s, d) => s + d.valor, 0)
      const lucroOperacional = lucroBruto - despMarketing - despOperacional - despSocietario
      const impostos         = Math.max(0, receitaBruta * configuracoes.aliquotaContabil)
      const lucroLiquido     = lucroOperacional - impostos

      return { receitaBruta, devolucoes, receitaLiquida, cpv, lucroBruto, despMarketing, despOperacional, despSocietario, lucroOperacional, impostos, lucroLiquido }
    }

    const atual    = calc(MES_ATUAL)
    const anterior = calc(MES_ANTERIOR)
    return { atual, anterior }
  }, [receitas, despesas, configuracoes.aliquotaContabil])

  const linhasDRE = [
    { label: 'Receita Bruta',          atual: dre.atual.receitaBruta,     anterior: dre.anterior.receitaBruta,     custo: false, negrito: false },
    { label: '(-) Devoluções',         atual: -dre.atual.devolucoes,      anterior: -dre.anterior.devolucoes,      custo: true,  negrito: false },
    { label: '= Receita Líquida',      atual: dre.atual.receitaLiquida,   anterior: dre.anterior.receitaLiquida,   custo: false, negrito: true  },
    { label: '(-) CPV',                atual: -dre.atual.cpv,             anterior: -dre.anterior.cpv,             custo: true,  negrito: false },
    { label: '= Lucro Bruto',          atual: dre.atual.lucroBruto,       anterior: dre.anterior.lucroBruto,       custo: false, negrito: true  },
    { label: '(-) Desp. Marketing',    atual: -dre.atual.despMarketing,   anterior: -dre.anterior.despMarketing,   custo: true,  negrito: false },
    { label: '(-) Desp. Operacional',  atual: -dre.atual.despOperacional, anterior: -dre.anterior.despOperacional, custo: true,  negrito: false },
    { label: '(-) Desp. Societário',   atual: -dre.atual.despSocietario,  anterior: -dre.anterior.despSocietario,  custo: true,  negrito: false },
    { label: '= Lucro Operacional',    atual: dre.atual.lucroOperacional, anterior: dre.anterior.lucroOperacional, custo: false, negrito: true  },
    { label: '(-) Impostos Est.',      atual: -dre.atual.impostos,        anterior: -dre.anterior.impostos,        custo: true,  negrito: false },
    { label: '= Lucro Líquido',        atual: dre.atual.lucroLiquido,     anterior: dre.anterior.lucroLiquido,     custo: false, negrito: true  },
  ]

  // ── Fluxo de Caixa (8 semanas projetadas) ────────────────────────────────
  const fluxoData = useMemo<FluxoSemanaData[]>(() => {
    const base = new Date('2024-02-12')
    const recMensal = dre.atual.receitaBruta || 15000
    const despMensal = (dre.atual.cpv + dre.atual.despMarketing + dre.atual.despOperacional + dre.atual.despSocietario) || 9000
    return Array.from({ length: 8 }, (_, i) => {
      const seed = Math.sin(i * 2.7 + 1) * 0.18
      const entradas = (recMensal / 4) * (1 + seed)
      const saidas   = (despMensal / 4) * (1 - seed * 0.5)
      const d = new Date(base); d.setDate(d.getDate() + i * 7)
      const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
      return { semana: label, entradas: Math.round(entradas), saidas: Math.round(saidas), saldo: Math.round(entradas - saidas) }
    })
  }, [dre])

  const proj30  = useMemo(() => fluxoData.slice(0, 4).reduce((s, w) => s + w.saldo, 0), [fluxoData])
  const proj60  = useMemo(() => fluxoData.slice(0, 8).reduce((s, w) => s + w.saldo, 0), [fluxoData])
  const proj90  = useMemo(() => proj60 * 1.5, [proj60])

  // ── Conciliação ───────────────────────────────────────────────────────────
  const semCategoria = useMemo(
    () => despesas.filter((d) => d.categoria === 'outro'),
    [despesas]
  )

  // ── Centro de Custos ──────────────────────────────────────────────────────
  const centroCustos = useMemo<CentroCustoData[]>(() => {
    const all = despesas.filter((d) => d.data.startsWith(MES_ATUAL))
    const comercial  = all.filter((d) => d.responsavel === 'matheus').reduce((s, d) => s + d.valor, 0)
    const digital    = all.filter((d) => d.responsavel === 'joao').reduce((s, d) => s + d.valor, 0)
    const producao   = all.filter((d) => d.responsavel === 'gabriel').reduce((s, d) => s + d.valor, 0)
    return [
      { nome: 'Comercial', total: comercial },
      { nome: 'Digital',   total: digital   },
      { nome: 'Produção',  total: producao  },
    ].filter((c) => c.total > 0)
  }, [despesas])

  const totalCustos = centroCustos.reduce((s, c) => s + c.total, 0)

  // ── PDF Export ────────────────────────────────────────────────────────────
  async function exportarPDF() {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFontSize(16)
    doc.setTextColor(201, 168, 76)
    doc.text('PURION OS — Relatório Contábil', 14, 18)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Gerado em ${DATA_REF.toLocaleDateString('pt-BR')} | Regime: ${configuracoes.regimeTributario === 'simples_nacional' ? 'Simples Nacional' : 'Lucro Presumido'}`, 14, 25)

    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('DRE Simplificado', 14, 34)

    autoTable(doc, {
      startY: 38,
      head: [['Linha', 'Mês Atual', 'Mês Anterior', 'Var%']],
      body: linhasDRE.map((l) => {
        const v = variacao(l.atual, l.anterior)
        return [
          l.label,
          l.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
          l.anterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
          v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
        ]
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [201, 168, 76], textColor: [13, 13, 13] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.text('Indicadores Fiscais', 14, y2)
    autoTable(doc, {
      startY: y2 + 4,
      body: [
        ['Regime Tributário', configuracoes.regimeTributario === 'simples_nacional' ? 'Simples Nacional' : 'Lucro Presumido'],
        ['CNAE', configuracoes.cnae],
        ['Alíquota Estimada', `${(configuracoes.aliquotaContabil * 100).toFixed(1)}%`],
        ['Impostos Estimados (mês)', fmt(dre.atual.impostos)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [201, 168, 76] },
    })

    doc.save(`purion-contabilidade-${MES_ATUAL}.pdf`)
  }

  return (
    <div className="page-content section-gap">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Contabilidade Gerencial</h1>
            <p className="caption mt-1">DRE · Fluxo de Caixa · Conciliação · Centro de Custos</p>
          </div>
          <button onClick={exportarPDF} className="btn btn-secondary btn-sm flex items-center gap-2">
            <FileText size={14} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Seção 1: DRE ──────────────────────────────────────────────────── */}
      <section>
        <p className="kpi-label mb-3">DRE Simplificado</p>
        <div className="card-purion overflow-hidden">
          <table className="table-purion w-full">
            <thead>
              <tr>
                <th className="text-left">Linha</th>
                <th className="text-right">Fev/2024</th>
                <th className="text-right">Jan/2024</th>
                <th className="text-right">Var%</th>
              </tr>
            </thead>
            <tbody>
              {linhasDRE.map((linha) => {
                const v = variacao(linha.atual, linha.anterior)
                const isPositive = linha.atual >= 0
                return (
                  <tr key={linha.label} className={linha.negrito ? 'bg-[rgba(201,168,76,0.04)]' : ''}>
                    <td className={linha.negrito ? 'font-semibold text-[var(--text-primary)]' : ''}>{linha.label}</td>
                    <td className={`td-mono text-right ${isPositive ? 'text-[var(--text-primary)]' : 'text-[#EF4444]'} ${linha.negrito ? 'font-semibold' : ''}`}>
                      {fmt(linha.atual)}
                    </td>
                    <td className="td-mono text-right text-[var(--text-secondary)]">{fmt(linha.anterior)}</td>
                    <td className="text-right">
                      {linha.custo ? <VarBadgeCusto v={v} /> : <VarBadge v={v} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Seção 2: Fluxo de Caixa ───────────────────────────────────────── */}
      <section>
        <p className="kpi-label mb-3">Fluxo de Caixa Projetado</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Projeção 30 dias', value: proj30 },
            { label: 'Projeção 60 dias', value: proj60 },
            { label: 'Projeção 90 dias', value: proj90 },
          ].map(({ label, value }) => (
            <div key={label} className="kpi-card">
              <p className="kpi-label">{label}</p>
              <p className={`kpi-value ${value >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
        <div className="card-purion">
          <p className="kpi-label mb-3">Entradas vs Saídas — 8 semanas</p>
          <GraficoFluxoCaixa data={fluxoData} />
        </div>
      </section>

      {/* ── Seção 3: Conciliação ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label">Conciliação Bancária</p>
          {semCategoria.length > 0 && (
            <span className="badge badge-warning">{semCategoria.length} sem categoria</span>
          )}
        </div>

        {semCategoria.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={24} className="mx-auto mb-2 text-[#10B981]" />
            <p className="text-[13px] text-[var(--text-primary)] font-medium">Tudo conciliado</p>
            <p className="caption mt-1">Nenhuma despesa sem categoria</p>
          </div>
        ) : (
          <div className="card-purion overflow-hidden">
            <table className="table-purion w-full">
              <thead>
                <tr>
                  <th className="text-left">Descrição</th>
                  <th className="text-right">Valor</th>
                  <th className="text-left">Data</th>
                  <th className="text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {semCategoria.map((d) => (
                  <tr key={d.id}>
                    <td>{d.descricao}</td>
                    <td className="td-mono text-right text-[#EF4444]">{fmt(d.valor)}</td>
                    <td className="caption">{new Date(d.data).toLocaleDateString('pt-BR')}</td>
                    <td>
                      {categorizando === d.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="select-purion text-[11px] py-1 h-auto"
                            value={novaCategoria}
                            onChange={(e) => setNovaCategoria(e.target.value)}
                          >
                            {CATEGORIAS_DESPESA.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm py-1 text-[11px]"
                            onClick={() => {
                              atualizarDespesa(d.id, { categoria: novaCategoria as any })
                              setCategorizando(null)
                            }}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn btn-secondary btn-sm py-1 text-[11px]"
                            onClick={() => setCategorizando(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => { setCategorizando(d.id); setNovaCategoria('insumos') }}
                        >
                          Categorizar <ChevronRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Seção 4: Centro de Custos ─────────────────────────────────────── */}
      <section>
        <p className="kpi-label mb-3">Centro de Custos — Fev/2024</p>
        {centroCustos.length === 0 ? (
          <div className="empty-state">
            <p className="caption">Nenhuma despesa registrada no período</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
            <div className="card-purion overflow-hidden">
              <table className="table-purion w-full">
                <thead>
                  <tr>
                    <th className="text-left">Centro</th>
                    <th className="text-left">Responsável</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {centroCustos.map((c) => {
                    const resp = c.nome === 'Comercial' ? 'Matheus' : c.nome === 'Digital' ? 'João' : 'Gabriel'
                    const pct = totalCustos > 0 ? (c.total / totalCustos) * 100 : 0
                    return (
                      <tr key={c.nome}>
                        <td className="font-medium">{c.nome}</td>
                        <td className="caption">{resp}</td>
                        <td className="td-mono text-right">{fmt(c.total)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="progress-bar w-16">
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="caption w-8 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-[rgba(201,168,76,0.04)]">
                    <td className="font-semibold" colSpan={2}>Total</td>
                    <td className="td-mono text-right font-semibold">{fmt(totalCustos)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card-purion">
              <p className="kpi-label mb-2">Distribuição</p>
              <GraficoCentroCustos data={centroCustos} />
            </div>
          </div>
        )}
      </section>

      {/* ── Seção 5: Indicadores Fiscais ──────────────────────────────────── */}
      <section>
        <p className="kpi-label mb-3">Indicadores Fiscais</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-card">
            <p className="kpi-label">Regime Tributário</p>
            <p className="kpi-value text-[18px]">
              {configuracoes.regimeTributario === 'simples_nacional' ? 'Simples Nacional' : 'Lucro Presumido'}
            </p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-1">
              <p className="kpi-label">Alíquota Estimada</p>
              {configuracoes.aliquotaContabil > 0.10 && (
                <span title="Alíquota alta" className="text-[#F59E0B]">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
            <p className="kpi-value text-[#C9A84C]">{(configuracoes.aliquotaContabil * 100).toFixed(1)}%</p>
            <p className="caption mt-0.5">Impostos est.: {fmt(dre.atual.impostos)}/mês</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">CNAE</p>
            <p className="kpi-value text-[18px]">{configuracoes.cnae}</p>
            <p className="caption mt-0.5">Perfumaria / Cosméticos</p>
          </div>
        </div>

        {configuracoes.regimeTributario === 'lucro_presumido' && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5">
            <AlertTriangle size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[var(--text-secondary)]">
              Regime Lucro Presumido geralmente implica obrigações acessórias adicionais. Verifique com seu contador.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
