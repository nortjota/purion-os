'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Trash2, Archive } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from './Toast'
import { ConfirmModal } from './ConfirmModal'

interface ArquivadosPanelProps<T extends { id: string }> {
  table: string
  mapRow: (row: Record<string, unknown>) => T
  renderTitle: (item: T) => string
  renderSubtitle?: (item: T) => string
  onRestore: (item: T) => Promise<void> | void
  isMaster: boolean
}

export function ArquivadosPanel<T extends { id: string }>({
  table, mapRow, renderTitle, renderSubtitle, onRestore, isMaster,
}: ArquivadosPanelProps<T>) {
  const { success, error: toastError } = useToast()
  const [itens, setItens] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [confirmHardDelete, setConfirmHardDelete] = useState(false)
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    const sb = supabase
    if (!sb) { setCarregando(false); return }
    setCarregando(true)
    const { data, error } = await sb
      .from(table)
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    dbLog('SELECT', `${table} (arquivados)`, error, `${data?.length ?? 0} rows`)
    setItens(data ? data.map(mapRow) : [])
    setCarregando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  useEffect(() => { carregar() }, [carregar])

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    setSelecionados((prev) => prev.size === itens.length ? new Set() : new Set(itens.map((i) => i.id)))
  }

  async function restaurarUm(item: T) {
    setProcessando(true)
    await onRestore(item)
    setItens((prev) => prev.filter((i) => i.id !== item.id))
    setSelecionados((prev) => { const n = new Set(prev); n.delete(item.id); return n })
    setProcessando(false)
  }

  async function restaurarSelecionados() {
    const alvo = itens.filter((i) => selecionados.has(i.id))
    setProcessando(true)
    for (const item of alvo) await onRestore(item)
    setItens((prev) => prev.filter((i) => !selecionados.has(i.id)))
    setSelecionados(new Set())
    setProcessando(false)
    success(`${alvo.length} restaurado${alvo.length !== 1 ? 's' : ''}`)
  }

  async function excluirPermanenteSelecionados() {
    const sb = supabase
    const ids = Array.from(selecionados)
    setProcessando(true)
    if (sb) {
      const { error } = await sb.from(table).delete().in('id', ids)
      dbLog('BULK_DELETE', table, error, `${ids.length} ids`)
      if (error) { toastError('Erro ao excluir permanentemente', error.message); setProcessando(false); return }
    }
    setItens((prev) => prev.filter((i) => !selecionados.has(i.id)))
    setSelecionados(new Set())
    setProcessando(false)
    setConfirmHardDelete(false)
    success(`${ids.length} excluído${ids.length !== 1 ? 's' : ''} permanentemente`)
  }

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando arquivados…</p></div>
  }

  if (itens.length === 0) {
    return (
      <div className="empty-state">
        <Archive size={32} className="empty-state-icon" />
        <p className="empty-state-title">Nenhum registro arquivado</p>
        <p className="empty-state-subtitle">Itens arquivados aparecem aqui e podem ser restaurados.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={selecionados.size === itens.length && itens.length > 0} onChange={toggleTodos} />
          <span className="caption">{selecionados.size} de {itens.length} selecionados</span>
        </label>
        {selecionados.size > 0 && (
          <div className="flex gap-2">
            <button onClick={restaurarSelecionados} disabled={processando} className="btn btn-secondary btn-sm">
              <RotateCcw size={12} /> Restaurar selecionados
            </button>
            {isMaster && (
              <button
                onClick={() => setConfirmHardDelete(true)}
                disabled={processando}
                className="btn btn-sm"
                style={{ background: 'rgba(232,82,56,0.15)', color: '#E85238' }}
              >
                <Trash2 size={12} /> Excluir permanente
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {itens.map((item) => (
          <div key={item.id} className="card-purion" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => toggle(item.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{renderTitle(item)}</p>
              {renderSubtitle && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{renderSubtitle(item)}</p>}
            </div>
            <button onClick={() => restaurarUm(item)} disabled={processando} className="icon-btn" title="Restaurar">
              <RotateCcw size={13} />
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={confirmHardDelete}
        title="Excluir permanentemente"
        message={`Excluir ${selecionados.size} registro(s) definitivamente? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
        confirmText="CONFIRMAR"
        onConfirm={excluirPermanenteSelecionados}
        onCancel={() => setConfirmHardDelete(false)}
        danger
      />
    </div>
  )
}
