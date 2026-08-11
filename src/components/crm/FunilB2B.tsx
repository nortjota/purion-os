'use client'

import { useMemo } from 'react'
import { Users, ArrowDown, Bell, TrendingUp, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useGrowth } from '@/hooks/useGrowth'
import { estagioNormalizado, METAS_MENSAIS, diasDesde } from './crmHelpers'
// StatusLead (novo pipeline): prospecto | abordado | reuniao_agendada | oportunidade | cliente | recorrente | perdido
// Valores antigos (contato_feito, proposta_enviada, negociando, parceiro_ativo, inativo) são normalizados via estagioNormalizado().

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function FunilB2B() {
  const { leads, vendas } = usePurionStore()
  const { funilMetas } = useGrowth()

  const hoje = new Date()
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay())

  // ── Contadores por etapa (normalizados para o novo pipeline) ──────
  const contadores = useMemo(() => {
    const abordagens    = leads.filter((l) => ['prospecto', 'abordado'].includes(estagioNormalizado(l.status))).length
    const reunioes      = leads.filter((l) => estagioNormalizado(l.status) === 'reuniao_agendada').length
    const oportunidades = leads.filter((l) => estagioNormalizado(l.status) === 'oportunidade').length
    const ganhos        = leads.filter((l) => ['cliente', 'recorrente'].includes(estagioNormalizado(l.status))).length
    return { abordagens, reunioes, oportunidades, ganhos }
  }, [leads])

  // ── Leads criados esta semana (proxy para abordagens novas) ──────
  const novosSemana = useMemo(() =>
    leads.filter((l) => new Date(l.createdAt) >= inicioSemana).length,
    [leads, inicioSemana]
  )

  // ── D+21: parceiros ativos sem reposição follow-up ───────────────
  const reposicoesPendentes = useMemo(() =>
    leads.filter((l) => {
      if (!['cliente', 'recorrente'].includes(estagioNormalizado(l.status))) return false
      const dias = diasDesde(l.updatedAt)
      return dias >= 14 && dias <= 35
    }).sort((a, b) => diasDesde(b.updatedAt) - diasDesde(a.updatedAt)),
    [leads]
  )

  // ── Receita B2B este mês ─────────────────────────────────────────
  const receitaMes = useMemo(() =>
    vendas
      .filter((v) => v.canal === 'b2b' && v.dataVenda.startsWith(mesStr) && v.statusPagamento === 'pago')
      .reduce((s, v) => s + (v.valorTotal ?? v.valorLiquido), 0),
    [vendas, mesStr]
  )

  // ── Funil visual ─────────────────────────────────────────────────
  const etapasFunil = [
    {
      label: 'Abordagens',
      meta: funilMetas.find((m) => m.etapa.toLowerCase().includes('abordagem'))?.metaSemanal ?? 18,
      realizado: novosSemana,
      total: contadores.abordagens,
      cor: '#5B8FE8',
      desc: 'Contatos novos esta semana',
    },
    {
      label: 'Reuniões',
      meta: funilMetas.find((m) => m.etapa.toLowerCase().includes('reuni'))?.metaSemanal ?? 4,
      realizado: leads.filter((l) => estagioNormalizado(l.status) === 'reuniao_agendada' && new Date(l.updatedAt) >= inicioSemana).length,
      total: contadores.reunioes,
      cor: '#C9A84C',
      desc: 'Prospects que aceitaram conversar',
    },
    {
      label: 'Oportunidades',
      meta: funilMetas.find((m) => m.etapa.toLowerCase().includes('oportunidade'))?.metaSemanal ?? 3,
      realizado: leads.filter((l) => estagioNormalizado(l.status) === 'oportunidade' && new Date(l.updatedAt) >= inicioSemana).length,
      total: contadores.oportunidades,
      cor: '#E8A838',
      desc: 'Proposta enviada / negociando',
    },
    {
      label: 'Ganhos',
      meta: funilMetas.find((m) => m.etapa.toLowerCase().includes('ganho'))?.metaSemanal ?? 2,
      realizado: leads.filter((l) => ['cliente', 'recorrente'].includes(estagioNormalizado(l.status)) && new Date(l.updatedAt) >= inicioSemana).length,
      total: contadores.ganhos,
      cor: '#4CAF7A',
      desc: 'Fechamentos confirmados',
    },
    {
      label: 'Reposições',
      meta: funilMetas.find((m) => m.etapa.toLowerCase().includes('reposição') || m.etapa.toLowerCase().includes('reposicao'))?.metaSemanal ?? 1,
      realizado: reposicoesPendentes.length,
      total: reposicoesPendentes.length,
      cor: '#A855F7',
      desc: 'Clientes em ciclo de reposição',
    },
  ]

  const mesAtual = Math.min(hoje.getMonth(), METAS_MENSAIS.length - 1)
  const metaMes = METAS_MENSAIS[mesAtual]
  const pctGanhos = metaMes.ganhos > 0 ? Math.min(100, Math.round((contadores.ganhos / metaMes.ganhos) * 100)) : 0
  const pctReceita = metaMes.receita > 0 ? Math.min(100, Math.round((receitaMes / metaMes.receita) * 100)) : 0

  return (
    <div className="flex flex-col gap-5">

      {/* Funil com metas semanais */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Funil da Máquina de Vendas</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Realizado esta semana vs meta semanal · total acumulado</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {etapasFunil.map((etapa, i) => {
            const pct = etapa.meta > 0 ? Math.min(100, Math.round((etapa.realizado / etapa.meta) * 100)) : 0
            const atingiu = etapa.realizado >= etapa.meta
            return (
              <div key={etapa.label}>
                <div className="card-purion" style={{ padding: '12px 16px' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${etapa.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Users size={14} style={{ color: etapa.cor }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{etapa.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{etapa.desc}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 800 }}>
                        <span style={{ color: etapa.cor }}>{etapa.total}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>total</span>
                      </p>
                      <p style={{ fontSize: 11, color: atingiu ? '#4CAF7A' : 'var(--text-secondary)' }}>
                        {etapa.realizado}/{etapa.meta} semana
                        {atingiu && ' ✓'}
                      </p>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: etapa.cor, borderRadius: 999, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
                {i < etapasFunil.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                    <ArrowDown size={14} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* D+21 Reposições */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} style={{ color: reposicoesPendentes.length > 0 ? '#E8A838' : 'var(--text-secondary)' }} />
          <p style={{ fontSize: 14, fontWeight: 700 }}>
            Reposições D+21
            {reposicoesPendentes.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, color: '#E8A838', fontWeight: 600 }}>
                {reposicoesPendentes.length} pendente{reposicoesPendentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {reposicoesPendentes.length === 0 ? (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Nenhum cliente no período D+14 a D+35. Bom trabalho!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reposicoesPendentes.map((lead) => {
              const dias = diasDesde(lead.updatedAt)
              const urgente = dias >= 21
              return (
                <div key={lead.id} className="card-purion" style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderColor: urgente ? 'rgba(232,168,56,0.4)' : 'var(--border)',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{lead.nomeEmpresa}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lead.cidade} · {lead.regiao}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: urgente ? '#E8A838' : '#4CAF7A' }}>
                      D+{dias}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                      {urgente ? '⚡ Follow-up agora' : 'Prepare abordagem'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Placar Comercial */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Placar Comercial</p>
        <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Ganhos no mês</span>
              <CheckCircle2 size={14} style={{ color: '#4CAF7A', opacity: 0.7 }} />
            </div>
            <span className="kpi-value" style={{ color: '#4CAF7A' }}>{contadores.ganhos}</span>
            <span className="caption">meta: {metaMes.ganhos} ({metaMes.mes})</span>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctGanhos}%`, background: '#4CAF7A', borderRadius: 999 }} />
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Receita B2B</span>
              <TrendingUp size={14} style={{ color: '#C9A84C', opacity: 0.7 }} />
            </div>
            <span className="kpi-value">{fmtR(receitaMes)}</span>
            <span className="caption">meta: {fmtR(metaMes.receita)}</span>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctReceita}%`, background: '#C9A84C', borderRadius: 999 }} />
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Pipeline total</span>
              <Users size={14} style={{ color: '#5B8FE8', opacity: 0.7 }} />
            </div>
            <span className="kpi-value" style={{ color: '#5B8FE8' }}>{leads.length}</span>
            <span className="caption">{contadores.oportunidades} em negociação ativa</span>
          </div>
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">Conv. Abord.→Ganho</span>
              <AlertCircle size={14} style={{ color: '#A855F7', opacity: 0.7 }} />
            </div>
            <span className="kpi-value" style={{ color: '#A855F7' }}>
              {contadores.abordagens > 0 ? Math.round((contadores.ganhos / contadores.abordagens) * 100) : 0}%
            </span>
            <span className="caption">meta: ~8% (18→1-2)</span>
          </div>
        </div>
      </div>

      {/* Ritual de Sexta */}
      <div style={{
        padding: '16px', borderRadius: 12,
        background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: '#C9A84C' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>Ritual de Sexta — Resumo Semanal</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Abordagens', realizado: novosSemana, meta: 18, pergunta: 'Chegamos a 18?' },
            { label: 'Reuniões', realizado: etapasFunil[1].realizado, meta: 4, pergunta: '4 reuniões ok?' },
            { label: 'Oportunidades', realizado: etapasFunil[2].realizado, meta: 3, pergunta: '3 propostas enviadas?' },
            { label: 'Ganhos', realizado: etapasFunil[3].realizado, meta: 2, pergunta: '1-2 fechamentos?' },
          ].map((item) => {
            const ok = item.realizado >= item.meta
            return (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 999, margin: '0 auto 6px',
                  background: ok ? 'rgba(76,175,122,0.15)' : 'rgba(232,82,56,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: ok ? '#4CAF7A' : '#E85238' }}>
                    {item.realizado}
                  </span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.pergunta}</p>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>
          Leve esse resumo para a reunião de domingo e defina ajustes para a próxima semana.
        </p>
      </div>
    </div>
  )
}
