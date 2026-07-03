'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { MetaDiaria, MetaChecklistItem, TipoMeta, EscopoMeta, CategoriaMeta, PerfilUsuario } from '@/store'

type Row = Record<string, unknown>

function toMeta(r: Row): MetaDiaria {
  return {
    id:          String(r.id),
    titulo:      String(r.titulo ?? ''),
    tipo:        String(r.tipo ?? 'numerica')    as TipoMeta,
    escopo:      String(r.escopo ?? 'individual') as EscopoMeta,
    responsavel: r.responsavel ? String(r.responsavel) as PerfilUsuario : null,
    categoria:   String(r.categoria ?? 'geral')  as CategoriaMeta,
    valorAlvo:   r.valor_alvo != null ? Number(r.valor_alvo) : null,
    valorAtual:  Number(r.valor_atual ?? 0),
    unidade:     r.unidade ? String(r.unidade) : null,
    data:        String(r.data),
    recorrente:  Boolean(r.recorrente),
    concluida:   Boolean(r.concluida),
    createdAt:   String(r.created_at),
    updatedAt:   String(r.updated_at),
  }
}

function toItem(r: Row): MetaChecklistItem {
  return {
    id:        String(r.id),
    metaId:    String(r.meta_id),
    texto:     String(r.texto ?? ''),
    feito:     Boolean(r.feito),
    ordem:     Number(r.ordem ?? 0),
    createdAt: String(r.created_at),
  }
}

async function verificarRecorrencia(
  sb: NonNullable<typeof supabase>,
  metas: MetaDiaria[],
  hoje: string,
) {
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const metasOntem = metas.filter((m) => m.data === ontem && m.recorrente)
  const metasHoje  = metas.filter((m) => m.data === hoje)
  const keyHoje    = new Set(metasHoje.map((m) => `${m.titulo}|${m.responsavel ?? ''}|${m.escopo}`))

  const paraRecriar = metasOntem.filter((m) => !keyHoje.has(`${m.titulo}|${m.responsavel ?? ''}|${m.escopo}`))
  if (paraRecriar.length === 0) return

  for (const meta of paraRecriar) {
    const { data: nova, error } = await sb.from('metas_diarias').insert({
      titulo:      meta.titulo,
      tipo:        meta.tipo,
      escopo:      meta.escopo,
      responsavel: meta.responsavel,
      categoria:   meta.categoria,
      valor_alvo:  meta.valorAlvo,
      valor_atual: 0,
      unidade:     meta.unidade,
      data:        hoje,
      recorrente:  true,
      concluida:   false,
    }).select().single()
    dbLog('INSERT', 'metas_diarias', error, `recorrencia de ${meta.id}`)

    if (nova && meta.tipo === 'checklist') {
      const itens = usePurionStore.getState().metaChecklistItens.filter((i) => i.metaId === meta.id)
      for (const item of itens) {
        const { error: ie } = await sb.from('meta_checklist_itens').insert({
          meta_id: nova.id, texto: item.texto, feito: false, ordem: item.ordem,
        })
        dbLog('INSERT', 'meta_checklist_itens', ie, `clone para ${nova.id}`)
      }
    }
  }
}

export function useMetas() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const hoje  = new Date().toISOString().slice(0, 10)
    const inicio = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

    const load = async () => {
      const { data: metasData, error: me } = await sb
        .from('metas_diarias')
        .select('*')
        .is('deleted_at', null)
        .gte('data', inicio)
        .order('created_at', { ascending: true })
      dbLog('SELECT', 'metas_diarias', me, `${metasData?.length ?? 0} rows`)

      const { data: itensData, error: ie } = await sb
        .from('meta_checklist_itens')
        .select('*')
        .order('ordem', { ascending: true })
      dbLog('SELECT', 'meta_checklist_itens', ie, `${itensData?.length ?? 0} rows`)

      const store = usePurionStore.getState()
      const metas = (metasData ?? []).map(toMeta)
      store.setMetasDiarias(metas)
      store.setMetaChecklistItens((itensData ?? []).map(toItem))

      await verificarRecorrencia(sb, metas, hoje)
    }

    load()

    const ch = sb.channel(`metas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas_diarias' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_checklist_itens' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    criarMeta: async (dados: {
      titulo: string
      tipo: TipoMeta
      escopo: EscopoMeta
      responsavel: PerfilUsuario | null
      categoria: CategoriaMeta
      valorAlvo: number | null
      unidade: string | null
      recorrente: boolean
      data: string
      itensChecklist?: string[]
    }): Promise<string | null> => {
      const sb = supabase
      if (!sb) return null
      const { data, error } = await sb.from('metas_diarias').insert({
        titulo:      dados.titulo,
        tipo:        dados.tipo,
        escopo:      dados.escopo,
        responsavel: dados.responsavel,
        categoria:   dados.categoria,
        valor_alvo:  dados.valorAlvo,
        valor_atual: 0,
        unidade:     dados.unidade,
        data:        dados.data,
        recorrente:  dados.recorrente,
        concluida:   false,
      }).select().single()
      dbLog('INSERT', 'metas_diarias', error, data?.id)
      if (error) { toastError('Erro ao criar meta', error.message); return null }

      if (data && dados.tipo === 'checklist' && dados.itensChecklist?.length) {
        for (let i = 0; i < dados.itensChecklist.length; i++) {
          const { error: ie } = await sb.from('meta_checklist_itens').insert({
            meta_id: data.id, texto: dados.itensChecklist[i], feito: false, ordem: i,
          })
          dbLog('INSERT', 'meta_checklist_itens', ie)
        }
      }

      if (data) {
        usePurionStore.getState().adicionarMetaDiaria(toMeta(data as Row))
        success('Meta criada')
      }
      return data?.id ?? null
    },

    atualizarProgresso: async (id: string, valorAtual: number): Promise<void> => {
      const sb = supabase
      const meta = usePurionStore.getState().metasDiarias.find((m) => m.id === id)
      const concluida = meta?.valorAlvo != null && valorAtual >= meta.valorAlvo
      const updates = { valor_atual: valorAtual, concluida, updated_at: new Date().toISOString() }
      if (sb) {
        const { error } = await sb.from('metas_diarias').update(updates).eq('id', id)
        dbLog('UPDATE', 'metas_diarias', error, id)
        if (error) { toastError('Erro ao atualizar progresso', error.message); return }
      }
      usePurionStore.getState().atualizarMetaDiaria(id, { valorAtual, concluida })
    },

    incrementarProgresso: async (id: string): Promise<void> => {
      const meta = usePurionStore.getState().metasDiarias.find((m) => m.id === id)
      if (!meta) return
      const novoValor = meta.valorAtual + 1
      const sb = supabase
      const concluida = meta.valorAlvo != null && novoValor >= meta.valorAlvo
      if (sb) {
        const { error } = await sb.from('metas_diarias').update({
          valor_atual: novoValor, concluida, updated_at: new Date().toISOString(),
        }).eq('id', id)
        dbLog('UPDATE', 'metas_diarias', error, id)
        if (error) { toastError('Erro ao incrementar', error.message); return }
      }
      usePurionStore.getState().atualizarMetaDiaria(id, { valorAtual: novoValor, concluida })
      if (concluida) success(`✓ ${meta.titulo} concluída!`)
    },

    marcarItem: async (id: string, feito: boolean): Promise<void> => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('meta_checklist_itens').update({ feito }).eq('id', id)
        dbLog('UPDATE', 'meta_checklist_itens', error, id)
        if (error) { toastError('Erro ao marcar item', error.message); return }
      }
      const store = usePurionStore.getState()
      store.atualizarChecklistItem(id, { feito })

      const item = store.metaChecklistItens.find((i) => i.id === id)
      if (!item) return
      const itens = store.metaChecklistItens.filter((i) => i.metaId === item.metaId)
      const feitos = itens.filter((i) => (i.id === id ? feito : i.feito)).length
      const total  = itens.length
      const concluida = feitos === total && total > 0
      const valorAtual = feitos

      if (sb) {
        const { error } = await sb.from('metas_diarias').update({
          valor_atual: valorAtual, concluida, updated_at: new Date().toISOString(),
        }).eq('id', item.metaId)
        dbLog('UPDATE', 'metas_diarias', error, item.metaId)
      }
      store.atualizarMetaDiaria(item.metaId, { valorAtual, concluida })
      if (concluida) {
        const meta = store.metasDiarias.find((m) => m.id === item.metaId)
        if (meta) success(`✓ ${meta.titulo} concluída!`)
      }
    },

    concluirMeta: async (id: string, concluida: boolean): Promise<void> => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('metas_diarias').update({
          concluida, updated_at: new Date().toISOString(),
        }).eq('id', id)
        dbLog('UPDATE', 'metas_diarias', error, id)
        if (error) { toastError('Erro ao concluir meta', error.message); return }
      }
      usePurionStore.getState().atualizarMetaDiaria(id, { concluida })
    },

    deletarMeta: async (id: string): Promise<void> => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('metas_diarias').update({
          deleted_at: new Date().toISOString(),
        }).eq('id', id)
        dbLog('UPDATE', 'metas_diarias', error, id)
        if (error) { toastError('Erro ao excluir meta', error.message); return }
      }
      usePurionStore.getState().removerMetaDiaria(id)
      success('Meta excluída')
    },
  }
}
