'use client'

import { useCallback, useState } from 'react'
import { Flag } from 'lucide-react'
import type { Lote, StatusLote } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { ESTAGIOS_LOTE, normalizarStatusLote, calcularCustoLote, formatarMoeda, socioInfo } from './producaoHelpers'

interface CardProps {
  lote: Lote
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onAbrir: (l: Lote) => void
}

function LoteCard({ lote, isDragging, onDragStart, onDragEnd, onAbrir }: CardProps) {
  const info = socioInfo(lote.responsavel)
  const testesReprovados = lote.testes.filter((t) => t.resultado === 'reprovado').length
  const testesAprovados = lote.testes.filter((t) => t.resultado === 'aprovado').length

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lote.id)}
      onDragEnd={onDragEnd}
      onClick={() => onAbrir(lote)}
      className={`
        rounded-xl border p-3 cursor-pointer select-none
        bg-[var(--bg-surface)] border-[var(--border)]
        hover:border-[rgba(201,168,76,0.25)]
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-bold text-[#C9A84C]">{lote.codigo}</span>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ backgroundColor: `${info.cor}25`, color: info.cor }} title={info.nome}>
          {info.inicial}
        </span>
      </div>
      <p className="text-xs text-[var(--text-primary)] mb-2 leading-snug">{lote.produto}</p>
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <span className="text-[#B8B8B8]">{lote.quantidadeProduzida} un. produzidas</span>
        <span className="font-semibold text-[#C9A84C]">{formatarMoeda(calcularCustoLote(lote.quantidadeProduzida))}</span>
      </div>
      {(testesAprovados > 0 || testesReprovados > 0) && (
        <div className="flex items-center gap-1 text-[10px] text-[#A0A0A0] mb-1.5">
          <Flag size={9} />
          {testesAprovados} aprovado{testesAprovados !== 1 ? 's' : ''}
          {testesReprovados > 0 && <span style={{ color: '#E85238' }}> · {testesReprovados} reprovado{testesReprovados !== 1 ? 's' : ''}</span>}
        </div>
      )}
      <div className="text-[10px] text-[#8A8A8A]">{formatarDataBR(lote.dataInicio)}</div>
    </div>
  )
}

interface ColunaProps {
  estagio: typeof ESTAGIOS_LOTE[number]
  lotes: Lote[]
  isDragOver: boolean
  dragId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: StatusLote) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, id: StatusLote) => void
  onAbrir: (l: Lote) => void
}

function Coluna({ estagio, lotes, isDragOver, dragId, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onAbrir }: ColunaProps) {
  const totalUnidades = lotes.reduce((s, l) => s + l.quantidadeProduzida, 0)
  return (
    <div
      className={`
        flex flex-col min-w-[230px] max-w-[240px] rounded-xl border
        transition-all duration-150
        ${isDragOver ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.04)]' : 'border-[var(--border)] bg-[var(--bg-surface-2)]'}
      `}
      onDragOver={(e) => onDragOver(e, estagio.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, estagio.id)}
    >
      <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: estagio.cor }} />
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1">{estagio.label}</span>
          <span className="text-[11px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${estagio.cor}20`, color: estagio.cor }}>
            {lotes.length}
          </span>
        </div>
        {totalUnidades > 0 && <p className="text-[10px] text-[#A0A0A0]">{totalUnidades} unidades</p>}
      </div>

      <div className="p-2 flex flex-col gap-2 min-h-[120px] flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        {lotes.map((l) => (
          <LoteCard key={l.id} lote={l} isDragging={dragId === l.id} onDragStart={onDragStart} onDragEnd={onDragEnd} onAbrir={onAbrir} />
        ))}
        {lotes.length === 0 && isDragOver && (
          <div className="flex-1 rounded-lg border border-dashed border-[rgba(201,168,76,0.3)] flex items-center justify-center min-h-[80px]">
            <span className="text-[10px] text-[#C9A84C]">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  lotes: Lote[]
  onAbrirLote: (l: Lote) => void
  onMudarEstagio: (id: string, status: StatusLote) => void
}

export function ProducaoLotesQuadro({ lotes, onAbrirLote, onMudarEstagio }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<StatusLote | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('loteId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }, [])

  const handleDragEnd = useCallback(() => { setDragId(null); setDragOverId(null) }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: StatusLote) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => setDragOverId(null), [])

  const handleDrop = useCallback((e: React.DragEvent, id: StatusLote) => {
    e.preventDefault()
    const loteId = e.dataTransfer.getData('loteId')
    if (loteId) onMudarEstagio(loteId, id)
    setDragId(null)
    setDragOverId(null)
  }, [onMudarEstagio])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {ESTAGIOS_LOTE.map((estagio) => (
        <Coluna
          key={estagio.id}
          estagio={estagio}
          lotes={lotes.filter((l) => normalizarStatusLote(l.status) === estagio.id)}
          isDragOver={dragOverId === estagio.id}
          dragId={dragId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onAbrir={onAbrirLote}
        />
      ))}
    </div>
  )
}
