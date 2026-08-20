'use client'

import { useMemo, useState } from 'react'
import { X, Target, ChevronRight } from 'lucide-react'
import { useEstrategiaRoadmap, useMetricasCRM, progressoObjetivo } from '@/hooks/useEstrategia'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { STATUS_OBJETIVO_COR, STATUS_OBJETIVO_LABEL, ordenarPorPrioridadeEPeso } from './metas/metasHelpers'
import { TabMetas } from './metas/TabMetas'
import { PainelRMR } from './rmr/PainelRMR'

const MAX_VISIVEIS = 6
type SubAba = 'metas' | 'rmr'
const SUB_TABS: Array<{ id: SubAba; label: string }> = [
  { id: 'metas', label: 'Metas (peso & prioridade)' },
  { id: 'rmr',   label: 'RMR — Reunião Mensal' },
]

export function BlocoProgressoMetas() {
  const isMobile = useMobile()
  const { objetivos, resultados, carregando } = useEstrategiaRoadmap()
  const metricas = useMetricasCRM()
  const [verTodas, setVerTodas] = useState(false)
  const [subAba, setSubAba] = useState<SubAba>('metas')

  const metasPrincipais = useMemo(() => {
    const topo = objetivos.filter((o) => !o.parentId)
    return ordenarPorPrioridadeEPeso(topo).slice(0, MAX_VISIVEIS)
  }, [objetivos])

  if (carregando) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Progresso das metas</p>
        <button
          onClick={() => setVerTodas(true)}
          className="flex items-center gap-1"
          style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Ver todas as metas <ChevronRight size={13} />
        </button>
      </div>

      {metasPrincipais.length === 0 ? (
        <div className="empty-state">
          <Target size={32} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma meta cadastrada</p>
          <button onClick={() => setVerTodas(true)} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
            Cadastrar metas
          </button>
        </div>
      ) : (
        <div className="card-purion" style={{ padding: 0, overflow: 'hidden' }}>
          {metasPrincipais.map((meta, i) => {
            const progresso = progressoObjetivo(meta, objetivos, resultados, metricas)
            const cor = STATUS_OBJETIVO_COR[meta.status]
            return (
              <div
                key={meta.id}
                className="flex items-center gap-3"
                style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: '0 0 auto', minWidth: 160, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.titulo}
                </span>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progresso}%`, background: cor, borderRadius: 999, transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: cor, width: 40, textAlign: 'right' }}>{progresso}%</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: `${cor}18`, color: cor,
                }}>
                  {STATUS_OBJETIVO_LABEL[meta.status]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {verTodas && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setVerTodas(false)}>
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', marginTop: '3vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Metas — detalhe G4</span>
              <button onClick={() => setVerTodas(false)} className="icon-btn border-0"><X size={16} /></button>
            </div>
            <div className="px-5 pt-3">
              {isMobile ? (
                <select className="select-purion" style={{ width: '100%' }} value={subAba} onChange={(e) => setSubAba(e.target.value as SubAba)}>
                  {SUB_TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              ) : (
                <InnerTabs tabs={SUB_TABS} activeTab={subAba} onChange={(id) => setSubAba(id as SubAba)} />
              )}
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
              {subAba === 'metas' ? <TabMetas /> : <PainelRMR />}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
