'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { Quadro, QuadroNo, QuadroConexao } from '@/store'

type Row = Record<string, unknown>

function toQuadro(r: Row): Quadro {
  return {
    id: r.id as string,
    nome: r.nome as string,
    descricao: (r.descricao as string) ?? null,
    emoji: (r.emoji as string) ?? '🧠',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function toNo(r: Row): QuadroNo {
  return {
    id: r.id as string,
    quadroId: r.quadro_id as string,
    tipo: r.tipo as QuadroNo['tipo'],
    conteudo: (r.conteudo as string) ?? '',
    posX: Number(r.pos_x) || 0,
    posY: Number(r.pos_y) || 0,
    largura: Number(r.largura) || 200,
    altura: Number(r.altura) || 120,
    cor: (r.cor as string) ?? '#C9A84C',
    autor: (r.autor as string | null) ?? null,
    createdAt: r.created_at as string,
  }
}

function toConexao(r: Row): QuadroConexao {
  return {
    id: r.id as string,
    quadroId: r.quadro_id as string,
    origemId: r.origem_id as string,
    destinoId: r.destino_id as string,
    label: (r.label as string) ?? '',
  }
}

export function useQuadros() {
  const {
    quadros, setQuadros,
    adicionarQuadro, atualizarQuadro: atualizarQuadroStore, removerQuadro,
    adicionarNo, atualizarNo: atualizarNoStore, removerNo,
    adicionarConexao, removerConexao,
  } = usePurionStore()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('quadros')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      dbLog('SELECT', 'quadros', error ?? undefined)
      if (data) setQuadros(data.map((r) => toQuadro(r as Row)))
    }
    load()

    const ch = sb
      .channel(`quadros-list-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quadros' }, (p) => {
        if (p.eventType === 'INSERT') adicionarQuadro(toQuadro(p.new as Row))
        else if (p.eventType === 'UPDATE') atualizarQuadroStore(p.new.id as string, toQuadro(p.new as Row))
        else if (p.eventType === 'DELETE') removerQuadro(p.old.id as string)
      })
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quadros ───────────────────────────────────────────────────────────────

  async function criarQuadro(nome: string, emoji = '🧠', descricao = '') {
    const sb = supabase
    if (!sb) return null
    const { data, error } = await sb
      .from('quadros')
      .insert({ nome, emoji, descricao })
      .select()
      .single()
    dbLog('INSERT', 'quadros', error ?? undefined)
    if (data) adicionarQuadro(toQuadro(data as Row))
    return data ? toQuadro(data as Row) : null
  }

  async function editarQuadro(id: string, campos: Partial<{ nome: string; emoji: string; descricao: string }>) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb
      .from('quadros')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    dbLog('UPDATE', 'quadros', error ?? undefined)
    if (data) atualizarQuadroStore(id, toQuadro(data as Row))
  }

  async function deletarQuadro(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb
      .from('quadros')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    dbLog('UPDATE', 'quadros', error ?? undefined)
    if (!error) removerQuadro(id)
  }

  // ── Nós ───────────────────────────────────────────────────────────────────

  async function carregarNos(quadroId: string): Promise<QuadroNo[]> {
    const sb = supabase
    if (!sb) return []
    const { data, error } = await sb
      .from('quadro_nos')
      .select('*')
      .eq('quadro_id', quadroId)
      .order('created_at', { ascending: true })
    dbLog('SELECT', 'quadro_nos', error ?? undefined)
    return data ? data.map((r) => toNo(r as Row)) : []
  }

  async function criarNo(
    quadroId: string,
    tipo: QuadroNo['tipo'],
    posX: number,
    posY: number,
    cor: string,
    autor?: string,
  ): Promise<QuadroNo | null> {
    const sb = supabase
    if (!sb) return null
    const dims: Record<string, { largura: number; altura: number }> = {
      postit: { largura: 200, altura: 120 },
      caixa:  { largura: 220, altura: 100 },
      texto:  { largura: 240, altura: 50  },
      imagem: { largura: 200, altura: 150 },
    }
    const { largura, altura } = dims[tipo] ?? dims.postit
    const { data, error } = await sb
      .from('quadro_nos')
      .insert({ quadro_id: quadroId, tipo, pos_x: posX, pos_y: posY, cor, autor: autor ?? null, largura, altura })
      .select()
      .single()
    dbLog('INSERT', 'quadro_nos', error ?? undefined)
    if (data) adicionarNo(toNo(data as Row))
    return data ? toNo(data as Row) : null
  }

  async function editarNo(id: string, campos: Partial<{ conteudo: string; cor: string; largura: number; altura: number }>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('quadro_nos').update(campos).eq('id', id)
    dbLog('UPDATE', 'quadro_nos', error ?? undefined)
    if (!error) atualizarNoStore(id, campos)
  }

  async function moverNo(id: string, posX: number, posY: number) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('quadro_nos').update({ pos_x: posX, pos_y: posY }).eq('id', id)
    dbLog('UPDATE', 'quadro_nos', error ?? undefined)
    if (!error) atualizarNoStore(id, { posX, posY })
  }

  async function deletarNo(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('quadro_nos').delete().eq('id', id)
    dbLog('DELETE', 'quadro_nos', error ?? undefined)
    if (!error) removerNo(id)
  }

  // ── Conexões ──────────────────────────────────────────────────────────────

  async function carregarConexoes(quadroId: string): Promise<QuadroConexao[]> {
    const sb = supabase
    if (!sb) return []
    const { data, error } = await sb
      .from('quadro_conexoes')
      .select('*')
      .eq('quadro_id', quadroId)
    dbLog('SELECT', 'quadro_conexoes', error ?? undefined)
    return data ? data.map((r) => toConexao(r as Row)) : []
  }

  async function criarConexao(quadroId: string, origemId: string, destinoId: string, label = ''): Promise<QuadroConexao | null> {
    const sb = supabase
    if (!sb) return null
    const { data, error } = await sb
      .from('quadro_conexoes')
      .insert({ quadro_id: quadroId, origem_id: origemId, destino_id: destinoId, label })
      .select()
      .single()
    dbLog('INSERT', 'quadro_conexoes', error ?? undefined)
    if (data) adicionarConexao(toConexao(data as Row))
    return data ? toConexao(data as Row) : null
  }

  async function deletarConexao(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('quadro_conexoes').delete().eq('id', id)
    dbLog('DELETE', 'quadro_conexoes', error ?? undefined)
    if (!error) removerConexao(id)
  }

  return {
    quadros,
    criarQuadro, editarQuadro, deletarQuadro,
    carregarNos, criarNo, editarNo, moverNo, deletarNo,
    carregarConexoes, criarConexao, deletarConexao,
  }
}
