'use client'

/**
 * PURION OS — Módulo Financeiro
 * KPIs · Registro de Movimentação · Gráfico · Projeção · Histórico · Calculadora
 */

import { useAcaoRapida } from '@/lib/acaoRapida'
import { useState, useMemo, useEffect } from 'react'
import { useMobile } from '@/hooks/useMobile'
import dynamic from 'next/dynamic'
import { useFinanceiro } from '@/hooks/useFinanceiro'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, X, Calculator, ChevronDown, Filter, Pencil, Trash2,
  Search, Download,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Receita, Despesa, CategoriaReceita, CategoriaDespesa, PerfilUsuario, Regiao } from '@/store'
import {
  getMesAtual,
  calcularKPIsGlobais,
  calcularGrafico6Meses,
  calcularProjecoes,
  calcularSplit,
  calcularPrecificacao,
  formatarMoeda,
  formatarPercentual,
  formatarDataBR,
  LABEL_CATEGORIA_RECEITA,
  LABEL_CATEGORIA_DESPESA,
} from '@/lib/calculos'

const GraficoEvolucao = dynamic(
  () => import('./GraficoEvolucao').then((m) => ({ default: m.GraficoEvolucao })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] skeleton" role="status" aria-label="Carregando gráfico" />
    ),
  }
)

// ─────────────────────────────────────────────
// TIPOS E CONSTANTES INTERNAS
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
  fornecedor?: string
  notaFiscal?: string
}

const REGIAO_POR_RESPONSAVEL: Record<PerfilUsuario, Regiao> = {
  matheus: 'DF',
  gabriel: 'SP',
  joao:    'SC',
}

const LABEL_RESPONSAVEL: Record<PerfilUsuario, string> = {
  matheus: 'Matheus',
  joao:    'João',
  gabriel: 'Gabriel (arquivado)',
}

// ─────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-black text-[var(--text-primary)] text-base" style={{ fontFamily: 'var(--font-title)' }}>
              Distribuição Recomendada
            </h3>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              Receita registrada: <span className="text-[var(--text-primary)] font-semibold">{formatarMoeda(valor)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2A2C2B] text-[#B8B8B8] hover:text-[var(--text-primary)] transition-colors" aria-label="Fechar" title="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.categoria} className="flex items-center gap-3">
              <span className="text-base w-6 text-center shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{item.categoria}</span>
                  <span className="text-xs font-black" style={{ color: item.cor, fontFamily: 'var(--font-mono)' }}>
                    {formatarMoeda(item.valor)}
                  </span>
                </div>
                <div className="w-full h-1 bg-[#2A2C2B] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.percentual}%`, backgroundColor: item.cor }} />
                </div>
              </div>
              <span className="text-[10px] text-[#B8B8B8] w-8 text-right shrink-0">{item.percentual}%</span>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-bold hover:bg-[var(--brand-accent)]/85 transition-colors">
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL DE EDIÇÃO
// ─────────────────────────────────────────────

interface ModalEditarProps {
  linha: LinhaHistorico
  onFechar: () => void
  onSalvar: (id: string, tipo: 'receita' | 'despesa', dados: Partial<Receita | Despesa>) => Promise<void>
}

function ModalEditarMovimentacao({ linha, onFechar, onSalvar }: ModalEditarProps) {
  const [categoria, setCategoria]   = useState(linha.categoria)
  const [valor, setValor]           = useState(String(linha.valor))
  const [data, setData]             = useState(linha.data)
  const [descricao, setDescricao]   = useState(linha.descricao)
  const [responsavel, setResponsavel] = useState<PerfilUsuario>((linha.responsavel as PerfilUsuario) || 'matheus')
  const [regiao, setRegiao]         = useState<Regiao>((linha.regiao as Regiao) || 'DF')
  const [fornecedor, setFornecedor] = useState(linha.fornecedor ?? '')
  const [notaFiscal, setNotaFiscal] = useState(linha.notaFiscal ?? '')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  const categorias = linha.tipo === 'receita'
    ? Object.entries(LABEL_CATEGORIA_RECEITA)
    : Object.entries(LABEL_CATEGORIA_DESPESA)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!categoria)                  { setErro('Selecione uma categoria.'); return }
    if (!descricao.trim())           { setErro('Informe uma descrição.'); return }
    setSalvando(true)
    const dados: Partial<Receita | Despesa> = {
      categoria: categoria as CategoriaReceita & CategoriaDespesa,
      valor: valorNum, data,
      descricao: descricao.trim(),
      responsavel, regiao,
      ...(linha.tipo === 'despesa' && { fornecedor: fornecedor.trim(), notaFiscal: notaFiscal.trim() }),
    }
    await onSalvar(linha.id, linha.tipo, dados)
    setSalvando(false)
    onFechar()
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-black text-[var(--text-primary)] text-base" style={{ fontFamily: 'var(--font-title)' }}>
              Editar Movimentação
            </h3>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              <span style={{ color: linha.tipo === 'receita' ? 'var(--status-ok)' : 'var(--status-danger)' }}>
                {linha.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
              </span>
              {' '}· ID {linha.id.slice(0, 8)}
            </p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-[#2A2C2B] text-[#B8B8B8] hover:text-[var(--text-primary)] transition-colors" aria-label="Fechar" title="Fechar">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Categoria */}
          <div>
            <label className="label-purion">Categoria</label>
            <div className="relative">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input-purion appearance-none pr-8 cursor-pointer">
                {categorias.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
            </div>
          </div>

          {/* Valor + Data */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label-purion">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] text-xs">R$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={valor} onChange={(e) => setValor(e.target.value)}
                  className="input-purion pl-8"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="label-purion">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-purion" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="label-purion">Descrição</label>
            <input
              type="text" value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="input-purion" maxLength={120}
            />
          </div>

          {/* Responsável + Região */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label-purion">Responsável</label>
              <div className="relative">
                <select
                  value={responsavel}
                  onChange={(e) => {
                    const r = e.target.value as PerfilUsuario
                    setResponsavel(r)
                    setRegiao(REGIAO_POR_RESPONSAVEL[r])
                  }}
                  className="input-purion appearance-none pr-8 cursor-pointer"
                >
                  <option value="matheus">Matheus</option>
                  <option value="joao">João</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
              </div>
            </div>
            <div className="w-[90px]">
              <label className="label-purion">Região</label>
              <div className="relative">
                <select value={regiao} onChange={(e) => setRegiao(e.target.value as Regiao)} className="input-purion appearance-none pr-6 cursor-pointer">
                  <option value="DF">DF</option>
                  <option value="SP">SP</option>
                  <option value="SC">SC</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Despesa: Fornecedor + NF */}
          {linha.tipo === 'despesa' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label-purion">Fornecedor</label>
                <input
                  type="text" value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="input-purion" maxLength={80}
                />
              </div>
              <div className="flex-1">
                <label className="label-purion">Nota Fiscal</label>
                <input
                  type="text" value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  placeholder="Nº da NF"
                  className="input-purion" maxLength={40}
                />
              </div>
            </div>
          )}

          {erro && <p className="text-xs text-[var(--status-danger)] px-1">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onFechar} className="btn btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn btn-primary flex-1 justify-center">
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
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
  const { perfilAtivo } = usePurionStore()
  const { adicionarReceita, adicionarDespesa } = useFinanceiro()

  const [tipo, setTipo]             = useState<TipoMovimentacao>('receita')
  const [categoria, setCategoria]   = useState<string>('')
  const [valor, setValor]           = useState<string>('')
  const [data, setData]             = useState<string>(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao]   = useState<string>('')
  const [responsavel, setResponsavel] = useState<PerfilUsuario>(perfilAtivo)
  const [regiao, setRegiao]         = useState<Regiao>(REGIAO_POR_RESPONSAVEL[perfilAtivo])
  const [fornecedor, setFornecedor] = useState<string>('')
  const [notaFiscal, setNotaFiscal] = useState<string>('')
  const [erro, setErro]             = useState<string>('')
  const [salvo, setSalvo]           = useState<boolean>(false)

  useEffect(() => { setRegiao(REGIAO_POR_RESPONSAVEL[responsavel]) }, [responsavel])

  const categoriasDisponiveis =
    tipo === 'receita'
      ? Object.entries(LABEL_CATEGORIA_RECEITA)
      : Object.entries(LABEL_CATEGORIA_DESPESA)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!categoria)                  { setErro('Selecione uma categoria.'); return }
    if (!descricao.trim())           { setErro('Informe uma descrição.'); return }

    let ok = false
    if (tipo === 'receita') {
      ok = await adicionarReceita({
        descricao: descricao.trim(), valor: valorNum,
        categoria: categoria as CategoriaReceita,
        data, regiao, responsavel,
      })
    } else {
      ok = await adicionarDespesa({
        descricao: descricao.trim(), valor: valorNum,
        categoria: categoria as CategoriaDespesa,
        data, regiao, responsavel,
        ...(fornecedor.trim() && { fornecedor: fornecedor.trim() }),
        ...(notaFiscal.trim() && { notaFiscal: notaFiscal.trim() }),
      })
    }
    if (!ok) return
    onRegistrado(tipo, valorNum)
    setValor(''); setCategoria(''); setDescricao('')
    setFornecedor(''); setNotaFiscal('')
    setErro(''); setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Tipo toggle */}
      <div className="flex rounded-lg overflow-hidden border border-[var(--border)] p-0.5 gap-0.5 bg-[var(--bg-surface-2)]">
        {(['receita', 'despesa'] as const).map((t) => (
          <button
            key={t} type="button"
            onClick={() => { setTipo(t); setCategoria('') }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              tipo === t
                ? t === 'receita'
                  ? 'bg-[rgba(143,209,79,0.15)] text-[var(--status-ok)] border border-[rgba(143,209,79,0.3)]'
                  : 'bg-[rgba(229,84,75,0.15)] text-[var(--status-danger)] border border-[rgba(229,84,75,0.3)]'
                : 'text-[#B8B8B8] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
          </button>
        ))}
      </div>

      {/* Categoria */}
      <div className="relative">
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input-purion appearance-none pr-8 cursor-pointer">
          <option value="" disabled>Categoria</option>
          {categoriasDisponiveis.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
      </div>

      {/* Valor + Data */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] text-xs">R$</span>
          <input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="input-purion pl-8" />
        </div>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-purion w-[140px]" />
      </div>

      {/* Descrição */}
      <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição da movimentação" className="input-purion" maxLength={120} />

      {/* Responsável + Região */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select value={responsavel} onChange={(e) => setResponsavel(e.target.value as PerfilUsuario)} className="input-purion appearance-none pr-8 cursor-pointer">
            <option value="matheus">Matheus</option>
            <option value="joao">João</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
        </div>
        <div className="relative w-[90px]">
          <select value={regiao} onChange={(e) => setRegiao(e.target.value as Regiao)} className="input-purion appearance-none pr-6 cursor-pointer">
            <option value="DF">DF</option>
            <option value="SP">SP</option>
            <option value="SC">SC</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
        </div>
      </div>

      {/* Fornecedor + NF (só para despesa) */}
      {tipo === 'despesa' && (
        <div className="flex gap-2">
          <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Fornecedor (opcional)" className="input-purion flex-1" maxLength={80} />
          <input type="text" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} placeholder="Nota Fiscal" className="input-purion w-[120px]" maxLength={40} />
        </div>
      )}

      {erro && <p className="text-xs text-[var(--status-danger)] px-1">{erro}</p>}

      {salvo && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#8FD14F"/><path d="M3.5 6l1.8 1.8 3-3.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {tipo === 'receita' ? 'Receita registrada!' : 'Despesa registrada!'}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-full justify-center">
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
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] text-xs">R$</span>
        <input
          type="number" min="0" step="0.01" value={custo}
          onChange={(e) => setCusto(e.target.value)}
          placeholder="Custo do produto"
          className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 pl-8 text-sm text-[var(--text-primary)] placeholder-[#A0A0A0] focus:outline-none focus:border-[rgba(156,195,219,0.5)] transition-colors"
        />
      </div>
      {resultado ? (
        <div className="space-y-2">
          {[
            { label: 'Preço de Venda', valor: formatarMoeda(resultado.precoVenda),       cor: '#D4FC3C', destaque: true  },
            { label: 'Margem Bruta',   valor: formatarPercentual(resultado.margemBruta), cor: '#8FD14F', destaque: false },
            { label: 'Lucro Líquido',  valor: formatarMoeda(resultado.lucroLiquido),      cor: '#9CC3DB', destaque: false },
            { label: 'Markup',         valor: `${resultado.markup.toFixed(2)}×`,          cor: '#A7A9A6', destaque: false },
          ].map(({ label, valor, cor, destaque }) => (
            <div key={label} className={`flex items-center justify-between p-3 rounded-lg border ${destaque ? 'bg-[rgba(212,252,60,0.06)] border-[rgba(212,252,60,0.2)]' : 'bg-[var(--bg-surface-2)] border-[var(--border)]'}`}>
              <span className="text-xs text-[#B8B8B8]">{label}</span>
              <span className="text-sm font-black" style={{ color: cor, fontFamily: 'var(--font-mono)' }}>{valor}</span>
            </div>
          ))}
          <p className="text-[10px] text-[var(--text-secondary)] text-center pt-1">
            Fórmula: Preço = Custo ÷ 0,35 (margem 65%)
          </p>
        </div>
      ) : (
        <div className="py-6 text-center text-[var(--text-secondary)] text-xs">
          Digite o custo para ver o preço sugerido
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// EXPORTAR CSV
// ─────────────────────────────────────────────

function exportarCSV(linhas: LinhaHistorico[]) {
  const headers = 'Data,Tipo,Categoria,Descrição,Valor,Responsável,Região,Fornecedor,Nota Fiscal'
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = linhas.map((l) => [
    l.data,
    l.tipo,
    LABEL_CATEGORIA_RECEITA[l.categoria as CategoriaReceita] ?? LABEL_CATEGORIA_DESPESA[l.categoria as CategoriaDespesa] ?? l.categoria,
    esc(l.descricao),
    l.valor.toFixed(2).replace('.', ','),
    LABEL_RESPONSAVEL[l.responsavel as PerfilUsuario] ?? l.responsavel,
    l.regiao,
    l.fornecedor ? esc(l.fornecedor) : '',
    l.notaFiscal ?? '',
  ].join(','))
  const csv = '﻿' + [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financeiro_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// TABELA DE HISTÓRICO
// ─────────────────────────────────────────────

const COR_TIPO = { receita: '#8FD14F', despesa: '#E5544B' }

interface TabelaHistoricoProps {
  linhas: LinhaHistorico[]
  isMobile?: boolean
  onDeletar?: (id: string, tipo: 'receita' | 'despesa') => void
  onEditar?: (linha: LinhaHistorico) => void
}

function TabelaHistorico({ linhas, isMobile, onDeletar, onEditar }: TabelaHistoricoProps) {
  const [filtroMes, setFiltroMes]                   = useState<string>('')
  const [filtroCategoria, setFiltroCategoria]       = useState<string>('')
  const [filtroTipo, setFiltroTipo]                 = useState<string>('')
  const [filtroResponsavel, setFiltroResponsavel]   = useState<string>('')
  const [busca, setBusca]                           = useState<string>('')
  const [expandedId, setExpandedId]                 = useState<string | null>(null)

  const mesesUnicos = useMemo(() => {
    const set = new Set(linhas.map((l) => l.data.substring(0, 7)))
    return [...set].sort().reverse()
  }, [linhas])

  const categoriasUnicas = useMemo(() => {
    const set = new Set(linhas.map((l) => l.categoria))
    return [...set].sort()
  }, [linhas])

  const linhasFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return linhas
      .filter((l) => !filtroMes         || l.data.startsWith(filtroMes))
      .filter((l) => !filtroCategoria   || l.categoria === filtroCategoria)
      .filter((l) => !filtroTipo        || l.tipo === filtroTipo)
      .filter((l) => !filtroResponsavel || l.responsavel === filtroResponsavel)
      .filter((l) => !q || (
        l.descricao.toLowerCase().includes(q) ||
        (l.fornecedor?.toLowerCase().includes(q) ?? false) ||
        (l.notaFiscal?.toLowerCase().includes(q) ?? false)
      ))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [linhas, filtroMes, filtroCategoria, filtroTipo, filtroResponsavel, busca])

  const totalFiltrado = linhasFiltradas.reduce(
    (acc, l) => ({ ...acc, [l.tipo]: (acc[l.tipo] ?? 0) + l.valor }),
    {} as Record<string, number>
  )

  const temFiltro = !!(filtroTipo || filtroMes || filtroCategoria || filtroResponsavel || busca)

  function limparFiltros() {
    setFiltroTipo(''); setFiltroMes(''); setFiltroCategoria('')
    setFiltroResponsavel(''); setBusca('')
  }

  const selectCls = 'bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[rgba(156,195,219,0.4)] cursor-pointer transition-colors'

  const labelCat = (cat: string) =>
    LABEL_CATEGORIA_RECEITA[cat as CategoriaReceita] ?? LABEL_CATEGORIA_DESPESA[cat as CategoriaDespesa] ?? cat

  return (
    <div>
      {/* Busca + CSV */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]" />
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar descrição, fornecedor…"
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[var(--text-secondary)] placeholder-[#A0A0A0] focus:outline-none focus:border-[rgba(156,195,219,0.4)] transition-colors"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[var(--text-primary)]" aria-label="Fechar" title="Fechar">
              <X size={10} />
            </button>
          )}
        </div>
        <button
          onClick={() => exportarCSV(linhasFiltradas)}
          title={`Exportar ${linhasFiltradas.length} registros como CSV`}
          className="p-1.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-[#B8B8B8] hover:text-[var(--brand-accent)] hover:border-[rgba(212,252,60,0.4)] transition-colors"
        >
          <Download size={13} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={13} className="text-[#A0A0A0]" />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={selectCls}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={selectCls}>
          <option value="">Todos os meses</option>
          {mesesUnicos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={selectCls}>
          <option value="">Todas as categorias</option>
          {categoriasUnicas.map((c) => <option key={c} value={c}>{labelCat(c)}</option>)}
        </select>
        <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className={selectCls}>
          <option value="">Todos os responsáveis</option>
          <option value="matheus">Matheus</option>
          <option value="joao">João</option>
        </select>
        {temFiltro && (
          <button onClick={limparFiltros} className="text-[10px] text-[var(--text-primary)] hover:underline flex items-center gap-1">
            <X size={10} /> Limpar
          </button>
        )}
        <span className="ml-auto text-[10px] text-[#A0A0A0]">{linhasFiltradas.length} registros</span>
      </div>

      {/* Subtotais */}
      {(totalFiltrado.receita || totalFiltrado.despesa) && (
        <div className="flex gap-3 mb-3">
          {totalFiltrado.receita  && <span className="text-xs text-[var(--status-ok)]">+ {formatarMoeda(totalFiltrado.receita)}</span>}
          {totalFiltrado.despesa  && <span className="text-xs text-[var(--status-danger)]">- {formatarMoeda(totalFiltrado.despesa)}</span>}
          {totalFiltrado.receita && totalFiltrado.despesa && (
            <span className={`text-xs font-semibold ${(totalFiltrado.receita - totalFiltrado.despesa) >= 0 ? 'text-[var(--status-ok)]' : 'text-[var(--status-danger)]'}`}>
              = {formatarMoeda(totalFiltrado.receita - totalFiltrado.despesa)}
            </span>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="table-purion">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              {!isMobile && <th>Categoria</th>}
              {!isMobile && <th>Descrição</th>}
              {!isMobile && <th>Responsável</th>}
              {!isMobile && <th>Fornecedor / NF</th>}
              <th style={{ textAlign: 'right' }}>Valor</th>
              {(onDeletar || onEditar) && <th style={{ width: 64 }} />}
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 3 : 8} className="px-4 py-8 text-center text-[var(--text-secondary)] text-xs">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              linhasFiltradas.map((linha) => (
                <>
                  <tr
                    key={linha.id}
                    onClick={() => isMobile && setExpandedId(expandedId === linha.id ? null : linha.id)}
                    className="bg-[var(--bg-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group/row"
                    style={isMobile ? { cursor: 'pointer' } : {}}
                  >
                    <td className="px-4 py-2.5 text-[#B8B8B8] whitespace-nowrap">
                      {formatarDataBR(linha.data)}
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
                        {linha.tipo === 'receita' ? '↑' : '↓'}
                      </span>
                    </td>
                    {!isMobile && <td className="px-4 py-2.5 text-[#B8B8B8]">{labelCat(linha.categoria)}</td>}
                    {!isMobile && (
                      <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[200px] truncate" title={linha.descricao}>
                        {linha.descricao}
                      </td>
                    )}
                    {!isMobile && (
                      <td className="px-4 py-2.5 text-[#B8B8B8]">
                        {LABEL_RESPONSAVEL[linha.responsavel as PerfilUsuario] ?? linha.responsavel}
                        <span className="text-[#8A8A8A] ml-1">{linha.regiao}</span>
                      </td>
                    )}
                    {!isMobile && (
                      <td className="px-4 py-2.5 text-[#A0A0A0] text-xs max-w-[180px] truncate">
                        {linha.fornecedor ? (
                          <>
                            {linha.fornecedor}
                            {linha.notaFiscal && <span className="text-[#8A8A8A] ml-1">· NF {linha.notaFiscal}</span>}
                          </>
                        ) : linha.notaFiscal ? (
                          <span>NF {linha.notaFiscal}</span>
                        ) : (
                          <span className="text-[#2A2C2B]">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-right" style={{ color: COR_TIPO[linha.tipo] }}>
                      {linha.tipo === 'receita' ? '+' : '-'} {formatarMoeda(linha.valor)}
                    </td>
                    {(onDeletar || onEditar) && (
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {onEditar && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditar(linha) }}
                              className="p-1 rounded hover:bg-[#2A2C2B] text-[#B8B8B8] hover:text-[var(--status-info)]" aria-label="Editar" title="Editar"><Pencil size={11} /></button>
                          )}
                          {onDeletar && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeletar(linha.id, linha.tipo) }}
                              className="p-1 rounded hover:bg-[#2A2C2B] text-[#B8B8B8] hover:text-[var(--status-danger)]" aria-label="Excluir" title="Excluir"><Trash2 size={11} /></button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isMobile && expandedId === linha.id && (
                    <tr key={`${linha.id}-detail`} className="bg-[var(--bg-surface-2)]">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-[#B8B8B8]"><span className="text-[#A0A0A0] font-medium">Categoria:</span> {labelCat(linha.categoria)}</p>
                          <p className="text-[11px] text-[#B8B8B8]"><span className="text-[#A0A0A0] font-medium">Descrição:</span> {linha.descricao}</p>
                          <p className="text-[11px] text-[#B8B8B8]">
                            <span className="text-[#A0A0A0] font-medium">Responsável:</span>{' '}
                            {LABEL_RESPONSAVEL[linha.responsavel as PerfilUsuario] ?? linha.responsavel} · {linha.regiao}
                          </p>
                          {linha.fornecedor && <p className="text-[11px] text-[#B8B8B8]"><span className="text-[#A0A0A0] font-medium">Fornecedor:</span> {linha.fornecedor}</p>}
                          {linha.notaFiscal  && <p className="text-[11px] text-[#B8B8B8]"><span className="text-[#A0A0A0] font-medium">Nota Fiscal:</span> {linha.notaFiscal}</p>}
                          {(onEditar || onDeletar) && (
                            <div className="flex gap-2 pt-2">
                              {onEditar && (
                                <button onClick={() => onEditar(linha)} className="btn btn-secondary btn-sm flex-1 justify-center">
                                  <Pencil size={10} /> Editar
                                </button>
                              )}
                              {onDeletar && (
                                <button
                                  onClick={() => onDeletar(linha.id, linha.tipo)}
                                  className="btn btn-sm flex-1 justify-center text-[var(--status-danger)] border border-[rgba(229,84,75,0.3)] hover:bg-[rgba(229,84,75,0.1)]"
                                >
                                  <Trash2 size={10} /> Excluir
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
  const isMobile = useMobile()
  const { deletarFinanceiro, atualizarFinanceiro } = useFinanceiro()

  const [deletandoFin, setDeletandoFin] = useState<{ id: string; tipo: 'receita' | 'despesa'; descricao: string } | null>(null)
  const [editandoFin, setEditandoFin]   = useState<LinhaHistorico | null>(null)

  const [painelAberto, setPainelAberto] = useState<'registrar' | 'calculadora' | null>(null)
  useAcaoRapida('registrar-receita', () => setPainelAberto('registrar'))
  useAcaoRapida('registrar-despesa', () => setPainelAberto('registrar'))
  const [showModalSplit, setShowModalSplit] = useState(false)
  const [splitInfo, setSplitInfo] = useState<{ valor: number; items: ReturnType<typeof calcularSplit> } | null>(null)

  const kpisGlobais  = useMemo(() => calcularKPIsGlobais(receitas, despesas),     [receitas, despesas])
  const mesAtual     = useMemo(() => getMesAtual(receitas),                        [receitas])
  const dadosGrafico = useMemo(() => calcularGrafico6Meses(receitas, despesas),   [receitas, despesas])
  const projecoes    = useMemo(() => calcularProjecoes(receitas, despesas),        [receitas, despesas])

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
      fornecedor: des.fornecedor,
      notaFiscal: des.notaFiscal,
    }))
    return [...r, ...d]
  }, [receitas, despesas])

  function handleRegistrado(tipo: TipoMovimentacao, valor: number) {
    setPainelAberto(null)
    if (tipo === 'receita') {
      setSplitInfo({ valor, items: calcularSplit(valor, configuracoes) })
      setShowModalSplit(true)
    }
  }

  const pctDespesa = kpisGlobais.receitaTotal > 0 ? (kpisGlobais.despesaTotal / kpisGlobais.receitaTotal) * 100 : NaN
  const metricas: MetricaFaixa[] = [
    { label: 'Receita acumulada', valor: formatarMoeda(kpisGlobais.receitaTotal), sub: `último mês com receita: ${mesAtual.slice(5, 7)}/${mesAtual.slice(0, 4)}`, dica: 'Soma de todas as receitas registradas.' },
    { label: 'Despesa acumulada', valor: formatarMoeda(kpisGlobais.despesaTotal), sub: `${formatarPercentual(pctDespesa)} da receita` },
    { label: 'Saldo', valor: formatarMoeda(kpisGlobais.saldoTotal), sub: 'receita − despesa', tom: kpisGlobais.saldoTotal < 0 ? 'danger' : 'ok' },
    { label: 'Resultado / receita', valor: formatarPercentual(kpisGlobais.margemMedia), sub: 'sobra depois de TODAS as despesas', tom: kpisGlobais.saldoTotal < 0 ? 'danger' : undefined, dica: 'Não é margem bruta: é (receita − todas as despesas lançadas) ÷ receita. A margem do produto (preço − custo do frasco) fica em Vendas > Métricas.' },
  ]

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Cabeçalho: título + as duas ações (antes ocupavam metade da tela, sempre abertas) */}
      <div className="toolbar">
        <h1 className="page-title" style={{ flex: '1 1 200px' }}>Financeiro</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => setPainelAberto('calculadora')}>
          <Calculator size={13} /> Calculadora de preço
        </button>
        <button className="btn btn-accent btn-sm" onClick={() => setPainelAberto('registrar')}>
          <Plus size={13} /> Registrar movimentação
        </button>
      </div>

      <MetricStrip metricas={metricas} rotulo="Resumo financeiro" />

      {/* Evolução + projeção lado a lado */}
      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="card-purion card-section">
          <p className="kpi-label mb-4">Evolução · 6 meses</p>
          <GraficoEvolucao dados={dadosGrafico} height={isMobile ? 200 : 280} />
        </div>

        <div className="card-purion card-section">
          <p className="kpi-label mb-1">Projeção · ritmo dos últimos 90 dias</p>
          <p className="caption mb-2">Só o que foi lançado. Despesa não lançada faz a margem parecer maior.</p>
          <table className="tabela-compacta">
            <thead>
              <tr><th>Horizonte</th><th>Receita</th><th>Despesa</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              {projecoes.map(({ dias, receitaProjetada, despesaProjetada, margemProjetada }) => (
                <tr key={dias}>
                  <td>{dias} dias</td>
                  <td className="tnum">{formatarMoeda(receitaProjetada)}</td>
                  <td className="tnum" style={{ color: 'var(--text-secondary)' }}>{formatarMoeda(despesaProjetada)}</td>
                  <td className="tnum" style={{ color: Number(margemProjetada) < 0 ? 'var(--status-danger)' : undefined }}>
                    {String(margemProjetada).replace('.', ',')}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico */}
      <div className="card-purion card-section">
        <div className="flex items-center gap-2 mb-4">
          <p className="kpi-label">Movimentações</p>
          <span className="caption ml-auto tnum">{historico.length} registros</span>
        </div>
        <TabelaHistorico
          linhas={historico}
          isMobile={isMobile}
          onEditar={(linha) => setEditandoFin(linha)}
          onDeletar={(id, tipo) => {
            const item = historico.find((l) => l.id === id)
            setDeletandoFin({ id, tipo, descricao: item?.descricao ?? id })
          }}
        />
      </div>

      {/* Registrar movimentação / Calculadora (sob demanda) */}
      {painelAberto && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPainelAberto(null) }}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">{painelAberto === 'registrar' ? 'Registrar movimentação' : 'Calculadora de precificação'}</h2>
              <button className="icon-btn" onClick={() => setPainelAberto(null)} aria-label="Fechar"><X size={14} /></button>
            </div>
            {painelAberto === 'registrar' ? <FormMovimentacao onRegistrado={handleRegistrado} /> : <CalculadoraPrecificacao />}
          </div>
        </div>
      )}

      {/* Modal Edição */}
      {editandoFin && (
        <ModalEditarMovimentacao
          linha={editandoFin}
          onFechar={() => setEditandoFin(null)}
          onSalvar={atualizarFinanceiro}
        />
      )}

      {/* Modal Split */}
      {showModalSplit && splitInfo && (
        <ModalSplit
          valor={splitInfo.valor}
          items={splitInfo.items}
          onClose={() => setShowModalSplit(false)}
        />
      )}

      {/* Confirmar delete */}
      <ConfirmModal
        open={!!deletandoFin}
        title={`Excluir ${deletandoFin?.tipo === 'receita' ? 'Receita' : 'Despesa'}`}
        message={`Deseja excluir "${deletandoFin?.descricao}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => {
          if (deletandoFin) {
            deletarFinanceiro(deletandoFin.id, deletandoFin.tipo)
            setDeletandoFin(null)
          }
        }}
        onCancel={() => setDeletandoFin(null)}
      />
    </div>
  )
}
