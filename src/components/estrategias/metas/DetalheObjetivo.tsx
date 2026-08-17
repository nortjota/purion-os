'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  X, Pencil, Trash2, Plus, Target, CheckSquare, TrendingUp, TrendingDown, Minus, RotateCcw,
} from 'lucide-react'
import type { Tarefa } from '@/store'
import type { EstrategiaObjetivo, EstrategiaResultado, MetricasCRM } from '@/hooks/useEstrategia'
import { progressoObjetivo, progressoResultadoEfetivo, valorEfetivoResultado, useHistoricoObjetivo } from '@/hooks/useEstrategia'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { formatNumber } from '@/lib/formatters'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import {
  STATUS_OBJETIVO_LABEL, STATUS_OBJETIVO_COR, formatarDataAlvo, calcularRitmo, RITMO_LABEL,
  PRIORIDADE_LABEL, PRIORIDADE_COR,
} from './metasHelpers'
import { ReguaMensal } from './ReguaMensal'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

interface Props {
  objetivo: EstrategiaObjetivo
  todosObjetivos: EstrategiaObjetivo[]
  todosResultados: EstrategiaResultado[]
  metricas: MetricasCRM
  tarefas: Tarefa[]
  onFechar: () => void
  onEditar: () => void
  onDeletar: () => void
  onReverterStatusAutomatico: () => void
  onNovoResultado: () => void
  onSelecionarResultado: (r: EstrategiaResultado) => void
  onDeletarResultado: (id: string) => void
  onSelecionarSubMeta: (o: EstrategiaObjetivo) => void
  onNovaSubMeta: () => void
}

function RitmoBadge({ ritmo }: { ritmo: 'adiantado' | 'no_ritmo' | 'atrasado' | null }) {
  if (!ritmo) return null
  const cfg = {
    adiantado: { cor: '#4CAF7A', Icon: TrendingUp },
    no_ritmo:  { cor: '#5B8FE8', Icon: Minus },
    atrasado:  { cor: '#E85238', Icon: TrendingDown },
  }[ritmo]
  return (
    <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: cfg.cor }}>
      <cfg.Icon size={12} /> {RITMO_LABEL[ritmo]}
    </span>
  )
}

export function DetalheObjetivo({
  objetivo, todosObjetivos, todosResultados, metricas, tarefas,
  onFechar, onEditar, onDeletar, onReverterStatusAutomatico, onNovoResultado, onSelecionarResultado,
  onDeletarResultado, onSelecionarSubMeta, onNovaSubMeta,
}: Props) {
  const isMobile = useMobile()
  const progresso = progressoObjetivo(objetivo, todosObjetivos, todosResultados, metricas)
  const cor = STATUS_OBJETIVO_COR[objetivo.status]
  const ritmo = calcularRitmo(progresso, objetivo.createdAt, objetivo.dataAlvo)
  const subMetas = todosObjetivos.filter((o) => o.parentId === objetivo.id)
  const resultados = todosResultados.filter((r) => r.objetivoId === objetivo.id)
  const tarefasVinculadas = tarefas.filter((t) => t.objetivoId === objetivo.id)
  const tarefasConcluidas = tarefasVinculadas.filter((t) => t.status === 'concluida').length
  const socio = objetivo.responsavel ? SOCIOS.find((s) => s.id === objetivo.responsavel) : null
  const { historico } = useHistoricoObjetivo(objetivo.id)

  const dadosHistorico = historico.map((h) => ({
    data: new Date(h.registradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    progresso: h.progresso,
  }))

  const conteudo = (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: `${cor}18`, color: cor,
          }}>
            {STATUS_OBJETIVO_LABEL[objetivo.status]}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onEditar} className="icon-btn" title="Editar"><Pencil size={14} /></button>
            <button onClick={onDeletar} className="icon-btn" title="Excluir" style={{ color: '#E85238' }}><Trash2 size={14} /></button>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{objetivo.titulo}</h2>
        {objetivo.descricao && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{objetivo.descricao}</p>
        )}
      </div>

      {/* Progresso */}
      <div className="card-purion" style={{ padding: '14px 16px' }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 12, fontWeight: 600 }}>Progresso</span>
          <div className="flex items-center gap-2">
            <RitmoBadge ritmo={ritmo} />
            <span style={{ fontSize: 16, fontWeight: 800, color: cor }}>{progresso}%</span>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progresso}%`, background: cor, borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
        {objetivo.statusManual && (
          <button
            onClick={onReverterStatusAutomatico}
            className="flex items-center gap-1"
            style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            <RotateCcw size={10} /> Status definido manualmente — voltar ao automático
          </button>
        )}
        {dadosHistorico.length > 1 && (
          <div style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={dadosHistorico}>
                <XAxis dataKey="data" tick={{ fill: '#B8B8B8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="progresso" stroke={cor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Metadados */}
      <div className="flex flex-wrap gap-3">
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Responsável</span>
          {socio ? (
            <div className="flex items-center gap-2">
              <span style={{
                width: 20, height: 20, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              }}>
                {socio.inicial}
              </span>
              <span style={{ fontSize: 12 }}>{socio.nome}</span>
            </div>
          ) : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>}
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Equipe</span>
          <span style={{ fontSize: 12 }}>{objetivo.equipe ?? '—'}</span>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Data-alvo</span>
          <span style={{ fontSize: 12 }}>{formatarDataAlvo(objetivo.dataAlvo)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Trimestre</span>
          <span style={{ fontSize: 12 }}>{objetivo.trimestre ?? '—'}</span>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Prioridade</span>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
            background: `${PRIORIDADE_COR[objetivo.prioridade]}20`, color: PRIORIDADE_COR[objetivo.prioridade],
          }}>
            {PRIORIDADE_LABEL[objetivo.prioridade]}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <span className="kpi-label mb-1 block">Peso (G4)</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{objetivo.peso}%</span>
        </div>
      </div>

      {/* Régua mensal — método G4 */}
      <ReguaMensal objetivo={objetivo} todosResultados={todosResultados} />

      {/* Sub-metas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 700 }}>Sub-metas</span>
          <button onClick={onNovaSubMeta} className="flex items-center gap-1" style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={11} /> Adicionar
          </button>
        </div>
        {subMetas.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Nenhuma sub-meta</p>
        ) : (
          <div className="flex flex-col gap-2">
            {subMetas.map((sub) => {
              const p = progressoObjetivo(sub, todosObjetivos, todosResultados, metricas)
              const c = STATUS_OBJETIVO_COR[sub.status]
              return (
                <div key={sub.id} onClick={() => onSelecionarSubMeta(sub)} className="card-purion" style={{ padding: '10px 12px', cursor: 'pointer' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600 }}><Target size={11} style={{ color: '#C9A84C' }} /> {sub.titulo}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{p}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p}%`, background: c, borderRadius: 999 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resultados-chave */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 700 }}>Resultados-chave</span>
          <button onClick={onNovoResultado} className="flex items-center gap-1" style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={11} /> Adicionar
          </button>
        </div>
        {resultados.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Nenhum resultado-chave</p>
        ) : (
          <div className="flex flex-col gap-2">
            {resultados.map((r) => {
              const p = progressoResultadoEfetivo(r, metricas)
              const atual = valorEfetivoResultado(r, metricas)
              return (
                <div key={r.id} className="card-purion" style={{ padding: '10px 12px' }}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span onClick={() => onSelecionarResultado(r)} style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                      {r.descricao} {r.fonteAuto && <span style={{ fontSize: 9, fontWeight: 700, color: '#5B8FE8' }}>· AUTO</span>}
                    </span>
                    <button onClick={() => onDeletarResultado(r.id)} className="icon-btn" style={{ color: '#E85238', width: 22, height: 22 }}><Trash2 size={11} /></button>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatNumber(atual)} / {formatNumber(r.meta)} {r.unidade ?? ''}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>{p}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p}%`, background: '#C9A84C', borderRadius: 999 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tarefas vinculadas */}
      <div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Tarefas ligadas</span>
        {tarefasVinculadas.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Nenhuma tarefa vinculada a esta meta</p>
        ) : (
          <>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{tarefasConcluidas} de {tarefasVinculadas.length} concluídas</p>
            <div className="flex flex-col gap-1.5">
              {tarefasVinculadas.map((t) => (
                <div key={t.id} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                  <CheckSquare size={12} style={{ color: t.status === 'concluida' ? '#4CAF7A' : 'var(--text-secondary)' }} />
                  <span style={{
                    flex: 1, color: t.status === 'concluida' ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: t.status === 'concluida' ? 'line-through' : 'none',
                  }}>
                    {t.titulo}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open onClose={onFechar} title={objetivo.titulo}>
        {conteudo}
      </BottomSheet>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150 }}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 480, maxWidth: '92vw',
          background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', zIndex: 151,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <span className="caption">Detalhes da meta</span>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {conteudo}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
