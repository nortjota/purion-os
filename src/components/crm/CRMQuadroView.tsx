'use client'

import { useCallback, useState } from 'react'
import { MapPin, Clock, Calendar } from 'lucide-react'
import type { Lead, StatusLead } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import {
  ESTAGIOS, TIER_CONFIG, formatarMoeda, diasDesde,
  urgenciaProximoPasso, URGENCIA_COR, socioInfo, estagioNormalizado,
} from './crmHelpers'

interface CardProps {
  lead: Lead
  isDragging: boolean
  selecionado: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onAbrir: (id: string) => void
  onToggleSel: (id: string) => void
}

function LeadCard({ lead, isDragging, selecionado, onDragStart, onDragEnd, onAbrir, onToggleSel }: CardProps) {
  const tier = TIER_CONFIG[lead.tier]
  const info = socioInfo(lead.responsavel)
  const ultimoContato = lead.ultimoPedido ?? lead.updatedAt
  const diasSem = diasDesde(ultimoContato)
  const urgencia = urgenciaProximoPasso(lead.proximoPassoData)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={() => onAbrir(lead.id)}
      className={`
        rounded-xl border p-3 cursor-pointer select-none
        bg-[var(--bg-surface)] border-[var(--border)]
        hover:border-[rgba(201,168,76,0.25)]
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${selecionado ? 'border-[#C9A84C]' : ''}
      `}
    >
      <div className="flex items-start gap-2 mb-2">
        <span onClick={(e) => { e.stopPropagation(); onToggleSel(lead.id) }} className="shrink-0 mt-0.5">
          <input type="checkbox" checked={selecionado} onChange={() => {}} />
        </span>
        <h3 className="text-xs font-bold text-[var(--text-primary)] leading-snug flex-1 min-w-0">
          {lead.nomeEmpresa}
        </h3>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
          style={{ backgroundColor: `${info.cor}25`, color: info.cor }}
          title={info.nome}
        >
          {info.inicial}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: tier.bg, color: tier.cor }}
        >
          {tier.label}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2 text-[10px]">
        <span className="text-[#B8B8B8] flex items-center gap-1 min-w-0">
          <MapPin size={9} className="shrink-0" />
          <span className="truncate">{lead.cidade} · {lead.regiao}</span>
        </span>
        <span className="font-semibold text-[#C9A84C] shrink-0 ml-1">
          {formatarMoeda(lead.valorMedioMensal)}/mês
        </span>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-[#A0A0A0]">
        <Clock size={9} />
        <span>{diasSem === 0 ? 'Contato hoje' : `${diasSem}d sem contato`}</span>
      </div>

      {lead.proximoPassoData && urgencia && (
        <div
          className="flex items-center gap-1 text-[10px] mt-1.5 px-1.5 py-1 rounded"
          style={{ background: `${URGENCIA_COR[urgencia]}15`, color: URGENCIA_COR[urgencia] }}
        >
          <Calendar size={9} />
          <span className="truncate">
            {formatarDataBR(lead.proximoPassoData)}{lead.proximoPassoAcao ? ` · ${lead.proximoPassoAcao}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

interface ColunaProps {
  estagio: typeof ESTAGIOS[number]
  leads: Lead[]
  isDragOver: boolean
  dragLeadId: string | null
  selecionados: Set<string>
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: StatusLead) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, id: StatusLead) => void
  onAbrir: (id: string) => void
  onToggleSel: (id: string) => void
}

function Coluna({
  estagio, leads, isDragOver, dragLeadId, selecionados,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onAbrir, onToggleSel,
}: ColunaProps) {
  const total = leads.reduce((s, l) => s + l.valorMedioMensal, 0)
  return (
    <div
      className={`
        flex flex-col min-w-[240px] max-w-[250px] rounded-xl border
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
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1">
            {estagio.label}
          </span>
          <span
            className="text-[11px] font-black px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${estagio.cor}20`, color: estagio.cor }}
          >
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-[10px] text-[#A0A0A0]">{formatarMoeda(total)}/mês em pipeline</p>
        )}
      </div>

      <div className="p-2 flex flex-col gap-2 min-h-[120px] flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isDragging={dragLeadId === lead.id}
            selecionado={selecionados.has(lead.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onAbrir={onAbrir}
            onToggleSel={onToggleSel}
          />
        ))}
        {leads.length === 0 && isDragOver && (
          <div className="flex-1 rounded-lg border border-dashed border-[rgba(201,168,76,0.3)] flex items-center justify-center min-h-[80px]">
            <span className="text-[10px] text-[#C9A84C]">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  leads: Lead[]
  selecionados: Set<string>
  onAbrirLead: (id: string) => void
  onToggleSel: (id: string) => void
  onMudarEstagio: (id: string, status: StatusLead) => void
}

export function CRMQuadroView({ leads, selecionados, onAbrirLead, onToggleSel, onMudarEstagio }: Props) {
  const [dragLeadId, setDragLeadId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<StatusLead | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragLeadId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragLeadId(null)
    setDragOverId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: StatusLead) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => setDragOverId(null), [])

  const handleDrop = useCallback((e: React.DragEvent, id: StatusLead) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (leadId) onMudarEstagio(leadId, id)
    setDragLeadId(null)
    setDragOverId(null)
  }, [onMudarEstagio])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {ESTAGIOS.map((estagio) => {
        const leadsCol = leads.filter((l) => estagioNormalizado(l.status) === estagio.id)
        return (
          <Coluna
            key={estagio.id}
            estagio={estagio}
            leads={leadsCol}
            isDragOver={dragOverId === estagio.id}
            dragLeadId={dragLeadId}
            selecionados={selecionados}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onAbrir={onAbrirLead}
            onToggleSel={onToggleSel}
          />
        )
      })}
    </div>
  )
}
