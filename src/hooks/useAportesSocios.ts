'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import type { PerfilUsuario } from '@/store'

export interface AporteSocio {
  id: string
  socio: PerfilUsuario
  valor: number
  data: string
  descricao: string | null
  createdAt: string
}

type Row = Record<string, unknown>

function toAporte(r: Row): AporteSocio {
  return {
    id:        String(r.id),
    socio:     String(r.socio) as PerfilUsuario,
    valor:     Number(r.valor ?? 0),
    data:      String(r.data),
    descricao: r.descricao ? String(r.descricao) : null,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

/** Aportes de capital dos sócios — quanto cada um colocou do próprio bolso na empresa. */
export function useAportesSocios() {
  const { success, error: toastError } = useToast()
  const [aportes, setAportes] = useState<AporteSocio[]>([])
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    const { data, error } = await sb.from('aportes_socios').select('*').is('deleted_at', null).order('data', { ascending: false })
    dbLog('SELECT', 'aportes_socios', error, `${data?.length ?? 0} rows`)
    if (data) setAportes(data.map(toAporte))
    setCarregando(false)
  }, [])

  useEffect(() => {
    load()
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`aportes-socios-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aportes_socios' }, load)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function registrarAporte(dados: { socio: PerfilUsuario; valor: number; data: string; descricao?: string | null }) {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb.from('aportes_socios').insert({
      socio: dados.socio, valor: dados.valor, data: dados.data, descricao: dados.descricao ?? null,
    }).select().single()
    dbLog('INSERT', 'aportes_socios', error, data?.id)
    if (error) { toastError('Erro ao registrar aporte', error.message); return }
    if (data) setAportes((prev) => [toAporte(data as Row), ...prev])
    success('Aporte registrado')
  }

  async function removerAporte(id: string) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('aportes_socios').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    dbLog('DELETE', 'aportes_socios', error, id)
    if (error) { toastError('Erro ao excluir aporte', error.message); return }
    setAportes((prev) => prev.filter((a) => a.id !== id))
    success('Aporte excluído')
  }

  const totalPorSocio = useMemo(() => {
    const totais = new Map<PerfilUsuario, number>()
    for (const a of aportes) totais.set(a.socio, (totais.get(a.socio) ?? 0) + a.valor)
    return totais
  }, [aportes])

  const totalGeral = useMemo(() => aportes.reduce((s, a) => s + a.valor, 0), [aportes])

  return { aportes, carregando, registrarAporte, removerAporte, totalPorSocio, totalGeral }
}
