import type { TrafegoPeriod, TrafegoApiResponse, TrafegoCampanha, TrafegoDaily } from '@/lib/trafego-types'

// Meta date_preset mapeado por período
const META_PRESET: Record<TrafegoPeriod, string> = {
  '7d':    'last_7d',
  '14d':   'last_14d',
  '30d':   'last_30d',
  'month': 'this_month',
}

function fmtDiaMes(dateStr: string): string {
  // Meta retorna 'YYYY-MM-DD'
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function extrairConversoes(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0
  return parseFloat(
    actions.find((a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')?.value ?? '0'
  )
}

function extrairReceita(actionValues: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actionValues) return 0
  return parseFloat(
    actionValues.find((a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')?.value ?? '0'
  )
}

export async function GET(request: Request): Promise<Response> {
  const token     = process.env.NEXT_PUBLIC_META_ACCESS_TOKEN
  const accountId = process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID

  if (!token || !accountId) {
    return Response.json({ status: 'no_credentials', gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0, campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString() } satisfies TrafegoApiResponse)
  }

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as TrafegoPeriod
  const preset = META_PRESET[period] ?? 'last_30d'
  const base    = `https://graph.facebook.com/v19.0/act_${accountId}`

  try {
    // 1. Totais da conta
    const totaisRes = await fetch(
      `${base}/insights?fields=spend,impressions,clicks,ctr,cpm,cpc,actions,action_values&date_preset=${preset}&access_token=${token}`,
      { cache: 'no-store' }
    )
    const totaisJson = await totaisRes.json()

    if (totaisJson.error) {
      const code = totaisJson.error.code as number
      if (code === 190 || code === 102 || code === 104 || code === 2500) {
        return Response.json({ status: 'auth_error', gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0, campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString(), erro: totaisJson.error.message } satisfies TrafegoApiResponse)
      }
      return Response.json({ status: 'api_error', gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0, campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString(), erro: totaisJson.error.message } satisfies TrafegoApiResponse)
    }

    const t = totaisJson.data?.[0] ?? {}
    const gasto     = parseFloat(t.spend ?? '0')
    const impressoes = parseInt(t.impressions ?? '0', 10)
    const cliques   = parseInt(t.clicks ?? '0', 10)
    const ctr       = parseFloat(t.ctr ?? '0')
    const cpm       = parseFloat(t.cpm ?? '0')
    const cpc       = parseFloat(t.cpc ?? '0')
    const conversoes = extrairConversoes(t.actions)
    const receita   = extrairReceita(t.action_values)
    const cpa       = conversoes > 0 ? gasto / conversoes : 0
    const roas      = gasto > 0 ? receita / gasto : 0

    // 2. Por campanha
    const campRes = await fetch(
      `${base}/insights?level=campaign&fields=campaign_id,campaign_name,spend,actions,action_values,effective_status&date_preset=${preset}&limit=20&access_token=${token}`,
      { cache: 'no-store' }
    )
    const campJson = await campRes.json()
    const campanhas: TrafegoCampanha[] = (campJson.data ?? []).map((c: {
      campaign_id: string
      campaign_name: string
      effective_status?: string
      spend?: string
      actions?: Array<{ action_type: string; value: string }>
      action_values?: Array<{ action_type: string; value: string }>
    }) => {
      const g  = parseFloat(c.spend ?? '0')
      const cv = extrairConversoes(c.actions)
      const rv = extrairReceita(c.action_values)
      return {
        id:         c.campaign_id,
        nome:       c.campaign_name,
        status:     c.effective_status ?? 'UNKNOWN',
        gasto:      g,
        conversoes: cv,
        roas:       g > 0 ? rv / g : 0,
        cpa:        cv > 0 ? g / cv : 0,
      }
    })

    // 3. Gasto diário
    const diarRes = await fetch(
      `${base}/insights?fields=spend&time_increment=1&date_preset=${preset}&access_token=${token}`,
      { cache: 'no-store' }
    )
    const diarJson = await diarRes.json()
    const diario: TrafegoDaily[] = (diarJson.data ?? []).map((d: { spend?: string; date_start: string }) => ({
      data:  fmtDiaMes(d.date_start),
      gasto: parseFloat(d.spend ?? '0'),
    }))

    return Response.json({
      status: 'ok',
      gasto, impressoes, cliques, ctr, cpm, cpc, conversoes, cpa, roas,
      campanhas, diario,
      ultimaAtualizacao: new Date().toISOString(),
    } satisfies TrafegoApiResponse)

  } catch (err) {
    return Response.json({
      status: 'api_error',
      gasto: 0, impressoes: 0, cliques: 0, ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0,
      campanhas: [], diario: [],
      ultimaAtualizacao: new Date().toISOString(),
      erro: err instanceof Error ? err.message : 'Erro desconhecido',
    } satisfies TrafegoApiResponse)
  }
}
