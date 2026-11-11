'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { usePurionStore } from '@/store'
import { ESTAGIOS_LOTE, normalizarStatusLote } from './producaoHelpers'
import { useInsumos, useBomReceita, capacidadeProducao, custoReceitaPorUnidade } from '@/hooks/useInsumosBOM'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1B1D1C', border: '1px solid rgba(245,245,240,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

/** Gráficos de produção (saídas por mês e lotes por estágio). Os números ficam na faixa do topo da página. */
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
    <div>
      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p className="kpi-label mb-4">Saídas de estoque por mês</p>
          {metricas.saidasChart.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metricas.saidasChart} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(245,245,240,0.05)' }} />
                <Bar dataKey="Vendas" fill="rgba(156,195,219,0.75)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="UGC" fill="rgba(167,169,166,0.75)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-purion" style={{ padding: '16px 20px' }}>
          <p className="kpi-label mb-3">Lotes por estágio</p>
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
