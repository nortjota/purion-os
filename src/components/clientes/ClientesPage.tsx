'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, MessageCircle, Mail, ShoppingBag, Truck, HeartHandshake, Headphones, ShoppingCart, Star, AlertTriangle,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { usePosVenda } from '@/hooks/usePosVenda'
import { linkWhatsApp } from '@/hooks/useDespacho'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { formatarDataBR } from '@/lib/calculos'
import { fmtR, STATUS_ENTREGA_LABEL, STATUS_PAGAMENTO_LABEL } from '@/lib/vendas-helpers'
import { TIPO_FOLLOWUP } from '@/lib/posVenda'
import {
  agruparClientes, segmentoDoCliente, SEGMENTO_INFO, mascararDocumento, DIAS_EM_RISCO,
  type Cliente, type SegmentoCliente,
} from '@/lib/clientes'
import { Segmentado } from '@/components/ui/Segmentado'
import { MetricStrip } from '@/components/ui/MetricStrip'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'

type Filtro = 'todos' | SegmentoCliente

interface TicketCliente { id: string; numero: string; assunto: string; status: string; criado_em: string; cliente_email?: string; pedido_ref?: string }
interface CarrinhoCliente { id: string; email: string | null; valor_total: number; recuperado: boolean; criado_em: string; etapa: string }

// ─────────────────────────────────────────────
// FICHA DO CLIENTE (painel lateral)
// ─────────────────────────────────────────────

type EventoLinha = { quando: string; tipo: 'pedido' | 'entrega' | 'posvenda' | 'ticket' | 'carrinho'; titulo: string; detalhe?: string; href?: string; tom?: string }

const ICONE_EVENTO = { pedido: ShoppingBag, entrega: Truck, posvenda: HeartHandshake, ticket: Headphones, carrinho: ShoppingCart }

function FichaCliente({ cliente, onFechar }: { cliente: Cliente; onFechar: () => void }) {
  const { tarefas: followUps } = usePosVenda()
  const [tickets, setTickets] = useState<TicketCliente[]>([])
  const [carrinhos, setCarrinhos] = useState<CarrinhoCliente[]>([])

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    const emails = cliente.emails
    const pedidos = cliente.vendas.map((v) => v.id)
    // tickets ligados por e-mail ou pelo pedido
    const filtros = [
      ...emails.map((e) => `cliente_email.ilike.${e}`),
      ...pedidos.map((id) => `pedido_ref.eq.${id}`),
    ]
    if (filtros.length) {
      sb.from('tickets_sac').select('id, numero, assunto, status, criado_em, cliente_email, pedido_ref')
        .or(filtros.join(',')).order('criado_em', { ascending: false }).limit(30)
        .then(({ data, error }) => { dbLog('SELECT', 'tickets_sac (ficha cliente)', error, `${data?.length ?? 0} rows`); if (data) setTickets(data as TicketCliente[]) })
    }
    if (emails.length) {
      sb.from('carrinhos_abandonados').select('id, email, valor_total, recuperado, criado_em, etapa')
        .in('email', emails).order('criado_em', { ascending: false }).limit(20)
        .then(({ data, error }) => { dbLog('SELECT', 'carrinhos_abandonados (ficha cliente)', error, `${data?.length ?? 0} rows`); if (data) setCarrinhos(data as CarrinhoCliente[]) })
    }
  }, [cliente])

  const linha = useMemo<EventoLinha[]>(() => {
    const ev: EventoLinha[] = []
    const idsPedidos = new Set(cliente.vendas.map((v) => v.id))
    cliente.vendas.forEach((v: Venda) => {
      ev.push({
        quando: v.dataVenda, tipo: 'pedido',
        titulo: `Pedido ${v.canal.toUpperCase()} · ${fmtR(v.valorTotal ?? v.valorLiquido)}`,
        detalhe: `${v.quantidade}× ${v.produto || 'PURION GT'} · ${STATUS_PAGAMENTO_LABEL[v.statusPagamento]} · ${STATUS_ENTREGA_LABEL[v.statusEntrega]}`,
        href: '/vendas', tom: v.statusPagamento === 'pago' ? undefined : 'var(--status-warning)',
      })
      if (v.dataEnvio) ev.push({ quando: v.dataEnvio, tipo: 'entrega', titulo: 'Despachado', detalhe: [v.transportadora, v.codigoRastreio].filter(Boolean).join(' · ') || undefined })
      if (v.dataEntregaRealizada) ev.push({ quando: v.dataEntregaRealizada, tipo: 'entrega', titulo: 'Entregue', detalhe: v.satisfacao ? `nota ${v.satisfacao}/5` : undefined })
    })
    followUps.filter((f) => idsPedidos.has(f.pedidoId)).forEach((f) => ev.push({
      quando: f.concluidoEm ?? f.dataPrevista, tipo: 'posvenda',
      titulo: `${TIPO_FOLLOWUP[f.tipo]?.label ?? f.tipo}${f.mensagemCodigo ? ` (${f.mensagemCodigo})` : ''}`,
      detalhe: f.status === 'pendente' ? `previsto ${formatarDataBR(f.dataPrevista)}` : f.status === 'feito' ? 'feito' : f.status === 'suprimido' ? `suprimido${f.motivoSupressao ? `: ${f.motivoSupressao}` : ''}` : f.status,
      href: '/posvenda', tom: f.status === 'pendente' ? 'var(--text-primary)' : 'var(--text-secondary)',
    }))
    tickets.forEach((t) => ev.push({
      quando: t.criado_em, tipo: 'ticket', titulo: `Ticket ${t.numero} · ${t.assunto}`, detalhe: t.status.replace('_', ' '), href: '/sac',
      tom: ['aberto', 'em_atendimento', 'aguardando_cliente'].includes(t.status) ? 'var(--status-warning)' : undefined,
    }))
    carrinhos.forEach((c) => ev.push({
      quando: c.criado_em, tipo: 'carrinho', titulo: `Carrinho ${c.recuperado ? 'recuperado' : 'abandonado'} · ${fmtR(c.valor_total)}`, detalhe: `parou em: ${c.etapa}`, href: '/leads-site',
    }))
    return ev.sort((a, b) => b.quando.localeCompare(a.quando))
  }, [cliente, followUps, tickets, carrinhos])

  const seg = segmentoDoCliente(cliente)
  const telefone = cliente.telefones[0]
  const wa = telefone ? linkWhatsApp(telefone, '') : null
  const ticketsAbertos = tickets.filter((t) => ['aberto', 'em_atendimento', 'aguardando_cliente'].includes(t.status)).length

  return (
    <div data-modal className="ficha-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <aside className="ficha-painel" role="dialog" aria-label={`Ficha de ${cliente.nome}`}>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="kpi-label">Cliente</p>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, fontWeight: 700, marginTop: 2 }}>{cliente.nome}</h2>
            <p className="caption" style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
              {cliente.emails.map((e) => <span key={e}>{e}</span>)}
              {cliente.documentos.map((d) => <span key={d} className="tnum">{d.length === 11 ? 'CPF' : 'CNPJ'} {mascararDocumento(d)}</span>)}
              {cliente.telefones.slice(0, 2).map((t) => <span key={t}>{t}</span>)}
            </p>
          </div>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)"><X size={14} /></button>
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          <span className={`badge ${SEGMENTO_INFO[seg].badge}`}>{SEGMENTO_INFO[seg].label}</span>
          {cliente.canais.map((c) => <span key={c} className="badge badge-neutral">{c.toUpperCase()}</span>)}
          {ticketsAbertos > 0 && <span className="badge badge-warning"><AlertTriangle size={11} /> {ticketsAbertos} ticket(s) em aberto</span>}
          {cliente.satisfacaoMedia != null && <span className="badge badge-neutral"><Star size={11} /> {cliente.satisfacaoMedia.toFixed(1).replace('.', ',')}/5</span>}
        </div>

        <div style={{ marginTop: 14 }}>
          <MetricStrip
            rotulo="Resumo do cliente"
            metricas={[
              { label: 'Total gasto', valor: fmtR(cliente.totalGasto), sub: `${cliente.pedidosPagos} pedido${cliente.pedidosPagos !== 1 ? 's' : ''} pago${cliente.pedidosPagos !== 1 ? 's' : ''}` },
              { label: 'Ticket médio', valor: cliente.pedidosPagos ? fmtR(cliente.ticketMedio) : '—', sub: `${cliente.frascos} frasco${cliente.frascos !== 1 ? 's' : ''}` },
              { label: 'Última compra', valor: cliente.diasDesdeUltima != null ? `há ${cliente.diasDesdeUltima}d` : '—', sub: cliente.primeiraCompra ? `cliente desde ${formatarDataBR(cliente.primeiraCompra.slice(0, 10))}` : 'sem compra paga', tom: seg === 'em_risco' ? 'warning' : undefined },
            ]}
          />
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm" style={{ textDecoration: 'none' }}><MessageCircle size={13} /> WhatsApp</a>}
          {cliente.emails[0] && <a href={`mailto:${cliente.emails[0]}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}><Mail size={13} /> E-mail</a>}
          <Link href="/sac" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}><Headphones size={13} /> SAC</Link>
        </div>

        {cliente.semIdentificador && (
          <p className="caption" style={{ marginTop: 12, color: 'var(--status-warning)' }}>
            Este pedido não tem CPF nem e-mail: não dá para juntar com outros pedidos da mesma pessoa.
          </p>
        )}

        <p className="kpi-label" style={{ marginTop: 20, marginBottom: 6 }}>Histórico · {linha.length}</p>
        <ol className="ficha-linha">
          {linha.map((e, i) => {
            const Icon = ICONE_EVENTO[e.tipo]
            const conteudo = (
              <>
                <span className="ficha-icone"><Icon size={13} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, color: e.tom ?? 'var(--text-primary)' }}>{e.titulo}</span>
                  {e.detalhe && <span className="caption" style={{ display: 'block' }}>{e.detalhe}</span>}
                </span>
                <span className="caption tnum" style={{ whiteSpace: 'nowrap' }}>{formatarDataBR(e.quando.slice(0, 10))}</span>
              </>
            )
            return (
              <li key={`${e.tipo}-${i}`}>
                {e.href ? <Link href={e.href} className="ficha-evento">{conteudo}</Link> : <div className="ficha-evento">{conteudo}</div>}
              </li>
            )
          })}
        </ol>
      </aside>
    </div>
  )
}

// ─────────────────────────────────────────────
// LISTA
// ─────────────────────────────────────────────

function ClientesPageInner() {
  const { vendas } = usePurionStore()
  const params = useSearchParams()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useEstadoPersistido<Filtro>('clientes.filtro', 'todos')
  const [abertoId, setAbertoId] = useState<string | null>(null)

  const clientes = useMemo(() => agruparClientes(vendas.filter((v) => (v.valorTotal ?? v.valorLiquido) > 0)), [vendas])

  // ?venda=<id> abre a ficha do cliente daquele pedido (link a partir de Vendas)
  useEffect(() => {
    const vendaId = params.get('venda')
    if (!vendaId) return
    const c = clientes.find((x) => x.vendas.some((v) => v.id === vendaId))
    if (c) setAbertoId(c.id)
  }, [params, clientes])

  const contagem = useMemo(() => {
    const n: Record<Filtro, number> = { todos: clientes.length, recorrente: 0, uma_compra: 0, em_risco: 0, sem_compra_paga: 0 }
    clientes.forEach((c) => { n[segmentoDoCliente(c)]++ })
    return n
  }, [clientes])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const termoDigitos = termo.replace(/\D/g, '')
    return clientes.filter((c) => {
      if (filtro !== 'todos' && segmentoDoCliente(c) !== filtro) return false
      if (!termo) return true
      return c.nome.toLowerCase().includes(termo)
        || c.emails.some((e) => e.includes(termo))
        || (termoDigitos.length >= 4 && (c.documentos.some((d) => d.includes(termoDigitos)) || c.telefones.some((t) => t.replace(/\D/g, '').includes(termoDigitos))))
    })
  }, [clientes, filtro, busca])

  const pagantes = clientes.filter((c) => c.pedidosPagos > 0)
  const recorrentes = pagantes.filter((c) => c.pedidosPagos >= 2).length
  const ltv = pagantes.length ? pagantes.reduce((s, c) => s + c.totalGasto, 0) / pagantes.length : 0
  const semId = clientes.filter((c) => c.semIdentificador).length
  const aberto = clientes.find((c) => c.id === abertoId) ?? null

  function fechar() {
    setAbertoId(null)
    if (params.get('venda')) router.replace('/clientes')
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="toolbar">
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 className="page-title">Clientes</h1>
          <p className="caption mt-1">Um registro por pessoa: pedidos com o mesmo CPF ou o mesmo e-mail viram um cliente só.</p>
        </div>
      </div>

      <MetricStrip
        rotulo="Resumo de clientes"
        metricas={[
          { label: 'Clientes', valor: pagantes.length, sub: 'com compra paga' },
          { label: 'Recorrentes', valor: recorrentes, sub: pagantes.length ? `${Math.round((recorrentes / pagantes.length) * 100)}% compraram 2+ vezes` : '—', onClick: () => setFiltro(filtro === 'recorrente' ? 'todos' : 'recorrente'), ativo: filtro === 'recorrente' },
          { label: 'Valor por cliente', valor: fmtR(ltv), sub: 'gasto médio acumulado' },
          { label: 'Em risco', valor: contagem.em_risco, sub: `sem compra há +${DIAS_EM_RISCO} dias`, tom: contagem.em_risco > 0 ? 'warning' : undefined, onClick: () => setFiltro(filtro === 'em_risco' ? 'todos' : 'em_risco'), ativo: filtro === 'em_risco' },
          ...(semId > 0 ? [{ label: 'Sem CPF nem e-mail', valor: semId, sub: 'pedidos que não dá para juntar', tom: 'warning' as const }] : []),
        ]}
      />

      <div className="toolbar">
        <label className="busca" style={{ flex: '1 1 260px', maxWidth: 420 }}>
          <Search size={13} aria-hidden />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, e-mail, CPF ou telefone" aria-label="Buscar cliente" />
        </label>
        <span className="toolbar-espaco" />
        <Segmentado
          rotulo="Segmento" valor={filtro} onChange={setFiltro}
          opcoes={[
            { id: 'todos', label: 'Todos', contagem: contagem.todos },
            { id: 'recorrente', label: 'Recorrentes', contagem: contagem.recorrente },
            { id: 'uma_compra', label: '1 compra', contagem: contagem.uma_compra },
            { id: 'em_risco', label: 'Em risco', contagem: contagem.em_risco },
          ]}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{clientes.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum cliente com esse filtro'}</p>
          <p className="empty-state-subtitle">{clientes.length === 0 ? 'Os clientes aparecem aqui a partir das vendas registradas.' : 'Ajuste a busca ou o segmento.'}</p>
        </div>
      ) : (
        <div className="card-purion overflow-hidden">
          <table className="table-purion">
            <thead>
              <tr><th>Cliente</th><th>Contato</th><th>Pedidos</th><th>Total gasto</th><th>Última compra</th><th>Situação</th></tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 300).map((c) => {
                const seg = segmentoDoCliente(c)
                return (
                  <tr key={c.id} className="linha-clicavel purion-row" onClick={() => setAbertoId(c.id)}>
                    <td>{c.nome}</td>
                    <td className="caption">{c.emails[0] ?? c.telefones[0] ?? '—'}</td>
                    <td className="tnum">{c.pedidosPagos}</td>
                    <td className="td-mono" style={{ textAlign: 'left' }}>{fmtR(c.totalGasto)}</td>
                    <td className="caption tnum">{c.ultimaCompra ? formatarDataBR(c.ultimaCompra.slice(0, 10)) : '—'}</td>
                    <td><span className={`badge ${SEGMENTO_INFO[seg].badge}`}>{SEGMENTO_INFO[seg].label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtrados.length > 300 && <p className="caption" style={{ padding: '10px 16px' }}>Mostrando 300 de {filtrados.length}. Use a busca para achar um cliente específico.</p>}
        </div>
      )}

      {aberto && <FichaCliente cliente={aberto} onFechar={fechar} />}
    </div>
  )
}

export function ClientesPage() {
  return <Suspense><ClientesPageInner /></Suspense>
}
