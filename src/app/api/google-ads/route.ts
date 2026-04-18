import { GoogleAdsApi } from 'google-ads-api'
import type { TrafegoPeriod, TrafegoApiResponse, TrafegoCampanha, TrafegoDaily } from '@/lib/trafego-types'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

const GOOGLE_DATE_CONST: Record<TrafegoPeriod, string> = {
  '7d':    'LAST_7_DAYS',
  '14d':   'LAST_14_DAYS',
  '30d':   'LAST_30_DAYS',
  'month': 'THIS_MONTH',
}

function microsToReais(micros: number | string | null | undefined): number {
  return Number(micros ?? 0) / 1_000_000
}

function fmtDiaMes(dateStr: string): string {
  // Google retorna 'YYYY-MM-DD'
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

export async function GET(request: Request): Promise<Response> {
  const { success } = await checkRateLimit('gads', getIdentifier(request))
  if (!success) return Response.json({ error: 'Rate limit excedido' }, { status: 429 })

  const clientId      = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret  = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken  = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const devToken      = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const customerId    = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!clientId || !clientSecret || !refreshToken || !devToken || !customerId) {
    return Response.json({ status: 'no_credentials', gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0, campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString() } satisfies TrafegoApiResponse)
  }

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as TrafegoPeriod
  const dateDuring = GOOGLE_DATE_CONST[period] ?? 'LAST_30_DAYS'

  try {
    const client = new GoogleAdsApi({ client_id: clientId, client_secret: clientSecret, developer_token: devToken })
    const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken })

    // 1. Totais da conta (sem segmento de data para uma linha de resumo)
    type TotaisRow = {
      metrics: {
        cost_micros?: string | number | null
        impressions?: string | number | null
        clicks?: string | number | null
        conversions?: string | number | null
        all_conversions_value?: string | number | null
      }
    }
    const totaisRows = await customer.report<TotaisRow[]>({
      entity: 'customer',
      metrics: ['metrics.cost_micros', 'metrics.impressions', 'metrics.clicks', 'metrics.conversions', 'metrics.all_conversions_value'],
      date_constant: dateDuring as Parameters<typeof customer.report>[0]['date_constant'],
    })

    let gasto = 0, impressoes = 0, cliques = 0, conversoes = 0, receita = 0
    for (const row of totaisRows) {
      gasto      += microsToReais(row.metrics.cost_micros)
      impressoes += Number(row.metrics.impressions ?? 0)
      cliques    += Number(row.metrics.clicks ?? 0)
      conversoes += Number(row.metrics.conversions ?? 0)
      receita    += Number(row.metrics.all_conversions_value ?? 0)
    }

    const ctr  = impressoes > 0 ? (cliques / impressoes) * 100 : 0
    const cpm  = impressoes > 0 ? (gasto / impressoes) * 1000 : 0
    const cpc  = cliques > 0 ? gasto / cliques : 0
    const cpa  = conversoes > 0 ? gasto / conversoes : 0
    const roas = gasto > 0 ? receita / gasto : 0

    // 2. Por campanha
    type CampRow = {
      campaign: { id?: string | number | null; name?: string | null; status?: number | null }
      metrics: {
        cost_micros?: string | number | null
        conversions?: string | number | null
        all_conversions_value?: string | number | null
      }
    }
    const campRows = await customer.report<CampRow[]>({
      entity: 'campaign',
      attributes: ['campaign.id', 'campaign.name', 'campaign.status'],
      metrics: ['metrics.cost_micros', 'metrics.conversions', 'metrics.all_conversions_value'],
      date_constant: dateDuring as Parameters<typeof customer.report>[0]['date_constant'],
      limit: 20,
    })

    const campanhas: TrafegoCampanha[] = campRows.map((r) => {
      const g  = microsToReais(r.metrics.cost_micros)
      const cv = Number(r.metrics.conversions ?? 0)
      const rv = Number(r.metrics.all_conversions_value ?? 0)
      // status enum: 2=ENABLED, 3=PAUSED, 4=REMOVED
      const statusMap: Record<number, string> = { 2: 'ATIVO', 3: 'PAUSADO', 4: 'REMOVIDO' }
      return {
        id:         String(r.campaign.id ?? ''),
        nome:       r.campaign.name ?? 'Campanha',
        status:     statusMap[Number(r.campaign.status ?? 0)] ?? 'DESCONHECIDO',
        gasto:      g,
        conversoes: cv,
        roas:       g > 0 ? rv / g : 0,
        cpa:        cv > 0 ? g / cv : 0,
      }
    })

    // 3. Gasto diário
    type DiarRow = {
      metrics: { cost_micros?: string | number | null }
      segments: { date?: string | null }
    }
    const diarRows = await customer.report<DiarRow[]>({
      entity: 'campaign',
      metrics: ['metrics.cost_micros'],
      segments: ['segments.date'],
      date_constant: dateDuring as Parameters<typeof customer.report>[0]['date_constant'],
    })

    // Agrupar por data
    const diarMap: Record<string, number> = {}
    for (const r of diarRows) {
      const d = r.segments.date ?? ''
      diarMap[d] = (diarMap[d] ?? 0) + microsToReais(r.metrics.cost_micros)
    }
    const diario: TrafegoDaily[] = Object.entries(diarMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, g]) => ({ data: fmtDiaMes(d), gasto: g }))

    return Response.json({
      status: 'ok',
      gasto, impressoes, cliques, ctr, cpm, cpc, conversoes, cpa, roas,
      campanhas, diario,
      ultimaAtualizacao: new Date().toISOString(),
    } satisfies TrafegoApiResponse)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const isAuth = msg.includes('UNAUTHENTICATED') || msg.includes('invalid_grant') || msg.includes('401')
    return Response.json({
      status: isAuth ? 'auth_error' : 'api_error',
      gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0,
      campanhas: [], diario: [],
      ultimaAtualizacao: new Date().toISOString(),
      erro: msg,
    } satisfies TrafegoApiResponse)
  }
}
