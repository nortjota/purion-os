import { LeadsSiteDashboard } from '@/components/leads-site/LeadsSiteDashboard'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { LeadSite, CarrinhoAbandonado } from '@/components/leads-site/LeadsSiteDashboard'

export const revalidate = 0

export default async function Page() {
  let leads: LeadSite[] = []
  let carrinhos: CarrinhoAbandonado[] = []
  try {
    const db = supabaseAdmin()
    const [leadsRes, carrinhosRes] = await Promise.all([
      db.from('leads_site').select('*').order('criado_em', { ascending: false }),
      db.from('carrinhos_abandonados').select('*').order('criado_em', { ascending: false }),
    ])
    if (leadsRes.data) leads = leadsRes.data as LeadSite[]
    if (carrinhosRes.data) carrinhos = carrinhosRes.data as CarrinhoAbandonado[]
  } catch {
    // tabelas podem não existir ainda — dashboard busca ao carregar
  }

  return <LeadsSiteDashboard leadsInicial={leads} carrinhosInicial={carrinhos} />
}
