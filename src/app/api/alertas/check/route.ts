import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Called once daily by Vercel cron (0 11 * * * UTC)
export async function GET() {
  const db = supabaseAdmin()
  const alertas: { titulo: string; mensagem: string; canal: string[]; link?: string }[] = []

  try {
    // 1. Check campaigns for low ROAS / high CPA
    const configRes = await db.from('configuracoes').select('roas_minimo, cpa_maximo').limit(1).single()
    const config = configRes.data
    const { data: campanhas } = await db.from('campanhas_ads').select('nome, roas, cpa, status').eq('status', 'ativa')

    if (campanhas && config) {
      for (const c of campanhas) {
        if (config.roas_minimo && c.roas < config.roas_minimo) {
          alertas.push({ titulo: '⚠️ ROAS baixo', mensagem: `Campanha "${c.nome}": ROAS em ${c.roas.toFixed(2)}x — abaixo do mínimo de ${config.roas_minimo}x.`, canal: ['sistema', 'whatsapp'], link: '/trafego' })
        }
        if (config.cpa_maximo && c.cpa > config.cpa_maximo) {
          alertas.push({ titulo: '⚠️ CPA alto', mensagem: `Campanha "${c.nome}": CPA em R$${c.cpa.toFixed(2)} — acima do limite de R$${config.cpa_maximo}.`, canal: ['sistema', 'whatsapp'], link: '/trafego' })
        }
      }
    }

    // 2. Check low stock
    const { data: skus } = await db.from('produtos_sku').select('nome, unidades, threshold').not('threshold', 'is', null)
    if (skus) {
      for (const s of skus) {
        if (s.unidades < s.threshold) {
          alertas.push({ titulo: '📦 Estoque baixo', mensagem: `SKU "${s.nome}": ${s.unidades} unidades — abaixo do mínimo de ${s.threshold}.`, canal: ['sistema'], link: '/producao' })
        }
      }
    }

    // 3. Check overdue expedition orders
    const now = new Date()
    const { data: pedidos } = await db.from('pedidos_expedicao').select('referencia, data_pedido, prazo_horas, status').not('status', 'in', '("enviado","entregue","cancelado")')
    if (pedidos) {
      for (const p of pedidos) {
        const deadline = new Date(new Date(p.data_pedido).getTime() + p.prazo_horas * 3_600_000)
        if (now > deadline) {
          const horas = Math.round((now.getTime() - deadline.getTime()) / 3_600_000)
          alertas.push({ titulo: '🚨 Prazo vencido', mensagem: `Pedido ${p.referencia} com prazo de expedição vencido há ${horas}h.`, canal: ['sistema', 'whatsapp'], link: '/producao' })
        }
      }
    }

    // 4. Leads without contact for >7 days
    const sete = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const { data: leads } = await db.from('leads').select('nome_empresa, ultimo_contato').lt('ultimo_contato', sete).eq('status', 'ativo')
    if (leads) {
      for (const l of leads) {
        const dias = Math.round((now.getTime() - new Date(l.ultimo_contato).getTime()) / 86_400_000)
        alertas.push({ titulo: '💼 Follow-up necessário', mensagem: `Lead ${l.nome_empresa} sem contato há ${dias} dias.`, canal: ['sistema'], link: '/crm' })
      }
    }

    // Send all alerts (deduplicated by inserting directly)
    for (const a of alertas) {
      await fetch(new URL('/api/notificacoes/enviar', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...a, tipo: 'alerta_automatico' }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, alertas: alertas.length })
  } catch (e) {
    console.error('[alertas/check]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
