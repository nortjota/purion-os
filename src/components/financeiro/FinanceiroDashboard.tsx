'use client'

/**
 * PURION OS — Módulo Financeiro
 * KPIs · Registro de Movimentação · Gráfico · Projeção · Histórico · Calculadora
 */

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, X, Calculator, ChevronDown, Filter,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Receita, Despesa, CategoriaReceita, CategoriaDespesa } from '@/store'
import {
  getMesAtual,
  calcularKPIsGlobais,
  calcularGrafico6Meses,
  calcularProjecoes,
  calcularSplit,
  calcularPrecificacao,
  formatarMoeda,
  formatarPercentual,
  LABEL_CATEGORIA_RECEITA,
  LABEL_CATEGORIA_DESPESA,
} from '@/lib/calculos'

// Importação dinâmica do gráfico (Recharts precisa de DOM)
const GraficoEvolucao = dynamic(
  () => import('./GraficoEvolucao').then((m) => ({ default: m.GraficoEvolucao })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] flex items-center justify-center text-[#4A4A4A] text-xs">
        Carregando gráfico...
      </div>
    ),
  }
)

// ─────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────

type TipoMovimentacao = 'receita' | 'despesa'

interface LinhaHistorico {
  id: string
  tipo: TipoMovimentacao
  data: string
  categoria: string
  descricao: string
  valor: number
  regiao: string
  responsavel: string
}

// ─────────────────────────────────────────────
// COMPONENTE KPICARD FINANCEIRO
// ─────────────────────────────────────────────

interface KPIFinProps {
  label: string
  valor: string
  icon: React.ElementType
  cor?: string
  sub?: string
}

function KPIFin({ label, valor, icon: Icon, cor = '#C9A84C', sub }: KPIFinProps) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 hover:border-[rgba(201,168,76,0.2)] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-medium">{label}</span>
        <Icon size={13} style={{ color: cor }} />
      </div>
      <span className="text-2xl font-black leading-none" style={{ color: cor, fontFamily: 'Montserrat, sans-serif' }}>
        {valor}
      </span>
      {sub && <span className="text-[10px] text-[#4A4A4A]">{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL DE SPLIT
// ─────────────────────────────────────────────

interface ModalSplitProps {
  valor: number
  items: ReturnType<typeof calcularSplit>
  onClose: () => void
}

function ModalSplit({ valor, items, onClose }: ModalSplitProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative z-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-black text-[var(--text-primary)] text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Distribuição Recomendada
            </h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Receita registrada: <span className="text-[#C9A84C] font-semibold">{formatarMoeda(valor)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Itens do split */}
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.categoria} className="flex items-center gap-3">
              <span className="text-base w-6 text-center shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{item.categoria}</span>
                  <span className="text-xs font-black" style={{ color: item.cor, fontFamily: 'Montserrat, sans-serif' }}>
                    {formatarMoeda(item.valor)}
                  </span>
                </div>
                {/* Mini barra */}
                <div className="w-full h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentual}%`, backgroundColor: item.cor }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-[#6B6B6B] w-8 text-right shrink-0">
                {item.percentual}%
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#C9A84C] text-[#0D0D0D] text-sm font-bold hover:bg-[#D4B55E] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FORMULÁRIO DE MOVIMENTAÇÃO
// ─────────────────────────────────────────────

interface FormMovProps {
  onRegistrado: (tipo: TipoMovimentacao, valor: number) => void
}

function FormMovimentacao({ onRegistrado }: FormMovProps) {
  const { adicionarReceita, adicionarDespesa, perfilAtivo } = usePurionStore()

  const [tipo, setTipo]           = useState<TipoMovimentacao>('receita')
  const [categoria, setCategoria] = useState<string>('')
  const [valor, setValor]         = useState<string>('')
  const [data, setData]           = useState<string>(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState<string>('')
  const [erro, setErro]           = useState<string>('')
  const [salvo, setSalvo]         = useState<boolean>(false)

  const categoriasDisponiveis =
    tipo === 'receita'
      ? Object.entries(LABEL_CATEGORIA_RECEITA)
      : Object.entries(LABEL_CATEGORIA_DESPESA)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!categoria)                  { setErro('Selecione uma categoria.'); return }
    if (!descricao.trim())           { setErro('Informe uma descrição.'); return }

    const id = `manual-${Date.now()}`

    if (tipo === 'receita') {
      const nova: Receita = {
        id,
        descricao: descricao.trim(),
        valor: valorNum,
        categoria: categoria as CategoriaReceita,
        data,
        regiao: perfilAtivo === 'matheus' ? 'DF' : perfilAtivo === 'gabriel' ? 'SP' : 'SC',
        responsavel: perfilAtivo,
      }
      adicionarReceita(nova)
    } else {
      const nova: Despesa = {
        id,
        descricao: descricao.trim(),
        valor: valorNum,
        categoria: categoria as CategoriaDespesa,
        data,
        regiao: perfilAtivo === 'matheus' ? 'DF' : perfilAtivo === 'gabriel' ? 'SP' : 'SC',
        responsavel: perfilAtivo,
      }
      adicionarDespesa(nova)
    }

    onRegistrado(tipo, valorNum)
    // Resetar form
    setValor('')
    setCategoria('')
    setDescricao('')
    setErro('')
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  const inputCls = `
    w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5
    text-sm text-[var(--text-primary)] placeholder-[#4A4A4A]
    focus:outline-none focus:border-[rgba(201,168,76,0.5)]
    transition-colors
  `

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Tipo: Receita / Despesa */}
      <div className="flex rounded-lg overflow-hidden border border-[var(--border)] p-0.5 gap-0.5 bg-[var(--bg-surface-2)]">
        {(['receita', 'despesa'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTipo(t); setCategoria('') }}
            className={`
              flex-1 py-2 text-xs font-semibold rounded-md transition-all
              ${tipo === t
                ? t === 'receita'
                  ? 'bg-[rgba(76,175,122,0.15)] text-[#4CAF7A] border border-[rgba(76,175,122,0.3)]'
                  : 'bg-[rgba(232,82,56,0.15)] text-[#E85238] border border-[rgba(232,82,56,0.3)]'
                : 'text-[#6B6B6B] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
          </button>
        ))}
      </div>

      {/* Categoria */}
      <div className="relative">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={`${inputCls} appearance-none pr-8 cursor-pointer`}
        >
          <option value="" disabled>Categoria</option>
          {categoriasDisponiveis.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none" />
      </div>

      {/* Valor + Data (linha) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] text-xs">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className={`${inputCls} pl-8`}
          />
        </div>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`${inputCls} w-[140px]`}
        />
      </div>

      {/* Descrição */}
      <input
        type="text"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição da movimentação"
        className={inputCls}
        maxLength={120}
      />

      {/* Erro */}
      {erro && (
        <p className="text-xs text-[#E85238] px-1">{erro}</p>
      )}

      {/* Toast de confirmação */}
      {salvo && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#10B981"/><path d="M3.5 6l1.8 1.8 3-3.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {tipo === 'receita' ? 'Receita registrada!' : 'Despesa registrada!'}
        </div>
      )}

      {/* Botão */}
      <button
        type="submit"
        className="
          w-full py-2.5 rounded-lg text-sm font-bold
          bg-[#C9A84C] text-[#0D0D0D]
          hover:bg-[#D4B55E] active:scale-[0.99]
          transition-all flex items-center justify-center gap-2
        "
      >
        <Plus size={14} />
        Registrar {tipo === 'receita' ? 'Receita' : 'Despesa'}
      </button>
    </form>
  )
}

// ─────────────────────────────────────────────
// CALCULADORA DE PRECIFICAÇÃO
// ─────────────────────────────────────────────

function CalculadoraPrecificacao() {
  const [custo, setCusto] = useState<string>('')
  const resultado = useMemo(() => {
    const val = parseFloat(custo.replace(',', '.'))
    return val > 0 ? calcularPrecificacao(val) : null
  }, [custo])

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] text-xs">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          placeholder="Custo do produto"
          className="
            w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 pl-8
            text-sm text-[var(--text-primary)] placeholder-[#4A4A4A]
            focus:outline-none focus:border-[rgba(201,168,76,0.5)]
            transition-colors
          "
        />
      </div>

      {resultado ? (
        <div className="space-y-2">
          {[
            { label: 'Preço de Venda', valor: formatarMoeda(resultado.precoVenda), cor: '#C9A84C', destaque: true },
            { label: 'Margem Bruta',   valor: formatarPercentual(resultado.margemBruta), cor: '#4CAF7A' },
            { label: 'Lucro Líquido',  valor: formatarMoeda(resultado.lucroLiquido), cor: '#5B8FE8' },
            { label: 'Markup',         valor: `${resultado.markup.toFixed(2)}×`, cor: '#8B5CF6' },
          ].map(({ label, valor, cor, destaque }) => (
            <div
              key={label}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                ${destaque
                  ? 'bg-[rgba(201,168,76,0.06)] border-[rgba(201,168,76,0.2)]'
                  : 'bg-[var(--bg-surface-2)] border-[var(--border)]'
                }
              `}
            >
              <span className="text-xs text-[#6B6B6B]">{label}</span>
              <span className="text-sm font-black" style={{ color: cor, fontFamily: 'Montserrat, sans-serif' }}>
                {valor}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-[#3A3A3A] text-center pt-1">
            Fórmula: Preço = Custo ÷ 0,35 (margem 65%)
          </p>
        </div>
      ) : (
        <div className="py-6 text-center text-[#3A3A3A] text-xs">
          Digite o custo para ver o preço sugerido
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// TABELA DE HISTÓRICO
// ─────────────────────────────────────────────

const COR_TIPO = { receita: '#4CAF7A', despesa: '#E85238' }

interface TabelaHistoricoProps {
  linhas: LinhaHistorico[]
}

function TabelaHistorico({ linhas }: TabelaHistoricoProps) {
  const [filtroMes, setFiltroMes]       = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroTipo, setFiltroTipo]     = useState<string>('')

  // Meses únicos para o select
  const mesesUnicos = useMemo(() => {
    const set = new Set(linhas.map((l) => l.data.substring(0, 7)))
    return [...set].sort().reverse()
  }, [linhas])

  // Categorias únicas
  const categoriasUnicas = useMemo(() => {
    const set = new Set(linhas.map((l) => l.categoria))
    return [...set].sort()
  }, [linhas])

  // Linhas filtradas
  const linhasFiltradas = useMemo(() => {
    return linhas
      .filter((l) => !filtroMes      || l.data.startsWith(filtroMes))
      .filter((l) => !filtroCategoria || l.categoria === filtroCategoria)
      .filter((l) => !filtroTipo     || l.tipo === filtroTipo)
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [linhas, filtroMes, filtroCategoria, filtroTipo])

  const totalFiltrado = linhasFiltradas.reduce(
    (acc, l) => ({ ...acc, [l.tipo]: (acc[l.tipo] ?? 0) + l.valor }),
    {} as Record<string, number>
  )

  const selectCls = `
    bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5
    text-xs text-[#8A8A8A] focus:outline-none focus:border-[rgba(201,168,76,0.4)]
    cursor-pointer transition-colors
  `

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={13} className="text-[#4A4A4A]" />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={selectCls}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={selectCls}>
          <option value="">Todos os meses</option>
          {mesesUnicos.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={selectCls}>
          <option value="">Todas as categorias</option>
          {categoriasUnicas.map((c) => (
            <option key={c} value={c}>
              {LABEL_CATEGORIA_RECEITA[c] ?? LABEL_CATEGORIA_DESPESA[c] ?? c}
            </option>
          ))}
        </select>
        {(filtroTipo || filtroMes || filtroCategoria) && (
          <button
            onClick={() => { setFiltroTipo(''); setFiltroMes(''); setFiltroCategoria('') }}
            className="text-[10px] text-[#C9A84C] hover:underline flex items-center gap-1"
          >
            <X size={10} /> Limpar
          </button>
        )}
        <span className="ml-auto text-[10px] text-[#4A4A4A]">
          {linhasFiltradas.length} registros
        </span>
      </div>

      {/* Subtotais */}
      {(totalFiltrado.receita || totalFiltrado.despesa) && (
        <div className="flex gap-3 mb-3">
          {totalFiltrado.receita && (
            <span className="text-xs text-[#4CAF7A]">
              + {formatarMoeda(totalFiltrado.receita)}
            </span>
          )}
          {totalFiltrado.despesa && (
            <span className="text-xs text-[#E85238]">
              - {formatarMoeda(totalFiltrado.despesa)}
            </span>
          )}
          {totalFiltrado.receita && totalFiltrado.despesa && (
            <span className={`text-xs font-semibold ${
              (totalFiltrado.receita - totalFiltrado.despesa) >= 0
                ? 'text-[#4CAF7A]' : 'text-[#E85238]'
            }`}>
              = {formatarMoeda(totalFiltrado.receita - totalFiltrado.despesa)}
            </span>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)]">
              {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bg-surface)]">
            {linhasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#3A3A3A] text-xs">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              linhasFiltradas.map((linha) => (
                <tr
                  key={linha.id}
                  className="bg-[var(--bg-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <td className="px-4 py-2.5 text-[#6B6B6B] whitespace-nowrap">
                    {linha.data}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${COR_TIPO[linha.tipo]}15`,
                        color: COR_TIPO[linha.tipo],
                        border: `1px solid ${COR_TIPO[linha.tipo]}30`,
                      }}
                    >
                      {linha.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#6B6B6B]">
                    {LABEL_CATEGORIA_RECEITA[linha.categoria] ?? LABEL_CATEGORIA_DESPESA[linha.categoria] ?? linha.categoria}
                  </td>
                  <td className="px-4 py-2.5 text-[#8A8A8A] max-w-[240px] truncate">
                    {linha.descricao}
                  </td>
                  <td className={`px-4 py-2.5 font-semibold whitespace-nowrap text-right`}
                    style={{ color: COR_TIPO[linha.tipo] }}>
                    {linha.tipo === 'receita' ? '+' : '-'} {formatarMoeda(linha.valor)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function FinanceiroDashboard() {
  const { receitas, despesas, configuracoes } = usePurionStore()

  // Estado do modal split
  const [showModalSplit, setShowModalSplit] = useState(false)
  const [splitInfo, setSplitInfo] = useState<{
    valor: number
    items: ReturnType<typeof calcularSplit>
  } | null>(null)

  // Cálculos memoizados
  const kpisGlobais = useMemo(() => calcularKPIsGlobais(receitas, despesas), [receitas, despesas])
  const mesAtual = useMemo(() => getMesAtual(receitas), [receitas])
  const dadosGrafico = useMemo(() => calcularGrafico6Meses(receitas, despesas), [receitas, despesas])
  const projecoes = useMemo(() => calcularProjecoes(receitas, despesas), [receitas, despesas])

  // Histórico unificado
  const historico: LinhaHistorico[] = useMemo(() => {
    const r: LinhaHistorico[] = receitas.map((rec) => ({
      id: rec.id, tipo: 'receita' as const,
      data: rec.data, categoria: rec.categoria,
      descricao: rec.descricao, valor: rec.valor,
      regiao: rec.regiao, responsavel: rec.responsavel,
    }))
    const d: LinhaHistorico[] = despesas.map((des) => ({
      id: des.id, tipo: 'despesa' as const,
      data: des.data, categoria: des.categoria,
      descricao: des.descricao, valor: des.valor,
      regiao: des.regiao, responsavel: des.responsavel,
    }))
    return [...r, ...d]
  }, [receitas, despesas])

  // Callback quando uma movimentação é registrada
  function handleRegistrado(tipo: TipoMovimentacao, valor: number) {
    if (tipo === 'receita') {
      const items = calcularSplit(valor, configuracoes)
      setSplitInfo({ valor, items })
      setShowModalSplit(true)
    }
  }

  // KPIs globais (todos os meses)
  const kpiCards = [
    {
      label: 'Receita Total',
      valor: formatarMoeda(kpisGlobais.receitaTotal),
      icon: TrendingUp,
      cor: '#4CAF7A',
      sub: `Mês atual: ${mesAtual}`,
    },
    {
      label: 'Despesa Total',
      valor: formatarMoeda(kpisGlobais.despesaTotal),
      icon: TrendingDown,
      cor: '#E85238',
      sub: `${formatarPercentual((kpisGlobais.despesaTotal / kpisGlobais.receitaTotal) * 100)} da receita`,
    },
    {
      label: 'Margem Bruta',
      valor: formatarPercentual(kpisGlobais.margemMedia),
      icon: BarChart2,
      cor: '#C9A84C',
      sub: `Meta: 65%`,
    },
    {
      label: 'Saldo Atual',
      valor: formatarMoeda(kpisGlobais.saldoTotal),
      icon: DollarSign,
      cor: kpisGlobais.saldoTotal >= 0 ? '#4CAF7A' : '#E85238',
      sub: 'Receita − Despesa',
    },
  ]

  // Label do mês por extenso
  const MESES: Record<string, string> = {
    '01': 'jan', '02': 'fev', '03': 'mar', '04': 'abr',
    '05': 'mai', '06': 'jun', '07': 'jul', '08': 'ago',
    '09': 'set', '10': 'out', '11': 'nov', '12': 'dez',
  }

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl font-black text-[var(--text-primary)] tracking-tight"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Financeiro
        </h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          Controle financeiro · Precificação · Projeções
        </p>
      </div>

      {/* ── Seção 1: KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPIFin key={card.label} {...card} />
        ))}
      </div>

      {/* ── Seção 2: Registrar + Calculadora ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Form de movimentação */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={15} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Registrar Movimentação</h2>
          </div>
          <FormMovimentacao onRegistrado={handleRegistrado} />
        </div>

        {/* Calculadora de precificação */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={15} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Calculadora de Precificação</h2>
          </div>
          <CalculadoraPrecificacao />
        </div>
      </div>

      {/* ── Seção 3: Gráfico de Evolução ── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Evolução Financeira — Últimos 6 Meses</h2>
          </div>
          <span className="text-[10px] text-[#4A4A4A] uppercase tracking-wider">
            Set 2023 → Fev 2024
          </span>
        </div>
        <GraficoEvolucao dados={dadosGrafico} />
      </div>

      {/* ── Seção 4: Projeção 30/60/90 dias ── */}
      <div>
        <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
          <TrendingUp size={11} /> Projeção Baseada na Média dos Últimos 30 Dias
        </p>
        <div className="grid grid-cols-3 gap-4">
          {projecoes.map(({ dias, receitaProjetada, despesaProjetada, margemProjetada }) => (
            <div
              key={dias}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[rgba(201,168,76,0.2)] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider font-medium">
                  {dias} dias
                </span>
                <span className="text-[10px] text-[#4A4A4A]">
                  até {new Date(new Date('2024-02-12').getTime() + dias * 86400000)
                    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#6B6B6B]">Receita proj.</span>
                  <span className="text-sm font-black text-[#4CAF7A]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {formatarMoeda(receitaProjetada)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#6B6B6B]">Despesa proj.</span>
                  <span className="text-sm font-semibold text-[#E85238]">
                    {formatarMoeda(despesaProjetada)}
                  </span>
                </div>
                <div className="pt-1 border-t border-[var(--border)] flex justify-between items-center">
                  <span className="text-xs text-[#6B6B6B]">Margem proj.</span>
                  <span className="text-sm font-black text-[#C9A84C]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {margemProjetada}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seção 5: Histórico ── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={15} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Histórico de Movimentações</h2>
          <span className="ml-auto text-[10px] text-[#4A4A4A]">{historico.length} registros</span>
        </div>
        <TabelaHistorico linhas={historico} />
      </div>

      {/* ── Modal de Split ── */}
      {showModalSplit && splitInfo && (
        <ModalSplit
          valor={splitInfo.valor}
          items={splitInfo.items}
          onClose={() => setShowModalSplit(false)}
        />
      )}
    </div>
  )
}
