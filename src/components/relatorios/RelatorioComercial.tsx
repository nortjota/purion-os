'use client'

import { useMemo } from 'react'
import { DollarSign, ShoppingBag, Target, Percent, TrendingUp, ShoppingCart, Users } from 'lucide-react'
import { usePurionStore, type PerfilUsuario } from '@/store'
import { WidgetContador, WidgetDonut, WidgetBarras, WidgetLinha, WidgetFunil } from '@/components/dashboard/widgets'
import { inicioPeriodo, type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { estagioNormalizado, ESTAGIOS_ATIVOS, ESTAGIOS_GANHOS, socioInfo } from '@/components/crm/crmHelpers'
import { formatarMoeda } from '@/lib/calculos'

interface Props { periodo: Periodo }

export function RelatorioComercial({ periodo }: Props) {
  const { vendas, leads } = usePurionStore()

  const vendasPeriodo = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return vendas.filter((v) => v.statusPagamento === 'pago' && (v.valorTotal ?? v.valorLiquido) > 0 && new Date(v.dataVenda) >= inicio)
  }, [vendas, periodo])

  const faturamento = useMemo(() => vendasPeriodo.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0), [vendasPeriodo])
  const ticketMedio = vendasPeriodo.length > 0 ? faturamento / vendasPeriodo.length : 0

  const conversaoB2B = useMemo(() => {
    const total = leads.length
    const ganhos = leads.filter((l) => ESTAGIOS_GANHOS.includes(estagioNormalizado(l.status))).length
    return total > 0 ? (ganhos / total) * 100 : 0
  }, [leads])

  const leadsAtivos = useMemo(
    () => leads.filter((l) => ESTAGIOS_ATIVOS.includes(estagioNormalizado(l.status))).length,
    [leads]
  )

  const vendasPorDia = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    const dias = Math.max(1, Math.round((Date.now() - inicio.getTime()) / 86_400_000))
    const pontos: { name: string; valor: number }[] = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const chave = d.toISOString().slice(0, 10)
      const valor = vendasPeriodo.filter((v) => v.dataVenda.slice(0, 10) === chave).reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
      pontos.push({ name: `${chave.slice(8, 10)}/${chave.slice(5, 7)}`, valor })
    }
    return pontos
  }, [vendasPeriodo, periodo])

  const porCanal = useMemo(() => ([
    { name: 'B2C', value: vendasPeriodo.filter((v) => v.canal === 'b2c').reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0), cor: '#C9A84C' },
    { name: 'B2B', value: vendasPeriodo.filter((v) => v.canal === 'b2b').reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0), cor: '#5B8FE8' },
  ]), [vendasPeriodo])

  const porSocio = useMemo(() => {
    const mapa = new Map<PerfilUsuario, number>()
    vendasPeriodo.forEach((v) => {
      const r = v.responsavel ?? 'matheus'
      mapa.set(r, (mapa.get(r) ?? 0) + (v.valorTotal ?? v.valorLiquido))
    })
    return Array.from(mapa.entries()).map(([id, value]) => ({ name: socioInfo(id).nome, value, cor: socioInfo(id).cor }))
  }, [vendasPeriodo])

  const funilEtapas = useMemo(() => {
    const norm = leads.map((l) => estagioNormalizado(l.status))
    return [
      { label: 'Abordagens',    valor: norm.filter((s) => s === 'prospecto' || s === 'abordado').length, cor: '#5B8FE8' },
      { label: 'Reuniões',      valor: norm.filter((s) => s === 'reuniao_agendada').length, cor: '#C9A84C' },
      { label: 'Oportunidades', valor: norm.filter((s) => s === 'oportunidade').length, cor: '#E8A838' },
      { label: 'Ganhos',        valor: norm.filter((s) => ESTAGIOS_GANHOS.includes(s)).length, cor: '#4CAF7A' },
    ]
  }, [leads])

  return (
    <div className="flex flex-col gap-4">
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <WidgetContador label="Faturamento" icon={DollarSign} destaque valor={formatarMoeda(faturamento)} subvalor={`${vendasPeriodo.length} pedidos`} />
        <WidgetContador label="Ticket médio" icon={ShoppingBag} valor={formatarMoeda(ticketMedio)} />
        <WidgetContador label="Conversão B2B" icon={Percent} valor={`${conversaoB2B.toFixed(1)}%`} subvalor="ganhos / total de leads" />
        <WidgetContador label="Leads ativos" icon={Target} valor={String(leadsAtivos)} subvalor="pipeline em andamento" />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <WidgetLinha title="Vendas por dia" icon={TrendingUp} data={vendasPorDia} formatarValor={(v) => formatarMoeda(v)} />
        </div>
        <WidgetDonut title="Vendas por canal" icon={ShoppingCart} data={porCanal} formatarValor={(v) => formatarMoeda(v)} />
        <WidgetBarras title="Vendas por sócio" icon={Users} data={porSocio} formatarValor={(v) => formatarMoeda(v)} />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <WidgetFunil title="Funil B2B — Máquina de Vendas" icon={Target} etapas={funilEtapas} />
      </div>
    </div>
  )
}
