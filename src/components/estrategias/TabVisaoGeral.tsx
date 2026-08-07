'use client'

import { useMemo } from 'react'
import { Star, Flag, CalendarClock, DollarSign, Percent, Scale, Package, CheckCircle2, Circle, Target } from 'lucide-react'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { EstrategiaFase, StatusFase } from '@/hooks/useEstrategia'
import { SecaoNotas } from './SecaoNotas'

// ─── Constantes de negócio (referência do plano da marca) ────────────
const CONTA_DO_MILHAO = {
  preco: 109.9,
  contribuicao: 76.94,
  pontoEquilibrioMes: 28,
  frascosMilhao: 9100,
}

const STATUS_COR: Record<StatusFase, string> = {
  concluida: '#4CAF7A',
  atual: '#C9A84C',
  futura: '#B8B8B8',
}

const STATUS_LABEL: Record<StatusFase, string> = {
  concluida: 'Concluída',
  atual: 'Em andamento',
  futura: 'Planejada',
}

function diasEntre(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function RoadmapCard({ fase }: { fase: EstrategiaFase }) {
  const cor = STATUS_COR[fase.status]
  return (
    <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
      <div
        className="card-purion"
        style={{
          padding: '14px 16px',
          borderColor: fase.status === 'atual' ? '#C9A84C' : 'var(--border)',
          background: fase.status === 'atual' ? 'rgba(201,168,76,0.06)' : undefined,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {fase.status === 'concluida'
            ? <CheckCircle2 size={15} style={{ color: cor }} />
            : <Circle size={15} style={{ color: cor }} />}
          <span style={{ fontSize: 13, fontWeight: 700 }}>{fase.nome}</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: `${cor}18`, color: cor,
        }}>
          {STATUS_LABEL[fase.status]}
        </span>
        {fase.marcoPrincipal && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
            {fase.marcoPrincipal}
          </p>
        )}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${fase.percentualConclusao}%`, background: cor, borderRadius: 999, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, textAlign: 'right' }}>{fase.percentualConclusao}%</p>
      </div>
    </div>
  )
}

function MiniCard({ icon: Icon, label, valor, sub, cor }: { icon: React.ElementType; label: string; valor: string; sub: string; cor: string }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <span className="kpi-label">{label}</span>
        <Icon size={14} style={{ color: cor, opacity: 0.7 }} />
      </div>
      <span className="kpi-value" style={{ color: cor }}>{valor}</span>
      <span className="caption">{sub}</span>
    </div>
  )
}

export function TabVisaoGeral() {
  const { fases, objetivos, resultados, carregando } = useEstrategiaRoadmap()

  const faseAtual = useMemo(
    () => fases.find((f) => f.status === 'atual') ?? null,
    [fases]
  )

  const proximaFase = useMemo(() => {
    const ordenadas = [...fases].sort((a, b) => a.ordem - b.ordem)
    const idxAtual = ordenadas.findIndex((f) => f.status === 'atual')
    return idxAtual >= 0 ? ordenadas[idxAtual + 1] ?? null : ordenadas.find((f) => f.status === 'futura') ?? null
  }, [fases])

  const diasAteFim = faseAtual?.dataFim ? diasEntre(new Date(), new Date(faseAtual.dataFim)) : null

  const okrsFaseAtual = useMemo(
    () => faseAtual ? objetivos.filter((o) => o.faseId === faseAtual.id) : [],
    [objetivos, faseAtual]
  )

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando roadmap…</p></div>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* North Star */}
      <div style={{
        padding: '20px 24px', borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))',
        border: '1px solid rgba(201,168,76,0.35)',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Star size={16} style={{ color: '#C9A84C' }} fill="#C9A84C" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            North Star
          </span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>
          Clientes e parceiros ativos que recompram
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          Todo esforço estratégico existe para mover este número. Recompra alta = produto e experiência funcionam.
        </p>
      </div>

      {/* Resumo da fase */}
      {faseAtual && (
        <div className="flex flex-wrap gap-3">
          <div className="card-purion" style={{ padding: '12px 16px', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={16} style={{ color: '#C9A84C' }} />
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Fase atual</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{faseAtual.nome}</span>
            </div>
          </div>
          <div className="card-purion" style={{ padding: '12px 16px', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarClock size={16} style={{ color: '#5B8FE8' }} />
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Dias até o fim da fase</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{diasAteFim !== null ? `${diasAteFim} dias` : '—'}</span>
            </div>
          </div>
          <div className="card-purion" style={{ padding: '12px 16px', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag size={16} style={{ color: '#4CAF7A' }} />
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Próximo marco</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {proximaFase?.marcoPrincipal ?? proximaFase?.nome ?? 'Fim de roadmap'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Roadmap horizontal */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Roadmap — 4 Fases</p>
        {fases.length === 0 ? (
          <div className="empty-state">
            <Flag size={36} className="empty-state-icon" />
            <p className="empty-state-title">Nenhuma fase cadastrada</p>
            <p className="empty-state-subtitle">As fases do roadmap (Fundação → Lançamento → Tração → Escala) aparecem aqui.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {[...fases].sort((a, b) => a.ordem - b.ordem).map((fase) => (
              <RoadmapCard key={fase.id} fase={fase} />
            ))}
          </div>
        )}
      </div>

      {/* OKRs da fase atual */}
      {okrsFaseAtual.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>OKRs — {faseAtual?.nome}</p>
          <div className="flex flex-col gap-2">
            {okrsFaseAtual.map((obj) => {
              const krs = resultados.filter((r) => r.objetivoId === obj.id)
              return (
                <div key={obj.id} className="card-purion" style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: krs.length ? 8 : 0 }}>{obj.titulo}</p>
                  {krs.map((kr) => {
                    const pct = kr.meta > 0 ? Math.min(100, Math.round((kr.atual / kr.meta) * 100)) : 0
                    return (
                      <div key={kr.id} style={{ marginBottom: 6 }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{kr.descricao}</span>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>
                            {formatNumber(kr.atual)} / {formatNumber(kr.meta)} {kr.unidade ?? ''}
                          </span>
                        </div>
                        <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, marginTop: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#C9A84C', borderRadius: 999 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Conta do milhão */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>A Conta do Milhão</p>
        <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <MiniCard icon={DollarSign} label="Preço oficial" valor={formatCurrency(CONTA_DO_MILHAO.preco)} sub="por frasco" cor="#C9A84C" />
          <MiniCard icon={Percent} label="Contribuição" valor={formatCurrency(CONTA_DO_MILHAO.contribuicao)} sub="margem por unidade" cor="#4CAF7A" />
          <MiniCard icon={Scale} label="Ponto de equilíbrio" valor={`${CONTA_DO_MILHAO.pontoEquilibrioMes}`} sub="frascos/mês para zerar" cor="#5B8FE8" />
          <MiniCard icon={Package} label="Conta do milhão" valor={`~${formatNumber(CONTA_DO_MILHAO.frascosMilhao)}`} sub="frascos/mês" cor="#A855F7" />
        </div>
      </div>

      <SecaoNotas secao="visao_geral" />
    </div>
  )
}
