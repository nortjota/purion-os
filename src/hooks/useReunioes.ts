'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import type {
  ReuniaoItem, DailyEntry, DecisaoEstrategica,
  PerfilUsuario, StatusReuniaoItem, VotoDecisao,
} from '@/store'

type Row = Record<string, unknown>

function toReuniao(r: Row): ReuniaoItem {
  return {
    id:             String(r.id),
    titulo:         String(r.titulo  ?? ''),
    tipo:           String(r.tipo    ?? 'operacional') as ReuniaoItem['tipo'],
    status:         String(r.status  ?? 'agendada')    as StatusReuniaoItem,
    data:           String(r.data),
    duracao:        Number(r.duracao ?? 60),
    participantes:  Array.isArray(r.participantes)   ? (r.participantes   as PerfilUsuario[])          : [],
    pauta:          Array.isArray(r.pauta)            ? (r.pauta           as string[])                 : [],
    ata:            String(r.ata ?? ''),
    decisoes:       Array.isArray(r.decisoes)         ? (r.decisoes        as string[])                 : [],
    proximosPassos: Array.isArray(r.proximos_passos)  ? (r.proximos_passos as ReuniaoItem['proximosPassos']) : [],
    createdAt:      String(r.created_at ?? new Date().toISOString()),
  }
}

function toDaily(r: Row): DailyEntry {
  return {
    id:          String(r.id),
    socio:       String(r.socio        ?? 'matheus') as PerfilUsuario,
    data:        String(r.data),
    ontemFiz:    String(r.ontem_fiz    ?? ''),
    hojeFarei:   String(r.hoje_farei   ?? ''),
    bloqueadoEm: String(r.bloqueado_em ?? ''),
    createdAt:   String(r.created_at   ?? new Date().toISOString()),
  }
}

function toDecisao(r: Row): DecisaoEstrategica {
  const votos = (r.votos as Record<string, string> | undefined) ?? {}
  return {
    id:           String(r.id),
    titulo:       String(r.titulo        ?? ''),
    descricao:    String(r.descricao     ?? ''),
    propostoPor:  String(r.proposto_por  ?? 'matheus') as PerfilUsuario,
    data:         String(r.data),
    prazoVotacao: String(r.prazo_votacao ?? ''),
    votos: {
      matheus: (votos.matheus ?? 'pendente') as VotoDecisao,
      joao:    (votos.joao    ?? 'pendente') as VotoDecisao,
      gabriel: (votos.gabriel ?? 'pendente') as VotoDecisao,
    },
    status:    String(r.status ?? 'aberta') as DecisaoEstrategica['status'],
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

export function useReunioes() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const loadR = async () => {
      const { data } = await sb.from('reunioes').select('*').order('data', { ascending: false })
      if (data) usePurionStore.getState().setReunioes(data.map(toReuniao))
    }
    const loadD = async () => {
      const { data } = await sb.from('daily_async').select('*').order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setDailyEntries(data.map(toDaily))
    }
    const loadDec = async () => {
      const { data } = await sb.from('decisoes').select('*').order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setDecisoes(data.map(toDecisao))
    }

    loadR(); loadD(); loadDec()

    const chR   = sb.channel('reunioes-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'reunioes'    }, loadR  ).subscribe()
    const chD   = sb.channel('daily-sync')   .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_async' }, loadD  ).subscribe()
    const chDec = sb.channel('decisoes-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'decisoes'    }, loadDec).subscribe()

    return () => { sb.removeChannel(chR); sb.removeChannel(chD); sb.removeChannel(chDec) }
  }, [])

  return {
    adicionarDaily: async (entry: Omit<DailyEntry, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('daily_async').insert({
        socio: entry.socio, data: entry.data,
        ontem_fiz: entry.ontemFiz, hoje_farei: entry.hojeFarei, bloqueado_em: entry.bloqueadoEm,
      }).select().single()
      if (data) usePurionStore.getState().adicionarDailyEntry({ ...entry, id: String(data.id), createdAt: String(data.created_at) })
    },

    atualizarDecisao: async (id: string, dados: Partial<DecisaoEstrategica>) => {
      const sb = supabase
      if (!sb) return
      await sb.from('decisoes').update({
        ...(dados.votos  !== undefined && { votos:  dados.votos }),
        ...(dados.status !== undefined && { status: dados.status }),
      }).eq('id', id)
      usePurionStore.getState().atualizarDecisao(id, dados)
    },

    adicionarReuniao: async (r: Omit<ReuniaoItem, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('reunioes').insert({
        titulo: r.titulo, tipo: r.tipo, status: r.status,
        data: r.data, duracao: r.duracao, participantes: r.participantes,
        pauta: r.pauta, ata: r.ata, decisoes: r.decisoes, proximos_passos: r.proximosPassos,
      }).select().single()
      if (data) usePurionStore.getState().adicionarReuniao({ ...r, id: String(data.id), createdAt: String(data.created_at) })
    },
  }
}
