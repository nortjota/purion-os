'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Download, FileText, Filter } from 'lucide-react'
import { useAfiliados } from '@/hooks/useAfiliados'

const GraficoPorPlataforma = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoPorPlataforma })),
  { ssr: false, loading: () => <div style={{ height: 220, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)
const GraficoEvolucaoMensal = dynamic(
  () => import('./AfiliadosGraficos').then(m => ({ default: m.GraficoEvolucaoMensal })),
  { ssr: false, loading: () => <div style={{ height: 220, background: 'var(--bg-surface-2)', borderRadius: 8 }} className="animate-pulse" /> }
)

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Periodo = '7d' | '30d' | 'mes' | 'trimestre' | 'custom'

function getPeriodoDatas(periodo: Periodo, customInicio?: string, customFim?: string): [string, string] {
  const hoje = new Date()
  const fim  = hoje.toISOString().slice(0, 10)
  if (periodo === '7d')        return [new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), fim]
  if (periodo === '30d')       return [new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), fim]
  if (periodo === 'mes')       return [`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`, fim]
  if (periodo === 'trimestre') return [new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), fim]
  return [customInicio ?? fim, customFim ?? fim]
}

export function AfiliadoRelatorio() {
  const { afiliados, vendas, cliques, carregando } = useAfiliados()
  const [periodo,       setPeriodo]       = useState<Periodo>('30d')
  const [customInicio,  setCustomInicio]  = useState('')
  const [customFim,     setCustomFim]     = useState('')
  const [filtroAfiliado, setFiltroAfiliado] = useState('todos')
  const [exportando,    setExportando]    = useState(false)

  const [dataInicio, dataFim] = getPeriodoDatas(periodo, customInicio, customFim)

  const vendasFiltradas = useMemo(() => vendas.filter(v => {
    const ok = v.data_venda >= dataInicio && v.data_venda <= dataFim + 'T23:59:59'
    const af = filtroAfiliado === 'todos' || v.afiliado_id === filtroAfiliado
    return ok && af && v.status_venda !== 'cancelada'
  }), [vendas, dataInicio, dataFim, filtroAfiliado])

  const cliquesFiltrados = useMemo(() => cliques.filter(c =>
    filtroAfiliado === 'todos' || c.afiliado_id === filtroAfiliado
  ), [cliques, filtroAfiliado])

  // ── Métricas gerais ───────────────────────────────────────────────────────
  const resumo = useMemo(() => {
    const totalCliques    = cliquesFiltrados.length
    const convertidos     = cliquesFiltrados.filter(c => c.converteu).length
    const taxaConv        = totalCliques > 0 ? convertidos / totalCliques * 100 : 0
    const receitaTotal    = vendasFiltradas.reduce((s, v) => s + v.valor_liquido, 0)
    const comPendentes    = vendasFiltradas.filter(v => v.status_comissao === 'pendente').reduce((s, v) => s + v.comissao_valor, 0)
    const comPagas        = vendasFiltradas.filter(v => v.status_comissao === 'paga').reduce((s, v) => s + v.comissao_valor, 0)
    const ticketMedio     = vendasFiltradas.length > 0 ? receitaTotal / vendasFiltradas.length : 0
    return { totalCliques, totalVendas: vendasFiltradas.length, taxaConv, receitaTotal, comPendentes, comPagas, ticketMedio }
  }, [vendasFiltradas, cliquesFiltrados])

  // ── Ranking de afiliados ──────────────────────────────────────────────────
  const ranking = useMemo(() => afiliados.map(a => {
    const aVendas  = vendasFiltradas.filter(v => v.afiliado_id === a.id)
    const aCliques = cliquesFiltrados.filter(c => c.afiliado_id === a.id)
    const receita  = aVendas.reduce((s, v) => s + v.valor_liquido, 0)
    const comissao = aVendas.reduce((s, v) => s + v.comissao_valor, 0)
    const conv     = aCliques.length > 0 ? aVendas.length / aCliques.length * 100 : 0
    return { ...a, receita, comissao, cliques: aCliques.length, conversao: conv }
  }).filter(a => a.receita > 0 || a.cliques > 0)
    .sort((a, b) => b.receita - a.receita),
  [afiliados, vendasFiltradas, cliquesFiltrados])

  // ── Performance por plataforma ────────────────────────────────────────────
  const dadosPlataforma = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of cliquesFiltrados) {
      const af = afiliados.find(a => a.id === c.afiliado_id)
      const plat = af?.tiktok ? 'TikTok' : af?.instagram ? 'Instagram' : af?.youtube ? 'YouTube' : 'Direto'
      map[plat] = (map[plat] ?? 0) + 1
    }
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor }))
  }, [cliquesFiltrados, afiliados])

  // ── Evolução mensal ───────────────────────────────────────────────────────
  const dadosEvolucao = useMemo(() => {
    const meses: Record<string, number> = {}
    for (const v of vendas.filter(v => v.status_venda !== 'cancelada')) {
      const m = v.data_venda.slice(0, 7)
      meses[m] = (meses[m] ?? 0) + v.valor_liquido
    }
    return Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mes, receita]) => ({
      mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receita,
    }))
  }, [vendas])

  // ── Análise de produtos ───────────────────────────────────────────────────
  const dadosProdutos = useMemo(() => {
    const map: Record<string, { qtd: number; receita: number }> = {}
    for (const v of vendasFiltradas) {
      for (const p of (v.produtos ?? [])) {
        const sku = (p.sku ?? p.nome) as string
        if (!map[sku]) map[sku] = { qtd: 0, receita: 0 }
        map[sku].qtd     += p.quantidade ?? 1
        map[sku].receita += p.valor * (p.quantidade ?? 1)
      }
    }
    return Object.entries(map).map(([sku, d]) => ({ sku, ...d })).sort((a, b) => b.receita - a.receita)
  }, [vendasFiltradas])

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  function exportarCSV() {
    const header = ['Nome', 'Código', 'Cliques', 'Vendas', 'Receita (R$)', 'Comissão (R$)', 'Conversão (%)']
    const rows   = ranking.map(a => [a.nome, a.codigo, a.cliques, a.receita.toFixed(2), a.comissao.toFixed(2), a.conversao.toFixed(1)])
    const csv    = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url    = URL.createObjectURL(blob)
    const link   = document.createElement('a')
    link.href    = url
    link.download = `afiliados-relatorio-${dataInicio}-${dataFim}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  async function exportarPDF() {
    setExportando(true)
    const { jsPDF } = await import('jspdf')
    const doc  = new jsPDF()
    let y = 20

    doc.setFontSize(18); doc.setTextColor(201, 168, 76)
    doc.text('PURION OS — Relatório de Afiliados', 14, y); y += 10

    doc.setFontSize(10); doc.setTextColor(120, 120, 120)
    doc.text(`Período: ${dataInicio} a ${dataFim}  |  Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, y); y += 12

    doc.setFontSize(13); doc.setTextColor(30, 30, 30)
    doc.text('Resumo Geral', 14, y); y += 8

    doc.setFontSize(10)
    const linhasResumo = [
      `Total de cliques: ${resumo.totalCliques}`,
      `Total de vendas: ${resumo.totalVendas}`,
      `Taxa de conversão: ${resumo.taxaConv.toFixed(1)}%`,
      `Receita total: ${fmt(resumo.receitaTotal)}`,
      `Comissões pagas: ${fmt(resumo.comPagas)}`,
      `Comissões pendentes: ${fmt(resumo.comPendentes)}`,
      `Ticket médio: ${fmt(resumo.ticketMedio)}`,
    ]
    for (const l of linhasResumo) { doc.text(l, 14, y); y += 6 }
    y += 6

    doc.setFontSize(13); doc.setTextColor(30, 30, 30)
    doc.text('Ranking de Afiliados', 14, y); y += 8
    doc.setFontSize(9); doc.setTextColor(80, 80, 80)
    doc.text('Nome                    Cliques  Vendas  Receita (R$)   Comissão (R$)', 14, y); y += 6
    doc.setTextColor(30, 30, 30)
    for (const a of ranking.slice(0, 20)) {
      const linha = `${a.nome.slice(0, 20).padEnd(22)} ${String(a.cliques).padEnd(8)} ${String(a.receita.toFixed(0)).padEnd(7)} ${a.receita.toFixed(2).padEnd(14)} ${a.comissao.toFixed(2)}`
      doc.text(linha, 14, y); y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    }

    doc.save(`relatorio-afiliados-${dataInicio}.pdf`)
    setExportando(false)
  }

  const INPUT = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }

  if (carregando) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Carregando dados…</p>
    </div>
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Relatório de Afiliados</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Análise consolidada de performance</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportarCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={exportarPDF} disabled={exportando} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: 'none', background: '#C9A84C', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: 12, color: '#0D0D0D', fontWeight: 600, opacity: exportando ? 0.7 : 1 }}>
            <FileText size={13} /> {exportando ? 'Gerando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
        <Filter size={14} color="var(--text-secondary)" />
        <select style={INPUT} value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)}>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="mes">Mês atual</option>
          <option value="trimestre">Trimestre</option>
          <option value="custom">Personalizado</option>
        </select>
        {periodo === 'custom' && (<>
          <input type="date" style={INPUT} value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>até</span>
          <input type="date" style={INPUT} value={customFim} onChange={e => setCustomFim(e.target.value)} />
        </>)}
        <select style={INPUT} value={filtroAfiliado} onChange={e => setFiltroAfiliado(e.target.value)}>
          <option value="todos">Todos os afiliados</option>
          {afiliados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>

      {/* 1. Resumo geral */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>1. Resumo geral</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total cliques',      value: resumo.totalCliques.toLocaleString('pt-BR') },
            { label: 'Total vendas',        value: resumo.totalVendas },
            { label: 'Taxa de conversão',   value: `${resumo.taxaConv.toFixed(1)}%` },
            { label: 'Receita total',       value: fmt(resumo.receitaTotal) },
            { label: 'Comissões pagas',     value: fmt(resumo.comPagas) },
            { label: 'Comissões pendentes', value: fmt(resumo.comPendentes) },
            { label: 'Ticket médio',        value: fmt(resumo.ticketMedio) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Ranking */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>2. Ranking de afiliados</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Afiliado', 'Cliques', 'Vendas', 'Receita', 'Comissão', 'Conversão'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>Nenhum dado no período</td></tr>
                : ranking.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: i < 3 ? 700 : 400 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {a.nome} <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({a.codigo})</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{a.cliques.toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{a.receita > 0 ? vendasFiltradas.filter(v => v.afiliado_id === a.id).length : 0}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(a.receita)}</td>
                    <td style={{ padding: '10px 12px', color: '#C9A84C', fontWeight: 600 }}>{fmt(a.comissao)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{a.conversao.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Plataforma + 4. Produtos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="grid-mobile-1">
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>3. Performance por plataforma</p>
          {dadosPlataforma.length === 0
            ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sem dados de cliques</p>
            : <GraficoPorPlataforma dados={dadosPlataforma} />
          }
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>4. Análise de produtos</p>
          {dadosProdutos.length === 0
            ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sem dados de produtos</p>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['SKU / Produto', 'Qtd', 'Receita'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosProdutos.map(p => (
                    <tr key={p.sku} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.sku}</td>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{p.qtd}</td>
                      <td style={{ padding: '8px', color: '#C9A84C', fontWeight: 600 }}>{fmt(p.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {/* 5. Evolução mensal */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>5. Evolução mensal — receita via afiliados</p>
        {dadosEvolucao.length === 0
          ? <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Sem dados suficientes</p>
          : <GraficoEvolucaoMensal dados={dadosEvolucao} />
        }
      </div>
    </div>
  )
}
