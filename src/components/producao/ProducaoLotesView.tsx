'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Lote, StatusLote } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { useProducao } from '@/hooks/useProducao'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ProducaoLotesQuadro } from './ProducaoLotesQuadro'
import { ProducaoLotesLista } from './ProducaoLotesLista'
import { ProducaoLotesCronograma } from './ProducaoLotesCronograma'
import { ProducaoLotesPainel } from './ProducaoLotesPainel'
import { ProducaoLoteDrawer } from './ProducaoLoteDrawer'
import { ProducaoModalNovoLote } from './ProducaoModalNovoLote'

type Visao = 'lista' | 'quadro' | 'cronograma' | 'painel'

const TABS = [
  { id: 'lista',      label: 'Lista'      },
  { id: 'quadro',     label: 'Quadro'     },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'painel',     label: 'Painel'     },
]

const VISOES_VALIDAS: Visao[] = ['lista', 'quadro', 'cronograma', 'painel']

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'quadro'
  const v = localStorage.getItem('purion:view:producao-lotes')
  return VISOES_VALIDAS.includes(v as Visao) ? (v as Visao) : 'quadro'
}

export function ProducaoLotesView() {
  const isMobile = useMobile()
  const { lotes } = usePurionStore()
  const { registrarProducaoComBOM, atualizarLote, deletarLote } = useProducao()

  const [visao, setVisao] = useState<Visao>('quadro')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<Lote | null>(null)

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: string) {
    setVisao(v as Visao)
    if (typeof window !== 'undefined') localStorage.setItem('purion:view:producao-lotes', v)
  }

  const loteSelecionado = useMemo(() => lotes.find((l) => l.id === loteSelecionadoId) ?? null, [lotes, loteSelecionadoId])

  function handleMudarEstagio(id: string, status: StatusLote) {
    const dataConclusao = status === 'concluido' ? new Date().toISOString().slice(0, 10) : undefined
    atualizarLote(id, { status, ...(dataConclusao && { dataConclusao }) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <p className="caption">{lotes.length} lote{lotes.length !== 1 ? 's' : ''} de produção</p>
        <button onClick={() => setModalNovoAberto(true)} className="btn btn-primary btn-sm">
          <Plus size={12} /> Novo lote
        </button>
      </div>

      {isMobile ? (
        <select className="select-purion" style={{ width: '100%' }} value={visao} onChange={(e) => mudarVisao(e.target.value)}>
          {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <InnerTabs tabs={TABS} activeTab={visao} onChange={mudarVisao} />
      )}

      <div>
        {visao === 'lista' && (
          <ProducaoLotesLista lotes={lotes} onAbrirLote={(l) => setLoteSelecionadoId(l.id)} onMudarEstagio={handleMudarEstagio} />
        )}
        {visao === 'quadro' && (
          <ProducaoLotesQuadro lotes={lotes} onAbrirLote={(l) => setLoteSelecionadoId(l.id)} onMudarEstagio={handleMudarEstagio} />
        )}
        {visao === 'cronograma' && (
          <ProducaoLotesCronograma lotes={lotes} onAbrirLote={(l) => setLoteSelecionadoId(l.id)} />
        )}
        {visao === 'painel' && <ProducaoLotesPainel lotes={lotes} />}
      </div>

      {modalNovoAberto && (
        <ProducaoModalNovoLote onConfirmar={registrarProducaoComBOM} onFechar={() => setModalNovoAberto(false)} />
      )}

      {loteSelecionado && !isMobile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 backdrop-blur-[2px]" onClick={() => setLoteSelecionadoId(null)} />
          <div className="fixed top-0 right-0 h-full w-[420px] z-40 bg-[var(--bg-surface-2)] border-l border-[var(--border)] shadow-2xl flex flex-col">
            <ProducaoLoteDrawer
              lote={loteSelecionado}
              onClose={() => setLoteSelecionadoId(null)}
              onSalvar={(dados) => atualizarLote(loteSelecionado.id, dados)}
              onDeletar={(l) => setDeletando(l)}
            />
          </div>
        </>
      )}

      <BottomSheet open={!!loteSelecionado && isMobile} onClose={() => setLoteSelecionadoId(null)} title={loteSelecionado?.codigo}>
        {loteSelecionado && (
          <ProducaoLoteDrawer
            lote={loteSelecionado}
            onClose={() => setLoteSelecionadoId(null)}
            onSalvar={(dados) => atualizarLote(loteSelecionado.id, dados)}
            onDeletar={(l) => setDeletando(l)}
          />
        )}
      </BottomSheet>

      <ConfirmModal
        open={!!deletando}
        title="Excluir Lote"
        message={`Deseja excluir o lote "${deletando?.codigo}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => {
          if (deletando) {
            deletarLote(deletando.id)
            if (loteSelecionadoId === deletando.id) setLoteSelecionadoId(null)
            setDeletando(null)
          }
        }}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}
