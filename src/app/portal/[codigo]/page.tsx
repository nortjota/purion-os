import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PortalPage } from '@/components/portal/PortalPage'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return {
    title: `Portal do Afiliado — ${codigo.toUpperCase()}`,
    description: 'Portal privado de afiliado PURION',
    robots: 'noindex, nofollow',
  }
}

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const db = supabaseAdmin()

  const { data: afiliado } = await db
    .from('afiliados')
    .select('*')
    .eq('codigo', codigo.toUpperCase())
    .is('deleted_at', null)
    .single()

  if (!afiliado) notFound()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: vendas },
    { data: cliques },
    { data: pagamentos },
    { data: materiais },
  ] = await Promise.all([
    db.from('afiliado_vendas')
      .select('*')
      .eq('afiliado_id', afiliado.id)
      .order('data_venda', { ascending: false })
      .limit(50),
    db.from('afiliado_cliques')
      .select('afiliado_id, converteu, criado_em')
      .eq('afiliado_id', afiliado.id)
      .gte('criado_em', thirtyDaysAgo.toISOString()),
    db.from('afiliado_pagamentos')
      .select('*')
      .eq('afiliado_id', afiliado.id)
      .order('criado_em', { ascending: false }),
    db.from('afiliado_materiais')
      .select('*')
      .eq('afiliado_id', afiliado.id)
      .order('criado_em', { ascending: false }),
  ])

  return (
    <PortalPage
      afiliado={afiliado}
      vendas={vendas ?? []}
      cliques={cliques ?? []}
      pagamentos={pagamentos ?? []}
      materiais={materiais ?? []}
    />
  )
}
