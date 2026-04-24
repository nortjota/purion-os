import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params
  const db = supabaseAdmin()

  // Buscar afiliado pelo código
  const { data: afiliado } = await db
    .from('afiliados')
    .select('id, nome, codigo, link_afiliado, valor_comissao, tipo_comissao, status, nicho, seguidores_total')
    .eq('codigo', codigo.toUpperCase())
    .is('deleted_at', null)
    .single()

  if (!afiliado) {
    return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 })
  }

  // Contagem de cliques
  const { count: totalCliques } = await db
    .from('afiliado_cliques')
    .select('id', { count: 'exact', head: true })
    .eq('afiliado_id', afiliado.id)

  // Cliques que converteram em venda
  const { count: cliquesConvertidos } = await db
    .from('afiliado_cliques')
    .select('id', { count: 'exact', head: true })
    .eq('afiliado_id', afiliado.id)
    .eq('converteu', true)

  // Métricas de vendas
  const { data: vendas } = await db
    .from('afiliado_vendas')
    .select('comissao_valor, status_comissao, valor_liquido, data_venda, pedido_ref, status_venda')
    .eq('afiliado_id', afiliado.id)
    .neq('status_venda', 'cancelada')
    .order('data_venda', { ascending: false })

  const totalVendas       = vendas?.length ?? 0
  const receitaTotal      = vendas?.reduce((s, v) => s + (v.valor_liquido   ?? 0), 0) ?? 0
  const comissaoPendente  = vendas?.filter((v) => v.status_comissao === 'pendente')
                                    .reduce((s, v) => s + (v.comissao_valor ?? 0), 0) ?? 0
  const comissaoAprovada  = vendas?.filter((v) => v.status_comissao === 'aprovada')
                                    .reduce((s, v) => s + (v.comissao_valor ?? 0), 0) ?? 0
  const comissaoPaga      = vendas?.filter((v) => v.status_comissao === 'paga')
                                    .reduce((s, v) => s + (v.comissao_valor ?? 0), 0) ?? 0

  const taxaConversao = (totalCliques ?? 0) > 0
    ? ((cliquesConvertidos ?? 0) / (totalCliques ?? 1) * 100).toFixed(1)
    : '0.0'

  // Últimas 5 vendas para exibição no portal
  const ultimasVendas = (vendas ?? []).slice(0, 5).map((v) => ({
    pedidoRef:       v.pedido_ref,
    valorLiquido:    v.valor_liquido,
    comissaoValor:   v.comissao_valor,
    statusComissao:  v.status_comissao,
    dataVenda:       v.data_venda,
  }))

  const payload = {
    afiliado: {
      nome:           afiliado.nome,
      codigo:         afiliado.codigo,
      linkAfiliado:   afiliado.link_afiliado,
      comissao:       `${afiliado.valor_comissao}${afiliado.tipo_comissao === 'percentual' ? '%' : ' R$'}`,
      status:         afiliado.status,
      nicho:          afiliado.nicho,
      seguidores:     afiliado.seguidores_total,
    },
    metricas: {
      totalCliques:      totalCliques      ?? 0,
      cliquesConvertidos: cliquesConvertidos ?? 0,
      taxaConversao:     `${taxaConversao}%`,
      totalVendas,
      receitaTotal,
      comissaoPendente,
      comissaoAprovada,
      comissaoPaga,
      comissaoTotal:     comissaoPendente + comissaoAprovada + comissaoPaga,
    },
    ultimasVendas,
    geradoEm: new Date().toISOString(),
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
