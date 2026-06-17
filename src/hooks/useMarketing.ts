'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
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
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('creators')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      dbLog('SELECT', 'creators', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setCreators(data.map(toCreator))
    }

    load()

    const ch = sb.channel(`creators-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creators' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarCreator: async (c: Omit<Creator, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('creators').insert({
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
      dbLog('INSERT', 'creators', error, data?.id)
      if (error) { toastError('Erro ao cadastrar creator', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarCreator({ ...c, id: String(data.id), createdAt: String(data.created_at) })
        success('Creator cadastrado')
      }
    },

    atualizarCreator: async (id: string, dados: Partial<Creator>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarCreator(id, dados)
        return
      }
      const { error } = await sb.from('creators').update({
        ...(dados.nome             !== undefined && { nome:              dados.nome }),
        ...(dados.instagram        !== undefined && { instagram:         dados.instagram }),
        ...(dados.tiktok           !== undefined && { tiktok:            dados.tiktok }),
        ...(dados.seguidores       !== undefined && { seguidores:        dados.seguidores }),
        ...(dados.nichoPrincipal   !== undefined && { nicho:             dados.nichoPrincipal }),
        ...(dados.status           !== undefined && { status:            dados.status }),
        ...(dados.cacheCombinado   !== undefined && { cache_combinado:   dados.cacheCombinado }),
        ...(dados.produtosEnviados !== undefined && { produtos_enviados: dados.produtosEnviados }),
        ...(dados.postagens        !== undefined && { postagens:         dados.postagens }),
        ...(dados.roi              !== undefined && { roi:               dados.roi }),
        ...(dados.responsavel      !== undefined && { responsavel:       dados.responsavel }),
        ...(dados.notas            !== undefined && { notas:             dados.notas }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'creators', error, id)
      if (error) { toastError('Erro ao salvar creator', error.message); return }
      usePurionStore.getState().atualizarCreator(id, dados)
      success('Creator atualizado')
    },

    deletarCreator: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('creators').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'creators', error, id)
        if (error) { toastError('Erro ao excluir creator', error.message); return }
      }
      const store = usePurionStore.getState()
      store.setCreators(store.creators.filter((c) => c.id !== id))
      success('Creator excluído', 'Você pode restaurar na Lixeira')
    },

    restaurarCreator: async (creator: Creator) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('creators').update({ deleted_at: null }).eq('id', creator.id)
        dbLog('UPDATE', 'creators', error, creator.id)
      }
      usePurionStore.getState().adicionarCreator(creator)
    },
  }
}
