'use client'

/**
 * PURION OS — CRM B2B
 * Kanban de leads com drag-and-drop nativo (HTML5), drawer lateral,
 * health score automático e filtros por região/score.
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Users, DollarSign, TrendingUp, Target, X, Phone,
  Mail, MapPin, Clock, Plus, ChevronDown, MessageSquare, Trash2, Download,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Lead, StatusLead, TipoEstabelecimento } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useCRM } from '@/hooks/useCRM'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { AdvancedFilters } from '@/components/ui/AdvancedFilters'
import type { ViewType } from '@/components/ui/ViewToggle'
import { useToast } from '@/components/ui/Toast'
import { formatarDataBR } from '@/lib/calculos'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

// Data de referência para cálculo do health score (demo)
const DATA_REF = new Date('2024-02-12')

const COLUNAS_KANBAN: Array<{ id: StatusLead; label: string; cor: string }> = [
  { id: 'prospecto',         label: 'Identificado',    cor: '#6B6B6B' },
  { id: 'contato_feito',    label: 'Abordagem',        cor: '#5B8FE8' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', cor: '#E8A838' },
  { id: 'negociando',       label: 'Negociando',       cor: '#C9A84C' },
  { id: 'parceiro_ativo',   label: 'Fechado',          cor: '#4CAF7A' },
  { id: 'inativo',          label: 'Perdido',          cor: '#E85238' },
]

const TIPO_BADGE: Record<TipoEstabelecimento, { label: string; bg: string; text: string }> = {
  estetica:       { label: 'Estética',       bg: 'rgba(201,168,76,0.15)',  text: '#C9A84C'  },
  detailer:       { label: 'Detailer',       bg: 'rgba(91,143,232,0.15)', text: '#5B8FE8' },
  concessionaria: { label: 'Concessionária', bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
}

const SCORE_COR = {
  verde:    { bg: '#4CAF7A', label: 'Quente',  desc: '< 3 dias' },
  amarelo:  { bg: '#E8A838', label: 'Morno',   desc: '4–7 dias' },
  vermelho: { bg: '#E85238', label: 'Frio',    desc: '> 7 dias' },
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

function calcularScore(lead: Lead): 'verde' | 'amarelo' | 'vermelho' {
  const ultimaData = lead.ultimoPedido ?? lead.updatedAt
  const diff = Math.floor((DATA_REF.getTime() - new Date(ultimaData).getTime()) / 86_400_000)
  if (diff < 3)  return 'verde'
  if (diff <= 7) return 'amarelo'
  return 'vermelho'
}

function diasSemContato(lead: Lead): number {
  const ultimaData = lead.ultimoPedido ?? lead.updatedAt
  return Math.floor((DATA_REF.getTime() - new Date(ultimaData).getTime()) / 86_400_000)
}

function formatarMoedaR(v: number) {
  return `R$ ${v.toLocaleString('pt-BR')}`
}

// ─────────────────────────────────────────────
// CARD DO LEAD
// ─────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd:   () => void
  onVerDetalhes: (id: string) => void
}

function LeadCard({ lead, isDragging, onDragStart, onDragEnd, onVerDetalhes }: LeadCardProps) {
  const score = calcularScore(lead)
  const diasSem = diasSemContato(lead)
  const tipo = lead.tipoEstabelecimento ?? 'estetica'
  const tipoBadge = TIPO_BADGE[tipo]

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={`
        rounded-xl border p-3.5 cursor-grab active:cursor-grabbing
        bg-[var(--bg-surface)] border-[var(--border)]
        hover:border-[rgba(201,168,76,0.25)]
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-40 scale-95 border-[#C9A84C]' : ''}
      `}
    >
      {/* Header: Nome + Health Score */}
      <div className="flex items-start gap-2 mb-2.5">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 ring-2"
          style={{
            backgroundColor: SCORE_COR[score].bg,
            boxShadow: `0 0 0 2px ${SCORE_COR[score].bg}40`,
          }}
          title={`${SCORE_COR[score].label} — ${diasSem} dias sem contato`}
        />
        <h3 className="text-xs font-bold text-[var(--text-primary)] leading-snug flex-1 min-w-0">
          {lead.nomeEmpresa}
        </h3>
      </div>

      {/* Badges: Tipo + Tier */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: tipoBadge.bg, color: tipoBadge.text }}
        >
          {tipoBadge.label}
        </span>
        <span className={`
          inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
          ${lead.tier === 'A' ? 'bg-[rgba(201,168,76,0.2)] text-[#C9A84C]'
          : lead.tier === 'B' ? 'bg-[rgba(91,143,232,0.15)] text-[#5B8FE8]'
          : 'bg-[#2A2A2A] text-[#6B6B6B]'}
        `}>
          Tier {lead.tier}
        </span>
      </div>

      {/* Cidade + Valor */}
      <div className="flex items-center justify-between mb-2 text-[10px]">
        <span className="text-[#6B6B6B] flex items-center gap-1">
          <MapPin size={9} /> {lead.cidade} · {lead.regiao}
        </span>
        <span className="font-semibold text-[#C9A84C]">
          {formatarMoedaR(lead.valorMedioMensal)}/mês
        </span>
      </div>

      {/* Último contato */}
      <div className="flex items-center gap-1 text-[10px] text-[#4A4A4A] mb-3">
        <Clock size={9} />
        <span style={{ color: SCORE_COR[score].bg }}>
          {diasSem === 0 ? 'Hoje' : `${diasSem}d sem contato`}
        </span>
        {lead.ultimoPedido && (
          <span className="text-[#3A3A3A]"> · último pedido {formatarDataBR(lead.ultimoPedido)}</span>
        )}
      </div>

      {/* Botão detalhes */}
      <button
        onClick={(e) => { e.stopPropagation(); onVerDetalhes(lead.id) }}
        className="
          w-full py-1.5 rounded-lg text-[10px] font-semibold
          border border-[var(--border)] text-[var(--text-secondary)]
          hover:border-[rgba(201,168,76,0.3)] hover:text-[#C9A84C]
          hover:bg-[rgba(201,168,76,0.05)]
          transition-all
        "
      >
        Ver detalhes
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// COLUNA DO KANBAN
// ─────────────────────────────────────────────

interface KanbanColProps {
  coluna: typeof COLUNAS_KANBAN[number]
  leads: Lead[]
  isDragOver: boolean
  dragLeadId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd:   () => void
  onDragOver:  (e: React.DragEvent, id: StatusLead) => void
  onDragLeave: () => void
  onDrop:      (e: React.DragEvent, id: StatusLead) => void
  onVerDetalhes: (id: string) => void
}

function KanbanCol({
  coluna, leads, isDragOver, dragLeadId,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onVerDetalhes,
}: KanbanColProps) {
  return (
    <div
      className={`
        flex flex-col min-w-[230px] max-w-[240px] rounded-xl border
        transition-all duration-150
        ${isDragOver
          ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.04)]'
          : 'border-[var(--border)] bg-[var(--bg-surface-2)]'
        }
      `}
      onDragOver={(e) => onDragOver(e, coluna.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, coluna.id)}
    >
      {/* Header da coluna */}
      <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: coluna.cor }}
        />
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex-1">
          {coluna.label}
        </span>
        <span
          className="text-[11px] font-black px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${coluna.cor}20`, color: coluna.cor }}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2 min-h-[120px] flex-1">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isDragging={dragLeadId === lead.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onVerDetalhes={onVerDetalhes}
          />
        ))}
        {/* Drop zone visual quando vazio */}
        {leads.length === 0 && isDragOver && (
          <div className="flex-1 rounded-lg border border-dashed border-[rgba(201,168,76,0.3)] flex items-center justify-center min-h-[80px]">
            <span className="text-[10px] text-[#C9A84C]">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DRAWER LATERAL DO LEAD
// ─────────────────────────────────────────────

interface Interacao {
  id: string
  texto: string
  timestamp: string
}

interface DrawerLeadProps {
  lead: Lead
  historicos: Interacao[]
  notasEdit: string
  onClose: () => void
  onSalvarNotas: (notas: string) => void
  onRegistrarContato: (texto: string) => void
  onMoverPara: (status: StatusLead) => void
  onNotasChange: (v: string) => void
  onDeletar: (lead: Lead) => void
}

function DrawerLead({
  lead, historicos, notasEdit, onClose,
  onSalvarNotas, onRegistrarContato, onMoverPara, onNotasChange, onDeletar,
}: DrawerLeadProps) {
  const [textoContato, setTextoContato] = useState('')
  const score = calcularScore(lead)
  const tipo = lead.tipoEstabelecimento ?? 'estetica'
  const tipoBadge = TIPO_BADGE[tipo]
  const diasSem = diasSemContato(lead)

  return (
    <div className="flex flex-col h-full">
      {/* Header do drawer */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-sm font-black text-[var(--text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {lead.nomeEmpresa}
            </h2>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
              style={{ backgroundColor: tipoBadge.bg, color: tipoBadge.text }}
            >
              {tipoBadge.label}
            </span>
            {/* Health score */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{
                backgroundColor: `${SCORE_COR[score].bg}20`,
                color: SCORE_COR[score].bg,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: SCORE_COR[score].bg }}
              />
              {SCORE_COR[score].label} · {diasSem}d
            </div>
          </div>
          <p className="text-[11px] text-[#6B6B6B]">{lead.nomeContato}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onDeletar(lead)}
            className="p-1.5 rounded-lg hover:bg-[rgba(232,82,56,0.1)] text-[#6B6B6B] hover:text-[#E85238] transition-colors"
            title="Excluir lead"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Dados de contato */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium">Contato</p>
          <div className="space-y-1">
            {[
              { icon: Phone, text: lead.telefone },
              { icon: Mail,  text: lead.email },
              { icon: MapPin, text: `${lead.cidade} · ${lead.regiao}` },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Icon size={11} className="text-[#4A4A4A] shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Ticket médio', valor: formatarMoedaR(lead.valorMedioMensal) + '/mês' },
            { label: 'Tier', valor: `Tier ${lead.tier}` },
            { label: 'Último pedido', valor: lead.ultimoPedido ? formatarDataBR(lead.ultimoPedido) : 'Sem pedido' },
            { label: 'Cadastrado', valor: formatarDataBR(lead.createdAt) },
          ].map(({ label, valor }) => (
            <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
              <p className="text-[9px] text-[#4A4A4A] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{valor}</p>
            </div>
          ))}
        </div>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded bg-[#2A2A2A] text-[#6B6B6B] text-[9px] font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Notas editáveis */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium">Notas</p>
            <button
              onClick={() => onSalvarNotas(notasEdit)}
              className="text-[10px] text-[#C9A84C] hover:underline"
            >
              Salvar
            </button>
          </div>
          <textarea
            value={notasEdit}
            onChange={(e) => onNotasChange(e.target.value)}
            rows={4}
            className="
              w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-3
              text-xs text-[var(--text-primary)] placeholder-[#4A4A4A] resize-none
              focus:outline-none focus:border-[rgba(201,168,76,0.4)]
              transition-colors
            "
            placeholder="Observações sobre este lead..."
          />
        </div>

        {/* Registrar novo contato */}
        <div>
          <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <MessageSquare size={9} /> Registrar contato
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={textoContato}
              onChange={(e) => setTextoContato(e.target.value)}
              placeholder="Descrição do contato..."
              className="
                flex-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2
                text-xs text-[var(--text-primary)] placeholder-[#4A4A4A]
                focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors
              "
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textoContato.trim()) {
                  onRegistrarContato(textoContato.trim())
                  setTextoContato('')
                }
              }}
            />
            <button
              onClick={() => {
                if (textoContato.trim()) {
                  onRegistrarContato(textoContato.trim())
                  setTextoContato('')
                }
              }}
              className="px-3 py-2 rounded-lg bg-[#C9A84C] text-[#0D0D0D] text-xs font-bold hover:bg-[#D4B55E] transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Histórico de interações */}
        {historicos.length > 0 && (
          <div>
            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium mb-2">
              Histórico ({historicos.length})
            </p>
            <ul className="space-y-2">
              {[...historicos].reverse().map((h) => (
                <li key={h.id} className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-2.5">
                  <p className="text-[10px] text-[#4A4A4A] mb-1">{h.timestamp}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{h.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mover para... */}
        <div>
          <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <ChevronDown size={9} /> Mover para
          </p>
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => onMoverPara(e.target.value as StatusLead)}
              className="
                w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2
                text-xs text-[var(--text-secondary)] cursor-pointer appearance-none
                focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors
              "
            >
              {COLUNAS_KANBAN.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] pointer-events-none"
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────

function KPICard({ label, valor, icon: Icon, sub, cor = '#C9A84C' }: {
  label: string; valor: string; icon: React.ElementType; sub?: string; cor?: string
}) {
  return (
    <div className="kpi-card flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className="kpi-label">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface-2)] flex items-center justify-center shrink-0">
          <Icon size={16} style={{ color: cor }} className="opacity-60" />
        </div>
      </div>
      <div>
        <span className="kpi-value" style={{ color: cor }}>{valor}</span>
        {sub && <p className="caption mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function exportarCSVLeads(leads: Lead[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const headers = 'Empresa,Contato,Telefone,Email,Cidade,Região,Responsável,Status,Tier,Valor Médio Mensal,Último Pedido,Tags,Notas'
  const rows = leads.map((l) => [
    esc(l.nomeEmpresa), esc(l.nomeContato), esc(l.telefone), esc(l.email),
    esc(l.cidade), esc(l.regiao), esc(l.responsavel), esc(l.status), esc(l.tier),
    esc(l.valorMedioMensal.toFixed(2)),
    esc(l.ultimoPedido ?? ''),
    esc(l.tags.join('; ')),
    esc(l.notas),
  ].join(','))
  const csv = '﻿' + [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function CRMDashboard() {
  const isMobile = useMobile()
  const { leads } = usePurionStore()
  const { atualizarLead, deletarLead } = useCRM()
  const { success } = useToast()
  const [deletandoLead, setDeletandoLead] = useState<Lead | null>(null)

  // ── Estado local ──
  const [filtroEstado,  setFiltroEstado]  = useState<'DF' | 'SP' | 'SC' | 'todos'>('todos')
  const [filtroScore,   setFiltroScore]   = useState<'verde' | 'amarelo' | 'vermelho' | 'todos'>('todos')
  const [viewMode, setViewMode] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('purion:view:crm') as ViewType) ?? 'list'
    }
    return 'list'
  })
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, unknown>>({})
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null)
  const [dragLeadId,    setDragLeadId]    = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<StatusLead | null>(null)
  // Mobile-specific state
  const [mobileColuna, setMobileColuna] = useState<StatusLead>('prospecto')

  // Notas e histórico em estado local (persistidos no store via save)
  const [notasMap, setNotasMap]       = useState<Record<string, string>>({})
  const [historicosMap, setHistoricosMap] = useState<Record<string, Interacao[]>>({})

  // ── Leads filtrados ──
  const leadsFiltrados = useMemo(() => {
    return leads.filter((l) => {
      if (filtroEstado !== 'todos' && l.regiao !== filtroEstado) return false
      if (filtroScore  !== 'todos' && calcularScore(l) !== filtroScore)  return false
      return true
    })
  }, [leads, filtroEstado, filtroScore])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total    = leads.length
    const ativos   = leads.filter((l) => l.status === 'parceiro_ativo').length
    const taxa     = total > 0 ? (ativos / total) * 100 : 0
    const pipeline = leads
      .filter((l) => l.status !== 'inativo')
      .reduce((s, l) => s + l.valorMedioMensal, 0)
    const esteticasAtivas = leads.filter(
      (l) => l.status === 'parceiro_ativo' && l.tipoEstabelecimento === 'estetica'
    ).length
    return { total, ativos, taxa, pipeline, esteticasAtivas }
  }, [leads])

  // ── Drag handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragLeadId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragLeadId(null)
    setDragOverColId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colId: StatusLead) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColId(colId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, colId: StatusLead) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('leadId')
    if (id) atualizarLead(id, { status: colId, updatedAt: new Date().toISOString() })
    setDragLeadId(null)
    setDragOverColId(null)
  }, [atualizarLead])

  // ── Lead selecionado ──
  const leadAtual = useMemo(
    () => leads.find((l) => l.id === leadSelecionadoId) ?? null,
    [leads, leadSelecionadoId]
  )
  const notasAtual = leadSelecionadoId != null
    ? (notasMap[leadSelecionadoId] ?? leadAtual?.notas ?? '')
    : ''
  const historicosAtual = leadSelecionadoId != null ? (historicosMap[leadSelecionadoId] ?? []) : []

  function abrirDrawer(id: string) {
    const lead = leads.find((l) => l.id === id)
    if (lead) {
      setLeadSelecionadoId(id)
      if (notasMap[id] === undefined) {
        setNotasMap((prev) => ({ ...prev, [id]: lead.notas }))
      }
    }
  }

  function handleSalvarNotas(notas: string) {
    if (!leadSelecionadoId) return
    setNotasMap((prev) => ({ ...prev, [leadSelecionadoId]: notas }))
    atualizarLead(leadSelecionadoId, { notas })
    success('Notas salvas')
  }

  function handleRegistrarContato(texto: string) {
    if (!leadSelecionadoId) return
    const interacao: Interacao = {
      id: `int-${Date.now()}`,
      texto,
      timestamp: new Date().toLocaleString('pt-BR'),
    }
    setHistoricosMap((prev) => ({
      ...prev,
      [leadSelecionadoId]: [...(prev[leadSelecionadoId] ?? []), interacao],
    }))
    const historicoAtual = leadAtual?.historicoInteracoes ?? []
    atualizarLead(leadSelecionadoId, {
      historicoInteracoes: [...historicoAtual, interacao],
      updatedAt: new Date().toISOString(),
    })
    success('Contato registrado')
  }

  function handleMoverPara(status: StatusLead) {
    if (!leadSelecionadoId) return
    atualizarLead(leadSelecionadoId, { status })
  }

  const BTN_ESTADO = ['todos', 'DF', 'SP', 'SC'] as const
  const BTN_SCORE = [
    { id: 'todos',    label: 'Todos' },
    { id: 'verde',    label: '● Quente'  },
    { id: 'amarelo',  label: '● Morno'   },
    { id: 'vermelho', label: '● Frio'    },
  ] as const

  const COR_BTN_SCORE: Record<string, string> = { verde: '#4CAF7A', amarelo: '#E8A838', vermelho: '#E85238', todos: '#6B6B6B' }

  // ── MOBILE VIEW ──────────────────────────────
  if (isMobile) {
    const leadsColuna = leadsFiltrados.filter((l) => l.status === mobileColuna)

    return (
      <div className="page-content section-gap">
        {/* Header */}
        <div>
          <h1 className="page-title">CRM B2B</h1>
          <p className="caption mt-1">Pipeline de parceiros</p>
        </div>

        {/* KPIs 2-col */}
        <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <KPICard label="Total Leads"    valor={String(kpis.total)}   icon={Users}      />
          <KPICard label="Ativos"         valor={String(kpis.ativos)}  icon={TrendingUp} cor="#22C55E" />
          <KPICard label="Conversão"      valor={`${kpis.taxa.toFixed(1)}%`} icon={Target} />
          <KPICard label="Pipeline"       valor={`R$ ${kpis.pipeline.toLocaleString('pt-BR')}`} icon={DollarSign} />
        </div>

        {/* Column tabs — horizontal scroll */}
        <div className="mobile-tabs-scroll" style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
          {COLUNAS_KANBAN.map((col) => {
            const count = leadsFiltrados.filter((l) => l.status === col.id).length
            const ativo = mobileColuna === col.id
            return (
              <button
                key={col.id}
                onClick={() => setMobileColuna(col.id)}
                style={{
                  flexShrink: 0, padding: '7px 14px',
                  borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${ativo ? col.cor : 'var(--border)'}`,
                  background: ativo ? `${col.cor}15` : 'transparent',
                  color: ativo ? col.cor : 'var(--text-secondary)',
                  minHeight: 36,
                }}
              >
                {col.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Lead cards list */}
        {leadsColuna.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Nenhum lead nesta coluna
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {leadsColuna.map((lead) => {
              const score = calcularScore(lead)
              const tipo = lead.tipoEstabelecimento ?? 'estetica'
              const tipoBadge = TIPO_BADGE[tipo]
              const diasSem = diasSemContato(lead)
              return (
                <div
                  key={lead.id}
                  className="mobile-card-item"
                  style={{ borderRadius: 12, padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: SCORE_COR[score].bg, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.nomeEmpresa}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>
                      R$ {lead.valorMedioMensal.toLocaleString('pt-BR')}/mês
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: tipoBadge.bg, color: tipoBadge.text }}>
                      {tipoBadge.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${SCORE_COR[score].bg}20`, color: SCORE_COR[score].bg }}>
                      {SCORE_COR[score].label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />{diasSem === 0 ? 'Hoje' : `${diasSem}d sem contato`}
                    </span>
                    <button
                      onClick={() => abrirDrawer(lead.id)}
                      style={{
                        padding: '6px 14px', minHeight: 32, borderRadius: 6, fontSize: 12, fontWeight: 500,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                      }}
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lead detail — bottom sheet */}
        <BottomSheet
          open={!!leadAtual}
          onClose={() => setLeadSelecionadoId(null)}
          title={leadAtual?.nomeEmpresa}
          footer={
            leadAtual ? (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <select
                  value={leadAtual.status}
                  onChange={(e) => handleMoverPara(e.target.value as StatusLead)}
                  style={{
                    flex: 1, height: 44, borderRadius: 8, fontSize: 14,
                    border: '1px solid var(--border)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', padding: '0 12px',
                  }}
                >
                  {COLUNAS_KANBAN.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleSalvarNotas(notasAtual)}
                  className="btn btn-primary"
                  style={{ height: 44 }}
                >
                  Salvar
                </button>
              </div>
            ) : undefined
          }
        >
          {leadAtual && (
            <DrawerLead
              lead={leadAtual}
              historicos={historicosAtual}
              notasEdit={notasAtual}
              onClose={() => setLeadSelecionadoId(null)}
              onSalvarNotas={handleSalvarNotas}
              onRegistrarContato={handleRegistrarContato}
              onMoverPara={handleMoverPara}
              onNotasChange={(v) => setNotasMap((prev) => ({ ...prev, [leadAtual.id]: v }))}
              onDeletar={(l) => setDeletandoLead(l)}
            />
          )}
        </BottomSheet>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Conteúdo principal (scrollável) */}
      <div className="flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto">
        <div className="page-content section-gap">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">CRM B2B</h1>
            <p className="caption mt-1">Pipeline de parceiros · Kanban</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle module="crm" current={viewMode} onChange={setViewMode} views={['list', 'grid', 'timeline']} />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)]">
              <Target size={14} className="text-[#C9A84C]" />
              <span className="text-[13px] text-[#C9A84C] font-[500]">
                {kpis.esteticasAtivas} / 15
              </span>
              <span className="caption">estéticas ativas</span>
            </div>
          </div>
        </div>

        {/* ── Advanced Filters ── */}
        <AdvancedFilters
          moduleKey="crm"
          filters={[
            { key: 'status', label: 'Status', type: 'select', options: [
              { value: 'prospecto', label: 'Prospecto' },
              { value: 'contato_feito', label: 'Abordagem' },
              { value: 'proposta_enviada', label: 'Proposta' },
              { value: 'negociando', label: 'Negociando' },
              { value: 'parceiro_ativo', label: 'Ativo' },
              { value: 'inativo', label: 'Inativo' },
            ]},
            { key: 'regiao', label: 'Região', type: 'select', options: [
              { value: 'DF', label: 'DF' },
              { value: 'SP', label: 'SP' },
              { value: 'SC', label: 'SC' },
            ]},
            { key: 'tier', label: 'Tier', type: 'select', options: [
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
              { value: 'C', label: 'C' },
            ]},
            { key: 'valorMin', label: 'Valor Mín.', type: 'range' },
            { key: 'valorMax', label: 'Valor Máx.', type: 'range' },
          ]}
          values={advancedFilters}
          onChange={setAdvancedFilters}
        />

        {/* ── KPIs ── */}
        <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KPICard label="Total de Leads"    valor={String(kpis.total)}   icon={Users}       sub="todos os stages" />
          <KPICard label="Parceiros Ativos"  valor={String(kpis.ativos)}  icon={TrendingUp}  sub="status Fechado" cor="#22C55E" />
          <KPICard label="Taxa de Conversão" valor={`${kpis.taxa.toFixed(1)}%`} icon={Target}  sub="ativos / total" />
          <KPICard label="Pipeline Total"    valor={`R$ ${kpis.pipeline.toLocaleString('pt-BR')}`} icon={DollarSign} sub="valor mensal potencial" />
        </div>

        {/* ── Filtros ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Estado */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-1">
            {BTN_ESTADO.map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${filtroEstado === e
                    ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]'
                    : 'text-[#6B6B6B] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                {e === 'todos' ? 'Todos' : e}
              </button>
            ))}
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-1">
            {BTN_SCORE.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFiltroScore(id)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${filtroScore === id
                    ? 'bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)]'
                    : 'text-[#6B6B6B] hover:text-[var(--text-primary)]'
                  }
                `}
                style={{ color: filtroScore === id ? COR_BTN_SCORE[id] : undefined }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => exportarCSVLeads(leadsFiltrados)}
              title="Exportar CSV"
              className="icon-btn"
            >
              <Download size={13} />
            </button>
            <span className="text-[10px] text-[#4A4A4A]">
              {leadsFiltrados.length} leads exibidos
            </span>
          </div>
        </div>

        {/* ── Kanban / Grid / Timeline ── */}
        {viewMode === 'list' && (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {COLUNAS_KANBAN.map((col) => {
              const leadsCol = leadsFiltrados.filter((l) => l.status === col.id)
              return (
                <KanbanCol
                  key={col.id}
                  coluna={col}
                  leads={leadsCol}
                  isDragOver={dragOverColId === col.id}
                  dragLeadId={dragLeadId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onVerDetalhes={abrirDrawer}
                />
              )
            })}
          </div>
        )}

        {viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {leadsFiltrados.map((lead) => {
              const score = calcularScore(lead)
              return (
                <button
                  key={lead.id}
                  onClick={() => abrirDrawer(lead.id)}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: SCORE_COR[score].bg, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.nomeEmpresa}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: lead.tier === 'A' ? 'rgba(201,168,76,0.15)' : lead.tier === 'B' ? 'rgba(91,143,232,0.15)' : '#2A2A2A',
                      color: lead.tier === 'A' ? '#C9A84C' : lead.tier === 'B' ? '#5B8FE8' : '#6B6B6B',
                    }}>
                      Tier {lead.tier}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>
                    R$ {lead.valorMedioMensal.toLocaleString('pt-BR')}/mês
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {viewMode === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...leadsFiltrados].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((lead, idx) => (
              <div
                key={lead.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '14px 0',
                  borderBottom: idx < leadsFiltrados.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A84C' }} />
                  {idx < leadsFiltrados.length - 1 && (
                    <div style={{ width: 1, height: 30, background: 'var(--border)' }} />
                  )}
                </div>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrirDrawer(lead.id)}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{lead.nomeEmpresa}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.cidade} · {lead.regiao} · Tier {lead.tier}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600, flexShrink: 0 }}>
                  R$ {lead.valorMedioMensal.toLocaleString('pt-BR')}/mês
                </span>
              </div>
            ))}
          </div>
        )}

        </div>
      </div>

      {/* ── Drawer lateral ── */}
      {leadAtual && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-30 backdrop-blur-[2px]"
            onClick={() => setLeadSelecionadoId(null)}
          />
          {/* Painel */}
          <div className="fixed top-0 right-0 h-full w-[420px] z-40 bg-[var(--bg-surface-2)] border-l border-[var(--border)] shadow-2xl flex flex-col">
            <DrawerLead
              lead={leadAtual}
              historicos={historicosAtual}
              notasEdit={notasAtual}
              onClose={() => setLeadSelecionadoId(null)}
              onSalvarNotas={handleSalvarNotas}
              onRegistrarContato={handleRegistrarContato}
              onMoverPara={handleMoverPara}
              onNotasChange={(v) => setNotasMap((prev) => ({ ...prev, [leadAtual.id]: v }))}
              onDeletar={(l) => setDeletandoLead(l)}
            />
          </div>
        </>
      )}

      {/* ── Confirmar delete ── */}
      <ConfirmModal
        open={!!deletandoLead}
        title="Excluir Lead"
        message={`Deseja excluir "${deletandoLead?.nomeEmpresa}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => {
          if (deletandoLead) {
            deletarLead(deletandoLead.id)
            setDeletandoLead(null)
            setLeadSelecionadoId(null)
          }
        }}
        onCancel={() => setDeletandoLead(null)}
      />
    </div>
  )
}
