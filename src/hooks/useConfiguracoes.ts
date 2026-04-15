'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type { Configuracoes } from '@/store'

export function useConfiguracoes() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data } = await sb.from('configuracoes').select('chave, valor')
      if (!data || !data.length) return
      const patch = data.reduce<Partial<Configuracoes>>((acc, row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc as Record<string, unknown>)[row.chave] = row.valor
        return acc
      }, {})
      usePurionStore.getState().setConfiguracoes(patch)
    }

    load()

    const ch = sb.channel('config-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    /**
     * Persiste configurações no Supabase (upsert por chave) e atualiza Zustand.
     * Se Supabase não estiver configurado, atualiza apenas o Zustand local.
     */
    salvarConfiguracoes: async (config: Partial<Configuracoes>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().setConfiguracoes(config)
        return
      }
      const upserts = Object.entries(config).map(([chave, valor]) => ({
        chave, valor, updated_at: new Date().toISOString(),
      }))
      await sb.from('configuracoes').upsert(upserts, { onConflict: 'chave' })
      usePurionStore.getState().setConfiguracoes(config)
    },
  }
}
