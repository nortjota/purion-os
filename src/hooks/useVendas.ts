'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { normalizarEstagio, criarTarefaReposicaoD21 } from './useCRM'
import type {
  Venda, StatusVendaAppmax, CanalVenda, StatusPagamentoVenda, StatusEntregaVenda, PerfilUsuario,
  OrigemVenda, TipoCliente,
} from '@/store'

type Row = Record<string, unknown>

function toVenda(r: Row): Venda {
  return {
    id:               String(r.id),
    pedidoAppmax:     r.pedido_appmax ? String(r.pedido_appmax) : null,
    clienteNome:      String(r.cliente_nome ?? ''),
    clienteEmail:     String(r.cliente_email ?? ''),
    clienteTelefone:  String(r.cliente_telefone ?? ''),
    clienteDocumento: r.cliente_documento ? String(r.cliente_documento) : null,
    valorBruto:       Number(r.valor_bruto ?? 0),
    valorLiquido:     Number(r.valor_liquido ?? 0),
    taxa:             Number(r.taxa ?? 0),
    status:           String(r.status ?? 'pendente') as StatusVendaAppmax,
    metodoPagamento:  String(r.metodo_pagamento ?? 'desconhecido'),
    parcelas:         Number(r.parcelas ?? 1),
    canal:            String(r.canal ?? 'b2c') as CanalVenda,
    afiliadoCodigo:   r.afiliado_codigo ? String(r.afiliado_codigo) : null,
    produto:          String(r.produto ?? ''),
    quantidade:       Number(r.quantidade ?? 1),
    dataVenda:        String(r.data_venda ?? r.created_at ?? new Date().toISOString()),
    createdAt:        String(r.created_at ?? new Date().toISOString()),

    leadId:               r.lead_id ? String(r.lead_id) : null,
    cep:                  r.cep ? String(r.cep) : null,
    endereco:             r.endereco ? String(r.endereco) : null,
    numero:               r.numero ? String(r.numero) : null,
    complemento:          r.complemento ? String(r.complemento) : null,
    bairro:               r.bairro ? String(r.bairro) : null,
    cidade:               r.cidade ? String(r.cidade) : null,
    uf:                   r.uf ? String(r.uf) : null,
    valorUnitario:        r.valor_unitario != null ? Number(r.valor_unitario) : null,
    desconto:             Number(r.desconto ?? 0),
    valorTotal:           r.valor_total != null ? Number(r.valor_total) : null,
    statusPagamento:      String(r.status_pagamento ?? 'pendente') as StatusPagamentoVenda,
    statusEntrega:        String(r.status_entrega ?? 'aguardando') as StatusEntregaVenda,
    codigoRastreio:       r.codigo_rastreio ? String(r.codigo_rastreio) : null,
    transportadora:       r.transportadora ? String(r.transportadora) : null,
    dataEnvio:            r.data_envio ? String(r.data_envio) : null,
    dataEntregaPrevista:  r.data_entrega_prevista ? String(r.data_entrega_prevista) : null,
    dataEntregaRealizada: r.data_entrega_realizada ? String(r.data_entrega_realizada) : null,
    afiliadoCreatorId:    r.afiliado_creator_id ? String(r.afiliado_creator_id) : null,
    responsavel:          r.responsavel ? (String(r.responsavel) as PerfilUsuario) : null,
    observacoes:          r.observacoes ? String(r.observacoes) : null,
    updatedAt:            String(r.updated_at ?? r.created_at ?? new Date().toISOString()),
    estoqueBaixado:       Boolean(r.estoque_baixado ?? false),
    financeiroLancado:    Boolean(r.financeiro_lancado ?? false),
    origemVenda:          r.origem_venda ? (String(r.origem_venda) as OrigemVenda) : null,
    cupom:                r.cupom ? String(r.cupom) : null,
    tipoCliente:          String(r.tipo_cliente ?? 'novo') as TipoCliente,
    notaFiscal:           r.nota_fiscal ? String(r.nota_fiscal) : null,
  }
}

export type NovaVendaManual = {
  canal: CanalVenda
  clienteNome: string
  clienteTelefone?: string
  clienteEmail?: string
  clienteDocumento?: string
  leadId?: string | null
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  quantidade: number
  valorUnitario: number
  desconto?: number
  valorTotal: number
  metodoPagamento: string
  parcelas?: number
  statusPagamento: StatusPagamentoVenda
  statusEntrega?: StatusEntregaVenda
  transportadora?: string
  codigoRastreio?: string
  dataEnvio?: string | null
  dataEntregaPrevista?: string | null
  afiliadoCreatorId?: string | null
  dataVenda?: string
  responsavel?: PerfilUsuario
  observacoes?: string
  produto?: string
  origemVenda?: OrigemVenda | null
  tipoCliente?: TipoCliente
  notaFiscal?: string | null
}

export function useVendas() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb
        .from('vendas')
        .select('*')
        .is('deleted_at', null)
        .order('data_venda', { ascending: false })
      dbLog('SELECT', 'vendas', error, `${data?.length ?? 0} rows`)
      if (data) usePurionStore.getState().setVendas(data.map(toVenda))
    }

    load()

    const ch = sb.channel(`vendas-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  /** Cria o lançamento de receita no financeiro quando uma venda fica paga. Idempotente por pedido_id. */
  async function gerarLancamentoFinanceiro(venda: Venda) {
    const sb = supabase
    if (!sb) return
    const { data: existente } = await sb.from('financeiro').select('id').eq('pedido_id', venda.id).maybeSingle()
    if (existente) return

    const valor = venda.valorTotal ?? venda.valorLiquido
    const { error } = await sb.from('financeiro').insert({
      tipo: 'receita',
      categoria: venda.canal === 'b2b' ? 'venda_b2b' : 'venda_b2c',
      valor,
      data: new Date().toISOString().slice(0, 10),
      descricao: `Venda ${venda.canal.toUpperCase()} — ${venda.clienteNome || 'Cliente'}`,
      regiao: 'DF',
      responsavel: venda.responsavel ?? 'matheus',
      pedido_id: venda.id,
    })
    dbLog('INSERT', 'financeiro (venda)', error, venda.id)
  }

  /** Recompra = já existe outra venda do mesmo cliente (por leadId em B2B, ou telefone/e-mail em B2C). */
  function detectarTipoCliente(v: NovaVendaManual): TipoCliente {
    const vendasAtuais = usePurionStore.getState().vendas
    const jaComprou = vendasAtuais.some((existente) => {
      if (v.canal === 'b2b' && v.leadId) return existente.leadId === v.leadId
      if (v.clienteTelefone) return existente.clienteTelefone === v.clienteTelefone
      if (v.clienteEmail) return existente.clienteEmail === v.clienteEmail
      return false
    })
    return jaComprou ? 'recompra' : 'novo'
  }

  return {
    criarVenda: async (v: NovaVendaManual) => {
      const sb = supabase
      if (!sb) return
      const tipoCliente = v.tipoCliente ?? detectarTipoCliente(v)
      const payload = {
        canal:               v.canal,
        cliente_nome:        v.clienteNome,
        cliente_telefone:    v.clienteTelefone ?? null,
        cliente_email:       v.clienteEmail ?? null,
        cliente_documento:   v.clienteDocumento ?? null,
        lead_id:             v.leadId ?? null,
        cep:                 v.cep ?? null,
        endereco:            v.endereco ?? null,
        numero:              v.numero ?? null,
        complemento:         v.complemento ?? null,
        bairro:              v.bairro ?? null,
        cidade:              v.cidade ?? null,
        uf:                  v.uf ?? null,
        quantidade:          v.quantidade,
        valor_unitario:      v.valorUnitario,
        desconto:            v.desconto ?? 0,
        valor_total:         v.valorTotal,
        valor_liquido:       v.valorTotal,
        valor_bruto:         v.valorTotal,
        metodo_pagamento:    v.metodoPagamento,
        parcelas:            v.parcelas ?? 1,
        status_pagamento:    v.statusPagamento,
        status:              v.statusPagamento === 'pago' ? 'aprovado' : v.statusPagamento === 'cancelado' ? 'recusado' : v.statusPagamento === 'estornado' ? 'estornado' : 'pendente',
        status_entrega:      v.statusEntrega ?? 'aguardando',
        transportadora:      v.transportadora ?? null,
        codigo_rastreio:     v.codigoRastreio ?? null,
        data_envio:          v.dataEnvio ?? null,
        data_entrega_prevista: v.dataEntregaPrevista ?? null,
        afiliado_creator_id: v.afiliadoCreatorId ?? null,
        data_venda:          v.dataVenda ?? new Date().toISOString(),
        responsavel:         v.responsavel ?? 'matheus',
        observacoes:         v.observacoes ?? null,
        produto:             v.produto ?? 'Perfume PURION GT',
        origem_venda:        v.origemVenda ?? (v.canal === 'b2b' ? 'b2b_presencial' : null),
        tipo_cliente:        tipoCliente,
        nota_fiscal:         v.notaFiscal ?? null,
      }
      const { data, error } = await sb.from('vendas').insert(payload).select().single()
      dbLog('INSERT', 'vendas', error, data?.id)
      if (error) { toastError('Erro ao registrar venda', error.message); return }
      if (!data) return

      const venda = toVenda(data)
      usePurionStore.getState().adicionarVenda(venda)
      success(v.canal === 'b2b' ? 'Venda B2B registrada' : 'Venda registrada')

      if (venda.statusPagamento === 'pago') await gerarLancamentoFinanceiro(venda)

      if (venda.canal === 'b2b' && venda.leadId) {
        const leadAtual = usePurionStore.getState().leads.find((l) => l.id === venda.leadId)
        const jaEraCliente = leadAtual ? ['cliente', 'recorrente'].includes(normalizarEstagio(leadAtual.status)) : false
        const historico = [
          ...(leadAtual?.historicoEstagios ?? []),
          { id: `hist-${Date.now()}`, de: leadAtual?.status ?? null, para: 'cliente' as const, timestamp: new Date().toISOString() },
        ]
        const { error: leadErr } = await sb.from('leads_crm')
          .update({ status: 'cliente', historico_estagios: historico })
          .eq('id', venda.leadId)
        dbLog('UPDATE', 'leads_crm (fechamento b2b)', leadErr, venda.leadId)
        if (!leadErr) {
          usePurionStore.getState().atualizarLead(venda.leadId, { status: 'cliente', historicoEstagios: historico })
          if (leadAtual && !jaEraCliente) criarTarefaReposicaoD21({ ...leadAtual, status: 'cliente' })
        }
      }
    },

    atualizarVenda: async (id: string, dados: Partial<NovaVendaManual>) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('vendas').update({
        ...(dados.clienteNome        !== undefined && { cliente_nome:        dados.clienteNome }),
        ...(dados.clienteTelefone    !== undefined && { cliente_telefone:    dados.clienteTelefone }),
        ...(dados.clienteEmail       !== undefined && { cliente_email:       dados.clienteEmail }),
        ...(dados.clienteDocumento   !== undefined && { cliente_documento:   dados.clienteDocumento }),
        ...(dados.cep                !== undefined && { cep:                 dados.cep }),
        ...(dados.endereco           !== undefined && { endereco:            dados.endereco }),
        ...(dados.numero             !== undefined && { numero:              dados.numero }),
        ...(dados.complemento        !== undefined && { complemento:         dados.complemento }),
        ...(dados.bairro             !== undefined && { bairro:              dados.bairro }),
        ...(dados.cidade             !== undefined && { cidade:              dados.cidade }),
        ...(dados.uf                 !== undefined && { uf:                  dados.uf }),
        ...(dados.quantidade         !== undefined && { quantidade:          dados.quantidade }),
        ...(dados.valorUnitario      !== undefined && { valor_unitario:      dados.valorUnitario }),
        ...(dados.desconto           !== undefined && { desconto:            dados.desconto }),
        ...(dados.valorTotal         !== undefined && { valor_total: dados.valorTotal, valor_liquido: dados.valorTotal, valor_bruto: dados.valorTotal }),
        ...(dados.metodoPagamento    !== undefined && { metodo_pagamento:    dados.metodoPagamento }),
        ...(dados.parcelas           !== undefined && { parcelas:            dados.parcelas }),
        ...(dados.transportadora     !== undefined && { transportadora:      dados.transportadora }),
        ...(dados.codigoRastreio     !== undefined && { codigo_rastreio:     dados.codigoRastreio }),
        ...(dados.dataEnvio          !== undefined && { data_envio:          dados.dataEnvio }),
        ...(dados.dataEntregaPrevista !== undefined && { data_entrega_prevista: dados.dataEntregaPrevista }),
        ...(dados.afiliadoCreatorId  !== undefined && { afiliado_creator_id: dados.afiliadoCreatorId }),
        ...(dados.responsavel        !== undefined && { responsavel:         dados.responsavel }),
        ...(dados.observacoes        !== undefined && { observacoes:         dados.observacoes }),
        ...(dados.origemVenda        !== undefined && { origem_venda:        dados.origemVenda }),
        ...(dados.tipoCliente        !== undefined && { tipo_cliente:        dados.tipoCliente }),
        ...(dados.notaFiscal         !== undefined && { nota_fiscal:         dados.notaFiscal }),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      dbLog('UPDATE', 'vendas', error, id)
      if (error) { toastError('Erro ao salvar venda', error.message); return }
      usePurionStore.getState().atualizarVenda(id, dados as Partial<Venda>)
      success('Venda atualizada')
    },

    mudarStatusPagamento: async (id: string, statusPagamento: StatusPagamentoVenda) => {
      const sb = supabase
      if (!sb) return
      const { error } = await sb.from('vendas').update({ status_pagamento: statusPagamento, updated_at: new Date().toISOString() }).eq('id', id)
      dbLog('UPDATE', 'vendas (status_pagamento)', error, id)
      if (error) { toastError('Erro ao atualizar pagamento', error.message); return }
      usePurionStore.getState().atualizarVenda(id, { statusPagamento })
      success('Status de pagamento atualizado')

      if (statusPagamento === 'pago') {
        const venda = usePurionStore.getState().vendas.find((v) => v.id === id)
        if (venda) await gerarLancamentoFinanceiro({ ...venda, statusPagamento })
      }
    },

    mudarStatusEntrega: async (id: string, statusEntrega: StatusEntregaVenda) => {
      const sb = supabase
      if (!sb) return
      const extras: Record<string, string> = {}
      if (statusEntrega === 'postado') extras.data_envio = new Date().toISOString()
      if (statusEntrega === 'entregue') extras.data_entrega_realizada = new Date().toISOString()
      const { error } = await sb.from('vendas').update({ status_entrega: statusEntrega, updated_at: new Date().toISOString(), ...extras }).eq('id', id)
      dbLog('UPDATE', 'vendas (status_entrega)', error, id)
      if (error) { toastError('Erro ao atualizar entrega', error.message); return }
      usePurionStore.getState().atualizarVenda(id, { statusEntrega, ...(extras.data_envio && { dataEnvio: extras.data_envio }), ...(extras.data_entrega_realizada && { dataEntregaRealizada: extras.data_entrega_realizada }) })
      success('Status de entrega atualizado')

      // Baixa estoque quando postado (idempotente via estoque_baixado)
      if (statusEntrega === 'postado') {
        const venda = usePurionStore.getState().vendas.find((v) => v.id === id)
        if (venda && !venda.estoqueBaixado) {
          const { data: estoque } = await sb.from('estoque_produto').select('quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
          if (estoque) {
            const saldo = Math.max(0, estoque.quantidade_atual - (venda.quantidade ?? 1))
            const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
              tipo: 'saida_venda', quantidade: venda.quantidade ?? 1,
              motivo: `Venda ${id}`, origem_tipo: 'venda', origem_id: id,
              saldo_apos: saldo, autor: venda.responsavel ?? 'matheus',
            })
            dbLog('INSERT', 'estoque_movimentacoes (saida_venda)', movErr, id)
            if (!movErr) {
              await sb.from('estoque_produto').update({ quantidade_atual: saldo, updated_at: new Date().toISOString() }).eq('quantidade_atual', estoque.quantidade_atual)
              await sb.from('vendas').update({ estoque_baixado: true }).eq('id', id)
              usePurionStore.getState().atualizarVenda(id, { estoqueBaixado: true })
            }
          }
        }
      }

      // Reverte estoque quando devolvido
      if (statusEntrega === 'devolvido') {
        const venda = usePurionStore.getState().vendas.find((v) => v.id === id)
        if (venda && venda.estoqueBaixado) {
          const { data: estoque } = await sb.from('estoque_produto').select('quantidade_atual').order('created_at', { ascending: true }).limit(1).maybeSingle()
          if (estoque) {
            const saldo = estoque.quantidade_atual + (venda.quantidade ?? 1)
            const { error: movErr } = await sb.from('estoque_movimentacoes').insert({
              tipo: 'ajuste', quantidade: venda.quantidade ?? 1,
              motivo: `Devolução venda ${id}`, origem_tipo: 'venda', origem_id: id,
              saldo_apos: saldo, autor: venda.responsavel ?? 'matheus',
            })
            dbLog('INSERT', 'estoque_movimentacoes (devolucao)', movErr, id)
            if (!movErr) {
              await sb.from('estoque_produto').update({ quantidade_atual: saldo, updated_at: new Date().toISOString() }).eq('quantidade_atual', estoque.quantidade_atual)
              await sb.from('vendas').update({ estoque_baixado: false }).eq('id', id)
              usePurionStore.getState().atualizarVenda(id, { estoqueBaixado: false })
            }
          }
        }
      }
    },

    deletarVenda: async (id: string) => {
      const sb = supabase
      if (sb) {
        const { error } = await sb.from('vendas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        dbLog('DELETE', 'vendas', error, id)
        if (error) { toastError('Erro ao excluir venda', error.message); return }
      }
      usePurionStore.getState().removerVenda(id)
      success('Venda excluída')
    },
  }
}
