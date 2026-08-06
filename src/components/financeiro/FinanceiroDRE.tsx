'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { CategoriaReceita, CategoriaDespesa } from '@/store'
import {
  formatarMoeda, formatarPercentual,
  LABEL_CATEGORIA_RECEITA, LABEL_CATEGORIA_DESPESA,
} from '@/lib/calculos'

const NOME_MES: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
}

const NOME_MES_CURTO: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function formatarMes(ym: string, curto = false) {
  const [y, m] = ym.split('-')
  return `${(curto ? NOME_MES_CURTO : NOME_MES)[m] ?? m}/${y.slice(2)}`
}

function agruparPorCategoria(items: Array<{ categoria: string; valor: number }>) {
  const map = new Map<string, number>()
  items.forEach((i) => map.set(i.categoria, (map.get(i.categoria) ?? 0) + i.valor))
  return [...map.entries()].sort(([, a], [, b]) => b - a)
}

function variacaoPct(atual: number, prev: number): number | null {
  if (!prev) return null
  return ((atual - prev) / prev) * 100
}

function VarBadge({ pct, inverso = false }: { pct: number | null; inverso?: boolean }) {
  if (pct === null) return null
  const positivo = inverso ? pct <= 0 : pct >= 0
  return (
    <span className="text-[10px] font-semibold" style={{ color: positivo ? '#4CAF7A' : '#E85238' }}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function exportarDRE(
  mes: string,
  receitasPorCat: [string, number][],
  despesasPorCat: [string, number][],
  totalReceitas: number,
  totalDespesas: number,
  resultado: number,
  margem: number,
) {
  const linhas: string[] = [
    `DRE — ${formatarMes(mes)}`,
    '',
    'RECEITAS',
    'Categoria,Valor',
    ...receitasPorCat.map(([cat, val]) =>
      `"${LABEL_CATEGORIA_RECEITA[cat as CategoriaReceita] ?? cat}","${formatarMoeda(val)}"`
    ),
    `"Total Receitas","${formatarMoeda(totalReceitas)}"`,
    '',
    'DESPESAS',
    'Categoria,Valor',
    ...despesasPorCat.map(([cat, val]) =>
      `"${LABEL_CATEGORIA_DESPESA[cat as CategoriaDespesa] ?? cat}","${formatarMoeda(val)}"`
    ),
    `"Total Despesas","${formatarMoeda(totalDespesas)}"`,
    '',
    'RESULTADO',
    `"Resultado Líquido","${formatarMoeda(resultado)}"`,
    `"Margem","${formatarPercentual(margem)}"`,
  ]
  const csv = '﻿' + linhas.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dre_${mes}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function FinanceiroDRE() {
  const { receitas, despesas } = usePurionStore()

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    receitas.forEach((r) => set.add(r.data.substring(0, 7)))
    despesas.forEach((d) => set.add(d.data.substring(0, 7)))
    if (set.size === 0) set.add(new Date().toISOString().substring(0, 7))
    return [...set].sort().reverse()
  }, [receitas, despesas])

  const [mesSel, setMesSel] = useState(() => mesesDisponiveis[0])

  const idxAtual = mesesDisponiveis.indexOf(mesSel)
  const mesPrev = mesesDisponiveis[idxAtual + 1] ?? null

  const recMes  = useMemo(() => receitas.filter((r) => r.data.startsWith(mesSel)),  [receitas, mesSel])
  const despMes = useMemo(() => despesas.filter((d) => d.data.startsWith(mesSel)),  [despesas, mesSel])
  const recPrev = useMemo(() => mesPrev ? receitas.filter((r) => r.data.startsWith(mesPrev)) : [],  [receitas, mesPrev])
  const despPrev = useMemo(() => mesPrev ? despesas.filter((d) => d.data.startsWith(mesPrev)) : [], [despesas, mesPrev])

  const recPorCat  = useMemo(() => agruparPorCategoria(recMes),  [recMes])
  const despPorCat = useMemo(() => agruparPorCategoria(despMes), [despMes])

  const totalRec  = recMes.reduce((s, r) => s + r.valor, 0)
  const totalDesp = despMes.reduce((s, d) => s + d.valor, 0)
  const resultado = totalRec - totalDesp
  const margem    = totalRec > 0 ? (resultado / totalRec) * 100 : 0

  const totalRecPrev  = recPrev.reduce((s, r) => s + r.valor, 0)
  const totalDespPrev = despPrev.reduce((s, d) => s + d.valor, 0)

  const varRec  = variacaoPct(totalRec, totalRecPrev)
  const varDesp = variacaoPct(totalDesp, totalDespPrev)

  const labelCatRec  = (cat: string) => LABEL_CATEGORIA_RECEITA[cat as CategoriaReceita]  ?? cat
  const labelCatDesp = (cat: string) => LABEL_CATEGORIA_DESPESA[cat as CategoriaDespesa] ?? cat

  return (
    <div className="page-content section-gap">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">DRE</h1>
          <p className="caption mt-1">Demonstrativo de Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Navegação de mês */}
          <button
            onClick={() => setMesSel(mesesDisponiveis[idxAtual + 1])}
            disabled={idxAtual >= mesesDisponiveis.length - 1}
            className="icon-btn"
            title="Mês anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-[var(--text-primary)] min-w-[80px] text-center">
            {formatarMes(mesSel)}
          </span>
          <button
            onClick={() => setMesSel(mesesDisponiveis[idxAtual - 1])}
            disabled={idxAtual <= 0}
            className="icon-btn"
            title="Próximo mês"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => exportarDRE(mesSel, recPorCat, despPorCat, totalRec, totalDesp, resultado, margem)}
            title="Exportar DRE como CSV"
            className="icon-btn"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <span className="kpi-label">Receitas</span>
            <TrendingUp size={16} style={{ color: '#4CAF7A' }} className="opacity-60" />
          </div>
          <div>
            <span className="kpi-value" style={{ color: '#4CAF7A' }}>{formatarMoeda(totalRec)}</span>
            {mesPrev && (
              <p className="caption mt-1 flex items-center gap-1">
                vs {formatarMes(mesPrev, true)} <VarBadge pct={varRec} />
              </p>
            )}
          </div>
        </div>
        <div className="kpi-card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <span className="kpi-label">Despesas</span>
            <TrendingDown size={16} style={{ color: '#E85238' }} className="opacity-60" />
          </div>
          <div>
            <span className="kpi-value" style={{ color: '#E85238' }}>{formatarMoeda(totalDesp)}</span>
            {mesPrev && (
              <p className="caption mt-1 flex items-center gap-1">
                vs {formatarMes(mesPrev, true)} <VarBadge pct={varDesp} inverso />
              </p>
            )}
          </div>
        </div>
        <div className="kpi-card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <span className="kpi-label">Resultado</span>
            <DollarSign size={16} style={{ color: resultado >= 0 ? '#C9A84C' : '#E85238' }} className="opacity-60" />
          </div>
          <div>
            <span className="kpi-value" style={{ color: resultado >= 0 ? '#C9A84C' : '#E85238' }}>
              {resultado >= 0 ? '+' : ''}{formatarMoeda(resultado)}
            </span>
            <p className="caption mt-1">{resultado >= 0 ? 'Lucro' : 'Prejuízo'}</p>
          </div>
        </div>
        <div className="kpi-card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <span className="kpi-label">Margem</span>
            <BarChart2 size={16} style={{ color: '#C9A84C' }} className="opacity-60" />
          </div>
          <div>
            <span className="kpi-value" style={{ color: margem >= 50 ? '#4CAF7A' : margem >= 0 ? '#C9A84C' : '#E85238' }}>
              {formatarPercentual(margem)}
            </span>
            <p className="caption mt-1">Meta: 65%</p>
          </div>
        </div>
      </div>

      {/* Demonstrativo */}
      <div className="card-purion card-section space-y-6">

        {/* RECEITAS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full bg-[#4CAF7A]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Receitas</h3>
            <span className="caption ml-auto">{recMes.length} registros</span>
          </div>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="table-purion">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th style={{ textAlign: 'right', width: 90 }}>% Receitas</th>
                  <th style={{ textAlign: 'right', width: 60 }}>Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {recPorCat.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--text-secondary)] text-xs">Nenhuma receita neste mês</td></tr>
                ) : recPorCat.map(([cat, valor]) => {
                  const count = recMes.filter((r) => r.categoria === cat).length
                  return (
                    <tr key={cat}>
                      <td>{labelCatRec(cat)}</td>
                      <td className="td-mono text-right" style={{ color: '#4CAF7A' }}>+{formatarMoeda(valor)}</td>
                      <td className="text-right caption">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                            <div className="h-full bg-[#4CAF7A] rounded-full" style={{ width: `${totalRec > 0 ? (valor / totalRec) * 100 : 0}%` }} />
                          </div>
                          {totalRec > 0 ? formatarPercentual((valor / totalRec) * 100) : '—'}
                        </div>
                      </td>
                      <td className="text-right caption">{count}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(76,175,122,0.05)', borderTop: '2px solid var(--border)' }}>
                  <td className="font-bold text-[var(--text-primary)]">Total Receitas</td>
                  <td className="td-mono text-right font-black" style={{ color: '#4CAF7A' }}>+{formatarMoeda(totalRec)}</td>
                  <td className="text-right caption font-semibold">100%</td>
                  <td className="text-right caption">{recMes.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* DESPESAS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full bg-[#E85238]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Despesas</h3>
            <span className="caption ml-auto">{despMes.length} registros</span>
          </div>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="table-purion">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th style={{ textAlign: 'right', width: 90 }}>% Receitas</th>
                  <th style={{ textAlign: 'right', width: 60 }}>Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {despPorCat.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--text-secondary)] text-xs">Nenhuma despesa neste mês</td></tr>
                ) : despPorCat.map(([cat, valor]) => {
                  const count = despMes.filter((d) => d.categoria === cat).length
                  const pctRec = totalRec > 0 ? (valor / totalRec) * 100 : 0
                  return (
                    <tr key={cat}>
                      <td>{labelCatDesp(cat)}</td>
                      <td className="td-mono text-right" style={{ color: '#E85238' }}>-{formatarMoeda(valor)}</td>
                      <td className="text-right caption">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                            <div className="h-full bg-[#E85238] rounded-full" style={{ width: `${Math.min(pctRec, 100)}%` }} />
                          </div>
                          {totalRec > 0 ? formatarPercentual(pctRec) : '—'}
                        </div>
                      </td>
                      <td className="text-right caption">{count}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(232,82,56,0.05)', borderTop: '2px solid var(--border)' }}>
                  <td className="font-bold text-[var(--text-primary)]">Total Despesas</td>
                  <td className="td-mono text-right font-black" style={{ color: '#E85238' }}>-{formatarMoeda(totalDesp)}</td>
                  <td className="text-right caption font-semibold">
                    {totalRec > 0 ? formatarPercentual((totalDesp / totalRec) * 100) : '—'}
                  </td>
                  <td className="text-right caption">{despMes.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* RESULTADO */}
        <div
          className="rounded-xl p-5 border"
          style={{
            background: resultado >= 0 ? 'rgba(201,168,76,0.06)' : 'rgba(232,82,56,0.06)',
            borderColor: resultado >= 0 ? 'rgba(201,168,76,0.25)' : 'rgba(232,82,56,0.25)',
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-[#B8B8B8] mb-1 uppercase tracking-wide">
                Resultado Líquido — {formatarMes(mesSel)}
              </p>
              <p
                className="text-2xl font-black"
                style={{ fontFamily: 'Montserrat, sans-serif', color: resultado >= 0 ? '#C9A84C' : '#E85238' }}
              >
                {resultado >= 0 ? '+' : ''}{formatarMoeda(resultado)}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-[#B8B8B8] mb-1">Margem Líquida</p>
                <p
                  className="text-xl font-black"
                  style={{ fontFamily: 'Montserrat, sans-serif', color: margem >= 50 ? '#4CAF7A' : margem >= 0 ? '#C9A84C' : '#E85238' }}
                >
                  {formatarPercentual(margem)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#B8B8B8] mb-1">Cobertura</p>
                <p className="text-xl font-black" style={{ fontFamily: 'Montserrat, sans-serif', color: '#B8B8B8' }}>
                  {totalRec > 0 ? formatarPercentual((totalDesp / totalRec) * 100) : '—'}
                </p>
                <p className="text-[10px] text-[#A0A0A0]">% desp/rec</p>
              </div>
            </div>
          </div>

          {/* Barra de progresso margem vs meta 65% */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#B8B8B8]">Margem vs meta 65%</span>
              <span className="text-[10px]" style={{ color: margem >= 65 ? '#4CAF7A' : '#E8A838' }}>
                {margem >= 65 ? '✓ Acima da meta' : `${(65 - margem).toFixed(1)}pp abaixo`}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(Math.max(margem, 0), 100)}%`,
                  background: margem >= 65 ? '#4CAF7A' : margem >= 30 ? '#C9A84C' : '#E85238',
                }}
              />
            </div>
          </div>
        </div>

        {/* Comparativo mês anterior */}
        {mesPrev && (totalRecPrev > 0 || totalDespPrev > 0) && (
          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-xs text-[#B8B8B8] mb-3 flex items-center gap-1.5">
              Comparativo vs {formatarMes(mesPrev)}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Receitas', atual: totalRec, prev: totalRecPrev, inverso: false, cor: '#4CAF7A' },
                { label: 'Despesas', atual: totalDesp, prev: totalDespPrev, inverso: true, cor: '#E85238' },
                { label: 'Resultado', atual: resultado, prev: totalRecPrev - totalDespPrev, inverso: false, cor: resultado >= 0 ? '#C9A84C' : '#E85238' },
              ].map(({ label, atual, prev, inverso, cor }) => {
                const delta = variacaoPct(atual, prev)
                return (
                  <div key={label} className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-3">
                    <p className="text-[10px] text-[#B8B8B8] mb-1">{label}</p>
                    <p className="text-sm font-bold" style={{ color: cor }}>{formatarMoeda(atual)}</p>
                    <VarBadge pct={delta} inverso={inverso} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
