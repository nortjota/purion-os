'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type { Creator, PerfilUsuario, StatusCreator } from '@/store'

type Row = Record<string, unknown>

function toCreator(r: Row): Creator {
  return {
    id:               String(r.id),
    nome:             String(r.nome             ?? ''),
    instagram:        String(r.instagram        ?? ''),
    tiktok:           r.tiktok ? String(r.tiktok) : undefined,
    seguidores:       Number(r.seguidores        ?? 0),
    nichoPrincipal:   String(r.nicho            ?? ''),
    status:           String(r.status           ?? 'contatado') as StatusCreator,
    cacheCombinado:   Number(r.cache_combinado   ?? 0),
    produtosEnviados: Array.isArray(r.produtos_enviados) ? (r.produtos_enviados as string[]) : [],
    postagens:        Array.isArray(r.postagens)  ? (r.postagens as Creator['postagens']) : [],
    roi:              Number(r.roi ?? 0),
    createdAt:        String(r.created_at ?? new Date().toISOString()),
    responsavel:      String(r.responsavel ?? 'matheus') as PerfilUsuario,
    notas:            String(r.notas ?? ''),
  }
}

export function useMarketing() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data } = await sb.from('creators').select('*').order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setCreators(data.map(toCreator))
    }

    load()

    const ch = sb.channel('creators-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creators' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarCreator: async (c: Omit<Creator, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('creators').insert({
        nome:              c.nome,
        instagram:         c.instagram,
        tiktok:            c.tiktok ?? null,
        nicho:             c.nichoPrincipal,
        seguidores:        c.seguidores,
        status:            c.status,
        cache_combinado:   c.cacheCombinado,
        produtos_enviados: c.produtosEnviados,
        postagens:         c.postagens,
        roi:               c.roi,
        responsavel:       c.responsavel,
        notas:             c.notas,
      }).select().single()
      if (data) usePurionStore.getState().adicionarCreator({ ...c, id: String(data.id), createdAt: String(data.created_at) })
    },

    atualizarCreator: async (id: string, dados: Partial<Creator>) => {
      const sb = supabase
      if (!sb) return
      await sb.from('creators').update({
        ...(dados.status    !== undefined && { status:    dados.status }),
        ...(dados.postagens !== undefined && { postagens: dados.postagens }),
        ...(dados.roi       !== undefined && { roi:       dados.roi }),
        ...(dados.notas     !== undefined && { notas:     dados.notas }),
      }).eq('id', id)
      usePurionStore.getState().atualizarCreator(id, dados)
    },
  }
}
