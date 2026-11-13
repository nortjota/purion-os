'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { SOCIOS_ATIVOS, PERFIS_INFO } from '@/lib/socios'
import { useTikTokStore } from '@/hooks/useTikTok'
import { totaisPorVideo, type TotaisVideo } from '@/lib/tiktok/inteligencia'
import { STATUS_INFO, type StatusVideo } from '@/lib/tiktok/tipos'

export const fmtNum = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.', ',')} mi` : v >= 10_000 ? `${(v / 1000).toFixed(1).replace('.', ',')} mil` : v.toLocaleString('pt-BR'))
export const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtPct = (v: number | null) => (v == null || Number.isNaN(v) ? '—' : `${v.toFixed(1).replace('.', ',')}%`)
export const fmtData = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—')
/** Instante fixo da montagem do componente (render puro; atualiza ao reabrir a tela). */
export function useAgora(): number { const [agora] = useState(() => Date.now()); return agora }

export const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

export const PESSOAS = SOCIOS_ATIVOS.map((s) => ({ id: s.id as string, nome: s.nome }))
export const nomePessoa = (id: string | null) => (id ? (PERFIS_INFO as Record<string, { nome: string }>)[id]?.nome ?? id : '—')

/** master/admin aprovam roteiro e corte final. */
export function usePodeAprovar() {
  const { perfil } = useAuthContext()
  return !perfil || perfil.role === 'master' || perfil.role === 'admin'
}

export function useNomesCreators() {
  const creators = usePurionStore((s) => s.creators)
  return useMemo(() => {
    const m = new Map(creators.map((c) => [c.id, c]))
    return {
      creators,
      nome: (id: string | null) => (id ? m.get(id)?.nome ?? 'Creator removido' : '—'),
      handle: (id: string | null) => {
        const c = id ? m.get(id) : null
        return c ? (c.tiktok || c.instagram || '') : ''
      },
    }
  }, [creators])
}

/** Totais por vídeo (views, vendas atribuídas…) recalculados quando os dados mudam. */
export function useTotais(): Map<string, TotaisVideo> {
  const publicacoes = useTikTokStore((s) => s.publicacoes)
  const metricas = useTikTokStore((s) => s.metricas)
  const atribuicoes = useTikTokStore((s) => s.atribuicoes)
  return useMemo(() => totaisPorVideo(publicacoes, metricas, atribuicoes.map((a) => ({ videoId: a.videoId, valor: a.valor }))), [publicacoes, metricas, atribuicoes])
}

export function SeloStatus({ status }: { status: StatusVideo }) {
  const info = STATUS_INFO[status]
  return (
    <span className="tt-selo" style={{ ['--tom' as string]: info.cor }}>
      <span className="tt-selo-ponto" />{info.label}
    </span>
  )
}

export function Campo({ label, children, largura }: { label: string; children: React.ReactNode; largura?: string }) {
  return (
    <label className="tt-campo" style={largura ? { gridColumn: largura } : undefined}>
      <span className="label-purion">{label}</span>
      {children}
    </label>
  )
}

export function Vazio({ icone: Icone, titulo, texto, acao }: { icone: React.ComponentType<{ size?: number }>; titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icone size={28} /></span>
      <p className="empty-state-title">{titulo}</p>
      {texto && <p className="empty-state-subtitle">{texto}</p>}
      {acao && <div style={{ marginTop: 10 }}>{acao}</div>}
    </div>
  )
}

// ── Pilares editoriais (reusa social_pilares de Estratégias → Social) ──

export interface PilarInfo { nome: string; cor: string; percentual: number }
const CORES_PADRAO = ['#D4FC3C', '#9CC3DB', '#8FD14F', '#E6C374', '#A7A9A6', '#8F7CE6']
let cachePilares: PilarInfo[] | null = null

export function usePilares(): PilarInfo[] {
  const [pilares, setPilares] = useState<PilarInfo[]>(cachePilares ?? [])
  useEffect(() => {
    if (cachePilares || !supabase) return
    supabase.from('social_pilares').select('nome, cor, percentual, ordem').order('ordem').then(({ data }) => {
      cachePilares = (data ?? []).map((r, i) => ({ nome: String(r.nome), cor: r.cor ? String(r.cor) : CORES_PADRAO[i % CORES_PADRAO.length], percentual: Number(r.percentual ?? 0) }))
      setPilares(cachePilares)
    })
  }, [])
  return pilares
}
export const corPilar = (pilares: PilarInfo[], nome: string | null) => pilares.find((p) => p.nome === nome)?.cor ?? '#6B6B6B'
