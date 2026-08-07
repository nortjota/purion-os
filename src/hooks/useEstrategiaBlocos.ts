'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { EstrategiaBloco, SecaoEstrategia, TipoBloco, ConteudoBloco } from '@/store'

type Row = Record<string, unknown>

function toBloco(r: Row): EstrategiaBloco {
  return {
    id:       String(r.id),
    secao:    String(r.secao ?? 'geral') as SecaoEstrategia,
    tipo:     String(r.tipo ?? 'paragrafo') as TipoBloco,
    conteudo: (r.conteudo ?? {}) as ConteudoBloco,
    ordem:    Number(r.ordem ?? 0),
  }
}

export function useEstrategiaBlocos() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb.from('estrategia_blocos').select('*').order('ordem', { ascending: true })
      dbLog('SELECT', 'estrategia_blocos', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setEstrategiaBlocos(data.map(toBloco))
    }

    load()

    const ch = sb.channel(`estrategia-blocos-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estrategia_blocos' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    criarBloco: async (secao: SecaoEstrategia, tipo: TipoBloco, conteudo: ConteudoBloco, ordem: number): Promise<EstrategiaBloco | null> => {
      const sb = supabase
      if (!sb) return null
      const { data, error } = await sb.from('estrategia_blocos').insert({
        secao, tipo, conteudo, ordem,
      }).select().single()
      dbLog('INSERT', 'estrategia_blocos', error, data?.id)
      if (error) return null
      if (data) {
        const novo = toBloco(data)
        usePurionStore.getState().adicionarEstrategiaBloco(novo)
        return novo
      }
      return null
    },

    atualizarBloco: async (id: string, dados: Partial<Pick<EstrategiaBloco, 'tipo' | 'conteudo' | 'ordem'>>): Promise<void> => {
      const sb = supabase
      if (!sb) { usePurionStore.getState().atualizarEstrategiaBloco(id, dados); return }
      const { error } = await sb.from('estrategia_blocos').update({
        ...(dados.tipo     !== undefined && { tipo: dados.tipo }),
        ...(dados.conteudo !== undefined && { conteudo: dados.conteudo }),
        ...(dados.ordem    !== undefined && { ordem: dados.ordem }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'estrategia_blocos', error, id)
      if (error) return
      usePurionStore.getState().atualizarEstrategiaBloco(id, dados)
    },

    deletarBloco: async (id: string): Promise<void> => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('estrategia_blocos').delete().eq('id', id)
      dbLog('DELETE', 'estrategia_blocos', error, id)
      if (error) return
      usePurionStore.getState().removerEstrategiaBloco(id)
    },

    reordenarBlocos: async (atualizacoes: Array<{ id: string; ordem: number }>): Promise<void> => {
      const sb = supabase
      atualizacoes.forEach(({ id, ordem }) => usePurionStore.getState().atualizarEstrategiaBloco(id, { ordem }))
      if (!sb) return
      await Promise.all(atualizacoes.map(({ id, ordem }) => sb.from('estrategia_blocos').update({ ordem }).eq('id', id)))
      dbLog('UPDATE', 'estrategia_blocos (reordenar)', null, `${atualizacoes.length} blocos`)
    },
  }
}
