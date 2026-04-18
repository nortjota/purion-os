import type { TrafegoPeriod, TrafegoApiResponse, TrafegoCampanha, TrafegoDaily } from '@/lib/trafego-types'
import { fetchWithTimeout, TimeoutError } from '@/lib/fetch-with-timeout'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

function getDateRange(period: TrafegoPeriod): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (period === '7d')    start.setDate(end.getDate() - 6)
  else if (period === '14d') start.setDate(end.getDate() - 13)
  else if (period === 'month') start.setDate(1)
  else start.setDate(end.getDate() - 29) // '30d'
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

function fmtDiaMes(dateStr: string): string {
  // TikTok retorna 'YYYY-MM-DD 00:00:00'
  const [, m, d] = (dateStr.slice(0, 10)).split('-')
  return `${d}/${m}`
}

export async function GET(request: Request): Promise<Response> {
  const { success } = await checkRateLimit('ads', getIdentifier(request))
  if (!success) return Response.json({ error: 'Rate limit excedido' }, { status: 429 })

  const token        = process.env.TIKTOK_ACCESS_TOKEN
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID

  if (!token || !advertiserId) {
    return Response.json({ status: 'no_credentials', gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0, campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString() } satisfies TrafegoApiResponse)
  }

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as TrafegoPeriod
  const { start, end } = getDateRange(period)

  const headers = {
    'Access-Token': token,
    'Content-Type': 'application/json',
  }

  try {
    // 1. Totais do anunciante (diário agrupado)
    const totaisBody = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_ADVERTISER',
      dimensions: ['stat_time_day'],
      metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 'conversion', 'cost_per_conversion', 'purchase_roas'],
      start_date: start,
      end_date: end,
      page_size: 60,
    }

    const totaisRes = await fetchWithTimeout(
      'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/',
      { method: 'POST', headers, body: JSON.stringify(totaisBody), cache: 'no-store' }
    )
    const totaisJson = await totaisRes.json()

    if (totaisJson.code !== 0) {
      const isAuth = totaisJson.code === 40001 || totaisJson.code === 40002 || totaisJson.code === 40105
      return Response.json({
        status: isAuth ? 'auth_error' : 'api_error',
        gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0,
        campanhas: [], diario: [],
        ultimaAtualizacao: new Date().toISOString(),
        erro: totaisJson.message,
      } satisfies TrafegoApiResponse)
    }

    const rows: Array<{
      dimensions: { stat_time_day: string }
      metrics: { spend?: string; impressions?: string; clicks?: string; ctr?: string; cpm?: string; cpc?: string; conversion?: string; cost_per_conversion?: string; purchase_roas?: string }
    }> = totaisJson.data?.list ?? []

    let gasto = 0, impressoes = 0, cliques = 0, conversoes = 0, roasSum = 0, roasCount = 0
    const diario: TrafegoDaily[] = []

    for (const row of rows) {
      const m = row.metrics
      const g = parseFloat(m.spend ?? '0')
      gasto      += g
      impressoes += parseInt(m.impressions ?? '0', 10)
      cliques    += parseInt(m.clicks ?? '0', 10)
      conversoes += parseFloat(m.conversion ?? '0')
      if (m.purchase_roas && parseFloat(m.purchase_roas) > 0) {
        roasSum   += parseFloat(m.purchase_roas)
        roasCount += 1
      }
      diario.push({ data: fmtDiaMes(row.dimensions.stat_time_day), gasto: g })
    }

    const ctr  = impressoes > 0 ? (cliques / impressoes) * 100 : 0
    const cpm  = impressoes > 0 ? (gasto / impressoes) * 1000 : 0
    const cpc  = cliques > 0 ? gasto / cliques : 0
    const cpa  = conversoes > 0 ? gasto / conversoes : 0
    const roas = roasCount > 0 ? roasSum / roasCount : 0

    // 2. Campanhas
    const campRes = await fetchWithTimeout(
      `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&page_size=20`,
      { headers, cache: 'no-store' }
    )
    const campJson = await campRes.json()

    // Relatório por campanha para pegar métricas
    const campList: Array<{ campaign_id: string; campaign_name: string; operation_status: string }> =
      campJson.data?.list ?? []

    let campanhas: TrafegoCampanha[] = []
    if (campList.length > 0) {
      const campStatsBody = {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id'],
        metrics: ['spend', 'conversion', 'purchase_roas'],
        start_date: start,
        end_date: end,
        page_size: 20,
      }
      const campStatsRes = await fetch(
        'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/',
        { method: 'POST', headers, body: JSON.stringify(campStatsBody), cache: 'no-store' }
      )
      const campStatsJson = await campStatsRes.json()
      const statsMap: Record<string, { gasto: number; conversoes: number; roas: number }> = {}
      for (const r of (campStatsJson.data?.list ?? []) as Array<{
        dimensions: { campaign_id: string }
        metrics: { spend?: string; conversion?: string; purchase_roas?: string }
      }>) {
        const g = parseFloat(r.metrics.spend ?? '0')
        const cv = parseFloat(r.metrics.conversion ?? '0')
        const ro = parseFloat(r.metrics.purchase_roas ?? '0')
        statsMap[r.dimensions.campaign_id] = { gasto: g, conversoes: cv, roas: ro }
      }

      campanhas = campList.map((c) => {
        const s = statsMap[c.campaign_id] ?? { gasto: 0, conversoes: 0, roas: 0 }
        return {
          id:         c.campaign_id,
          nome:       c.campaign_name,
          status:     c.operation_status === 'ENABLE' ? 'ATIVO' : 'PAUSADO',
          gasto:      s.gasto,
          conversoes: s.conversoes,
          roas:       s.roas,
          cpa:        s.conversoes > 0 ? s.gasto / s.conversoes : 0,
        }
      })
    }

    return Response.json({
      status: 'ok',
      gasto, impressoes, cliques, ctr, cpm, cpc, conversoes, cpa, roas,
      campanhas, diario,
      ultimaAtualizacao: new Date().toISOString(),
    } satisfies TrafegoApiResponse)

  } catch (err) {
    if (err instanceof TimeoutError) {
      return Response.json({ error: 'API TikTok Ads timeout' }, { status: 504 })
    }
    return Response.json({
      status: 'api_error',
      gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0,
      campanhas: [], diario: [],
      ultimaAtualizacao: new Date().toISOString(),
      erro: err instanceof Error ? err.message : 'Erro desconhecido',
    } satisfies TrafegoApiResponse)
  }
}
