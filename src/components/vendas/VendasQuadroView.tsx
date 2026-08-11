'use client'

import { useCallback, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Venda, StatusEntregaVenda } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { STATUS_ENTREGA_LABEL, CANAL_LABEL, CANAL_BADGE, fmtR } from '@/lib/vendas-helpers'

const COLUNAS: Array<{ id: StatusEntregaVenda; cor: string }> = [
  { id: 'aguardando',  cor: '#B8B8B8' },
  { id: 'separando',   cor: '#E8A838' },
  { id: 'postado',     cor: '#5B8FE8' },
  { id: 'em_transito', cor: '#5B8FE8' },
  { id: 'entregue',    cor: '#4CAF7A' },
  { id: 'devolvido',   cor: '#E85238' },
]

interface CardProps {
  venda: Venda
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onAbrir: (v: Venda) => void
}

function VendaCard({ venda, isDragging, onDragStart, onDragEnd, onAbrir }: CardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, venda.id)}
      onDragEnd={onDragEnd}
      onClick={() => onAbrir(venda)}
      className={`
        rounded-xl border p-3 cursor-pointer select-none
        bg-[var(--bg-surface)] border-[var(--border)]
        hover:border-[rgba(201,168,76,0.25)]
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-[var(--text-primary)] leading-snug flex-1 min-w-0 truncate">
          {venda.clienteNome || 'Cliente'}
        </h3>
        <span className={`badge ${CANAL_BADGE[venda.canal]}`} style={{ flexShrink: 0 }}>{CANAL_LABEL[venda.canal]}</span>
      </div>

      <div className="flex items-center justify-between mb-2 text-[10px]">
        <span className="text-[#B8B8B8]">{venda.quantidade} frasco{venda.quantidade !== 1 ? 's' : ''}</span>
        <span className="font-semibold text-[#C9A84C]">{fmtR(venda.valorTotal ?? venda.valorLiquido)}</span>
      </div>

      {venda.cidade && (
        <div className="flex items-center gap-1 text-[10px] text-[#A0A0A0] mb-1">
          <MapPin size={9} /> <span className="truncate">{venda.cidade}{venda.uf ? `/${venda.uf}` : ''}</span>
        </div>
      )}

      <div className="text-[10px] text-[#8A8A8A]">{formatarDataBR(venda.dataVenda.slice(0, 10))}</div>
    </div>
  )
}

interface ColunaProps {
  coluna: typeof COLUNAS[number]
  vendas: Venda[]
  isDragOver: boolean
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: StatusEntregaVenda) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, id: StatusEntregaVenda) => void
  onAbrir: (v: Venda) => void
}

function Coluna({ coluna, vendas, isDragOver, dragId, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onAbrir }: ColunaProps) {
  const frascos = vendas.reduce((s, v) => s + v.quantidade, 0)
  return (
    <div
      className={`
        flex flex-col min-w-[230px] max-w-[240px] rounded-xl border
        transition-all duration-150
        ${isDragOver ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.04)]' : 'border-[var(--border)] bg-[var(--bg-surface-2)]'}
      `}
      onDragOver={(e) => onDragOver(e, coluna.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, coluna.id)}
    >
      <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1">
            {STATUS_ENTREGA_LABEL[coluna.id]}
          </span>
          <span className="text-[11px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${coluna.cor}20`, color: coluna.cor }}>
            {vendas.length}
          </span>
        </div>
        {frascos > 0 && <p className="text-[10px] text-[#A0A0A0]">{frascos} frasco{frascos !== 1 ? 's' : ''}</p>}
      </div>

      <div className="p-2 flex flex-col gap-2 min-h-[120px] flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        {vendas.map((v) => (
          <VendaCard key={v.id} venda={v} isDragging={dragId === v.id} onDragStart={onDragStart} onDragEnd={onDragEnd} onAbrir={onAbrir} />
        ))}
        {vendas.length === 0 && isDragOver && (
          <div className="flex-1 rounded-lg border border-dashed border-[rgba(201,168,76,0.3)] flex items-center justify-center min-h-[80px]">
            <span className="text-[10px] text-[#C9A84C]">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  vendas: Venda[]
  onAbrirVenda: (v: Venda) => void
  onMudarStatusEntrega: (id: string, status: StatusEntregaVenda) => void
}

export function VendasQuadroView({ vendas, onAbrirVenda, onMudarStatusEntrega }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<StatusEntregaVenda | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('vendaId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: StatusEntregaVenda) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => setDragOverId(null), [])

  const handleDrop = useCallback((e: React.DragEvent, id: StatusEntregaVenda) => {
    e.preventDefault()
    const vendaId = e.dataTransfer.getData('vendaId')
    if (vendaId) onMudarStatusEntrega(vendaId, id)
    setDragId(null)
    setDragOverId(null)
  }, [onMudarStatusEntrega])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUNAS.map((coluna) => (
        <Coluna
          key={coluna.id}
          coluna={coluna}
          vendas={vendas.filter((v) => v.statusEntrega === coluna.id)}
          isDragOver={dragOverId === coluna.id}
          dragId={dragId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onAbrir={onAbrirVenda}
        />
      ))}
    </div>
  )
}
