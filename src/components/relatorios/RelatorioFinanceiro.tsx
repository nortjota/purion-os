'use client'

import { useMemo } from 'react'
import { DollarSign, TrendingDown, Percent, Wallet, PieChart as PieIcon, BarChart3 } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { CategoriaReceita, CategoriaDespesa } from '@/store'
import { WidgetContador, WidgetDonut, WidgetBarras } from '@/components/dashboard/widgets'
import { inicioPeriodo, type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { formatarMoeda } from '@/lib/calculos'

interface Props { periodo: Periodo }

const CATEGORIA_RECEITA_LABEL: Record<CategoriaReceita, string> = {
  venda_b2b: 'Venda B2B', venda_b2c: 'Venda B2C', nuvemshop: 'Site próprio', marketplace: 'Marketplace', outro: 'Outro',
}

const CATEGORIA_DESPESA_LABEL: Record<CategoriaDespesa, string> = {
  insumos: 'Insumos', embalagens: 'Embalagens', ads_meta: 'Ads Meta', ads_google: 'Ads Google',
  logistica: 'Logística', taxas_impostos: 'Taxas & Impostos', pessoal: 'Pessoal', overhead: 'Overhead',
  ugc_creators: 'UGC / Creators', outro: 'Outro',
}

export function RelatorioFinanceiro({ periodo }: Props) {
  const { receitas, despesas } = usePurionStore()

  const receitasPeriodo = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return receitas.filter((r) => new Date(r.data) >= inicio)
  }, [receitas, periodo])

  const despesasPeriodo = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return despesas.filter((d) => new Date(d.data) >= inicio)
  }, [despesas, periodo])

  const totalReceita = useMemo(() => receitasPeriodo.reduce((s, r) => s + r.valor, 0), [receitasPeriodo])
  const totalDespesa = useMemo(() => despesasPeriodo.reduce((s, d) => s + d.valor, 0), [despesasPeriodo])
  const resultado = totalReceita - totalDespesa
  const margem = totalReceita > 0 ? (resultado / totalReceita) * 100 : 0

  const porCategoriaReceita = useMemo(() => {
    const mapa = new Map<CategoriaReceita, number>()
    receitasPeriodo.forEach((r) => mapa.set(r.categoria, (mapa.get(r.categoria) ?? 0) + r.valor))
    return Array.from(mapa.entries()).map(([cat, value]) => ({ name: CATEGORIA_RECEITA_LABEL[cat], value }))
  }, [receitasPeriodo])

  const porCategoriaDespesa = useMemo(() => {
    const mapa = new Map<CategoriaDespesa, number>()
    despesasPeriodo.forEach((d) => mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor))
    return Array.from(mapa.entries()).map(([cat, value]) => ({ name: CATEGORIA_DESPESA_LABEL[cat], value }))
  }, [despesasPeriodo])

  const porMes = useMemo(() => {
    const mapa = new Map<string, { receita: number; despesa: number }>()
    const chave = (iso: string) => iso.slice(0, 7)
    receitas.forEach((r) => {
      const k = chave(r.data)
      const atual = mapa.get(k) ?? { receita: 0, despesa: 0 }
      atual.receita += r.valor
      mapa.set(k, atual)
    })
    despesas.forEach((d) => {
      const k = chave(d.data)
      const atual = mapa.get(k) ?? { receita: 0, despesa: 0 }
      atual.despesa += d.valor
      mapa.set(k, atual)
    })
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([mes, v]) => ({ name: mes.slice(5, 7) + '/' + mes.slice(2, 4), Receita: Math.round(v.receita), Despesa: Math.round(v.despesa) }))
  }, [receitas, despesas])

  return (
    <div className="flex flex-col gap-4">
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <WidgetContador label="Receita" icon={DollarSign} destaque valor={formatarMoeda(totalReceita)} />
        <WidgetContador label="Despesa" icon={TrendingDown} valor={formatarMoeda(totalDespesa)} />
        <WidgetContador label="Margem" icon={Percent} valor={`${margem.toFixed(1)}%`} alerta={margem < 0} />
        <WidgetContador label="Resultado" icon={Wallet} valor={formatarMoeda(resultado)} alerta={resultado < 0} />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <WidgetBarras
            title="Receita vs. Despesa por mês" icon={BarChart3} data={porMes}
            series={[{ key: 'Receita', label: 'Receita', cor: '#4CAF7A' }, { key: 'Despesa', label: 'Despesa', cor: '#E85238' }]}
            formatarValor={(v) => formatarMoeda(v)}
          />
        </div>
        <div className="card-purion" style={{ padding: '16px 18px' }}>
          <span className="kpi-label">DRE resumido</span>
          <div className="flex flex-col gap-2 mt-3">
            {[
              { label: 'Receita bruta', valor: totalReceita, cor: '#4CAF7A' },
              { label: '(–) Despesas', valor: -totalDespesa, cor: '#E85238' },
              { label: '(=) Resultado', valor: resultado, cor: resultado >= 0 ? '#C9A84C' : '#E85238' },
            ].map((linha) => (
              <div key={linha.label} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{linha.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: linha.cor }}>{formatarMoeda(linha.valor)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Margem de contribuição</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>{margem.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <WidgetDonut title="Receita por categoria" icon={PieIcon} data={porCategoriaReceita} formatarValor={(v) => formatarMoeda(v)} />
        <WidgetDonut title="Despesa por categoria" icon={PieIcon} data={porCategoriaDespesa} formatarValor={(v) => formatarMoeda(v)} />
      </div>
    </div>
  )
}
