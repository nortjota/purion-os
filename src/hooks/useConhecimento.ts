'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { KbCategoria, KbDocumento, KbBloco, TipoBloco, ConteudoBloco } from '@/store'

type Row = Record<string, unknown>

export interface KbArquivado {
  id: string
  titulo: string
  deletedAt: string
}

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
  const { success, error: toastError, toast } = useToast()
  const { perfil } = useAuthContext()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadCategorias = async () => {
      const { data, error } = await sb.from('kb_categorias').select('*').is('deleted_at', null).order('ordem', { ascending: true })
      dbLog('SELECT', 'kb_categorias', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setKbCategorias(data.map(toCategoria))
    }
    const loadDocumentos = async () => {
      const { data, error } = await sb.from('kb_documentos').select('*').is('deleted_at', null).order('ordem', { ascending: true })
      dbLog('SELECT', 'kb_documentos', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setKbDocumentos(data.map(toDocumento))
    }
    const loadBlocos = async () => {
      const { data, error } = await sb.from('kb_blocos').select('*').is('deleted_at', null).order('ordem', { ascending: true })
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

  // ── Restaurar (usado por Fase 4 e pelo "Desfazer" do toast) ──
  const restaurarDocumento = async (id: string) => {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('kb_documentos').update({ deleted_at: null }).eq('id', id)
    dbLog('UPDATE', 'kb_documentos (restaurar)', error, id)
    if (error) { toastError('Erro ao restaurar documento', error.message); return }
    const { error: blocosErr } = await sb.from('kb_blocos').update({ deleted_at: null }).eq('documento_id', id)
    dbLog('UPDATE', 'kb_blocos (restaurar)', blocosErr, id)
    success('Documento restaurado')
  }

  const restaurarCategoria = async (id: string) => {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('kb_categorias').update({ deleted_at: null }).eq('id', id)
    dbLog('UPDATE', 'kb_categorias (restaurar)', error, id)
    if (error) { toastError('Erro ao restaurar guia', error.message); return }
    success('Guia restaurada')
  }

  // ── Excluir (soft delete — arquivar) ──
  const deletarDocumento = async (id: string, titulo?: string) => {
    const sb = supabase
    if (sb) {
      const { error } = await sb.from('kb_documentos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      dbLog('DELETE', 'kb_documentos', error, id)
      if (error) { toastError('Erro ao excluir documento', error.message); return }
      const { error: blocosErr } = await sb.from('kb_blocos').update({ deleted_at: new Date().toISOString() }).eq('documento_id', id)
      dbLog('DELETE', 'kb_blocos (cascata)', blocosErr, id)
    }
    usePurionStore.getState().removerKbDocumento(id)
    toast({
      type: 'success',
      title: 'Documento arquivado',
      description: titulo ? `"${titulo}" foi movido para a lixeira.` : undefined,
      action: { label: 'Desfazer', onClick: () => restaurarDocumento(id) },
    })
  }

  const deletarCategoria = async (id: string, nome?: string) => {
    const sb = supabase
    if (sb) {
      const { data: docs, error: docsSelErr } = await sb.from('kb_documentos').select('id').eq('categoria_id', id).is('deleted_at', null)
      dbLog('SELECT', 'kb_documentos (p/ cascata)', docsSelErr, `${docs?.length ?? 0} rows`)
      const docIds = (docs ?? []).map((d) => String(d.id))

      const { error } = await sb.from('kb_categorias').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      dbLog('DELETE', 'kb_categorias', error, id)
      if (error) { toastError('Erro ao excluir guia', error.message); return }

      if (docIds.length > 0) {
        const { error: docsErr } = await sb.from('kb_documentos').update({ deleted_at: new Date().toISOString() }).in('id', docIds)
        dbLog('DELETE', 'kb_documentos (cascata)', docsErr, `${docIds.length} docs`)
        const { error: blocosErr } = await sb.from('kb_blocos').update({ deleted_at: new Date().toISOString() }).in('documento_id', docIds)
        dbLog('DELETE', 'kb_blocos (cascata)', blocosErr, `${docIds.length} docs`)
      }
    }
    const store = usePurionStore.getState()
    store.removerKbCategoria(id)
    store.setKbDocumentos(store.kbDocumentos.filter((d) => d.categoriaId !== id))
    toast({
      type: 'success',
      title: 'Guia arquivada',
      description: nome ? `"${nome}" e seus documentos foram movidos para a lixeira.` : undefined,
      action: { label: 'Desfazer', onClick: () => restaurarCategoria(id) },
    })
  }

  // ── Excluir permanentemente (master, via Lixeira) ──
  const excluirDocumentoPermanente = async (id: string) => {
    const sb = supabase
    if (!sb) return
    const { error: blocosErr } = await sb.from('kb_blocos').delete().eq('documento_id', id)
    dbLog('DELETE', 'kb_blocos (permanente)', blocosErr, id)
    const { error } = await sb.from('kb_documentos').delete().eq('id', id)
    dbLog('DELETE', 'kb_documentos (permanente)', error, id)
    if (error) { toastError('Erro ao excluir permanentemente', error.message); return }
    success('Documento excluído permanentemente')
  }

  const excluirCategoriaPermanente = async (id: string) => {
    const sb = supabase
    if (!sb) return
    const { data: docs, error: docsSelErr } = await sb.from('kb_documentos').select('id').eq('categoria_id', id)
    dbLog('SELECT', 'kb_documentos (p/ exclusão permanente)', docsSelErr, `${docs?.length ?? 0} rows`)
    const docIds = (docs ?? []).map((d) => String(d.id))
    if (docIds.length > 0) {
      const { error: blocosErr } = await sb.from('kb_blocos').delete().in('documento_id', docIds)
      dbLog('DELETE', 'kb_blocos (permanente, cascata)', blocosErr, `${docIds.length} docs`)
      const { error: docsErr } = await sb.from('kb_documentos').delete().in('id', docIds)
      dbLog('DELETE', 'kb_documentos (permanente, cascata)', docsErr, `${docIds.length} docs`)
    }
    const { error } = await sb.from('kb_categorias').delete().eq('id', id)
    dbLog('DELETE', 'kb_categorias (permanente)', error, id)
    if (error) { toastError('Erro ao excluir permanentemente', error.message); return }
    success('Guia excluída permanentemente')
  }

  // ── Lixeira: lista sob demanda (não fica assinado o tempo todo) ──
  const carregarArquivados = async (): Promise<{ categorias: KbArquivado[]; documentos: KbArquivado[] }> => {
    const sb = supabase
    if (!sb) return { categorias: [], documentos: [] }
    const [catRes, docRes] = await Promise.all([
      sb.from('kb_categorias').select('id, nome, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      sb.from('kb_documentos').select('id, titulo, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    ])
    dbLog('SELECT', 'kb_categorias (arquivadas)', catRes.error, `${catRes.data?.length ?? 0} rows`)
    dbLog('SELECT', 'kb_documentos (arquivados)', docRes.error, `${docRes.data?.length ?? 0} rows`)
    return {
      categorias: (catRes.data ?? []).map((r) => ({ id: String(r.id), titulo: String(r.nome ?? '—'), deletedAt: String(r.deleted_at) })),
      documentos: (docRes.data ?? []).map((r) => ({ id: String(r.id), titulo: String(r.titulo ?? '—'), deletedAt: String(r.deleted_at) })),
    }
  }

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

    deletarDocumento,
    restaurarDocumento,
    deletarCategoria,
    restaurarCategoria,
    excluirDocumentoPermanente,
    excluirCategoriaPermanente,
    carregarArquivados,

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
