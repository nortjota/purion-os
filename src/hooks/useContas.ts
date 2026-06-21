'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { ContaAcesso, CategoriaContaAcesso, StatusContaAcesso } from '@/store'

type Row = Record<string, unknown>

function toConta(r: Row): ContaAcesso {
  return {
    id:            String(r.id),
    plataforma:    String(r.plataforma ?? ''),
    categoria:     String(r.categoria ?? 'infra') as CategoriaContaAcesso,
    identificador: String(r.identificador ?? ''),
    url:           String(r.url ?? ''),
    responsavel:   String(r.responsavel ?? ''),
    status:        String(r.status ?? 'pendente') as StatusContaAcesso,
    observacoes:   String(r.observacoes ?? ''),
    vaultRef:      String(r.vault_ref ?? ''),
    updatedAt:     String(r.updated_at ?? new Date().toISOString()),
  }
}

export function useContas() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('contas_acessos')
        .select('*')
        .is('deleted_at', null)
        .order('categoria', { ascending: true })
      dbLog('SELECT', 'contas_acessos', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setContasAcessos(data.map(toConta))
    }

    load()

    const ch = sb.channel(`contas-acessos-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_acessos' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    criarConta: async (dados: Omit<ContaAcesso, 'id' | 'updatedAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data, error } = await sb.from('contas_acessos').insert({
        plataforma:    dados.plataforma,
        categoria:     dados.categoria,
        identificador: dados.identificador,
        url:           dados.url,
        responsavel:   dados.responsavel,
        status:        dados.status,
        observacoes:   dados.observacoes,
        vault_ref:     dados.vaultRef,
      }).select().single()
      dbLog('INSERT', 'contas_acessos', error, data?.id)
      if (error) { toastError('Erro ao criar conta', error.message); return }
      if (data) {
        usePurionStore.getState().adicionarContaAcesso(toConta(data))
        success('Conta cadastrada')
      }
    },

    atualizarConta: async (id: string, dados: Partial<Omit<ContaAcesso, 'id' | 'updatedAt'>>) => {
      const sb = supabase
      if (!sb) { usePurionStore.getState().atualizarContaAcesso(id, dados); return }
      const { error } = await sb.from('contas_acessos').update({
        ...(dados.plataforma    !== undefined && { plataforma: dados.plataforma }),
        ...(dados.categoria     !== undefined && { categoria: dados.categoria }),
        ...(dados.identificador !== undefined && { identificador: dados.identificador }),
        ...(dados.url           !== undefined && { url: dados.url }),
        ...(dados.responsavel   !== undefined && { responsavel: dados.responsavel }),
        ...(dados.status        !== undefined && { status: dados.status }),
        ...(dados.observacoes   !== undefined && { observacoes: dados.observacoes }),
        ...(dados.vaultRef      !== undefined && { vault_ref: dados.vaultRef }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'contas_acessos', error, id)
      if (error) { toastError('Erro ao salvar conta', error.message); return }
      usePurionStore.getState().atualizarContaAcesso(id, dados)
      success('Conta atualizada')
    },

    deletarConta: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('contas_acessos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'contas_acessos', error, id)
        if (error) { toastError('Erro ao excluir conta', error.message); return }
      }
      usePurionStore.getState().removerContaAcesso(id)
      success('Conta excluída')
    },
  }
}
