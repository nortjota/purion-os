'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { useToast } from '@/components/ui/Toast'
import {
  motivoSupressao, DIAS_LEMBRETE, MAX_LEMBRETES,
  type FollowUpTarefa, type TicketAberto, type TipoFollowUp, type StatusFollowUp, type CanalFollowUp,
} from '@/lib/posVenda'

type Row = Record<string, unknown>

function toFollowUp(r: Row): FollowUpTarefa {
  return {
    id:              String(r.id),
    pedidoId:        String(r.pedido_id),
    clienteNome:     String(r.cliente_nome ?? ''),
    clienteTelefone: r.cliente_telefone ? String(r.cliente_telefone) : null,
    clienteEmail:    r.cliente_email ? String(r.cliente_email) : null,
    tipo:            String(r.tipo) as TipoFollowUp,
    gatilho:         String(r.gatilho ?? ''),
    dataPrevista:    String(r.data_prevista),
    janelaFim:       r.janela_fim ? String(r.janela_fim) : null,
    canal:           String(r.canal ?? 'whatsapp') as CanalFollowUp,
    status:          String(r.status ?? 'pendente') as StatusFollowUp,
    motivoSupressao: r.motivo_supressao ? String(r.motivo_supressao) : null,
    mensagemCodigo:  r.mensagem_sugerida_codigo ? String(r.mensagem_sugerida_codigo) : null,
    comercial:       Boolean(r.comercial),
    lembretes:       Number(r.lembretes ?? 0),
    responsavel:     String(r.responsavel ?? 'matheus'),
    concluidoEm:     r.concluido_em ? String(r.concluido_em) : null,
    createdAt:       String(r.created_at ?? ''),
  }
}

export function hojeLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Campos de consentimento/contexto editáveis no pedido. */
export interface SinaisCliente {
  optInPesquisa?: boolean
  optInMarketing?: boolean
  optOutWhatsappMarketing?: boolean
  compraPresente?: boolean
  participaEstudo?: boolean
  sinalReposicao?: boolean
}

const COLUNA_SINAL: Record<keyof SinaisCliente, string> = {
  optInPesquisa: 'opt_in_pesquisa',
  optInMarketing: 'opt_in_marketing',
  optOutWhatsappMarketing: 'opt_out_whatsapp_marketing',
  compraPresente: 'compra_presente',
  participaEstudo: 'participa_estudo',
  sinalReposicao: 'sinal_reposicao',
}

export function usePosVenda() {
  const { success, error: toastError, toast } = useToast()
  const [tarefas, setTarefas] = useState<FollowUpTarefa[]>([])
  const [tickets, setTickets] = useState<TicketAberto[]>([])
  const [carregando, setCarregando] = useState(!!supabase)
  const [tabelaAusente, setTabelaAusente] = useState(false)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return

    const { data, error } = await sb.from('follow_up_tarefas').select('*').order('data_prevista', { ascending: true })
    dbLog('SELECT', 'follow_up_tarefas', error, `${data?.length ?? 0} rows`)
    if (error) {
      // 42P01 = tabela não existe (migration ainda não rodou)
      if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message)) setTabelaAusente(true)
      setCarregando(false)
      return
    }
    setTabelaAusente(false)

    const { data: tk, error: tkErr } = await sb.from('tickets_sac')
      .select('pedido_ref, cliente_email, cliente_whatsapp, tipo, status')
      .in('tipo', ['reclamacao', 'troca', 'devolucao'])
      .in('status', ['aberto', 'em_atendimento', 'aguardando_cliente'])
    dbLog('SELECT', 'tickets_sac (reclamacoes abertas)', tkErr, `${tk?.length ?? 0} rows`)
    const abertos: TicketAberto[] = (tk ?? []).map((t: Row) => ({
      pedidoRef: t.pedido_ref ? String(t.pedido_ref) : null,
      clienteEmail: t.cliente_email ? String(t.cliente_email) : null,
      clienteWhatsapp: t.cliente_whatsapp ? String(t.cliente_whatsapp) : null,
    }))

    let lista = (data ?? []).map(toFollowUp)

    // Supressão ao vivo: reaplica as regras do playbook em toda tarefa pendente
    const vendas = usePurionStore.getState().vendas
    const porId = new Map(vendas.map((v) => [v.id, v]))
    const agora = new Date().toISOString()
    const suprimir: Array<{ id: string; motivo: string }> = []
    for (const t of lista) {
      if (t.status !== 'pendente') continue
      const motivo = motivoSupressao(t, porId.get(t.pedidoId), abertos)
      if (motivo) suprimir.push({ id: t.id, motivo })
    }
    for (const s of suprimir) {
      const { error: supErr } = await sb.from('follow_up_tarefas')
        .update({ status: 'suprimido', motivo_supressao: s.motivo, updated_at: agora })
        .eq('id', s.id).eq('status', 'pendente')
      dbLog('UPDATE', 'follow_up_tarefas (supressao automatica)', supErr, `${s.id}: ${s.motivo}`)
    }
    if (suprimir.length > 0) {
      const mapa = new Map(suprimir.map((s) => [s.id, s.motivo]))
      lista = lista.map((t) => mapa.has(t.id) ? { ...t, status: 'suprimido', motivoSupressao: mapa.get(t.id)! } : t)
    }

    setTickets(abertos)
    setTarefas(lista)
    setCarregando(false)
  }, [])

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    void Promise.resolve().then(load)
    const ch = sb.channel(`posvenda-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_up_tarefas' }, () => { load() })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  async function atualizarTarefa(id: string, campos: Record<string, unknown>, local: Partial<FollowUpTarefa>) {
    const sb = supabase
    if (!sb) return false
    const { error } = await sb.from('follow_up_tarefas').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id)
    dbLog('UPDATE', 'follow_up_tarefas', error, id)
    if (error) { toastError('Erro ao atualizar follow-up', error.message); return false }
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, ...local } : t)))
    return true
  }

  return {
    tarefas,
    tickets,
    carregando,
    tabelaAusente,
    recarregar: load,

    marcarFeito: async (id: string) => {
      const agora = new Date().toISOString()
      if (await atualizarTarefa(id, { status: 'feito', concluido_em: agora }, { status: 'feito', concluidoEm: agora })) success('Follow-up concluído')
    },

    suprimir: async (id: string, motivo: string) => {
      if (await atualizarTarefa(id, { status: 'suprimido', motivo_supressao: motivo }, { status: 'suprimido', motivoSupressao: motivo })) {
        toast({ type: 'info', title: 'Follow-up suprimido', description: motivo })
      }
    },

    /** Cliente não respondeu: 1 lembrete em +3 dias; no 2º "sem resposta" a tarefa é encerrada. */
    semResposta: async (t: FollowUpTarefa) => {
      if (t.lembretes >= MAX_LEMBRETES) {
        const motivo = 'Sem resposta após 1 lembrete — encerrado'
        if (await atualizarTarefa(t.id, { status: 'suprimido', motivo_supressao: motivo }, { status: 'suprimido', motivoSupressao: motivo })) {
          toast({ type: 'info', title: 'Follow-up encerrado', description: motivo })
        }
        return
      }
      const nova = somarDias(hojeLocalISO(), DIAS_LEMBRETE)
      if (await atualizarTarefa(t.id, { lembretes: t.lembretes + 1, data_prevista: nova }, { lembretes: t.lembretes + 1, dataPrevista: nova })) {
        success('Lembrete agendado', `Nova tentativa em ${new Date(`${nova}T12:00:00`).toLocaleDateString('pt-BR')}`)
      }
    },

    /** Atualiza consentimentos/contexto do cliente no pedido (o banco gera/ajusta a jornada). */
    atualizarSinais: async (venda: Venda, sinais: SinaisCliente) => {
      const sb = supabase
      if (!sb) return
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const [k, v] of Object.entries(sinais)) payload[COLUNA_SINAL[k as keyof SinaisCliente]] = v
      const { error } = await sb.from('vendas').update(payload).eq('id', venda.id)
      dbLog('UPDATE', 'vendas (sinais pos-venda)', error, venda.id)
      if (error) { toastError('Erro ao salvar preferências do cliente', error.message); return }
      usePurionStore.getState().atualizarVenda(venda.id, sinais)
      await load()
    },

    /** Registra a nota de satisfação (1-5). Nota 4-5 gera Avaliação/UGC (M07); 1-2 suprime avaliação e oferta. */
    registrarFeedback: async (venda: Venda, nota: number) => {
      const sb = supabase
      if (!sb) return
      const agora = new Date().toISOString()
      const { error } = await sb.from('vendas').update({ satisfacao: nota, feedback_em: agora, updated_at: agora }).eq('id', venda.id)
      dbLog('UPDATE', 'vendas (satisfacao)', error, `${venda.id}: ${nota}`)
      if (error) { toastError('Erro ao registrar feedback', error.message); return }
      usePurionStore.getState().atualizarVenda(venda.id, { satisfacao: nota, feedbackEm: agora })
      success('Feedback registrado', nota >= 4 ? 'Avaliação/UGC (M07) agendada' : nota <= 2 ? 'Avaliação e ofertas suprimidas' : undefined)
      await load()
    },
  }
}
