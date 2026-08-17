'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Package, Factory, TrendingDown, AlertTriangle, Boxes } from 'lucide-react'
import { usePurionStore } from '@/store'
import { ESTAGIOS_LOTE, normalizarStatusLote, formatarMoeda } from './producaoHelpers'
import { useInsumos, useBomReceita, capacidadeProducao, custoReceitaPorUnidade } from '@/hooks/useInsumosBOM'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

function KpiCard({ label, value, cor, sub, icon: Icon }: {
  label: string; value: string | number; cor?: string; sub?: string; icon: React.ElementType
}) {
  return (
    <div className="kpi-card" style={{ borderColor: cor ? `${cor}30` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="kpi-label">{label}</span>
        <Icon size={14} style={{ color: cor ?? 'var(--text-secondary)', opacity: 0.7 }} />
      </div>
      <span className="kpi-value" style={{ color: cor }}>{value}</span>
      {sub && <p className="caption mt-1">{sub}</p>}
    </div>
  )
}

export function ProducaoPainelView() {
  const { estoqueProduto, estoqueMovimentacoes, lotes } = usePurionStore()
  const { insumos, emAlerta, valorTotalInsumos } = useInsumos()
  const { itens: receita } = useBomReceita()

  const metricas = useMemo(() => {
    const frascosProntos = estoqueProduto?.quantidadeAtual ?? 0
    const frascosProduzidos = lotes.reduce((s, l) => s + l.quantidadeProduzida, 0)
    const frascosVendidos = estoqueMovimentacoes.filter((m) => m.tipo === 'saida_venda').reduce((s, m) => s + m.quantidade, 0)
    const frascosDoados = estoqueMovimentacoes.filter((m) => m.tipo === 'saida_ugc').reduce((s, m) => s + m.quantidade, 0)
    const lotesAtivos = lotes.filter((l) => !['concluido', 'reprovado'].includes(normalizarStatusLote(l.status))).length
    const { capacidade } = capacidadeProducao(receita, insumos)
    const custoReceita = custoReceitaPorUnidade(receita, insumos)
    const valorEstoquePronto = frascosProntos * (estoqueProduto?.custoUnitario ?? 0)
    const valorTotalEstoque = valorEstoquePronto + valorTotalInsumos

    const porEstagioLote = ESTAGIOS_LOTE.map((e) => ({
      name: e.label, value: lotes.filter((l) => normalizarStatusLote(l.status) === e.id).length, cor: e.cor,
    })).filter((d) => d.value > 0)

    const saidasPorMes = new Map<string, { vendas: number; ugc: number }>()
    estoqueMovimentacoes
      .filter((m) => m.tipo === 'saida_venda' || m.tipo === 'saida_ugc')
      .forEach((m) => {
        const mes = m.createdAt.slice(0, 7)
        const atual = saidasPorMes.get(mes) ?? { vendas: 0, ugc: 0 }
        if (m.tipo === 'saida_venda') atual.vendas += m.quantidade; else atual.ugc += m.quantidade
        saidasPorMes.set(mes, atual)
      })
    const saidasChart = Array.from(saidasPorMes.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([mes, v]) => ({ name: mes, Vendas: v.vendas, UGC: v.ugc }))

    return {
      frascosProntos, frascosProduzidos, frascosVendidos, frascosDoados, lotesAtivos,
      insumosAlerta: emAlerta.length, capacidade, custoReceita, valorEstoquePronto, valorTotalEstoque,
      porEstagioLote, saidasChart,
    }
  }, [estoqueProduto, estoqueMovimentacoes, lotes, insumos, receita, emAlerta, valorTotalInsumos])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiCard label="Valor total em estoque" value={formatarMoeda(metricas.valorTotalEstoque)} icon={Package} cor="#C9A84C" sub="insumos + prontos" />
        <KpiCard label="Frascos prontos"        value={metricas.frascosProntos}    icon={Package} cor="#4CAF7A" sub={formatarMoeda(metricas.valorEstoquePronto) + ' em estoque'} />
        <KpiCard label="Capacidade restante"    value={`${metricas.capacidade} frascos`} icon={Package} cor="#C9A84C" sub="com os insumos atuais" />
        <KpiCard label="Custo real / frasco"    value={formatarMoeda(metricas.custoReceita)} icon={Factory} sub="calculado da receita (BOM)" />
        <KpiCard label="Lotes ativos"           value={metricas.lotesAtivos}       icon={Boxes} cor="#E8A838" />
        <KpiCard label="Insumos em alerta"      value={metricas.insumosAlerta}     icon={AlertTriangle} cor={metricas.insumosAlerta > 0 ? '#E85238' : undefined} />
        <KpiCard label="Vendidos + doados"      value={metricas.frascosVendidos + metricas.frascosDoados} icon={TrendingDown} cor="#5B8FE8" sub={`${metricas.frascosVendidos} vendidos · ${metricas.frascosDoados} UGC`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Saídas de estoque por mês</p>
          {metricas.saidasChart.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas.saidasChart} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                <Bar dataKey="Vendas" fill="rgba(91,143,232,0.75)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="UGC" fill="rgba(168,85,247,0.75)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Lotes por estágio</p>
          {metricas.porEstagioLote.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={metricas.porEstagioLote} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {metricas.porEstagioLote.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {metricas.porEstagioLote.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
