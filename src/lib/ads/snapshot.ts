/**
 * PURION OS — Snapshot diário de campanhas de ads (Meta + TikTok).
 *
 * SERVER-SIDE APENAS. Chamado pelo cron diário existente
 * (/api/alertas/check) — não cria um cron novo (limite do plano Hobby).
 * Persiste 1 linha por (tenant, plataforma, nome de campanha) em
 * campanhas_ads, atualizada a cada execução.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import type { SupabaseClient } from '@supabase/supabase-js'

const TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function extrairValor(arr: Array<{ action_type: string; value: string }> | undefined): number {
  if (!arr) return 0
  return parseFloat(arr.find((a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')?.value ?? '0')
}

async function buscarCampanhasMeta(): Promise<Array<{ nome: string; status: string; gasto: number; conversoes: number; receita: number }>> {
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID
  if (!token || !accountId) return []

  const res = await fetchWithTimeout(
    `https://graph.facebook.com/v19.0/act_${accountId}/insights?level=campaign&fields=campaign_name,spend,actions,action_values,effective_status&date_preset=this_month&limit=50&access_token=${token}`,
    { cache: 'no-store' },
  )
  const json = await res.json()
  if (json.error || !Array.isArray(json.data)) return []

  return json.data.map((c: { campaign_name: string; effective_status?: string; spend?: string; actions?: Array<{ action_type: string; value: string }>; action_values?: Array<{ action_type: string; value: string }> }) => ({
    nome: c.campaign_name,
    status: c.effective_status === 'ACTIVE' ? 'ativa' : 'pausada',
    gasto: parseFloat(c.spend ?? '0'),
    conversoes: extrairValor(c.actions),
    receita: extrairValor(c.action_values),
  }))
}

async function buscarCampanhasTiktok(): Promise<Array<{ nome: string; status: string; gasto: number; conversoes: number; receita: number }>> {
  const token = process.env.TIKTOK_ACCESS_TOKEN
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID
  if (!token || !advertiserId) return []

  const today = new Date().toISOString().slice(0, 10)
  const inicioMes = `${today.slice(0, 7)}-01`

  try {
    const body = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: ['campaign_id', 'campaign_name'],
      metrics: ['spend', 'conversion'],
      start_date: inicioMes,
      end_date: today,
      page_size: 50,
    }
    const res = await fetchWithTimeout('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      headers: { 'Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const json = await res.json()
    if (json.code !== 0) return []
    const list = json?.data?.list ?? []
    return list.map((c: { dimensions?: { campaign_name?: string }; metrics?: { spend?: string; conversion?: string } }) => ({
      nome: c.dimensions?.campaign_name ?? 'Campanha TikTok',
      status: 'ativa',
      gasto: parseFloat(c.metrics?.spend ?? '0'),
      conversoes: parseFloat(c.metrics?.conversion ?? '0'),
      receita: 0,
    }))
  } catch {
    return []
  }
}

/**
 * Busca campanhas Meta + TikTok e grava/atualiza snapshot em campanhas_ads.
 * Best-effort: nunca lança — se uma plataforma falhar, a outra ainda é gravada.
 */
export async function gravarSnapshotAds(db: SupabaseClient): Promise<{ gravadas: number }> {
  let gravadas = 0

  for (const [plataforma, buscar] of [
    ['meta', buscarCampanhasMeta],
    ['tiktok', buscarCampanhasTiktok],
  ] as const) {
    try {
      const campanhas = await buscar()
      for (const c of campanhas) {
        const roas = c.gasto > 0 ? c.receita / c.gasto : 0
        const cpa = c.conversoes > 0 ? c.gasto / c.conversoes : 0
        const { error } = await db.from('campanhas_ads').upsert({
          tenant_id: TENANT_ID,
          plataforma,
          nome: c.nome,
          status: c.status,
          gasto_total: c.gasto,
          conversoes: Math.round(c.conversoes),
          receita_gerada: c.receita,
          roas,
          cpa,
          periodo_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,plataforma,nome' })
        if (!error) gravadas++
        else console.error(`[snapshot-ads] erro ao gravar ${plataforma}/${c.nome}:`, error.message)
      }
    } catch (err) {
      console.error(`[snapshot-ads] erro ao buscar ${plataforma}:`, err instanceof Error ? err.message : err)
    }
  }

  return { gravadas }
}
