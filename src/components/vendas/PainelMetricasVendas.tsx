'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { usePurionStore } from '@/store'
import type { OrigemVenda } from '@/store'
import { ToggleLeft, ToggleRight, Info } from 'lucide-react'
import { fmtR, calcularMargem, ORIGEM_VENDA_LABEL, TIPO_CLIENTE_LABEL } from '@/lib/vendas-helpers'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

const ORIGEM_COR: Record<OrigemVenda, string> = {
  organico: '#4CAF7A', meta_ads: '#5B8FE8', tiktok: '#E85238',
  indicacao: '#A855F7', b2b_presencial: '#C9A84C', afiliado: '#E8A838',
}

type Periodo = 'hoje' | '7d' | '30d' | '90d' | 'mes' | 'todos'
type CanalFiltro = 'todos' | 'b2c' | 'b2b'

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'mes', label: 'Mês atual' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'todos', label: 'Tudo' },
]

const CANAIS: { id: CanalFiltro; label: string }[] = [
  { id: 'todos', label: 'B2C + B2B' },
  { id: 'b2c', label: 'Só B2C' },
  { id: 'b2b', label: 'Só B2B' },
]

const DESPACHADOS_STATUS = ['postado', 'em_transito', 'entregue']
const A_DESPACHAR_STATUS = ['aguardando', 'separando']

function Tip({ text }: { text: string }) {
  return (
    <span title={text} style={{ cursor: 'help', color: 'var(--text-secondary)', flexShrink: 0, lineHeight: 1 }}>
      <Info size={10} />
    </span>
  )
}

function Bloco({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: '1 1 240px', minWidth: 0,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${cor}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: cor, textTransform: 'uppercase' }}>
        {titulo}
      </span>
      {children}
    </div>
  )
}

function Linha({ label, valor, sub, tip }: { label: string; valor: string | number; sub?: string; tip?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        {tip && <Tip text={tip} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
}

export function PainelMetricasVendas() {
  const { vendas, doacoesUGC } = usePurionStore()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [canal, setCanal] = useState<CanalFiltro>('todos')
  const [incluirUGC, setIncluirUGC] = useState(true)

  const vendasFiltradas = useMemo(() => {
    const agora = Date.now()
    const hoje = new Date()
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const hojeStr = hoje.toISOString().slice(0, 10)
    return vendas.filter((v) => {
      if ((v.valorTotal ?? v.valorLiquido) === 0) return false
      if (canal !== 'todos' && v.canal !== canal) return false
      if (periodo === 'hoje') return v.dataVenda.startsWith(hojeStr)
      if (periodo === 'mes') return v.dataVenda.startsWith(mesAtual)
      if (periodo === '7d') return (agora - new Date(v.dataVenda).getTime()) / 86_400_000 <= 7
      if (periodo === '30d') return (agora - new Date(v.dataVenda).getTime()) / 86_400_000 <= 30
      if (periodo === '90d') return (agora - new Date(v.dataVenda).getTime()) / 86_400_000 <= 90
      return true
    })
  }, [vendas, periodo, canal])

  const doacoesFiltradas = useMemo(() => {
    const agora = Date.now()
    const hoje = new Date()
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const hojeStr = hoje.toISOString().slice(0, 10)
    return doacoesUGC.filter((d) => {
      if (!['postado', 'entregue'].includes(d.statusEnvio)) return false
      if (periodo === 'hoje') return d.dataEnvio.startsWith(hojeStr)
      if (periodo === 'mes') return d.dataEnvio.startsWith(mesAtual)
      if (periodo === '7d') return (agora - new Date(d.dataEnvio).getTime()) / 86_400_000 <= 7
      if (periodo === '30d') return (agora - new Date(d.dataEnvio).getTime()) / 86_400_000 <= 30
      if (periodo === '90d') return (agora - new Date(d.dataEnvio).getTime()) / 86_400_000 <= 90
      return true
    })
  }, [doacoesUGC, periodo])

  const m = useMemo(() => {
    const pagas = vendasFiltradas.filter((v) => v.statusPagamento === 'pago')
    const pedidos = vendasFiltradas.length
    const pedidosPagos = pagas.length
    const frascosTotais = vendasFiltradas.reduce((s, v) => s + v.quantidade, 0)
    const frascosB2C = vendasFiltradas.filter((v) => v.canal === 'b2c').reduce((s, v) => s + v.quantidade, 0)
    const frascosB2B = vendasFiltradas.filter((v) => v.canal === 'b2b').reduce((s, v) => s + v.quantidade, 0)
    const faturamento = pagas.reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0)
    const ticketMedio = pedidosPagos > 0 ? faturamento / pedidosPagos : 0
    const fracsosPorPedido = pedidos > 0 ? frascosTotais / pedidos : 0
    const fracsosDespachados = vendasFiltradas.filter((v) => DESPACHADOS_STATUS.includes(v.statusEntrega)).reduce((s, v) => s + v.quantidade, 0)
    const frascosADespachar = pagas.filter((v) => A_DESPACHAR_STATUS.includes(v.statusEntrega)).reduce((s, v) => s + v.quantidade, 0)
    const frascosUGC = doacoesFiltradas.reduce((s, d) => s + d.quantidade, 0)
    const totalSaiu = fracsosDespachados + (incluirUGC ? frascosUGC : 0)

    // Margem por venda: valor − custo de produção − taxa de pagamento
    const margemTotal = pagas.reduce((s, v) => s + calcularMargem(v), 0)
    const margemMedia = pedidosPagos > 0 ? margemTotal / pedidosPagos : 0
    const margemPct = faturamento > 0 ? (margemTotal / faturamento) * 100 : 0

    // Origem da venda
    const porOrigem = (Object.keys(ORIGEM_VENDA_LABEL) as OrigemVenda[]).map((o) => ({
      name: ORIGEM_VENDA_LABEL[o], value: vendasFiltradas.filter((v) => v.origemVenda === o).length, cor: ORIGEM_COR[o],
    })).filter((d) => d.value > 0)
    const semOrigem = vendasFiltradas.filter((v) => !v.origemVenda).length

    // Cliente novo vs recompra
    const novos = vendasFiltradas.filter((v) => v.tipoCliente === 'recompra' ? false : true).length
    const recompras = vendasFiltradas.filter((v) => v.tipoCliente === 'recompra').length

    return {
      pedidos, pedidosPagos, frascosTotais, frascosB2C, frascosB2B, faturamento, ticketMedio, fracsosPorPedido,
      fracsosDespachados, frascosADespachar, frascosUGC, totalSaiu,
      margemTotal, margemMedia, margemPct, porOrigem, semOrigem, novos, recompras,
    }
  }, [vendasFiltradas, doacoesFiltradas, incluirUGC])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="flex gap-0.5 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
          {PERIODOS.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap"
              style={periodo === p.id ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}>
              {p.label}
            </button>
          ))}
        </div>
        {<div className="flex gap-0.5 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
          {CANAIS.map((c) => (
            <button key={c.id} onClick={() => setCanal(c.id)}
              className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap"
              style={canal === c.id ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}>
              {c.label}
            </button>
          ))}
        </div>}
        <button
          onClick={() => setIncluirUGC((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 11, fontWeight: 500,
            color: incluirUGC ? '#C9A84C' : 'var(--text-secondary)',
          }}>
          {incluirUGC ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          Incluir UGC no estoque
        </button>
      </div>

      {/* 3 Blocos */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* BLOCO 1 — PEDIDOS */}
        <Bloco titulo="Pedidos (transações)" cor="#C9A84C">
          <Linha
            label="Total de pedidos"
            valor={m.pedidos}
            sub={`${m.pedidosPagos} pagos`}
            tip="Número de transações. 1 pedido pode conter vários frascos."
          />
          <Divider />
          <Linha
            label="Ticket médio por pedido"
            valor={fmtR(m.ticketMedio)}
            tip="Faturamento ÷ nº de pedidos pagos"
          />
          <Linha
            label="Frascos por pedido (média)"
            valor={m.fracsosPorPedido > 0 ? m.fracsosPorPedido.toFixed(1) : '—'}
            tip="Total de frascos vendidos ÷ total de pedidos"
          />
        </Bloco>

        {/* BLOCO 2 — FRASCOS VENDIDOS */}
        <Bloco titulo="Frascos Vendidos (unidades)" cor="#5B8FE8">
          <Linha
            label="Total de frascos vendidos"
            valor={m.frascosTotais}
            sub={fmtR(m.faturamento) + ' em faturamento'}
            tip="Soma da quantidade em todos os pedidos — diferente do nº de pedidos"
          />
          {canal === 'todos' && (
            <>
              <Divider />
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>
                    B2C (consumidor final)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{m.frascosB2C}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>frascos</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>
                    B2B (estéticas / revendas)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{m.frascosB2B}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>frascos</div>
                </div>
              </div>
            </>
          )}
        </Bloco>

        {/* BLOCO 3 — LOGÍSTICA / ESTOQUE */}
        <Bloco titulo="Logística / Saída do Estoque" cor="#22C55E">
          <Linha
            label="Frascos despachados"
            valor={m.fracsosDespachados}
            tip="Frascos em pedidos com status: postado, em trânsito ou entregue"
          />
          <Linha
            label="Frascos a despachar"
            valor={m.frascosADespachar}
            sub="pedidos pagos ainda não enviados"
            tip="Frascos em pedidos pagos com status: aguardando ou separando"
          />
          <Divider />
          <Linha
            label="Frascos doados (UGC)"
            valor={m.frascosUGC}
            tip="Frascos enviados a creators — não são venda, mas saem do estoque"
          />
          <div style={{
            background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Total que saiu do estoque
              </span>
              <Tip text={incluirUGC ? 'Despachados + doados UGC' : 'Só despachados (UGC excluído pelo toggle acima)'} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#22C55E', lineHeight: 1 }}>{m.totalSaiu}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
              {m.fracsosDespachados} vendidos + {m.frascosUGC} doados UGC
            </div>
          </div>
        </Bloco>

        {/* BLOCO 4 — MARGEM */}
        <Bloco titulo="Margem" cor="#A855F7">
          <Linha
            label="Margem total"
            valor={fmtR(m.margemTotal)}
            sub={`${m.margemPct.toFixed(1)}% do faturamento`}
            tip="Faturamento − (custo de produção × qtd) − taxa de pagamento, somado nos pedidos pagos"
          />
          <Divider />
          <Linha
            label="Margem média por pedido"
            valor={fmtR(m.margemMedia)}
            tip="Margem total ÷ nº de pedidos pagos"
          />
        </Bloco>
      </div>

      {/* Origem da venda + Perfil do cliente */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          flex: '2 1 320px', minWidth: 0,
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 16px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Origem da venda</p>
          {m.porOrigem.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado de origem registrado neste período</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={m.porOrigem} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: '#B8B8B8', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis tick={{ fill: '#B8B8B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                  <Bar dataKey="value" name="Pedidos" radius={[3, 3, 0, 0]}>
                    {m.porOrigem.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {m.semOrigem > 0 && (
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {m.semOrigem} pedido{m.semOrigem !== 1 ? 's' : ''} sem origem registrada
                </p>
              )}
            </>
          )}
        </div>

        <div style={{
          flex: '1 1 200px', minWidth: 0,
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 16px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Cliente novo vs. recompra</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={[
                  { name: TIPO_CLIENTE_LABEL.novo, value: m.novos, cor: '#5B8FE8' },
                  { name: TIPO_CLIENTE_LABEL.recompra, value: m.recompras, cor: '#4CAF7A' },
                ]}
                cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={3}
              >
                <Cell fill="#5B8FE8" />
                <Cell fill="#4CAF7A" />
              </Pie>
              <RTooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5B8FE8', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{TIPO_CLIENTE_LABEL.novo}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{m.novos}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF7A', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{TIPO_CLIENTE_LABEL.recompra}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{m.recompras}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
