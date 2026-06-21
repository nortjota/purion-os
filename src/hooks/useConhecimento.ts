'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { KbCategoria, KbDocumento, KbBloco, TipoBloco, ConteudoBloco } from '@/store'

type Row = Record<string, unknown>

function toCategoria(r: Row): KbCategoria {
  return {
    id:    String(r.id),
    nome:  String(r.nome ?? ''),
    icone: String(r.icone ?? 'BookOpen'),
    cor:   String(r.cor ?? '#C9A84C'),
    ordem: Number(r.ordem ?? 0),
  }
}

function toDocumento(r: Row): KbDocumento {
  return {
    id:            String(r.id),
    categoriaId:   r.categoria_id ? String(r.categoria_id) : null,
    titulo:        String(r.titulo ?? ''),
    emoji:         String(r.emoji ?? '📄'),
    resumo:        String(r.resumo ?? ''),
    ordem:         Number(r.ordem ?? 0),
    favorito:      Boolean(r.favorito),
    atualizadoPor: r.atualizado_por ? String(r.atualizado_por) : null,
    updatedAt:     String(r.updated_at ?? new Date().toISOString()),
  }
}

function toBloco(r: Row): KbBloco {
  return {
    id:          String(r.id),
    documentoId: String(r.documento_id),
    tipo:        String(r.tipo ?? 'paragrafo') as TipoBloco,
    conteudo:    (r.conteudo ?? {}) as ConteudoBloco,
    ordem:       Number(r.ordem ?? 0),
  }
}

export function useConhecimento() {
  const { success, error: toastError } = useToast()
  const { perfil } = useAuthContext()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadCategorias = async () => {
      const { data, error } = await sb.from('kb_categorias').select('*').order('ordem', { ascending: true })
      dbLog('SELECT', 'kb_categorias', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setKbCategorias(data.map(toCategoria))
    }
    const loadDocumentos = async () => {
      const { data, error } = await sb.from('kb_documentos').select('*').is('deleted_at', null).order('ordem', { ascending: true })
      dbLog('SELECT', 'kb_documentos', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setKbDocumentos(data.map(toDocumento))
    }
    const loadBlocos = async () => {
      const { data, error } = await sb.from('kb_blocos').select('*').order('ordem', { ascending: true })
      dbLog('SELECT', 'kb_blocos', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setKbBlocos(data.map(toBloco))
    }

    loadCategorias(); loadDocumentos(); loadBlocos()

    const chC = sb.channel(`kb-categorias-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_categorias' }, loadCategorias)
      .subscribe()
    const chD = sb.channel(`kb-documentos-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_documentos' }, loadDocumentos)
      .subscribe()
    const chB = sb.channel(`kb-blocos-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_blocos' }, loadBlocos)
      .subscribe()

    return () => { sb.removeChannel(chC); sb.removeChannel(chD); sb.removeChannel(chB) }
  }, [])

  return {
    criarDocumento: async (dados: { categoriaId: string | null; titulo: string; emoji: string; resumo: string }) => {
      const sb = supabase
      if (!sb) return null
      const autor = perfil?.nome ?? 'Usuário'
      const ordemAtual = usePurionStore.getState().kbDocumentos.filter((d) => d.categoriaId === dados.categoriaId).length
      const { data, error } = await sb.from('kb_documentos').insert({
        categoria_id:   dados.categoriaId,
        titulo:         dados.titulo,
        emoji:          dados.emoji,
        resumo:         dados.resumo,
        ordem:          ordemAtual,
        atualizado_por: autor,
      }).select().single()
      dbLog('INSERT', 'kb_documentos', error, data?.id)
      if (error) { toastError('Erro ao criar documento', error.message); return null }
      if (data) {
        const novo = toDocumento(data)
        usePurionStore.getState().adicionarKbDocumento(novo)
        success('Documento criado')
        return novo
      }
      return null
    },

    atualizarDocumento: async (id: string, dados: Partial<Pick<KbDocumento, 'titulo' | 'emoji' | 'resumo' | 'categoriaId' | 'favorito'>>) => {
      const sb = supabase
      if (!sb) return
      const autor = perfil?.nome ?? 'Usuário'
      const { error } = await sb.from('kb_documentos').update({
        ...(dados.titulo      !== undefined && { titulo: dados.titulo }),
        ...(dados.emoji       !== undefined && { emoji: dados.emoji }),
        ...(dados.resumo      !== undefined && { resumo: dados.resumo }),
        ...(dados.categoriaId !== undefined && { categoria_id: dados.categoriaId }),
        ...(dados.favorito    !== undefined && { favorito: dados.favorito }),
        atualizado_por: autor,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'kb_documentos', error, id)
      if (error) { toastError('Erro ao salvar documento', error.message); return }
      usePurionStore.getState().atualizarKbDocumento(id, { ...dados, atualizadoPor: autor, updatedAt: new Date().toISOString() })
    },

    deletarDocumento: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('kb_documentos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'kb_documentos', error, id)
        if (error) { toastError('Erro ao excluir documento', error.message); return }
      }
      usePurionStore.getState().removerKbDocumento(id)
      success('Documento excluído')
    },

    criarBloco: async (documentoId: string, tipo: TipoBloco, conteudo: ConteudoBloco, ordem: number) => {
      const sb = supabase
      if (!sb) return null
      const { data, error } = await sb.from('kb_blocos').insert({
        documento_id: documentoId, tipo, conteudo, ordem,
      }).select().single()
      dbLog('INSERT', 'kb_blocos', error, data?.id)
      if (error) { toastError('Erro ao criar bloco', error.message); return null }
      if (data) {
        const novo = toBloco(data)
        usePurionStore.getState().adicionarKbBloco(novo)
        return novo
      }
      return null
    },

    atualizarBloco: async (id: string, dados: Partial<Pick<KbBloco, 'tipo' | 'conteudo' | 'ordem'>>) => {
      const sb = supabase
      if (!sb) { usePurionStore.getState().atualizarKbBloco(id, dados); return }
      const { error } = await sb.from('kb_blocos').update({
        ...(dados.tipo     !== undefined && { tipo: dados.tipo }),
        ...(dados.conteudo !== undefined && { conteudo: dados.conteudo }),
        ...(dados.ordem    !== undefined && { ordem: dados.ordem }),
      }).eq('id', id)
      dbLog('UPDATE', 'kb_blocos', error, id)
      if (error) { toastError('Erro ao salvar bloco', error.message); return }
      usePurionStore.getState().atualizarKbBloco(id, dados)
    },

    deletarBloco: async (id: string) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('kb_blocos').delete().eq('id', id)
      dbLog('DELETE', 'kb_blocos', error, id)
      if (error) { toastError('Erro ao excluir bloco', error.message); return }
      usePurionStore.getState().removerKbBloco(id)
    },

    reordenarBlocos: async (atualizacoes: Array<{ id: string; ordem: number }>) => {
      const sb = supabase
      atualizacoes.forEach(({ id, ordem }) => usePurionStore.getState().atualizarKbBloco(id, { ordem }))
      if (!sb) return
      await Promise.all(atualizacoes.map(({ id, ordem }) => sb.from('kb_blocos').update({ ordem }).eq('id', id)))
      dbLog('UPDATE', 'kb_blocos (reordenar)', null, `${atualizacoes.length} blocos`)
    },
  }
}
