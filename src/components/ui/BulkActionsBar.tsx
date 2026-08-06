'use client'

import { Archive, Trash2, X } from 'lucide-react'

export interface BulkActionsBarCampo {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
  onAplicar: (value: string) => void
}

interface BulkActionsBarProps {
  selecionados: number
  total: number
  onLimpar: () => void
  onArquivar: () => void
  onExcluirPermanente?: () => void
  campos?: BulkActionsBarCampo[]
  processando?: boolean
}

export function BulkActionsBar({
  selecionados, total, onLimpar, onArquivar, onExcluirPermanente, campos = [], processando,
}: BulkActionsBarProps) {
  if (selecionados === 0) return null

  return (
    <div
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 20, zIndex: 90,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '10px 16px', borderRadius: 14,
        background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C', whiteSpace: 'nowrap' }}>
        {selecionados} de {total} selecionados
      </span>

      {campos.map((campo) => (
        <select
          key={campo.key}
          className="select-purion"
          value=""
          disabled={processando}
          onChange={(e) => { if (e.target.value) campo.onAplicar(e.target.value) }}
          style={{ fontSize: 12 }}
        >
          <option value="">{campo.label}</option>
          {campo.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      <button onClick={onArquivar} disabled={processando} className="btn btn-secondary btn-sm">
        <Archive size={12} /> Arquivar
      </button>

      {onExcluirPermanente && (
        <button
          onClick={onExcluirPermanente}
          disabled={processando}
          className="btn btn-sm"
          style={{ background: 'rgba(232,82,56,0.15)', color: '#E85238' }}
        >
          <Trash2 size={12} /> Excluir permanente
        </button>
      )}

      <button onClick={onLimpar} disabled={processando} className="icon-btn" title="Limpar seleção">
        <X size={14} />
      </button>
    </div>
  )
}
