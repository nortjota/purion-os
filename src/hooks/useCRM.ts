'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { Lead, Regiao, PerfilUsuario, TierLead, StatusLead, TipoEstabelecimento } from '@/store'

type Row = Record<string, unknown>

function toLead(r: Row): Lead {
  return {
    id:                  String(r.id),
    nomeEmpresa:         String(r.nome_empresa         ?? ''),
    nomeContato:         String(r.nome_contato         ?? ''),
    telefone:            String(r.telefone             ?? ''),
    email:               String(r.email                ?? ''),
    regiao:              String(r.regiao               ?? 'DF')        as Regiao,
    cidade:              String(r.cidade               ?? ''),
    responsavel:         String(r.responsavel          ?? 'matheus')   as PerfilUsuario,
    tier:                String(r.tier                 ?? 'C')         as TierLead,
    status:              String(r.status               ?? 'prospecto') as StatusLead,
    valorMedioMensal:    Number(r.valor_medio_mensal   ?? 0),
    ultimoPedido:        r.ultimo_pedido ? String(r.ultimo_pedido) : null,
    createdAt:           String(r.created_at           ?? new Date().toISOString()),
    updatedAt:           String(r.updated_at           ?? new Date().toISOString()),
    notas:               String(r.notas                ?? ''),
    tipoEstabelecimento: r.tipo_estabelecimento
                           ? String(r.tipo_estabelecimento) as TipoEstabelecimento
                           : undefined,
    historicoInteracoes: Array.isArray(r.historico_interacoes)
                           ? (r.historico_interacoes as Lead['historicoInteracoes'])
                           : [],
    latitude:            r.latitude  ? Number(r.latitude)  : undefined,
    longitude:           r.longitude ? Number(r.longitude) : undefined,
    tags:                Array.isArray(r.tags) ? (r.tags as string[]) : [],
  }
}

export function useCRM() {
  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const q = sb.from('leads_crm').select('*').order('created_at', { ascending: false })
      const { data, error } = await q.is('deleted_at', null)
      dbLog('SELECT', 'leads_crm', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setLeads(data.map(toLead))
    }

    load()

    const ch = sb.channel(`leads-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_crm' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    adicionarLead: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
      const sb = supabase
      if (!sb) return
      const now = new Date().toISOString()
      const { data, error } = await sb.from('leads_crm').insert({
        nome_empresa:         lead.nomeEmpresa,
        nome_contato:         lead.nomeContato,
        telefone:             lead.telefone,
        email:                lead.email,
        regiao:               lead.regiao,
        cidade:               lead.cidade,
        responsavel:          lead.responsavel,
        tier:                 lead.tier,
        status:               lead.status,
        valor_medio_mensal:   lead.valorMedioMensal,
        ultimo_pedido:        lead.ultimoPedido ?? null,
        notas:                lead.notas,
        tipo_estabelecimento: lead.tipoEstabelecimento ?? null,
        historico_interacoes: lead.historicoInteracoes ?? [],
        tags:                 lead.tags,
      }).select().single()
      dbLog('INSERT', 'leads_crm', error, data?.id)
      if (data) usePurionStore.getState().adicionarLead({
        ...lead, id: String(data.id), createdAt: now, updatedAt: now,
      })
    },

    atualizarLead: async (id: string, dados: Partial<Lead>) => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().atualizarLead(id, dados)
        return
      }
      const { error } = await sb.from('leads_crm').update({
        ...(dados.nomeEmpresa         !== undefined && { nome_empresa:         dados.nomeEmpresa }),
        ...(dados.nomeContato         !== undefined && { nome_contato:         dados.nomeContato }),
        ...(dados.telefone            !== undefined && { telefone:             dados.telefone }),
        ...(dados.email               !== undefined && { email:                dados.email }),
        ...(dados.regiao              !== undefined && { regiao:               dados.regiao }),
        ...(dados.cidade              !== undefined && { cidade:               dados.cidade }),
        ...(dados.responsavel         !== undefined && { responsavel:          dados.responsavel }),
        ...(dados.tier                !== undefined && { tier:                 dados.tier }),
        ...(dados.status              !== undefined && { status:               dados.status }),
        ...(dados.valorMedioMensal    !== undefined && { valor_medio_mensal:   dados.valorMedioMensal }),
        ...(dados.notas               !== undefined && { notas:                dados.notas }),
        ...(dados.tipoEstabelecimento !== undefined && { tipo_estabelecimento: dados.tipoEstabelecimento }),
        ...(dados.historicoInteracoes !== undefined && { historico_interacoes: dados.historicoInteracoes }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'leads_crm', error, id)
      usePurionStore.getState().atualizarLead(id, dados)
    },

    deletarLead: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('leads_crm').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'leads_crm', error, id)
      }
      usePurionStore.getState().removerLead(id)
    },

    restaurarLead: async (lead: Lead) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('leads_crm').update({ deleted_at: null }).eq('id', lead.id)
        dbLog('UPDATE', 'leads_crm', error, lead.id)
      }
      usePurionStore.getState().adicionarLead(lead)
    },
  }
}
