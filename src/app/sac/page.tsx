import { SacDashboard } from '@/components/sac/SacDashboard'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Ticket } from '@/components/sac/SacDashboard'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'SAC & Suporte' }

export const revalidate = 0

export default async function Page() {
  let tickets: Ticket[] = []
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('tickets_sac')
      .select('*')
      .is('deleted_at', null)
      .order('criado_em', { ascending: false })
    if (data) tickets = data as Ticket[]
  } catch {
    // table may not exist yet — dashboard will fetch on load
  }

  return <SacDashboard ticketsInicial={tickets} />
}
