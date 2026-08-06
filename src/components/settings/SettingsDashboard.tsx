'use client'

/**
 * PURION OS — Módulo 10: Configurações
 * 5 tabs: Regras Financeiras, Metas, Alertas de Tráfego, Estoque, APIs.
 * Salva no Zustand (persist → localStorage). Credenciais API em localStorage direto.
 */

import { useState, useEffect, useMemo } from 'react'
import { Save, Download, Eye, EyeOff, AlertTriangle, Check, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useMobile } from '@/hooks/useMobile'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const TABS = [
  { id: 'financeiro', label: 'Regras Financeiras' },
  { id: 'metas',      label: 'Metas' },
  { id: 'alertas',    label: 'Alertas de Tráfego' },
  { id: 'estoque',    label: 'Estoque' },
  { id: 'apis',       label: 'APIs' },
] as const

type TabId = (typeof TABS)[number]['id']

// ─────────────────────────────────────────────
// HELPERS DE COMPONENTE REUTILIZÁVEL
// ─────────────────────────────────────────────

function InputNum({
  label, value, onChange, min, max, step = 1, prefix = '', suffix = '', hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
      <div className="flex items-center bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg overflow-hidden focus-within:border-[#C9A84C] transition-colors">
        {prefix && (
          <span className="px-2.5 py-2 text-xs text-[#A0A0A0] border-r border-[#3A3A3A] bg-[var(--bg-surface-2)]">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 text-sm text-[var(--text-primary)] bg-transparent outline-none"
        />
        {suffix && (
          <span className="px-2.5 py-2 text-xs text-[#A0A0A0] border-l border-[#3A3A3A] bg-[var(--bg-surface-2)]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-[#A0A0A0] mt-0.5">{hint}</p>}
    </div>
  )
}

function InputPwd({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
      <div className="flex items-center bg-[var(--bg-primary)] border border-[#3A3A3A] rounded-lg overflow-hidden focus-within:border-[#C9A84C]">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder ?? '••••••••••••'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm text-[var(--text-primary)] bg-transparent outline-none font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="px-2.5 text-[#B8B8B8] hover:text-[#C9A84C]"
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  )
}

function SalvoToast({ visivel }: { visivel: boolean }) {
  if (!visivel) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
      <Check size={12} />
      Salvo
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function SettingsDashboard() {
  const {
    configuracoes, setConfiguracoes,
    leads, receitas, despesas, tarefas, lotes, estoque,
    creators, campanhasAds, reunioes,
    produtosSKU, pedidosExpedicao, conteudosCalendario,
    dailyEntries, decisoes, atualizarProdutoSKU,
  } = usePurionStore()

  const isMobile = useMobile()
  const [abaAtiva, setAbaAtiva] = useState<TabId | null>('financeiro')
  const [toast, setToast] = useState<TabId | null>(null)

  // On mobile, start with no tab selected (list view)
  useEffect(() => {
    if (isMobile) setAbaAtiva(null)
    else setAbaAtiva((prev) => prev ?? 'financeiro')
  }, [isMobile])

  const showToast = (tab: TabId) => {
    setToast(tab)
    setTimeout(() => setToast(null), 2000)
  }

  // ── Estado: Tab 1 — Regras Financeiras ──
  const [finForm, setFinForm] = useState({
    margemLucro:           Math.round(configuracoes.margemLucro * 100),
    margemMinimaAlvo:      Math.round(configuracoes.margemMinimaAlvo * 100),
    alertaMargemAbaixoDe:  Math.round(configuracoes.alertaMargemAbaixoDe * 100),
    splitEstoque:          Math.round(configuracoes.splitEstoque * 100),
    splitMarketing:        Math.round(configuracoes.splitMarketing * 100),
    splitCaixa:            Math.round(configuracoes.splitOperacional * 100),
    splitDesenvolvimento:  Math.round(configuracoes.splitReserva * 100),
    splitSocietario:       Math.round(configuracoes.splitSocietario * 100),
  })

  const totalSplit = useMemo(
    () => finForm.splitEstoque + finForm.splitMarketing + finForm.splitCaixa +
          finForm.splitDesenvolvimento + finForm.splitSocietario,
    [finForm]
  )
  const splitOk = totalSplit === 100

  // ── Estado: Tab 2 — Metas ──
  const [metasForm, setMetasForm] = useState({
    metaFaturamento90Dias:  configuracoes.metaFaturamento90Dias,
    metaFaturamento12Meses: configuracoes.metaFaturamento12Meses,
    metaLeadsMes:           configuracoes.metaLeadsMes,
    metaCreatorsMes:        configuracoes.metaCreatorsMes,
    metaVideosMes:          configuracoes.metaVideosMes,
  })

  // ── Estado: Tab 3 — Alertas ──
  const [alertasForm, setAlertasForm] = useState({
    roasMinimo:            configuracoes.roasMinimo,
    cpaMaximo:             configuracoes.cpaMaximo,
    orcamentoDiarioMeta:   configuracoes.orcamentoDiarioMeta,
    orcamentoDiarioGoogle: configuracoes.orcamentoDiarioGoogle,
    orcamentoDiarioTikTok: configuracoes.orcamentoDiarioTikTok,
  })

  // ── Estado: Tab 4 — Estoque ──
  const [estoqueForm, setEstoqueForm] = useState({
    thresholdNoir:            configuracoes.thresholdNoir,
    thresholdUrban:           configuracoes.thresholdUrban,
    thresholdCoastal:         configuracoes.thresholdCoastal,
    prazoMaxExpedicaoHoras:   configuracoes.prazoMaxExpedicaoHoras,
  })

  // ── Estado: Tab 5 — APIs (localStorage) ──
  const [apiCreds, setApiCreds] = useState(() => {
    if (typeof window === 'undefined') return {
      metaToken: '', metaAdAccountId: '',
      googleClientId: '', googleClientSecret: '', googleRefreshToken: '', googleDevToken: '', googleCustomerId: '',
      tiktokToken: '', tiktokAdvertiserId: '',
    }
    try {
      return JSON.parse(localStorage.getItem('purion-api-creds') ?? '{}')
    } catch {
      return {}
    }
  })

  const setApi = (key: string, val: string) => setApiCreds((prev: Record<string, string>) => ({ ...prev, [key]: val }))
  const getApi = (key: string): string => (apiCreds as Record<string, string>)[key] ?? ''

  // Sync com store quando store mudar externamente
  useEffect(() => {
    setFinForm({
      margemLucro:          Math.round(configuracoes.margemLucro * 100),
      margemMinimaAlvo:     Math.round(configuracoes.margemMinimaAlvo * 100),
      alertaMargemAbaixoDe: Math.round(configuracoes.alertaMargemAbaixoDe * 100),
      splitEstoque:         Math.round(configuracoes.splitEstoque * 100),
      splitMarketing:       Math.round(configuracoes.splitMarketing * 100),
      splitCaixa:           Math.round(configuracoes.splitOperacional * 100),
      splitDesenvolvimento: Math.round(configuracoes.splitReserva * 100),
      splitSocietario:      Math.round(configuracoes.splitSocietario * 100),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers de save ──
  const salvarFinanceiro = () => {
    if (!splitOk) return
    setConfiguracoes({
      margemLucro:           finForm.margemLucro / 100,
      markupPadrao:          1 / (1 - finForm.margemLucro / 100),
      margemMinimaAlvo:      finForm.margemMinimaAlvo / 100,
      alertaMargemAbaixoDe:  finForm.alertaMargemAbaixoDe / 100,
      splitEstoque:          finForm.splitEstoque / 100,
      splitMarketing:        finForm.splitMarketing / 100,
      splitOperacional:      finForm.splitCaixa / 100,
      splitReserva:          finForm.splitDesenvolvimento / 100,
      splitSocietario:       finForm.splitSocietario / 100,
    })
    showToast('financeiro')
  }

  const salvarMetas = () => {
    setConfiguracoes(metasForm)
    showToast('metas')
  }

  const salvarAlertas = () => {
    setConfiguracoes(alertasForm)
    showToast('alertas')
  }

  const salvarEstoque = () => {
    setConfiguracoes(estoqueForm)
    // Sincroniza thresholds nos SKUs
    produtosSKU.forEach((sku) => {
      const threshold =
        sku.sku === 'noir'    ? estoqueForm.thresholdNoir :
        sku.sku === 'urban'   ? estoqueForm.thresholdUrban :
        estoqueForm.thresholdCoastal
      atualizarProdutoSKU(sku.id, { threshold })
    })
    showToast('estoque')
  }

  const salvarAPIs = () => {
    localStorage.setItem('purion-api-creds', JSON.stringify(apiCreds))
    showToast('apis')
  }

  // ── Export JSON ──
  const exportarJSON = () => {
    const dados = {
      exportadoEm: new Date().toISOString(),
      leads, receitas, despesas, tarefas, lotes, estoque,
      creators, campanhasAds, reunioes,
      produtosSKU, pedidosExpedicao, conteudosCalendario,
      dailyEntries, decisoes, configuracoes,
    }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `purion-os-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="page-content" style={{ maxWidth: '900px' }}>

      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Configurações</h1>
        <p className="caption mt-1">Regras financeiras, metas, alertas e integrações</p>
      </div>

      {/* Tab bar — desktop only, or mobile back header */}
      {isMobile && abaAtiva ? (
        <button
          onClick={() => setAbaAtiva(null)}
          className="flex items-center gap-2 text-sm text-[#C9A84C] mb-6"
        >
          <ChevronLeft size={16} />
          {TABS.find((t) => t.id === abaAtiva)?.label}
        </button>
      ) : !isMobile ? (
        <div className="tab-nav mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`tab-item ${abaAtiva === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Mobile list menu — shown when no tab selected */}
      {isMobile && !abaAtiva && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
            >
              <span className="text-sm text-[var(--text-primary)]">{tab.label}</span>
              <ChevronRightIcon size={16} className="text-[#A0A0A0]" />
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════
          TAB 1 — REGRAS FINANCEIRAS
      ════════════════════════════════════ */}
      {abaAtiva === 'financeiro' && (
        <div className="space-y-6">

          {/* Precificação */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Precificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputNum
                label="Markup padrão %"
                value={finForm.margemLucro}
                onChange={(v) => setFinForm({ ...finForm, margemLucro: v })}
                min={1} max={99} suffix="%"
                hint={`Markup efetivo: ${(1 / (1 - finForm.margemLucro / 100)).toFixed(2)}×`}
              />
              <InputNum
                label="Margem mínima alvo %"
                value={finForm.margemMinimaAlvo}
                onChange={(v) => setFinForm({ ...finForm, margemMinimaAlvo: v })}
                min={1} max={99} suffix="%"
              />
              <InputNum
                label="Alertar margem abaixo de %"
                value={finForm.alertaMargemAbaixoDe}
                onChange={(v) => setFinForm({ ...finForm, alertaMargemAbaixoDe: v })}
                min={1} max={99} suffix="%"
              />
            </div>
          </div>

          {/* Reinvestimento */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Reinvestimento do Lucro
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${splitOk ? 'text-emerald-400' : 'text-red-400'}`}>
                  Total: {totalSplit}%
                </span>
                {!splitOk && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400">
                    <AlertTriangle size={10} />
                    deve ser 100%
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'splitEstoque',        label: '% Estoque' },
                { key: 'splitMarketing',       label: '% Marketing' },
                { key: 'splitCaixa',           label: '% Caixa' },
                { key: 'splitDesenvolvimento', label: '% Desenvolvimento' },
                { key: 'splitSocietario',      label: '% Societário' },
              ].map(({ key, label }) => (
                <InputNum
                  key={key}
                  label={label}
                  value={(finForm as Record<string, number>)[key]}
                  onChange={(v) => setFinForm({ ...finForm, [key]: v })}
                  min={0} max={100} suffix="%"
                />
              ))}
            </div>
            {/* Barra visual do split */}
            <div className="mt-4 h-3 rounded-full overflow-hidden flex gap-0.5">
              {[
                { val: finForm.splitEstoque,        color: '#C9A84C' },
                { val: finForm.splitMarketing,       color: '#8B5CF6' },
                { val: finForm.splitCaixa,           color: '#3B82F6' },
                { val: finForm.splitDesenvolvimento, color: '#10B981' },
                { val: finForm.splitSocietario,      color: '#F59E0B' },
              ].map(({ val, color }, i) => (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{ width: `${val}%`, backgroundColor: color }}
                />
              ))}
              {totalSplit < 100 && (
                <div className="h-full flex-1 bg-[#2A2A2A]" />
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {[
                { label: 'Estoque', color: '#C9A84C',  val: finForm.splitEstoque },
                { label: 'Marketing', color: '#8B5CF6', val: finForm.splitMarketing },
                { label: 'Caixa', color: '#3B82F6',    val: finForm.splitCaixa },
                { label: 'Desenvolvimento', color: '#10B981', val: finForm.splitDesenvolvimento },
                { label: 'Societário', color: '#F59E0B', val: finForm.splitSocietario },
              ].map(({ label, color, val }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-[#B8B8B8]">{label} {val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <SalvoToast visivel={toast === 'financeiro'} />
            <button
              onClick={salvarFinanceiro}
              disabled={!splitOk}
              className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={13} />
              Salvar regras financeiras
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB 2 — METAS
      ════════════════════════════════════ */}
      {abaAtiva === 'metas' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Faturamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputNum
                label="Meta faturamento 90 dias"
                value={metasForm.metaFaturamento90Dias}
                onChange={(v) => setMetasForm({ ...metasForm, metaFaturamento90Dias: v })}
                prefix="R$" min={0} step={1000}
              />
              <InputNum
                label="Meta faturamento 12 meses"
                value={metasForm.metaFaturamento12Meses}
                onChange={(v) => setMetasForm({ ...metasForm, metaFaturamento12Meses: v })}
                prefix="R$" min={0} step={10000}
              />
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Crescimento Mensal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputNum
                label="Meta leads B2B / mês"
                value={metasForm.metaLeadsMes}
                onChange={(v) => setMetasForm({ ...metasForm, metaLeadsMes: v })}
                min={0}
              />
              <InputNum
                label="Meta creators / mês"
                value={metasForm.metaCreatorsMes}
                onChange={(v) => setMetasForm({ ...metasForm, metaCreatorsMes: v })}
                min={0}
              />
              <InputNum
                label="Meta vídeos / mês"
                value={metasForm.metaVideosMes}
                onChange={(v) => setMetasForm({ ...metasForm, metaVideosMes: v })}
                min={0}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <SalvoToast visivel={toast === 'metas'} />
            <button
              onClick={salvarMetas}
              className="btn btn-primary"
            >
              <Save size={13} />
              Salvar metas
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB 3 — ALERTAS DE TRÁFEGO
      ════════════════════════════════════ */}
      {abaAtiva === 'alertas' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Limites de Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputNum
                label="ROAS mínimo"
                value={alertasForm.roasMinimo}
                onChange={(v) => setAlertasForm({ ...alertasForm, roasMinimo: v })}
                min={0.1} step={0.1} suffix="×"
                hint="Alerta quando ROAS cair abaixo desse valor"
              />
              <InputNum
                label="CPA máximo"
                value={alertasForm.cpaMaximo}
                onChange={(v) => setAlertasForm({ ...alertasForm, cpaMaximo: v })}
                prefix="R$" min={1} step={5}
                hint="Custo por aquisição — alerta se ultrapassar"
              />
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Orçamento Diário Máximo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputNum
                label="Meta Ads (por dia)"
                value={alertasForm.orcamentoDiarioMeta}
                onChange={(v) => setAlertasForm({ ...alertasForm, orcamentoDiarioMeta: v })}
                prefix="R$" min={0} step={10}
              />
              <InputNum
                label="Google Ads (por dia)"
                value={alertasForm.orcamentoDiarioGoogle}
                onChange={(v) => setAlertasForm({ ...alertasForm, orcamentoDiarioGoogle: v })}
                prefix="R$" min={0} step={10}
              />
              <InputNum
                label="TikTok Ads (por dia)"
                value={alertasForm.orcamentoDiarioTikTok}
                onChange={(v) => setAlertasForm({ ...alertasForm, orcamentoDiarioTikTok: v })}
                prefix="R$" min={0} step={10}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <SalvoToast visivel={toast === 'alertas'} />
            <button
              onClick={salvarAlertas}
              className="btn btn-primary"
            >
              <Save size={13} />
              Salvar alertas
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB 4 — ESTOQUE
      ════════════════════════════════════ */}
      {abaAtiva === 'estoque' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Thresholds de Alerta por SKU</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputNum
                label="Threshold NOIR (un)"
                value={estoqueForm.thresholdNoir}
                onChange={(v) => setEstoqueForm({ ...estoqueForm, thresholdNoir: v })}
                min={0} suffix="un"
                hint="Badge vermelho se estoque abaixo desse valor"
              />
              <InputNum
                label="Threshold URBAN (un)"
                value={estoqueForm.thresholdUrban}
                onChange={(v) => setEstoqueForm({ ...estoqueForm, thresholdUrban: v })}
                min={0} suffix="un"
                hint="Badge vermelho se estoque abaixo desse valor"
              />
              <InputNum
                label="Threshold COASTAL (un)"
                value={estoqueForm.thresholdCoastal}
                onChange={(v) => setEstoqueForm({ ...estoqueForm, thresholdCoastal: v })}
                min={0} suffix="un"
                hint="Badge vermelho se estoque abaixo desse valor"
              />
            </div>
            {/* Preview visual dos SKUs */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {produtosSKU.map((sku) => {
                const threshold =
                  sku.sku === 'noir'    ? estoqueForm.thresholdNoir :
                  sku.sku === 'urban'   ? estoqueForm.thresholdUrban :
                  estoqueForm.thresholdCoastal
                const alerta = sku.unidades < threshold
                return (
                  <div
                    key={sku.id}
                    className={`bg-[var(--bg-surface-2)] border rounded-lg p-3 ${alerta ? 'border-red-500/40' : 'border-[var(--border)]'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-[#C9A84C] tracking-widest">
                        {sku.sku.toUpperCase()}
                      </span>
                      {alerta && (
                        <span className="text-[9px] font-bold text-red-400">ALERTA</span>
                      )}
                    </div>
                    <p className={`text-xl font-black ${alerta ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                      {sku.unidades}
                    </p>
                    <p className="text-[9px] text-[#A0A0A0]">mín {threshold} un</p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Expedição</h3>
            <div className="max-w-xs">
              <InputNum
                label="Prazo máximo de expedição (horas)"
                value={estoqueForm.prazoMaxExpedicaoHoras}
                onChange={(v) => setEstoqueForm({ ...estoqueForm, prazoMaxExpedicaoHoras: v })}
                min={1} suffix="h"
                hint="SLA padrão para novos pedidos. Badge vermelho na sidebar se houver expirado."
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <SalvoToast visivel={toast === 'estoque'} />
            <button
              onClick={salvarEstoque}
              className="btn btn-primary"
            >
              <Save size={13} />
              Salvar estoque
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB 5 — APIs
      ════════════════════════════════════ */}
      {abaAtiva === 'apis' && (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">
              Integração ativa será configurada na próxima sessão. Os campos abaixo são
              preparatórios — as credenciais são salvas apenas no <strong>localStorage</strong> do seu navegador.
            </p>
          </div>

          {/* Meta Ads */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-[8px] font-black text-white">f</span>
              </div>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Meta Ads</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputPwd label="Access Token" value={getApi('metaToken')} onChange={(v) => setApi('metaToken', v)} />
              <InputPwd label="Ad Account ID" value={getApi('metaAdAccountId')} onChange={(v) => setApi('metaAdAccountId', v)} placeholder="act_XXXXXXXXXXXXXXXX" />
            </div>
          </div>

          {/* Google Ads */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded bg-red-500 flex items-center justify-center">
                <span className="text-[8px] font-black text-white">G</span>
              </div>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Google Ads</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputPwd label="Client ID" value={getApi('googleClientId')} onChange={(v) => setApi('googleClientId', v)} />
              <InputPwd label="Client Secret" value={getApi('googleClientSecret')} onChange={(v) => setApi('googleClientSecret', v)} />
              <InputPwd label="Refresh Token" value={getApi('googleRefreshToken')} onChange={(v) => setApi('googleRefreshToken', v)} />
              <InputPwd label="Developer Token" value={getApi('googleDevToken')} onChange={(v) => setApi('googleDevToken', v)} />
              <InputPwd label="Customer ID" value={getApi('googleCustomerId')} onChange={(v) => setApi('googleCustomerId', v)} placeholder="XXX-XXX-XXXX" />
            </div>
          </div>

          {/* TikTok Ads */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded bg-[var(--bg-surface)] border border-[#3A3A3A] flex items-center justify-center">
                <span className="text-[8px] font-black text-[var(--text-primary)]">TT</span>
              </div>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">TikTok Ads</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputPwd label="Access Token" value={getApi('tiktokToken')} onChange={(v) => setApi('tiktokToken', v)} />
              <InputPwd label="Advertiser ID" value={getApi('tiktokAdvertiserId')} onChange={(v) => setApi('tiktokAdvertiserId', v)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <SalvoToast visivel={toast === 'apis'} />
            <button
              onClick={salvarAPIs}
              className="btn btn-primary"
            >
              <Save size={13} />
              Salvar credenciais
            </button>
          </div>
        </div>
      )}

      {/* ── Rodapé — Export JSON ── */}
      <div className="mt-10 pt-6 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-[#B8B8B8]">Exportar todos os dados do PURION OS em formato JSON.</p>
          <p className="text-[10px] text-[#A0A0A0] mt-0.5">
            Inclui leads, financeiro, tarefas, produção, marketing, reuniões e configurações.
          </p>
        </div>
        <button
          onClick={exportarJSON}
          className="btn btn-secondary"
        >
          <Download size={13} />
          Exportar todos os dados (JSON)
        </button>
      </div>
    </div>
  )
}
