'use client'

/**
 * PURION OS — Produção & Estoque
 * Ciclo completo estilo Asana: insumos → lote de produção → frascos prontos (estoque) → expedição.
 */

import { useState } from 'react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { useEstoque } from '@/hooks/useEstoque'
import { ProducaoEstoqueView } from './ProducaoEstoqueView'
import { ProducaoLotesView } from './ProducaoLotesView'
import { ProducaoExpedicaoView } from './ProducaoExpedicaoView'
import { ProducaoInsumosView } from './ProducaoInsumosView'
import { ProducaoPainelView } from './ProducaoPainelView'

type TabId = 'estoque' | 'lotes' | 'expedicao' | 'insumos' | 'painel'

const TABS: { id: TabId; label: string }[] = [
  { id: 'estoque',    label: 'Estoque'            },
  { id: 'lotes',      label: 'Lotes de Produção'  },
  { id: 'expedicao',  label: 'Expedição'          },
  { id: 'insumos',    label: 'Insumos'            },
  { id: 'painel',     label: 'Painel'             },
]

export function ProducaoDashboard() {
  const [aba, setAba] = useState<TabId>('estoque')
  const { registrarMovimentacao } = useEstoque()

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Produção & Estoque</h1>
        <p className="caption mt-1">Insumos → lotes → frascos prontos → expedição</p>
      </div>

      <InnerTabs tabs={TABS} activeTab={aba} onChange={(id) => setAba(id as TabId)} />

      {aba === 'estoque' && <ProducaoEstoqueView registrarMovimentacao={registrarMovimentacao} />}
      {aba === 'lotes' && <ProducaoLotesView />}
      {aba === 'expedicao' && <ProducaoExpedicaoView />}
      {aba === 'insumos' && <ProducaoInsumosView />}
      {aba === 'painel' && <ProducaoPainelView />}
    </div>
  )
}
