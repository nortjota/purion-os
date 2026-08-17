'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Target, Milestone } from 'lucide-react'
import type { Tarefa } from '@/store'
import type { EstrategiaObjetivo, EstrategiaResultado, MetricasCRM, PrioridadeObjetivo } from '@/hooks/useEstrategia'
import { progressoObjetivo, progressoResultadoEfetivo, valorEfetivoResultado } from '@/hooks/useEstrategia'
import { formatNumber } from '@/lib/formatters'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import {
  STATUS_OBJETIVO_LABEL, STATUS_OBJETIVO_COR,
  PRIORIDADE_LABEL_CURTO, PRIORIDADE_COR, PRIORIDADE_OPCOES,
} from './metasHelpers'

export interface GrupoMetas {
  id: string
  label: string
  objetivos: EstrategiaObjetivo[]
}

interface Props {
  grupos: GrupoMetas[]
  todosObjetivos: EstrategiaObjetivo[]
  todosResultados: EstrategiaResultado[]
  metricas: MetricasCRM
  tarefas: Tarefa[]
  onSelecionarObjetivo: (o: EstrategiaObjetivo) => void
  onSelecionarResultado: (r: EstrategiaResultado, objetivoTitulo: string) => void
  onNovaMeta: (parentId: string | null) => void
  onNovoResultado: (objetivoId: string) => void
  onAtualizarPeso: (id: string, peso: number) => void
  onAtualizarPrioridade: (id: string, prioridade: PrioridadeObjetivo) => void
}

function Avatar({ id }: { id: string | null }) {
  const socio = id ? SOCIOS.find((s) => s.id === id) : null
  if (!socio) return <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>—</span>
  return (
    <div className="flex items-center gap-2">
      <span style={{
        width: 20, height: 20, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>
        {socio.inicial}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{socio.nome}</span>
    </div>
  )
}

function BarraProgresso({ progresso, cor }: { progresso: number; cor: string }) {
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progresso}%`, background: cor, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', width: 32, textAlign: 'right' }}>{progresso}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: EstrategiaObjetivo['status'] }) {
  const cor = STATUS_OBJETIVO_COR[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
      background: `${cor}18`, color: cor, whiteSpace: 'nowrap',
    }}>
      {STATUS_OBJETIVO_LABEL[status]}
    </span>
  )
}

function PrioridadeBadge({ prioridade, onClick }: { prioridade: EstrategiaObjetivo['prioridade']; onClick?: (e: React.MouseEvent) => void }) {
  const cor = PRIORIDADE_COR[prioridade]
  return (
    <span
      onClick={onClick}
      title={onClick ? 'Clique para mudar a prioridade' : undefined}
      style={{
        fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
        background: `${cor}20`, color: cor, whiteSpace: 'nowrap', flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {PRIORIDADE_LABEL_CURTO[prioridade]}
    </span>
  )
}

function LinhaResultado({ resultado, metricas, nivel, onSelecionar }: {
  resultado: EstrategiaResultado; metricas: MetricasCRM; nivel: number
  onSelecionar: () => void
}) {
  const pct = progressoResultadoEfetivo(resultado, metricas)
  const atual = valorEfetivoResultado(resultado, metricas)
  return (
    <div
      onClick={onSelecionar}
      className="meta-row"
      style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 160px 140px', alignItems: 'center',
        gap: 8, padding: '8px 12px', paddingLeft: 12 + nivel * 22 + 20,
        cursor: 'pointer', borderTop: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <Milestone size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {resultado.descricao}
        </span>
        {resultado.fonteAuto && (
          <span style={{ fontSize: 9, fontWeight: 700, color: '#5B8FE8', background: 'rgba(91,143,232,0.12)', padding: '1px 6px', borderRadius: 999, flexShrink: 0 }}>
            AUTO
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
        {formatNumber(atual)} / {formatNumber(resultado.meta)} {resultado.unidade ?? ''}
      </span>
      <BarraProgresso progresso={pct} cor="#C9A84C" />
      <span />
    </div>
  )
}

function LinhaObjetivo({
  objetivo, nivel, todosObjetivos, todosResultados, metricas, tarefas,
  expandidos, toggleExpandido, onSelecionarObjetivo, onSelecionarResultado, onNovaMeta, onNovoResultado,
  onAtualizarPeso, onAtualizarPrioridade,
}: {
  objetivo: EstrategiaObjetivo
  nivel: number
  todosObjetivos: EstrategiaObjetivo[]
  todosResultados: EstrategiaResultado[]
  metricas: MetricasCRM
  tarefas: Tarefa[]
  expandidos: Set<string>
  toggleExpandido: (id: string) => void
  onSelecionarObjetivo: (o: EstrategiaObjetivo) => void
  onSelecionarResultado: (r: EstrategiaResultado, objetivoTitulo: string) => void
  onNovaMeta: (parentId: string | null) => void
  onNovoResultado: (objetivoId: string) => void
  onAtualizarPeso: (id: string, peso: number) => void
  onAtualizarPrioridade: (id: string, prioridade: PrioridadeObjetivo) => void
}) {
  const subObjetivos = todosObjetivos.filter((o) => o.parentId === objetivo.id)
  const resultadosDoObjetivo = todosResultados.filter((r) => r.objetivoId === objetivo.id)
  const temFilhos = subObjetivos.length > 0 || resultadosDoObjetivo.length > 0
  const aberto = expandidos.has(objetivo.id)
  const progresso = progressoObjetivo(objetivo, todosObjetivos, todosResultados, metricas)
  const tarefasVinculadas = tarefas.filter((t) => t.objetivoId === objetivo.id)
  const tarefasConcluidas = tarefasVinculadas.filter((t) => t.status === 'concluida').length

  return (
    <div>
      <div
        className="meta-row"
        style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 160px 140px', alignItems: 'center',
          gap: 8, padding: '10px 12px', paddingLeft: 12 + nivel * 22,
          cursor: 'pointer', borderTop: nivel === 0 ? undefined : '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2" style={{ minWidth: 0 }} onClick={() => onSelecionarObjetivo(objetivo)}>
          <button
            onClick={(e) => { e.stopPropagation(); if (temFilhos) toggleExpandido(objetivo.id) }}
            style={{
              width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: temFilhos ? 'pointer' : 'default',
              color: 'var(--text-secondary)', flexShrink: 0, opacity: temFilhos ? 1 : 0.25,
            }}
          >
            {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <Target size={13} style={{ color: '#C9A84C', flexShrink: 0 }} />
          {nivel === 0 && (
            <PrioridadeBadge
              prioridade={objetivo.prioridade}
              onClick={(e) => {
                e.stopPropagation()
                const i = PRIORIDADE_OPCOES.indexOf(objetivo.prioridade)
                onAtualizarPrioridade(objetivo.id, PRIORIDADE_OPCOES[(i + 1) % PRIORIDADE_OPCOES.length])
              }}
            />
          )}
          <span style={{ fontSize: 13, fontWeight: nivel === 0 ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {objetivo.titulo}
          </span>
          {tarefasVinculadas.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>
              {tarefasConcluidas}/{tarefasVinculadas.length} tarefas
            </span>
          )}
        </div>
        <div onClick={() => onSelecionarObjetivo(objetivo)}>
          <StatusBadge status={objetivo.status} />
        </div>
        <div onClick={() => onSelecionarObjetivo(objetivo)}>
          <BarraProgresso progresso={progresso} cor={STATUS_OBJETIVO_COR[objetivo.status]} />
        </div>
        <div className="flex items-center justify-between gap-2" onClick={() => onSelecionarObjetivo(objetivo)}>
          <Avatar id={objetivo.responsavel} />
          {nivel === 0 && (
            <span onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
              <InlineEdit
                value={objetivo.peso}
                type="number"
                placeholder="peso"
                onSave={(v) => onAtualizarPeso(objetivo.id, Math.max(0, Math.min(100, Number(v) || 0)))}
              />%
            </span>
          )}
        </div>
      </div>

      {aberto && (
        <div>
          {subObjetivos.map((sub) => (
            <LinhaObjetivo
              key={sub.id}
              objetivo={sub}
              nivel={nivel + 1}
              todosObjetivos={todosObjetivos}
              todosResultados={todosResultados}
              metricas={metricas}
              tarefas={tarefas}
              expandidos={expandidos}
              toggleExpandido={toggleExpandido}
              onSelecionarObjetivo={onSelecionarObjetivo}
              onSelecionarResultado={onSelecionarResultado}
              onNovaMeta={onNovaMeta}
              onNovoResultado={onNovoResultado}
              onAtualizarPeso={onAtualizarPeso}
              onAtualizarPrioridade={onAtualizarPrioridade}
            />
          ))}
          {resultadosDoObjetivo.map((r) => (
            <LinhaResultado
              key={r.id}
              resultado={r}
              metricas={metricas}
              nivel={nivel + 1}
              onSelecionar={() => onSelecionarResultado(r, objetivo.titulo)}
            />
          ))}
          <div style={{ paddingLeft: 12 + (nivel + 1) * 22 + 20, padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-3">
              <button
                onClick={() => onNovoResultado(objetivo.id)}
                className="flex items-center gap-1"
                style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={11} /> Resultado-chave
              </button>
              <button
                onClick={() => onNovaMeta(objetivo.id)}
                className="flex items-center gap-1"
                style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={11} /> Sub-meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function MetaListaView({
  grupos, todosObjetivos, todosResultados, metricas, tarefas,
  onSelecionarObjetivo, onSelecionarResultado, onNovaMeta, onNovoResultado,
  onAtualizarPeso, onAtualizarPrioridade,
}: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (grupos.every((g) => g.objetivos.length === 0)) {
    return (
      <div className="empty-state">
        <Target size={36} className="empty-state-icon" />
        <p className="empty-state-title">Nenhuma meta cadastrada</p>
        <p className="empty-state-subtitle">Crie a primeira meta estratégica para começar a acompanhar o progresso.</p>
        <button onClick={() => onNovaMeta(null)} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          <Plus size={12} /> Nova meta
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.filter((g) => g.objetivos.length > 0).map((grupo) => (
        <div key={grupo.id}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {grupo.label}
            </p>
            <button
              onClick={() => onNovaMeta(null)}
              className="flex items-center gap-1"
              style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={12} /> Nova meta
            </button>
          </div>
          <div className="card-purion" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 160px 140px', gap: 8,
                padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--bg-surface-2)',
              }}
            >
              <span>Nome</span>
              <span>Status</span>
              <span>Progresso</span>
              <span>Responsável</span>
            </div>
            {grupo.objetivos.map((o) => (
              <LinhaObjetivo
                key={o.id}
                objetivo={o}
                nivel={0}
                todosObjetivos={todosObjetivos}
                todosResultados={todosResultados}
                metricas={metricas}
                tarefas={tarefas}
                expandidos={expandidos}
                toggleExpandido={toggleExpandido}
                onSelecionarObjetivo={onSelecionarObjetivo}
                onSelecionarResultado={onSelecionarResultado}
                onNovaMeta={onNovaMeta}
                onNovoResultado={onNovoResultado}
                onAtualizarPeso={onAtualizarPeso}
                onAtualizarPrioridade={onAtualizarPrioridade}
              />
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .meta-row:hover { background: rgba(201,168,76,0.04); }
      `}</style>
    </div>
  )
}
