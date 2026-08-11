import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { gravarSnapshotAds } from '@/lib/ads/snapshot'

type Alerta = { titulo: string; mensagem: string; canal: string[]; link?: string; papel?: 'matheus' | 'joao' | 'gabriel' }

const RESPONSAVEL_PARA_PAPEL: Record<string, 'matheus' | 'joao' | 'gabriel'> = {
  matheus: 'matheus', joao: 'joao', gabriel: 'gabriel',
}

// Called once daily by Vercel cron (0 11 * * * UTC)
export async function GET() {
  const db = supabaseAdmin()
  const alertas: Alerta[] = []
  const now = new Date()

  try {
    // 0. Snapshot diário de campanhas (Meta + TikTok) — usa a janela do cron existente
    const { gravadas } = await gravarSnapshotAds(db)

    // 1. ROAS baixo / CPA alto — config dinâmica (configuracoes é tabela chave/valor)
    const { data: configRows } = await db.from('configuracoes').select('chave, valor').in('chave', ['roasMinimo', 'cpaMaximo'])
    const roasMinimo = Number(configRows?.find((r) => r.chave === 'roasMinimo')?.valor ?? 2.5)
    const cpaMaximo  = Number(configRows?.find((r) => r.chave === 'cpaMaximo')?.valor ?? 45)

    const { data: campanhas } = await db.from('campanhas_ads').select('nome, roas, cpa, status, gasto_total').eq('status', 'ativa')
    if (campanhas) {
      for (const c of campanhas) {
        if (c.roas > 0 && c.roas < roasMinimo) {
          alertas.push({ titulo: '⚠️ ROAS baixo', mensagem: `Campanha "${c.nome}": ROAS em ${c.roas.toFixed(2)}x — abaixo do mínimo de ${roasMinimo}x.`, canal: ['sistema', 'whatsapp'], link: '/trafego', papel: 'joao' })
        }
        if (c.cpa > cpaMaximo) {
          alertas.push({ titulo: '⚠️ CPA alto', mensagem: `Campanha "${c.nome}": CPA em R$${c.cpa.toFixed(2)} — acima do limite de R$${cpaMaximo}.`, canal: ['sistema', 'whatsapp'], link: '/trafego', papel: 'joao' })
        }
      }
    }

    // 2. Estoque baixo (produto pronto — PURION GT 60ml)
    const { data: estoqueProduto } = await db.from('estoque_produto').select('id, produto, quantidade_atual, quantidade_minima').order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (estoqueProduto && estoqueProduto.quantidade_atual < estoqueProduto.quantidade_minima) {
      alertas.push({
        titulo: '📦 Estoque baixo',
        mensagem: `${estoqueProduto.produto}: ${estoqueProduto.quantidade_atual} frascos — abaixo do mínimo de ${estoqueProduto.quantidade_minima}.`,
        canal: ['sistema', 'whatsapp'], link: '/producao', papel: 'gabriel',
      })

      // Cria tarefa "produzir mais" — idempotente: só cria se não houver uma já aberta
      const { data: tarefaAberta } = await db.from('tarefas').select('id')
        .eq('modulo', 'producao').contains('tags', ['reposicao-estoque'])
        .not('status', 'in', '("concluida","cancelada")')
        .is('deleted_at', null)
        .maybeSingle()
      if (!tarefaAberta) {
        const { error: tarefaErr } = await db.from('tarefas').insert({
          titulo: '🏭 Produzir mais — estoque de prontos abaixo do mínimo',
          descricao: `Estoque atual: ${estoqueProduto.quantidade_atual} frascos (mínimo: ${estoqueProduto.quantidade_minima}). Planeje um novo lote de produção.`,
          status: 'aberta', prioridade: 'alta', responsavel: 'gabriel', modulo: 'producao',
          tags: ['reposicao-estoque'],
        })
        if (tarefaErr) console.error('[alertas/check] erro ao criar tarefa produzir mais', tarefaErr)
      }
    }

    // Legado: SKUs antigos (produtos_sku), mantido por compatibilidade
    const { data: skus } = await db.from('produtos_sku').select('nome, unidades, threshold').not('threshold', 'is', null)
    if (skus) {
      for (const s of skus) {
        if (s.unidades < s.threshold) {
          alertas.push({ titulo: '📦 Estoque baixo', mensagem: `SKU "${s.nome}": ${s.unidades} unidades — abaixo do mínimo de ${s.threshold}.`, canal: ['sistema'], link: '/producao', papel: 'gabriel' })
        }
      }
    }

    // 3. Prazos de expedição vencidos
    const { data: pedidos } = await db.from('pedidos_expedicao').select('referencia, data_pedido, prazo_horas, status').not('status', 'in', '("enviado","entregue","cancelado")')
    if (pedidos) {
      for (const p of pedidos) {
        const deadline = new Date(new Date(p.data_pedido).getTime() + p.prazo_horas * 3_600_000)
        if (now > deadline) {
          const horas = Math.round((now.getTime() - deadline.getTime()) / 3_600_000)
          alertas.push({ titulo: '🚨 Prazo vencido', mensagem: `Pedido ${p.referencia} com prazo de expedição vencido há ${horas}h.`, canal: ['sistema', 'whatsapp'], link: '/producao', papel: 'gabriel' })
        }
      }
    }

    // 4. Leads B2B sem contato há >7 dias
    const sete = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const { data: leads } = await db.from('leads_crm').select('nome_empresa, ultimo_contato').lt('ultimo_contato', sete).eq('status', 'ativo')
    if (leads) {
      for (const l of leads) {
        const dias = Math.round((now.getTime() - new Date(l.ultimo_contato).getTime()) / 86_400_000)
        alertas.push({ titulo: '💼 Follow-up necessário', mensagem: `Lead ${l.nome_empresa} sem contato há ${dias} dias.`, canal: ['sistema'], link: '/crm', papel: 'matheus' })
      }
    }

    // 5. Tarefas atrasadas
    const { data: tarefasAtrasadas } = await db
      .from('tarefas')
      .select('titulo, responsavel, due_date')
      .is('deleted_at', null)
      .lt('due_date', now.toISOString())
      .not('status', 'in', '("concluida","cancelada")')
    if (tarefasAtrasadas) {
      for (const t of tarefasAtrasadas) {
        const dias = Math.round((now.getTime() - new Date(t.due_date).getTime()) / 86_400_000)
        alertas.push({
          titulo: '⏰ Tarefa atrasada',
          mensagem: `"${t.titulo}" está atrasada há ${dias} dia(s).`,
          canal: ['sistema'], link: '/tarefas',
          papel: RESPONSAVEL_PARA_PAPEL[t.responsavel],
        })
      }
    }

    // Send all alerts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    for (const a of alertas) {
      await fetch(new URL('/api/notificacoes/enviar', appUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...a, tipo: 'alerta_automatico' }),
      }).catch(() => {})
    }

    // 6. Resumo diário (Fase 4) — consolida vendas, ads, leads, tarefas atrasadas
    const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const [{ data: vendasHoje }, { data: leadsNovosHoje }] = await Promise.all([
      db.from('vendas').select('valor_liquido, status').is('deleted_at', null).gte('data_venda', inicioHoje),
      db.from('leads_crm').select('id').is('deleted_at', null).gte('created_at', inicioHoje),
    ])
    const vendasAprovadas = (vendasHoje ?? []).filter((v) => v.status === 'aprovado')
    const faturamentoHoje = vendasAprovadas.reduce((s, v) => s + Number(v.valor_liquido ?? 0), 0)
    const gastoAdsHoje = (campanhas ?? []).reduce((s, c) => s + Number((c as { gasto_total?: number }).gasto_total ?? 0), 0)

    await fetch(new URL('/api/notificacoes/enviar', appUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'resumo_diario',
        titulo: '📊 Resumo de hoje',
        mensagem: `${vendasAprovadas.length} venda(s) aprovada(s) (R$${faturamentoHoje.toFixed(2)}) · R$${gastoAdsHoje.toFixed(2)} em ads · ${leadsNovosHoje?.length ?? 0} novo(s) lead(s) · ${tarefasAtrasadas?.length ?? 0} tarefa(s) atrasada(s).`,
        canal: ['sistema'],
        link: '/',
      }),
    }).catch(() => {})

    return NextResponse.json({ ok: true, alertas: alertas.length, snapshotsAds: gravadas })
  } catch (e) {
    console.error('[alertas/check]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
