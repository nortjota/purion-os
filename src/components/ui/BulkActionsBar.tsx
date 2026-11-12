'use client'

import { Archive, Trash2, X } from 'lucide-react'

export interface BulkActionsBarCampo {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
  onAplicar: (value: string) => void
}

export interface BulkActionsBarAcao {
  label: string
  icon?: React.ComponentType<{ size?: number }>
  onClick: () => void
  /** ação principal da barra (botão de destaque) */
  principal?: boolean
}

interface BulkActionsBarProps {
  selecionados: number
  total: number
  onLimpar: () => void
  onArquivar: () => void
  /** ações extras, antes dos campos (ex.: Concluir) */
  acoes?: BulkActionsBarAcao[]
  /** permite selecionar todos os itens visíveis */
  onSelecionarTodos?: () => void
  /** texto do botão de arquivar (ex.: 'Excluir' quando vai para a Lixeira) */
  rotuloArquivar?: string
  onExcluirPermanente?: () => void
  campos?: BulkActionsBarCampo[]
  processando?: boolean
}

export function BulkActionsBar({
  selecionados, total, onLimpar, onArquivar, onExcluirPermanente, campos = [], processando, acoes = [], onSelecionarTodos, rotuloArquivar = 'Arquivar',
}: BulkActionsBarProps) {
  if (selecionados === 0) return null

  return (
    <div
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 20, zIndex: 90,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '8px 10px 8px 16px', borderRadius: 18, justifyContent: 'center',
        background: 'var(--popover)', border: '1px solid color-mix(in srgb, var(--foreground) 22%, transparent)',
        boxShadow: 'var(--shadow-float)',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        {selecionados} de {total} selecionado{selecionados !== 1 ? 's' : ''}
      </span>
      {onSelecionarTodos && selecionados < total && (
        <button onClick={onSelecionarTodos} disabled={processando} className="link-limpar">Selecionar todos</button>
      )}

      {acoes.map(({ label, icon: Icon, onClick, principal }) => (
        <button key={label} onClick={onClick} disabled={processando} className={`btn btn-sm ${principal ? 'btn-accent' : 'btn-secondary'}`}>
          {Icon && <Icon size={12} />} {label}
        </button>
      ))}

      {campos.map((campo) => (
        <select
          key={campo.key}
          className="filtro"
          value=""
          disabled={processando}
          aria-label={campo.label}
          onChange={(e) => { if (e.target.value) campo.onAplicar(e.target.value) }}
        >
          <option value="">{campo.label}</option>
          {campo.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      <button onClick={onArquivar} disabled={processando} className="btn btn-secondary btn-sm">
        <Archive size={12} /> {rotuloArquivar}
      </button>

      {onExcluirPermanente && (
        <button
          onClick={onExcluirPermanente}
          disabled={processando}
          className="btn btn-sm"
          style={{ background: 'rgba(229,84,75,0.15)', color: 'var(--status-danger)' }}
        >
          <Trash2 size={12} /> Excluir permanente
        </button>
      )}

      <button onClick={onLimpar} disabled={processando} className="icon-btn" title="Limpar seleção (Esc)" aria-label="Limpar seleção">
        <X size={14} />
      </button>
    </div>
  )
}
