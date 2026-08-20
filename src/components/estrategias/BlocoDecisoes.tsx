'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Milestone, ChevronRight } from 'lucide-react'
import { useEstrategiaDecisoes } from '@/hooks/useEstrategia'
import { TabDecisoes, ModalDecisao, corCategoria, labelCategoria, fmtData } from './TabDecisoes'

const MAX_VISIVEIS = 6

export function BlocoDecisoes() {
  const { decisoes, carregando, criarDecisao } = useEstrategiaDecisoes()
  const [modalRegistro, setModalRegistro] = useState(false)
  const [verTodas, setVerTodas] = useState(false)

  const recentes = useMemo(() => decisoes.slice(0, MAX_VISIVEIS), [decisoes])

  return (
    <section className="flex flex-col gap-3">
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Decisões</p>

      {/* Ação principal — registrar decisão, bem em evidência */}
      <button
        onClick={() => setModalRegistro(true)}
        className="flex items-center justify-center gap-2"
        style={{
          width: '100%', height: 56, borderRadius: 14, border: '1.5px dashed rgba(201,168,76,0.45)',
          background: 'rgba(201,168,76,0.06)', color: '#C9A84C', cursor: 'pointer',
          fontSize: 15, fontWeight: 700, transition: 'background 150ms, border-color 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; e.currentTarget.style.borderColor = '#C9A84C' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)' }}
      >
        <Plus size={18} /> Registrar nova decisão
      </button>

      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recentes
        </span>
        <button
          onClick={() => setVerTodas(true)}
          className="flex items-center gap-1"
          style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Ver todas as decisões <ChevronRight size={13} />
        </button>
      </div>

      {carregando ? (
        <p className="caption">Carregando…</p>
      ) : recentes.length === 0 ? (
        <div className="empty-state">
          <Milestone size={32} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma decisão registrada</p>
          <p className="empty-state-subtitle">Preço, fragrância, North Star… registre os marcos que definem a estratégia.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recentes.map((d) => (
            <div key={d.id} className="card-purion" style={{ padding: '12px 16px' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtData(d.data)}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  background: `${corCategoria(d.categoria)}18`, color: corCategoria(d.categoria),
                }}>
                  {labelCategoria(d.categoria)}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{d.titulo}</p>
              {d.justificativa && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{d.justificativa}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalRegistro && (
        <ModalDecisao
          onFechar={() => setModalRegistro(false)}
          onSalvar={async (d) => { await criarDecisao(d); setModalRegistro(false) }}
        />
      )}

      {verTodas && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setVerTodas(false)}>
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', marginTop: '3vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Todas as decisões</span>
              <button onClick={() => setVerTodas(false)} className="icon-btn border-0"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
              <TabDecisoes />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
