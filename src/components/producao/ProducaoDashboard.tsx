'use client'

/**
 * PURION OS — Produção & Estoque
 * Ciclo completo: insumos → lote de produção → frascos prontos (estoque) → expedição.
 * A faixa de números fica sempre visível e leva à aba que resolve cada ponto.
 */

import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { useAcaoRapida, dispararAcaoRapida } from '@/lib/acaoRapida'
import { useMemo, useState } from 'react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import { usePurionStore } from '@/store'
import { useEstoque } from '@/hooks/useEstoque'
import { useInsumos, useBomReceita, capacidadeProducao, custoReceitaPorUnidade } from '@/hooks/useInsumosBOM'
import { normalizarStatusLote, formatarMoeda } from './producaoHelpers'
import { ProducaoEstoqueView } from './ProducaoEstoqueView'
import { ProducaoLotesView } from './ProducaoLotesView'
import { ProducaoExpedicaoView } from './ProducaoExpedicaoView'
import { ProducaoInsumosView } from './ProducaoInsumosView'
import { ProducaoReceitaView } from './ProducaoReceitaView'

type TabId = 'estoque' | 'lotes' | 'insumos' | 'receita' | 'expedicao'

export function ProducaoDashboard() {
  const [aba, setAba] = useEstadoPersistido<TabId>('producao.aba', 'estoque')
  // leva à aba de lotes; quem abre o formulário é a própria aba
  useAcaoRapida('novo-lote', () => setAba('lotes'), { consumir: false })
  const { registrarMovimentacao } = useEstoque()
  const { estoqueProduto, lotes } = usePurionStore()
  const { insumos, emAlerta, valorTotalInsumos } = useInsumos()
  const { itens: receita } = useBomReceita()

  const metricas = useMemo<MetricaFaixa[]>(() => {
    const prontos = estoqueProduto?.quantidadeAtual ?? 0
    const minimo = estoqueProduto?.quantidadeMinima ?? 0
    const abaixo = !!estoqueProduto && prontos < minimo
    const lotesAtivos = lotes.filter((l) => !['concluido', 'reprovado'].includes(normalizarStatusLote(l.status))).length
    const { capacidade } = capacidadeProducao(receita, insumos)
    const custoReceita = custoReceitaPorUnidade(receita, insumos)
    const valorProntos = prontos * (estoqueProduto?.custoUnitario ?? 0)
    return [
      { label: 'Frascos prontos', valor: estoqueProduto ? prontos : '—', sub: !estoqueProduto ? 'estoque não inventariado' : abaixo ? `abaixo do mínimo (${minimo})` : `mínimo ${minimo} · ok`, tom: !estoqueProduto ? 'warning' : abaixo ? 'danger' : undefined, onClick: () => setAba('estoque'), ativo: aba === 'estoque' },
      { label: 'Lotes ativos', valor: lotesAtivos, sub: 'em produção', onClick: () => setAba('lotes'), ativo: aba === 'lotes' },
      { label: 'Insumos em alerta', valor: emAlerta.length, sub: emAlerta.length > 0 ? 'abaixo do mínimo' : 'todos acima do mínimo', tom: emAlerta.length > 0 ? 'danger' : undefined, onClick: () => setAba('insumos'), ativo: aba === 'insumos' },
      { label: 'Capacidade restante', valor: receita.length > 0 ? capacidade : '—', sub: receita.length > 0 ? 'frascos com os insumos atuais' : 'receita do produto não cadastrada', tom: receita.length === 0 || capacidade === 0 ? 'warning' : undefined, dica: 'Quantos frascos dá para produzir com os insumos em estoque, pela receita (BOM).' },
      { label: 'Custo real / frasco', valor: custoReceita > 0 ? formatarMoeda(custoReceita) : '—', sub: custoReceita > 0 ? 'calculado da receita' : 'cadastre a receita e o custo dos insumos', tom: custoReceita > 0 ? undefined : 'warning', onClick: () => setAba('receita'), ativo: aba === 'receita' },
      { label: 'Valor em estoque', valor: formatarMoeda(valorProntos + valorTotalInsumos), sub: 'insumos + prontos' },
    ]
  }, [estoqueProduto, lotes, receita, insumos, emAlerta, valorTotalInsumos, aba])

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'estoque',   label: 'Estoque' },
    { id: 'lotes',     label: 'Lotes' },
    { id: 'insumos',   label: 'Insumos', badge: emAlerta.length },
    { id: 'receita',   label: 'Receita' },
    { id: 'expedicao', label: 'Expedição' },
  ]

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* As duas ações do dia a dia ficam no topo, não no fim da página */}
      <div className="toolbar">
        <h1 className="page-title" style={{ flex: '1 1 200px' }}>Produção & Estoque</h1>
        <button className="btn btn-secondary btn-sm" disabled={!estoqueProduto}
          title={estoqueProduto ? 'Corrigir o saldo de frascos prontos (com motivo registrado)' : 'Estoque ainda não inventariado'}
          onClick={() => { setAba('estoque'); dispararAcaoRapida('ajustar-estoque') }}>
          <SlidersHorizontal size={13} /> Ajustar estoque
        </button>
        <button className="btn btn-accent btn-sm" onClick={() => { setAba('lotes'); dispararAcaoRapida('novo-lote') }}>
          <Plus size={14} /> Novo lote
        </button>
      </div>

      <MetricStrip metricas={metricas} rotulo="Resumo de produção e estoque" />

      <InnerTabs tabs={tabs} activeTab={aba} onChange={(id) => setAba(id as TabId)} />

      {aba === 'estoque' && <ProducaoEstoqueView registrarMovimentacao={registrarMovimentacao} />}
      {aba === 'lotes' && <ProducaoLotesView />}
      {aba === 'insumos' && <ProducaoInsumosView />}
      {aba === 'receita' && <ProducaoReceitaView />}
      {aba === 'expedicao' && <ProducaoExpedicaoView />}
    </div>
  )
}
