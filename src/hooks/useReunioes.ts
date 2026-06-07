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
    participantes:  Array.isArray(r.participantes)   ? (r.participantes   as PerfilUsuario[])              : [],
    pauta:          Array.isArray(r.pauta)            ? (r.pauta           as string[])                     : [],
    ata:            String(r.ata ?? ''),
    decisoes:       Array.isArray(r.decisoes)         ? (r.decisoes        as string[])                     : [],
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
    // DB column is 'bloqueado'; mapped back to app field 'bloqueadoEm'
    bloqueadoEm: String(r.bloqueado_em ?? r.bloqueado ?? ''),
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
      const { data } = await sb
        .from('reunioes')
        .select('*')
        .is('deleted_at', null)
        .order('data', { ascending: false })
      if (data) usePurionStore.getState().setReunioes(data.map(toReuniao))
    }
    const loadD = async () => {
      const { data } = await sb
        .from('daily_async')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setDailyEntries(data.map(toDaily))
    }
    const loadDec = async () => {
      const { data } = await sb
        .from('decisoes')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (data) usePurionStore.getState().setDecisoes(data.map(toDecisao))
    }

    loadR(); loadD(); loadDec()

    const chR   = sb.channel('reunioes-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'reunioes'    }, loadR  ).subscribe()
    const chD   = sb.channel('daily-sync')   .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_async' }, loadD  ).subscribe()
    const chDec = sb.channel('decisoes-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'decisoes'    }, loadDec).subscribe()

    return () => { sb.removeChannel(chR); sb.removeChannel(chD); sb.removeChannel(chDec) }
  }, [])

  return {
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

    atualizarReuniao: async (id: string, dados: Partial<ReuniaoItem>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarReuniao(id, dados)
        return
      }
      await sb.from('reunioes').update({
        ...(dados.titulo          !== undefined && { titulo:          dados.titulo }),
        ...(dados.tipo            !== undefined && { tipo:            dados.tipo }),
        ...(dados.status          !== undefined && { status:          dados.status }),
        ...(dados.data            !== undefined && { data:            dados.data }),
        ...(dados.duracao         !== undefined && { duracao:         dados.duracao }),
        ...(dados.participantes   !== undefined && { participantes:   dados.participantes }),
        ...(dados.pauta           !== undefined && { pauta:           dados.pauta }),
        ...(dados.ata             !== undefined && { ata:             dados.ata }),
        ...(dados.decisoes        !== undefined && { decisoes:        dados.decisoes }),
        ...(dados.proximosPassos  !== undefined && { proximos_passos: dados.proximosPassos }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      usePurionStore.getState().atualizarReuniao(id, dados)
    },

    deletarReuniao: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('reunioes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      const store = usePurionStore.getState()
      store.setReunioes(store.reunioes.filter((r) => r.id !== id))
    },

    restaurarReuniao: async (reuniao: ReuniaoItem) => {
      const sb = supabase
      if (sb) await sb.from('reunioes').update({ deleted_at: null }).eq('id', reuniao.id)
      usePurionStore.getState().adicionarReuniao(reuniao)
    },

    adicionarDecisao: async (d: Omit<DecisaoEstrategica, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('decisoes').insert({
        titulo:        d.titulo,
        descricao:     d.descricao,
        proposto_por:  d.propostoPor,
        data:          d.data,
        prazo_votacao: d.prazoVotacao,
        votos:         d.votos,
        status:        d.status,
      }).select().single()
      if (data) usePurionStore.getState().adicionarDecisao({ ...d, id: String(data.id), createdAt: String(data.created_at) })
    },

    atualizarDecisao: async (id: string, dados: Partial<DecisaoEstrategica>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarDecisao(id, dados)
        return
      }
      await sb.from('decisoes').update({
        ...(dados.titulo        !== undefined && { titulo:        dados.titulo }),
        ...(dados.descricao     !== undefined && { descricao:     dados.descricao }),
        ...(dados.propostoPor   !== undefined && { proposto_por:  dados.propostoPor }),
        ...(dados.data          !== undefined && { data:          dados.data }),
        ...(dados.prazoVotacao  !== undefined && { prazo_votacao: dados.prazoVotacao }),
        ...(dados.votos         !== undefined && { votos:         dados.votos }),
        ...(dados.status        !== undefined && { status:        dados.status }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      usePurionStore.getState().atualizarDecisao(id, dados)
    },

    deletarDecisao: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('decisoes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      const store = usePurionStore.getState()
      store.setDecisoes(store.decisoes.filter((d) => d.id !== id))
    },

    restaurarDecisao: async (decisao: DecisaoEstrategica) => {
      const sb = supabase
      if (sb) await sb.from('decisoes').update({ deleted_at: null }).eq('id', decisao.id)
      usePurionStore.getState().adicionarDecisao(decisao)
    },

    adicionarDaily: async (entry: Omit<DailyEntry, 'id' | 'createdAt'>) => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.from('daily_async').insert({
        socio: entry.socio, data: entry.data,
        ontem_fiz: entry.ontemFiz, hoje_farei: entry.hojeFarei, bloqueado: entry.bloqueadoEm,
      }).select().single()
      if (data) usePurionStore.getState().adicionarDailyEntry({ ...entry, id: String(data.id), createdAt: String(data.created_at) })
    },

    atualizarDaily: async (id: string, dados: Partial<DailyEntry>) => {
      const sb = supabase
      if (sb) {
        await sb.from('daily_async').update({
          ...(dados.ontemFiz    !== undefined && { ontem_fiz:  dados.ontemFiz }),
          ...(dados.hojeFarei   !== undefined && { hoje_farei: dados.hojeFarei }),
          ...(dados.bloqueadoEm !== undefined && { bloqueado:  dados.bloqueadoEm }),
        }).eq('id', id)
      }
      const store = usePurionStore.getState()
      store.setDailyEntries(store.dailyEntries.map((d) => d.id === id ? { ...d, ...dados } : d))
    },

    deletarDaily: async (id: string) => {
      const sb = supabase
      if (sb) await sb.from('daily_async').delete().eq('id', id)
      const store = usePurionStore.getState()
      store.setDailyEntries(store.dailyEntries.filter((d) => d.id !== id))
    },

    restaurarDaily: async (entry: DailyEntry) => {
      const sb = supabase
      if (sb) await sb.from('daily_async').insert({
        socio: entry.socio, data: entry.data,
        ontem_fiz: entry.ontemFiz, hoje_farei: entry.hojeFarei, bloqueado: entry.bloqueadoEm,
      })
      usePurionStore.getState().adicionarDailyEntry(entry)
    },
  }
}
