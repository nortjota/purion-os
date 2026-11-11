'use client'

import { Skeleton } from '@/components/motion/Skeleton'

import { useMemo } from 'react'
import { Star, Flag, CalendarClock, DollarSign, Percent, Scale, Package, CheckCircle2, Circle, Target } from 'lucide-react'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { EstrategiaFase, StatusFase } from '@/hooks/useEstrategia'
import { SecaoNotas } from './SecaoNotas'
import { PRECO_B2C_OFICIAL } from '@/lib/precificacao'

// ─── Constantes de negócio (referência do plano da marca) ────────────
// Preço oficial R$ 97,90 · contribuição orgânica R$ 39,90/frasco (97,90 − 30 custo − 28 variáveis).
// Ponto de equilíbrio mantém o mesmo custo fixo de referência do plano (≈ R$ 2.154/mês).
const CUSTO_FIXO_MES_REF = 2154
const CONTA_DO_MILHAO = {
  preco: PRECO_B2C_OFICIAL,
  contribuicao: 39.9,
  pontoEquilibrioMes: Math.ceil(CUSTO_FIXO_MES_REF / 39.9),
  frascosMilhao: Math.ceil(1_000_000 / PRECO_B2C_OFICIAL),
}

const STATUS_COR: Record<StatusFase, string> = {
  concluida: '#8FD14F',
  atual: '#D4FC3C',
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
          borderColor: fase.status === 'atual' ? 'var(--brand-accent)' : 'var(--border)',
          background: fase.status === 'atual' ? 'rgba(212,252,60,0.06)' : undefined,
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
    return <Skeleton rows={4} label="Carregando roadmap…" />
  }

  return (
    <div className="flex flex-col gap-5">
      {/* North Star */}
      <div style={{
        padding: '20px 24px', borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(245,245,240,0.12), rgba(245,245,240,0.03))',
        border: '1px solid rgba(245,245,240,0.35)',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Star size={16} style={{ color: 'var(--text-primary)' }} fill="var(--text-primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
            <Target size={16} style={{ color: 'var(--text-primary)' }} />
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Fase atual</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{faseAtual.nome}</span>
            </div>
          </div>
          <div className="card-purion" style={{ padding: '12px 16px', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarClock size={16} style={{ color: 'var(--status-info)' }} />
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}>Dias até o fim da fase</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{diasAteFim !== null ? `${diasAteFim} dias` : '—'}</span>
            </div>
          </div>
          <div className="card-purion" style={{ padding: '12px 16px', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag size={16} style={{ color: 'var(--status-ok)' }} />
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
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-accent)', borderRadius: 999 }} />
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
          <MiniCard icon={DollarSign} label="Preço oficial" valor={formatCurrency(CONTA_DO_MILHAO.preco)} sub="por frasco" cor="#D4FC3C" />
          <MiniCard icon={Percent} label="Contribuição" valor={formatCurrency(CONTA_DO_MILHAO.contribuicao)} sub="margem por unidade" cor="#8FD14F" />
          <MiniCard icon={Scale} label="Ponto de equilíbrio" valor={`${CONTA_DO_MILHAO.pontoEquilibrioMes}`} sub="frascos/mês para zerar" cor="#9CC3DB" />
          <MiniCard icon={Package} label="Conta do milhão" valor={`~${formatNumber(CONTA_DO_MILHAO.frascosMilhao)}`} sub="frascos/mês" cor="#A7A9A6" />
        </div>
      </div>

      <SecaoNotas secao="visao_geral" />
    </div>
  )
}
