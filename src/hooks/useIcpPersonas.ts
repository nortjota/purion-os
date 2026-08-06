'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

export type TipoPersona = 'primaria' | 'secundaria'

export interface IcpPersona {
  id: string
  nome: string
  tipo: TipoPersona
  emoji: string
  demografia: string
  dores: string[]
  desejos: string[]
  gatilho: string
  jtbd: string
  ordem: number
}

export type NovaPersona = Omit<IcpPersona, 'id'>

type Row = Record<string, unknown>

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string' && val.trim()) {
    return val.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function toPersona(r: Row, idx: number): IcpPersona {
  return {
    id:          String(r.id),
    nome:        String(r.nome ?? ''),
    tipo:        String(r.tipo ?? 'primaria') as TipoPersona,
    emoji:       String(r.emoji ?? '👤'),
    demografia:  String(r.demografia ?? ''),
    dores:       toArray(r.dores),
    desejos:     toArray(r.desejos),
    gatilho:     String(r.gatilho ?? ''),
    jtbd:        String(r.jtbd ?? ''),
    ordem:       Number(r.ordem ?? idx),
  }
}

export function useIcpPersonas() {
  const { success, error: toastError } = useToast()
  const [personas, setPersonas] = useState<IcpPersona[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('icp_personas').select('*').order('ordem', { ascending: true })
    dbLog('SELECT', 'icp_personas', error, `${data?.length ?? 0} rows`)
    if (data) setPersonas(data.map(toPersona))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`icp-personas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'icp_personas' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function atualizarPersona(id: string, dados: Partial<NovaPersona>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('icp_personas').update({
      ...(dados.nome        !== undefined && { nome: dados.nome }),
      ...(dados.tipo        !== undefined && { tipo: dados.tipo }),
      ...(dados.emoji       !== undefined && { emoji: dados.emoji }),
      ...(dados.demografia  !== undefined && { demografia: dados.demografia }),
      ...(dados.dores       !== undefined && { dores: dados.dores }),
      ...(dados.desejos     !== undefined && { desejos: dados.desejos }),
      ...(dados.gatilho     !== undefined && { gatilho: dados.gatilho }),
      ...(dados.jtbd        !== undefined && { jtbd: dados.jtbd }),
    }).eq('id', id)
    dbLog('UPDATE', 'icp_personas', error, id)
    if (error) { toastError('Erro ao atualizar persona', error.message); return }
    setPersonas((prev) => prev.map((p) => p.id === id ? { ...p, ...dados } : p))
    success('Persona atualizada')
  }

  return { personas, carregando, atualizarPersona }
}
