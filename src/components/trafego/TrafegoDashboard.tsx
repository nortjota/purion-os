'use client'

/**
 * PURION OS — Módulo 9: Tráfego Pago
 * Painel unificado + sub-abas Meta / Google / TikTok.
 */

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePurionStore } from '@/store'
import type { TrafegoApiResponse, TrafegoPeriod, TrafegoCampanha } from '@/lib/trafego-types'
import type { DailyConsolidado } from './TrafegoGraficos'

const TrafegoGraficos = dynamic(() => import('./TrafegoGraficos'), {
  ssr: false,
  loading: () => <div className="h-[220px] bg-[var(--bg-surface-2)] rounded-lg animate-pulse" />,
})

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

type TabId = 'painel' | 'meta' | 'google' | 'tiktok'

const PLATAFORMAS: { id: TabId; label: string; cor: string; subLabel: string }[] = [
  { id: 'meta',   label: 'Meta Ads',   cor: '#1877F2', subLabel: 'Facebook & Instagram' },
  { id: 'google', label: 'Google Ads', cor: '#34A853', subLabel: 'Search & Display' },
  { id: 'tiktok', label: 'TikTok Ads', cor: '#EE1D52', subLabel: 'TikTok For Business' },
]

const PERIODOS: { value: TrafegoPeriod; label: string }[] = [
  { value: '7d',    label: '7 dias' },
  { value: '14d',   label: '14 dias' },
  { value: '30d',   label: '30 dias' },
  { value: 'month', label: 'Mês atual' },
]

const VAZIO: TrafegoApiResponse = {
  status: 'ok', gasto: 0, impressoes: 0, cliques: 0,
  ctr: 0, cpm: 0, cpc: 0, conversoes: 0, cpa: 0, roas: 0,
  campanhas: [], diario: [], ultimaAtualizacao: new Date().toISOString(),
}

// ─────────────────────────────────────────────
// FORMATAÇÃO
// ─────────────────────────────────────────────

const fmtR  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtN  = (v: number) => v.toLocaleString('pt-BR')
const fmtTs = (iso: string) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

function SkeletonCard() {
  return <div className="bg-[var(--bg-surface)] rounded-xl h-24 animate-pulse" />
}

function BannerErro({ status, plataforma, ultimaAtualizacao }: {
  status: 'no_credentials' | 'auth_error' | 'api_error'
  plataforma: string
  ultimaAtualizacao?: string
}) {
  if (status === 'no_credentials') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
          <Settings size={20} className="text-[#C9A84C]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Configure a API de {plataforma}</p>
          <p className="text-xs text-[#B8B8B8] mt-1">As credenciais não foram preenchidas em Configurações.</p>
        </div>
        <Link href="/settings"
          className="text-xs font-bold text-[#0A0A0A] bg-[#C9A84C] px-4 py-2 rounded-lg hover:bg-[#D4B568] transition-colors">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  if (status === 'auth_error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Token expirado — Reconectar {plataforma}</p>
            <p className="text-xs text-red-400/70 mt-0.5">Acesse Configurações para atualizar o token de acesso.</p>
          </div>
        </div>
        <Link href="/settings" className="text-xs font-bold text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0">
          Reconectar
        </Link>
      </div>
    )
  }

  // api_error
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 flex items-center gap-3 mb-4">
      <RefreshCw size={14} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">
        API indisponível — exibindo último cache.{' '}
        {ultimaAtualizacao && <span className="text-amber-400/70">Última atualização: {fmtTs(ultimaAtualizacao)}</span>}
      </p>
    </div>
  )
}

function StatusConexao({ status, plataforma }: { status: TrafegoApiResponse['status']; plataforma: string }) {
  if (status === 'ok') return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
      <CheckCircle size={10} /> Conectado
    </span>
  )
  if (status === 'no_credentials') return (
    <span className="text-[9px] font-bold text-[#B8B8B8]">Não configurado</span>
  )
  if (status === 'auth_error') return (
    <span className="text-[9px] font-bold text-red-400">Token expirado</span>
  )
  return <span className="text-[9px] font-bold text-amber-400">API indisponível</span>
}

function KpiCard({ label, valor, destaque, alerta, aviso }: {
  label: string; valor: string; destaque?: boolean; alerta?: boolean; aviso?: boolean
}) {
  return (
    <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl px-4 py-3">
      <p className="text-[9px] text-[#B8B8B8] uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-black ${alerta ? 'text-red-400' : aviso ? 'text-amber-400' : destaque ? 'text-[#C9A84C]' : 'text-[var(--text-primary)]'}`}>
        {valor}
      </p>
      {alerta && <span className="text-[8px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded mt-1 inline-block">ACIMA DO LIMITE</span>}
    </div>
  )
}

function TabelaCampanhas({ campanhas, roasMinimo, cpaMaximo }: {
  campanhas: TrafegoCampanha[]
  roasMinimo: number
  cpaMaximo: number
}) {
  if (!campanhas.length) return (
    <p className="text-xs text-[#A0A0A0] py-4 text-center">Nenhuma campanha no período.</p>
  )
  return (
    <div className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-[var(--border)]">
        {['Nome', 'Status', 'Gasto', 'Conv.', 'ROAS', 'CPA'].map((h) => (
          <span key={h} className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-wider">{h}</span>
        ))}
      </div>
      {campanhas.map((c) => {
        const roasOk = c.roas >= roasMinimo || c.roas === 0
        const cpaOk  = c.cpa  <= cpaMaximo  || c.cpa  === 0
        return (
          <div key={c.id} className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-[var(--border)] last:border-0 items-center hover:bg-[rgba(255,255,255,0.02)]">
            <span className="text-xs text-[var(--text-primary)] truncate col-span-1">{c.nome}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${c.status === 'ATIVO' ? 'text-emerald-400 bg-emerald-400/10' : 'text-[#B8B8B8] bg-[var(--bg-surface)]'}`}>
              {c.status}
            </span>
            <span className="text-xs text-[var(--text-primary)] font-semibold">{fmtR(c.gasto)}</span>
            <span className="text-xs text-[var(--text-secondary)]">{fmtN(Math.round(c.conversoes))}</span>
            <span className={`text-xs font-bold ${roasOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {c.roas > 0 ? `${c.roas.toFixed(1)}×` : '—'}
            </span>
            <span className={`text-xs font-bold ${cpaOk ? 'text-[var(--text-primary)]' : 'text-amber-400'}`}>
              {c.cpa > 0 ? fmtR(c.cpa) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PlataformaTab({ data, loading, plataforma, cor, subLabel, roasMinimo, cpaMaximo }: {
  data: TrafegoApiResponse
  loading: boolean
  plataforma: string
  cor: string
  subLabel: string
  roasMinimo: number
  cpaMaximo: number
}) {
  if (loading) return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Banner de erro (auth ou api_error) */}
      {(data.status === 'auth_error' || data.status === 'api_error') && (
        <BannerErro status={data.status} plataforma={plataforma} ultimaAtualizacao={data.ultimaAtualizacao} />
      )}

      {/* Credencial ausente: mostrar só o card de configuração */}
      {data.status === 'no_credentials' ? (
        <BannerErro status="no_credentials" plataforma={plataforma} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Gasto Total"  valor={fmtR(data.gasto)}      destaque />
            <KpiCard label="Impressões"   valor={fmtN(data.impressoes)} />
            <KpiCard label="Cliques"      valor={fmtN(data.cliques)}    />
            <KpiCard label="CTR"          valor={`${data.ctr.toFixed(2)}%`} />
            <KpiCard label="CPM"          valor={fmtR(data.cpm)}        />
            <KpiCard label="CPC"          valor={fmtR(data.cpc)}        />
            <KpiCard label="Conversões"   valor={fmtN(Math.round(data.conversoes))} />
            <KpiCard label="CPA"          valor={data.cpa > 0 ? fmtR(data.cpa) : '—'}
              alerta={data.cpa > cpaMaximo && data.cpa > 0} />
            <KpiCard label="ROAS"         valor={data.roas > 0 ? `${data.roas.toFixed(1)}×` : '—'}
              aviso={data.roas > 0 && data.roas < roasMinimo} />
          </div>

          {/* Gráfico de linha — gasto diário */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-4">
              Gasto Diário — {subLabel}
            </p>
            <TrafegoGraficos tipo="linha" linhaData={data.diario} cor={cor} />
          </div>

          {/* Campanhas */}
          <div>
            <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-3">
              Campanhas Ativas
            </p>
            <TabelaCampanhas campanhas={data.campanhas} roasMinimo={roasMinimo} cpaMaximo={cpaMaximo} />
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function TrafegoDashboard() {
  const { configuracoes } = usePurionStore()
  const roasMinimo = configuracoes.roasMinimo ?? 2.5
  const cpaMaximo  = configuracoes.cpaMaximo  ?? 45

  const [activeTab, setActiveTab] = useState<TabId>('painel')
  const [period, setPeriod]       = useState<TrafegoPeriod>('30d')

  const [metaData,   setMetaData]   = useState<TrafegoApiResponse>(VAZIO)
  const [googleData, setGoogleData] = useState<TrafegoApiResponse>(VAZIO)
  const [tiktokData, setTiktokData] = useState<TrafegoApiResponse>(VAZIO)
  const [loading,    setLoading]    = useState({ meta: true, google: true, tiktok: true })

  useEffect(() => {
    setLoading({ meta: true, google: true, tiktok: true })

    const fetchPlat = async (url: string, set: (d: TrafegoApiResponse) => void, key: 'meta' | 'google' | 'tiktok') => {
      try {
        const res = await fetch(url)
        const json: TrafegoApiResponse = await res.json()
        set(json)
      } catch {
        set({ ...VAZIO, status: 'api_error' })
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }))
      }
    }

    fetchPlat(`/api/meta-ads?period=${period}`,    setMetaData,   'meta')
    fetchPlat(`/api/google-ads?period=${period}`,  setGoogleData, 'google')
    fetchPlat(`/api/tiktok-ads?period=${period}`,  setTiktokData, 'tiktok')
  }, [period])

  // ── Dados consolidados para o Painel ──
  const totalGasto    = metaData.gasto + googleData.gasto + tiktokData.gasto
  const totalConv     = metaData.conversoes + googleData.conversoes + tiktokData.conversoes
  const cpaCons       = totalConv > 0 ? totalGasto / totalConv : 0

  const roasCons = useMemo(() => {
    const platforms = [metaData, googleData, tiktokData]
    const gastoPonderado = platforms.reduce((s, p) => s + p.roas * p.gasto, 0)
    return totalGasto > 0 ? gastoPonderado / totalGasto : 0
  }, [metaData, googleData, tiktokData, totalGasto])

  const plataformaMaisEficiente = useMemo(() => {
    const map = [
      { label: 'Meta',   roas: metaData.roas,   ativo: metaData.status === 'ok' && metaData.gasto > 0 },
      { label: 'Google', roas: googleData.roas,  ativo: googleData.status === 'ok' && googleData.gasto > 0 },
      { label: 'TikTok', roas: tiktokData.roas,  ativo: tiktokData.status === 'ok' && tiktokData.gasto > 0 },
    ].filter((p) => p.ativo)
    if (!map.length) return '—'
    return map.reduce((best, p) => (p.roas > best.roas ? p : best)).label
  }, [metaData, googleData, tiktokData])

  // ── Gráfico empilhado: merge das datas ──
  const empilhadoData: DailyConsolidado[] = useMemo(() => {
    const map: Record<string, DailyConsolidado> = {}
    const addPlatform = (diario: typeof metaData.diario, key: 'meta' | 'google' | 'tiktok') => {
      for (const d of diario) {
        if (!map[d.data]) map[d.data] = { data: d.data, meta: 0, google: 0, tiktok: 0 }
        map[d.data][key] += d.gasto
      }
    }
    addPlatform(metaData.diario,   'meta')
    addPlatform(googleData.diario, 'google')
    addPlatform(tiktokData.diario, 'tiktok')
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data))
  }, [metaData.diario, googleData.diario, tiktokData.diario])

  const anyLoading = loading.meta || loading.google || loading.tiktok

  return (
    <div className="page-content section-gap">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Tráfego Pago</h1>
          <p className="caption mt-1">Meta · Google · TikTok — dados em tempo real</p>
        </div>
        {/* Seletor de período */}
        <div className="flex gap-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-1">
          {PERIODOS.map(({ value, label }) => (
            <button key={value} onClick={() => setPeriod(value)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${period === value ? 'bg-[#C9A84C] text-[#0A0A0A]' : 'text-[#B8B8B8] hover:text-[var(--text-primary)]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([{ id: 'painel' as const, label: 'Painel Unificado' }, ...PLATAFORMAS.map((p) => ({ id: p.id, label: p.label }))]).map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`text-[11px] font-bold px-4 py-2.5 border-b-2 transition-colors ${activeTab === id ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-transparent text-[#B8B8B8] hover:text-[var(--text-primary)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: PAINEL ══ */}
      {activeTab === 'painel' && (
        <div className="space-y-6">
          {/* 4 KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {anyLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : [
                  { label: 'Gasto Consolidado', valor: fmtR(totalGasto),          destaque: true },
                  { label: 'ROAS Consolidado',  valor: roasCons > 0 ? `${roasCons.toFixed(1)}×` : '—', aviso: roasCons > 0 && roasCons < roasMinimo },
                  { label: 'CPA Consolidado',   valor: cpaCons > 0 ? fmtR(cpaCons) : '—', alerta: cpaCons > cpaMaximo && cpaCons > 0 },
                  { label: 'Mais Eficiente',    valor: plataformaMaisEficiente },
                ].map((kpi) => (
                  <KpiCard key={kpi.label} {...kpi} />
                ))
            }
          </div>

          {/* Gráfico empilhado */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-4">
              Gasto Diário por Plataforma
            </p>
            {anyLoading
              ? <div className="h-[220px] bg-[var(--bg-surface-2)] rounded-lg animate-pulse" />
              : <TrafegoGraficos tipo="empilhado" empilhadoData={empilhadoData} />
            }
          </div>

          {/* Tabela comparativa */}
          <div>
            <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-widest mb-3">
              Comparativo de Plataformas
            </p>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-[var(--border)]">
                {['Plataforma', 'Gasto', 'Cliques', 'CPA', 'ROAS', 'Conexão'].map((h) => (
                  <span key={h} className="text-[9px] font-bold text-[#A0A0A0] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {PLATAFORMAS.map(({ id, label, cor }) => {
                const d = id === 'meta' ? metaData : id === 'google' ? googleData : tiktokData
                const isLoading = loading[id as keyof typeof loading]
                return (
                  <div key={id} className="grid grid-cols-6 gap-2 px-4 py-3.5 border-b border-[var(--border)] last:border-0 items-center hover:bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
                    </div>
                    {isLoading ? (
                      <div className="col-span-5 h-4 bg-[#2A2A2A] rounded animate-pulse" />
                    ) : (
                      <>
                        <span className="text-xs font-bold text-[#C9A84C]">{fmtR(d.gasto)}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{fmtN(d.cliques)}</span>
                        <span className={`text-xs font-bold ${d.cpa > cpaMaximo && d.cpa > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                          {d.cpa > 0 ? fmtR(d.cpa) : '—'}
                        </span>
                        <span className={`text-xs font-bold ${d.roas > 0 && d.roas < roasMinimo ? 'text-red-400' : 'text-emerald-400'}`}>
                          {d.roas > 0 ? `${d.roas.toFixed(1)}×` : '—'}
                        </span>
                        <StatusConexao status={d.status} plataforma={label} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ TABs: META / GOOGLE / TIKTOK ══ */}
      {PLATAFORMAS.map(({ id, label, cor, subLabel }) => activeTab === id && (
        <PlataformaTab
          key={id}
          data={id === 'meta' ? metaData : id === 'google' ? googleData : tiktokData}
          loading={loading[id as keyof typeof loading]}
          plataforma={label}
          cor={cor}
          subLabel={subLabel}
          roasMinimo={roasMinimo}
          cpaMaximo={cpaMaximo}
        />
      ))}

    </div>
  )
}
