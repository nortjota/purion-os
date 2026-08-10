'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Target, Plus } from 'lucide-react'
import type { EstrategiaObjetivo, EstrategiaResultado, MetricasCRM } from '@/hooks/useEstrategia'
import { progressoObjetivo } from '@/hooks/useEstrategia'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import { STATUS_OBJETIVO_LABEL, STATUS_OBJETIVO_COR, STATUS_OBJETIVO_OPCOES, formatarDataAlvo } from './metasHelpers'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, fontSize: 12, color: '#F5F5F5',
}

interface Props {
  objetivosTopo: EstrategiaObjetivo[]
  todosObjetivos: EstrategiaObjetivo[]
  todosResultados: EstrategiaResultado[]
  metricas: MetricasCRM
  onSelecionarObjetivo: (o: EstrategiaObjetivo) => void
  onNovaMeta: () => void
}

function AnelProgresso({ progresso, cor }: { progresso: number; cor: string }) {
  const raio = 26
  const circ = 2 * Math.PI * raio
  const offset = circ - (progresso / 100) * circ
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={raio} fill="none" stroke="var(--bg-surface-2)" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={raio} fill="none" stroke={cor} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: 'var(--text-primary)',
      }}>
        {progresso}%
      </span>
    </div>
  )
}

function CardMeta({ objetivo, todosObjetivos, todosResultados, metricas, onSelecionar }: {
  objetivo: EstrategiaObjetivo
  todosObjetivos: EstrategiaObjetivo[]
  todosResultados: EstrategiaResultado[]
  metricas: MetricasCRM
  onSelecionar: () => void
}) {
  const progresso = progressoObjetivo(objetivo, todosObjetivos, todosResultados, metricas)
  const cor = STATUS_OBJETIVO_COR[objetivo.status]
  const socio = objetivo.responsavel ? SOCIOS.find((s) => s.id === objetivo.responsavel) : null
  const numFilhos = todosObjetivos.filter((o) => o.parentId === objetivo.id).length + todosResultados.filter((r) => r.objetivoId === objetivo.id).length

  return (
    <div onClick={onSelecionar} className="card-purion" style={{ padding: 16, cursor: 'pointer', display: 'flex', gap: 14 }}>
      <AnelProgresso progresso={progresso} cor={cor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objetivo.titulo}</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: `${cor}18`, color: cor, whiteSpace: 'nowrap',
        }}>
          {STATUS_OBJETIVO_LABEL[objetivo.status]}
        </span>
        <div className="flex items-center justify-between mt-2">
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatarDataAlvo(objetivo.dataAlvo)}</span>
          {socio && (
            <span style={{
              width: 20, height: 20, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
            }}>
              {socio.inicial}
            </span>
          )}
        </div>
        {numFilhos > 0 && (
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>{numFilhos} sub-item{numFilhos > 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  )
}

export function MetaPainelView({ objetivosTopo, todosObjetivos, todosResultados, metricas, onSelecionarObjetivo, onNovaMeta }: Props) {
  const distribuicao = useMemo(() => {
    return STATUS_OBJETIVO_OPCOES.map((status) => ({
      name: STATUS_OBJETIVO_LABEL[status],
      value: todosObjetivos.filter((o) => o.status === status).length,
      cor: STATUS_OBJETIVO_COR[status],
    })).filter((d) => d.value > 0)
  }, [todosObjetivos])

  if (objetivosTopo.length === 0) {
    return (
      <div className="empty-state">
        <Target size={36} className="empty-state-icon" />
        <p className="empty-state-title">Nenhuma meta cadastrada</p>
        <button onClick={onNovaMeta} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          <Plus size={12} /> Nova meta
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {objetivosTopo.map((o) => (
          <CardMeta
            key={o.id}
            objetivo={o}
            todosObjetivos={todosObjetivos}
            todosResultados={todosResultados}
            metricas={metricas}
            onSelecionar={() => onSelecionarObjetivo(o)}
          />
        ))}
      </div>

      <div className="card-purion" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Distribuição por status</p>
        {distribuicao.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhum dado</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={distribuicao} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {distribuicao.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-2">
              {distribuicao.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
