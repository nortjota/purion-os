'use client'

import { useMemo } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, Users2, Eye, Megaphone } from 'lucide-react'
import { usePurionStore } from '@/store'
import { WidgetContador, WidgetBarras, WidgetLista, type ItemLista } from '@/components/dashboard/widgets'
import { inicioPeriodo, type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { formatarMoeda } from '@/lib/calculos'

interface Props { periodo: Periodo }

const PLATAFORMA_LABEL: Record<string, string> = { meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok Ads' }
const PLATAFORMA_COR: Record<string, string> = { meta: '#1877F2', google: '#34A853', tiktok: '#EE1D52' }

export function RelatorioMarketing({ periodo }: Props) {
  const { campanhasAds, creators } = usePurionStore()

  const gastoTotal = useMemo(() => campanhasAds.reduce((s, c) => s + c.gastoTotal, 0), [campanhasAds])
  const receitaGerada = useMemo(() => campanhasAds.reduce((s, c) => s + c.receitaGerada, 0), [campanhasAds])
  const conversoesTotal = useMemo(() => campanhasAds.reduce((s, c) => s + c.conversoes, 0), [campanhasAds])
  const roas = gastoTotal > 0 ? receitaGerada / gastoTotal : 0
  const cpa = conversoesTotal > 0 ? gastoTotal / conversoesTotal : 0

  const creatorsAtivos = useMemo(
    () => creators.filter((c) => ['kit_enviado', 'postado', 'pago', 'parceiro_recorrente'].includes(c.status)).length,
    [creators]
  )

  const alcanceOrganico = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    let total = 0
    creators.forEach((c) => c.postagens.forEach((p) => { if (new Date(p.data) >= inicio) total += p.alcance }))
    return total
  }, [creators, periodo])

  const gastoPorPlataforma = useMemo(() => {
    const mapa = new Map<string, number>()
    campanhasAds.forEach((c) => mapa.set(c.plataforma, (mapa.get(c.plataforma) ?? 0) + c.gastoTotal))
    return Array.from(mapa.entries()).map(([p, value]) => ({ name: PLATAFORMA_LABEL[p] ?? p, value, cor: PLATAFORMA_COR[p] }))
  }, [campanhasAds])

  const topCreators: ItemLista[] = useMemo(() => {
    return [...creators]
      .sort((a, b) => b.seguidores - a.seguidores)
      .slice(0, 6)
      .map((c) => ({
        id: c.id, titulo: c.nome, subtitulo: `${c.nichoPrincipal || 'Sem nicho'} · ${c.postagens.length} post(s)`,
        valor: c.seguidores >= 1000 ? `${(c.seguidores / 1000).toFixed(1)}k` : String(c.seguidores),
        cor: '#C9A84C',
      }))
  }, [creators])

  return (
    <div className="flex flex-col gap-4">
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <WidgetContador label="Gasto em Ads" icon={DollarSign} destaque valor={formatarMoeda(gastoTotal)} />
        <WidgetContador label="ROAS" icon={TrendingUp} valor={roas > 0 ? `${roas.toFixed(2)}x` : '—'} alerta={roas > 0 && roas < 2.5} />
        <WidgetContador label="CPA médio" icon={ShoppingCart} valor={cpa > 0 ? formatarMoeda(cpa) : '—'} alerta={cpa > 43.76} />
        <WidgetContador label="Creators ativos" icon={Users2} valor={String(creatorsAtivos)} subvalor={`${creators.length} cadastrados`} />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <WidgetBarras title="Gasto por plataforma" icon={Megaphone} data={gastoPorPlataforma} formatarValor={(v) => formatarMoeda(v)} />
        <WidgetContador label="Alcance orgânico" icon={Eye} valor={alcanceOrganico >= 1000 ? `${(alcanceOrganico / 1000).toFixed(1)}k` : String(alcanceOrganico)} subvalor="soma de alcance das postagens de creators" />
        <WidgetLista title="Top creators" icon={Users2} items={topCreators} href="/creators" emptyMessage="Nenhum creator cadastrado" limite={6} />
      </div>
    </div>
  )
}
