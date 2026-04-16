'use client'

/**
 * PURION OS — Módulo 5: Produção & Estoque
 * SKU cards, controle de lotes com checklist QC, expedição com SLA visual.
 */

import { useState, useCallback } from 'react'
import { Package, Plus, ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle, XCircle, Truck } from 'lucide-react'
import { usePurionStore, type Lote, type PedidoExpedicao, type SKUProduto } from '@/store'

// DATA_REF = 2024-02-12 (demo reference)
const DATA_REF = new Date('2024-02-12T12:00:00Z')

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const TESTES_OBRIGATORIOS = [
  { tipo: 'duracao',           label: 'Teste de Duração' },
  { tipo: 'mancha',            label: 'Teste de Mancha' },
  { tipo: 'estabilidade_termica', label: 'Estabilidade Térmica' },
  { tipo: 'valvula',           label: 'Teste de Válvula' },
  { tipo: 'teste_cego',        label: 'Teste Cego' },
] as const

const SKU_LABEL: Record<SKUProduto, string> = {
  noir: 'NOIR',
  urban: 'URBAN',
  coastal: 'COASTAL',
}

const SKU_SUB: Record<SKUProduto, string> = {
  noir: 'Intense',
  urban: 'Fresh',
  coastal: 'Blue',
}

const STATUS_PEDIDO_LABEL: Record<PedidoExpedicao['status'], string> = {
  aguardando: 'Aguardando',
  em_separacao: 'Separando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_PEDIDO_COLOR: Record<PedidoExpedicao['status'], string> = {
  aguardando: 'text-amber-400 bg-amber-400/10',
  em_separacao: 'text-blue-400 bg-blue-400/10',
  enviado: 'text-purple-400 bg-purple-400/10',
  entregue: 'text-emerald-400 bg-emerald-400/10',
  cancelado: 'text-[#6B6B6B] bg-[#2A2A2A]',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function calcularStatusLote(lote: Lote): 'em_testes' | 'aprovado' | 'reprovado' {
  if (lote.status === 'aprovado') return 'aprovado'
  if (lote.status === 'reprovado') return 'reprovado'
  const reprovado = lote.testes.some((t) => t.resultado === 'reprovado')
  if (reprovado) return 'reprovado'
  const aprovados = TESTES_OBRIGATORIOS.every((req) =>
    lote.testes.find((t) => t.tipo === req.tipo && t.resultado === 'aprovado')
  )
  return aprovados ? 'aprovado' : 'em_testes'
}

function calcularSLA(pedido: PedidoExpedicao): {
  percentual: number
  expirado: boolean
  horasRestantes: number
} {
  const inicio = new Date(pedido.dataPedido).getTime()
  const fim = inicio + pedido.prazoHoras * 3_600_000
  const agora = DATA_REF.getTime()
  const total = fim - inicio
  const decorrido = agora - inicio
  const percentual = Math.min(100, Math.max(0, (decorrido / total) * 100))
  const expirado = agora > fim
  const horasRestantes = Math.max(0, Math.round((fim - agora) / 3_600_000))
  return { percentual, expirado, horasRestantes }
}

function fmt(date: string) {
  return new Date(date + (date.includes('T') ? '' : 'T12:00:00Z')).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

function ModalAjusteEstoque({
  skuId, nome, unidadesAtual,
  onSalvar, onFechar,
}: {
  skuId: string
  nome: string
  unidadesAtual: number
  onSalvar: (novoValor: number) => void
  onFechar: () => void
}) {
  const [valor, setValor] = useState(String(unidadesAtual))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Ajustar Estoque</h3>
        <p className="text-xs text-[#6B6B6B] mb-4">{nome}</p>
        <label className="text-xs text-[#8A8A8A] block mb-1">Novas unidades em estoque</label>
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#C9A84C] mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[var(--border)] rounded-lg hover:border-[#3A3A3A]">
            Cancelar
          </button>
          <button
            onClick={() => { const n = parseInt(valor, 10); if (!isNaN(n)) onSalvar(n) }}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalNovoLote({ onSalvar, onFechar }: { onSalvar: (lote: Lote) => void; onFechar: () => void }) {
  const [form, setForm] = useState({
    fragrancia: 'noir' as SKUProduto,
    dataProd: '2024-02-12',
    quantidade: '',
  })

  const handleSubmit = () => {
    const qtd = parseInt(form.quantidade, 10)
    if (!qtd || qtd <= 0) return
    const skuNome = { noir: 'Noir Intense', urban: 'Urban Fresh', coastal: 'Coastal Blue' }
    const lote: Lote = {
      id: `lote-${Date.now()}`,
      codigo: `LOTE-2024-${String(Date.now()).slice(-3)}`,
      produto: `${skuNome[form.fragrancia]} 10ml`,
      quantidadeProduzida: qtd,
      quantidadeAprovada: 0,
      status: 'controle_qualidade',
      dataInicio: form.dataProd,
      dataConclusao: null,
      responsavel: 'gabriel',
      testes: TESTES_OBRIGATORIOS.map((t) => ({
        tipo: t.tipo as Lote['testes'][number]['tipo'],
        resultado: 'pendente' as const,
        data: form.dataProd,
        observacoes: '',
      })),
      insumos: [],
      notas: '',
    }
    onSalvar(lote)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Novo Lote</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Fragrância</label>
            <select
              value={form.fragrancia}
              onChange={(e) => setForm({ ...form, fragrancia: e.target.value as SKUProduto })}
              className="w-full bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#C9A84C]"
            >
              <option value="noir">NOIR Intense</option>
              <option value="urban">URBAN Fresh</option>
              <option value="coastal">COASTAL Blue</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Data de produção</label>
            <input
              type="date"
              value={form.dataProd}
              onChange={(e) => setForm({ ...form, dataProd: e.target.value })}
              className="w-full bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Quantidade produzida (un)</label>
            <input
              type="number"
              min={1}
              placeholder="ex: 200"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              className="w-full bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#C9A84C]"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[var(--border)] rounded-lg hover:border-[#3A3A3A]">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Criar Lote
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function ProducaoDashboard() {
  const {
    produtosSKU, atualizarProdutoSKU,
    lotes, adicionarLote, atualizarLote,
    pedidosExpedicao, atualizarPedidoExpedicao,
  } = usePurionStore()

  const [ajusteModal, setAjusteModal] = useState<{ id: string; nome: string; unidades: number } | null>(null)
  const [novoLoteModal, setNovoLoteModal] = useState(false)
  const [loteExpandido, setLoteExpandido] = useState<string | null>(null)

  const toggleLote = useCallback((id: string) => {
    setLoteExpandido((prev) => (prev === id ? null : id))
  }, [])

  const pedidosAtivos = pedidosExpedicao.filter(
    (p) => p.status !== 'entregue' && p.status !== 'cancelado'
  )
  const expirados = pedidosAtivos.filter((p) => calcularSLA(p).expirado).length

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black tracking-widest text-[var(--text-primary)] uppercase">
            Produção & Estoque
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">Controle de qualidade, SKUs e expedição</p>
        </div>
        {expirados > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-bold text-red-400">
              {expirados} pedido{expirados > 1 ? 's' : ''} com SLA expirado
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          SEÇÃO 1 — ESTOQUE POR SKU
      ══════════════════════════════════════ */}
      <section>
        <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">
          Estoque Atual — Produto Acabado
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {produtosSKU.map((sku) => {
            const alerta = sku.unidades < sku.threshold
            return (
              <div
                key={sku.id}
                className={`
                  bg-[var(--bg-surface)] border rounded-xl p-5 flex flex-col gap-3
                  ${alerta ? 'border-red-500/40' : 'border-[var(--border)]'}
                `}
              >
                {/* SKU header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#6B6B6B] tracking-widest uppercase">
                      {SKU_LABEL[sku.sku]}
                    </span>
                    <p className="text-xs text-[#8A8A8A]">{SKU_SUB[sku.sku]}</p>
                  </div>
                  {alerta && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} />
                      ABAIXO DO MÍNIMO
                    </span>
                  )}
                </div>

                {/* Units — large gold number */}
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-4xl font-black leading-none"
                    style={{ color: alerta ? '#EF4444' : '#C9A84C' }}
                  >
                    {sku.unidades.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-[#6B6B6B]">un</span>
                </div>

                {/* Threshold indicator */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (sku.unidades / (sku.threshold * 3)) * 100)}%`,
                        backgroundColor: alerta ? '#EF4444' : '#C9A84C',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#6B6B6B] shrink-0">mín {sku.threshold}</span>
                </div>

                <p className="text-[10px] text-[#4A4A4A]">Atualizado em {fmt(sku.ultimaAtualizacao)}</p>

                <button
                  onClick={() => setAjusteModal({ id: sku.id, nome: sku.nome, unidades: sku.unidades })}
                  className="
                    w-full mt-1 px-3 py-2 text-xs font-semibold rounded-lg
                    text-[#C9A84C] border border-[#C9A84C]/30
                    hover:bg-[rgba(201,168,76,0.08)] transition-colors
                  "
                >
                  Ajustar estoque
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 2 — CONTROLE DE LOTES
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
            Controle de Lotes
          </h2>
          <button
            onClick={() => setNovoLoteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568] transition-colors"
          >
            <Plus size={12} />
            Novo lote
          </button>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Cabeçalho tabela */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_40px] gap-4 px-4 py-2.5 border-b border-[var(--border)]">
            {['Nº Lote', 'Fragrância', 'Data Prod.', 'Qtd', 'Status'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">{h}</span>
            ))}
            <span />
          </div>

          {lotes.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#4A4A4A]">Nenhum lote cadastrado</div>
          )}

          {lotes.map((lote) => {
            const statusGeral = calcularStatusLote(lote)
            const expandido = loteExpandido === lote.id
            const statusColor = {
              em_testes: 'text-amber-400 bg-amber-400/10',
              aprovado: 'text-emerald-400 bg-emerald-400/10',
              reprovado: 'text-red-400 bg-red-400/10',
            }[statusGeral]
            const statusLabel = {
              em_testes: 'Em testes',
              aprovado: 'Aprovado',
              reprovado: 'Reprovado',
            }[statusGeral]

            return (
              <div key={lote.id} className="border-b border-[var(--border)] last:border-0">
                {/* Linha principal */}
                <button
                  onClick={() => toggleLote(lote.id)}
                  className="w-full grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_40px] gap-4 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <span className="text-xs font-mono text-[#C9A84C]">{lote.codigo}</span>
                  <span className="text-xs text-[var(--text-primary)]">{lote.produto}</span>
                  <span className="text-xs text-[#8A8A8A]">{fmt(lote.dataInicio)}</span>
                  <span className="text-xs text-[var(--text-primary)] font-bold">{lote.quantidadeProduzida}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-center ${statusColor}`}>
                    {statusLabel}
                  </span>
                  <span className="flex items-center justify-center text-[#6B6B6B]">
                    {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Checklist expandida */}
                {expandido && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-4">
                      <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">
                        Checklist de Testes — {lote.codigo}
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {TESTES_OBRIGATORIOS.map((req) => {
                          const teste = lote.testes.find((t) => t.tipo === req.tipo)
                          const resultado = teste?.resultado ?? 'pendente'
                          return (
                            <div key={req.tipo} className="flex items-start gap-3">
                              {/* Ícone de status */}
                              {resultado === 'aprovado' ? (
                                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              ) : resultado === 'reprovado' ? (
                                <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-[#3A3A3A] shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${resultado === 'aprovado' ? 'text-[var(--text-primary)]' : resultado === 'reprovado' ? 'text-red-400' : 'text-[#6B6B6B]'}`}>
                                    {req.label}
                                  </span>
                                  {teste?.data && (
                                    <span className="text-[10px] text-[#4A4A4A]">
                                      {resultado !== 'pendente' ? `aprovado em ${fmt(teste.data)}` : `iniciado em ${fmt(teste.data)}`}
                                    </span>
                                  )}
                                </div>
                                {teste?.observacoes && (
                                  <p className="text-[10px] text-[#4A4A4A] mt-0.5 truncate">{teste.observacoes}</p>
                                )}
                              </div>
                              {/* Aprovar / Reprovar se pendente */}
                              {resultado === 'pendente' && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      const novosTestes = lote.testes.map((t) =>
                                        t.tipo === req.tipo ? { ...t, resultado: 'aprovado' as const, data: new Date().toISOString().slice(0, 10) } : t
                                      )
                                      if (!lote.testes.find((t) => t.tipo === req.tipo)) {
                                        novosTestes.push({ tipo: req.tipo as Lote['testes'][number]['tipo'], resultado: 'aprovado', data: new Date().toISOString().slice(0, 10), observacoes: '' })
                                      }
                                      const statusCalc = calcularStatusLote({ ...lote, testes: novosTestes })
                                      const novoStatus = statusCalc === 'aprovado' ? 'aprovado' as const : statusCalc === 'reprovado' ? 'reprovado' as const : lote.status
                                      atualizarLote(lote.id, { testes: novosTestes, status: novoStatus })
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-400/30 rounded hover:bg-emerald-400/10"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => {
                                      const novosTestes = lote.testes.map((t) =>
                                        t.tipo === req.tipo ? { ...t, resultado: 'reprovado' as const, data: new Date().toISOString().slice(0, 10) } : t
                                      )
                                      if (!lote.testes.find((t) => t.tipo === req.tipo)) {
                                        novosTestes.push({ tipo: req.tipo as Lote['testes'][number]['tipo'], resultado: 'reprovado', data: new Date().toISOString().slice(0, 10), observacoes: '' })
                                      }
                                      const statusCalc = calcularStatusLote({ ...lote, testes: novosTestes })
                                      const novoStatus = statusCalc === 'reprovado' ? 'reprovado' as const : lote.status
                                      atualizarLote(lote.id, { testes: novosTestes, status: novoStatus })
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-400/30 rounded hover:bg-red-400/10"
                                  >
                                    Reprovar
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — EXPEDIÇÃO
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
              Expedição
            </h2>
            {expirados > 0 && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                {expirados} expirado{expirados > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1.5fr_2fr_1fr_2.5fr_1.5fr] gap-4 px-4 py-2.5 border-b border-[var(--border)]">
            {['Pedido', 'Destinatário', 'Data', 'SLA 48h', 'Status'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {pedidosExpedicao.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#4A4A4A]">Nenhum pedido registrado</div>
          )}

          {pedidosExpedicao.map((pedido) => {
            const { percentual, expirado, horasRestantes } = calcularSLA(pedido)
            const concluido = pedido.status === 'entregue' || pedido.status === 'cancelado'
            const barColor = concluido ? '#3A3A3A' : expirado ? '#EF4444' : percentual > 75 ? '#F59E0B' : '#C9A84C'

            return (
              <div
                key={pedido.id}
                className="grid grid-cols-[1.5fr_2fr_1fr_2.5fr_1.5fr] gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <span className="text-xs font-mono text-[#C9A84C]">{pedido.numeroPedido}</span>
                <div>
                  <p className="text-xs text-[var(--text-primary)]">{pedido.destinatario}</p>
                  <p className="text-[10px] text-[#4A4A4A]">
                    {pedido.itens.map((i) => `${i.quantidade}× ${SKU_LABEL[i.sku]}`).join(', ')}
                  </p>
                </div>
                <span className="text-xs text-[#8A8A8A]">{fmt(pedido.dataPedido)}</span>

                {/* SLA bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-0.5">
                    {concluido ? (
                      <span className="text-[10px] text-[#6B6B6B]">Concluído</span>
                    ) : expirado ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                        <AlertTriangle size={10} /> EXPIRADO
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1">
                        <Clock size={10} /> {horasRestantes}h restantes
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${concluido ? 100 : percentual}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>

                {/* Status dropdown */}
                <select
                  value={pedido.status}
                  onChange={(e) => atualizarPedidoExpedicao(pedido.id, { status: e.target.value as PedidoExpedicao['status'] })}
                  className={`
                    text-[10px] font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer
                    ${STATUS_PEDIDO_COLOR[pedido.status]}
                    bg-transparent
                  `}
                  style={{ backgroundColor: 'transparent' }}
                >
                  {Object.entries(STATUS_PEDIDO_LABEL).map(([val, label]) => (
                    <option key={val} value={val} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">{label}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Modais ── */}
      {ajusteModal && (
        <ModalAjusteEstoque
          skuId={ajusteModal.id}
          nome={ajusteModal.nome}
          unidadesAtual={ajusteModal.unidades}
          onSalvar={(novoValor) => {
            atualizarProdutoSKU(ajusteModal.id, {
              unidades: novoValor,
              ultimaAtualizacao: '2024-02-12',
            })
            setAjusteModal(null)
          }}
          onFechar={() => setAjusteModal(null)}
        />
      )}
      {novoLoteModal && (
        <ModalNovoLote
          onSalvar={(lote) => { adicionarLote(lote); setNovoLoteModal(false) }}
          onFechar={() => setNovoLoteModal(false)}
        />
      )}
    </div>
  )
}
