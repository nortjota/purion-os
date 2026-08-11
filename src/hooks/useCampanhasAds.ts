'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { CampanhaAds, PerfilUsuario } from '@/store'

type Row = Record<string, unknown>

function toCampanha(r: Row): CampanhaAds {
  return {
    id:              String(r.id),
    nome:            String(r.nome ?? ''),
    plataforma:      String(r.plataforma ?? 'meta') as CampanhaAds['plataforma'],
    status:          String(r.status ?? 'ativa') as CampanhaAds['status'],
    orcamentoDiario: Number(r.orcamento_diario ?? 0),
    gastoTotal:      Number(r.gasto_total ?? 0),
    impressoes:      Number(r.impressoes ?? 0),
    cliques:         Number(r.cliques ?? 0),
    conversoes:      Number(r.conversoes ?? 0),
    receitaGerada:   Number(r.receita_gerada ?? 0),
    periodo: {
      inicio: r.periodo_inicio ? String(r.periodo_inicio) : new Date().toISOString(),
      fim:    r.periodo_fim ? String(r.periodo_fim) : null,
    },
    responsavel: (r.responsavel ? String(r.responsavel) : 'matheus') as PerfilUsuario,
  }
}

/** Carrega o snapshot diário de campanhas_ads (gravado pelo cron de alertas) para o store global. */
export function useCampanhasAds() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb.from('campanhas_ads').select('*').order('gasto_total', { ascending: false })
      dbLog('SELECT', 'campanhas_ads', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setCampanhasAds(data.map(toCampanha))
    }

    load()

    const ch = sb.channel(`campanhas-ads-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas_ads' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])
}
