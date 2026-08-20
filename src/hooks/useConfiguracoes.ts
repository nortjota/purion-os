'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { Configuracoes } from '@/store'

export function useConfiguracoes() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb.from('configuracoes').select('chave, valor')
      dbLog('SELECT', 'configuracoes', error, `${data?.length ?? 0} rows`)
      if (!data || !data.length) return
      const patch = data.reduce<Partial<Configuracoes>>((acc, row) => {
        (acc as Record<string, unknown>)[row.chave] = row.valor
        return acc
      }, {})
      usePurionStore.getState().setConfiguracoes(patch)
    }

    load()

    const ch = sb.channel(`config-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    /**
     * Persiste configurações no Supabase (upsert por chave) e só então atualiza o Zustand —
     * se o upsert falhar (RLS, coluna faltando, etc.) o estado local NÃO muda, para a UI nunca
     * mostrar um valor como "salvo" quando na verdade não gravou. Retorna true/false.
     */
    salvarConfiguracoes: async (config: Partial<Configuracoes>): Promise<boolean> => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().setConfiguracoes(config)
        return true
      }
      const upserts = Object.entries(config).map(([chave, valor]) => ({
        chave, valor, updated_at: new Date().toISOString(),
      }))
      const { error } = await sb.from('configuracoes').upsert(upserts, { onConflict: 'tenant_id,chave' })
      dbLog('UPSERT', 'configuracoes', error, Object.keys(config))
      if (error) { toastError('Erro ao salvar configurações', error.message); return false }
      usePurionStore.getState().setConfiguracoes(config)
      success('Configurações salvas')
      return true
    },
  }
}
