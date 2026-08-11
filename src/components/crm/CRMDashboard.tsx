'use client'

/**
 * PURION OS — CRM B2B
 * Pipeline de vendas estilo Asana: 5 visões (Quadro, Lista, Funil, Calendário, Painel),
 * drawer lateral com ações rápidas, alerta D+21 de reposição e filtros avançados.
 */

import { useState, useMemo, useEffect } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Lead, StatusLead, TierLead } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { useCRM } from '@/hooks/useCRM'
import { useIsMaster } from '@/hooks/useIsMaster'
import { useBulkActions } from '@/hooks/useBulkActions'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { BulkActionsBar } from '@/components/ui/BulkActionsBar'
import { useToast } from '@/components/ui/Toast'

import { CRMQuadroView } from './CRMQuadroView'
import { CRMListaView, type LeadGroupBy } from './CRMListaView'
import { CRMCalendarioView } from './CRMCalendarioView'
import { CRMPainelView } from './CRMPainelView'
import { CRMLeadDrawer } from './CRMLeadDrawer'
import { CRMFiltrosBar, FILTROS_CRM_VAZIOS, aplicarFiltrosCRM, type FiltrosCRM } from './CRMFiltrosBar'
import { CRMModalNovaLead } from './CRMModalNovaLead'
import { FunilB2B } from './FunilB2B'
import { ESTAGIOS } from './crmHelpers'

type Visao = 'quadro' | 'lista' | 'funil' | 'calendario' | 'painel'

const TABS = [
  { id: 'quadro',     label: 'Quadro'     },
  { id: 'lista',      label: 'Lista'      },
  { id: 'funil',      label: 'Funil'      },
  { id: 'calendario', label: 'Calendário' },
  { id: 'painel',     label: 'Painel'     },
]

const VISOES_VALIDAS: Visao[] = ['quadro', 'lista', 'funil', 'calendario', 'painel']

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'quadro'
  const v = localStorage.getItem('purion:view:crm-pipeline')
  return VISOES_VALIDAS.includes(v as Visao) ? (v as Visao) : 'quadro'
}

export function CRMDashboard() {
  const isMobile = useMobile()
  const { leads, perfilAtivo } = usePurionStore()
  const { adicionarLead, atualizarLead, deletarLead } = useCRM()
  const { isMaster } = useIsMaster()
  const { success } = useToast()

  const [visao, setVisao] = useState<Visao>('quadro')
  const [filtros, setFiltros] = useState<FiltrosCRM>(FILTROS_CRM_VAZIOS)
  const [groupBy, setGroupBy] = useState<LeadGroupBy>('estagio')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [modalNovaAberto, setModalNovaAberto] = useState(false)
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null)
  const [deletandoLead, setDeletandoLead] = useState<Lead | null>(null)

  // ── Seleção em massa (visão Quadro) ──
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [confirmArquivarMassa, setConfirmArquivarMassa] = useState(false)
  const [confirmExcluirMassa, setConfirmExcluirMassa] = useState(false)
  const { bulkArchive, bulkHardDelete, isProcessing: isProcessingMassa } = useBulkActions({
    table: 'leads_crm', itemLabelSingular: 'lead', itemLabelPlural: 'leads',
  })

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: string) {
    setVisao(v as Visao)
    if (typeof window !== 'undefined') localStorage.setItem('purion:view:crm-pipeline', v)
  }

  const leadsFiltrados = useMemo(() => aplicarFiltrosCRM(leads, filtros), [leads, filtros])
  const leadSelecionado = useMemo(() => leads.find((l) => l.id === leadSelecionadoId) ?? null, [leads, leadSelecionadoId])
  const filtrosAtivosCount = Object.entries(filtros).filter(
    ([k, v]) => v !== FILTROS_CRM_VAZIOS[k as keyof FiltrosCRM]
  ).length

  function toggleSel(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleArquivarMassa() {
    const ids = Array.from(selecionados)
    const ok = await bulkArchive(ids)
    if (ok) {
      const store = usePurionStore.getState()
      store.setLeads(store.leads.filter((l) => !selecionados.has(l.id)))
      setSelecionados(new Set())
    }
    setConfirmArquivarMassa(false)
  }

  async function handleExcluirMassa() {
    const ids = Array.from(selecionados)
    const ok = await bulkHardDelete(ids)
    if (ok) {
      const store = usePurionStore.getState()
      store.setLeads(store.leads.filter((l) => !selecionados.has(l.id)))
      setSelecionados(new Set())
    }
    setConfirmExcluirMassa(false)
  }

  function handleMudarEstagio(id: string, status: StatusLead) {
    atualizarLead(id, { status })
  }

  function handleMudarTier(id: string, tier: TierLead) {
    atualizarLead(id, { tier })
  }

  function handleAgendarPasso(id: string, data: string, acao?: string) {
    atualizarLead(id, { proximoPassoData: data, ...(acao !== undefined && { proximoPassoAcao: acao }) })
    success('Follow-up agendado')
  }

  function handleRegistrarContato(texto: string) {
    if (!leadSelecionadoId || !leadSelecionado) return
    const interacao = { id: `int-${Date.now()}`, texto, timestamp: new Date().toLocaleString('pt-BR') }
    atualizarLead(leadSelecionadoId, {
      historicoInteracoes: [...(leadSelecionado.historicoInteracoes ?? []), interacao],
      updatedAt: new Date().toISOString(),
    })
    success('Contato registrado')
  }

  const px = isMobile ? 14 : 24

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: `16px ${px}px 0`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              CRM B2B — Pipeline
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              {leadsFiltrados.length} lead{leadsFiltrados.length !== 1 ? 's' : ''} · Máquina de Vendas
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setFiltrosAbertos((o) => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: isMobile ? 34 : 32, padding: '0 12px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${filtrosAtivosCount > 0 ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                background: filtrosAtivosCount > 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
                color: filtrosAtivosCount > 0 ? '#C9A84C' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={13} />
              {!isMobile && 'Filtrar'}
              {filtrosAtivosCount > 0 && (
                <span style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                  {filtrosAtivosCount}
                </span>
              )}
            </button>

            {visao === 'lista' && !isMobile && (
              <select
                className="select-purion"
                style={{ width: 'auto', height: 32 }}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as LeadGroupBy)}
              >
                <option value="estagio">Agrupar por estágio</option>
                <option value="tier">Agrupar por tier</option>
                <option value="none">Sem agrupamento</option>
              </select>
            )}

            <button
              onClick={() => setModalNovaAberto(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: isMobile ? 34 : 32, padding: '0 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: '#C9A84C', color: '#0D0D0D', border: 'none', cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              {!isMobile && 'Nova lead'}
            </button>
          </div>
        </div>

        {/* ── Abas de visão ── */}
        {isMobile ? (
          <select
            className="select-purion"
            style={{ width: '100%', marginBottom: 10 }}
            value={visao}
            onChange={(e) => mudarVisao(e.target.value)}
          >
            {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        ) : (
          <InnerTabs tabs={TABS} activeTab={visao} onChange={mudarVisao} />
        )}
      </div>

      {/* ── Filtros (desktop inline) ── */}
      {filtrosAbertos && !isMobile && (
        <div style={{ padding: '12px 24px', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <CRMFiltrosBar leads={leads} filtros={filtros} onChange={setFiltros} />
        </div>
      )}

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {visao === 'quadro' && (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: `14px ${px}px` }}>
            <CRMQuadroView
              leads={leadsFiltrados}
              selecionados={selecionados}
              onAbrirLead={setLeadSelecionadoId}
              onToggleSel={toggleSel}
              onMudarEstagio={handleMudarEstagio}
            />
          </div>
        )}

        {visao === 'lista' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `14px ${px}px ${isMobile ? 90 : 16}px` }}>
            <CRMListaView
              leads={leadsFiltrados}
              groupBy={isMobile ? 'estagio' : groupBy}
              onAbrirLead={setLeadSelecionadoId}
              onMudarEstagio={handleMudarEstagio}
              onMudarTier={handleMudarTier}
            />
          </div>
        )}

        {visao === 'funil' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `14px ${px}px ${isMobile ? 90 : 16}px` }}>
            <FunilB2B />
          </div>
        )}

        {visao === 'calendario' && (
          <CRMCalendarioView
            leads={leadsFiltrados}
            onAbrirLead={setLeadSelecionadoId}
            onAgendarPasso={(id, data) => handleAgendarPasso(id, data)}
          />
        )}

        {visao === 'painel' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `14px ${px}px ${isMobile ? 90 : 16}px` }}>
            <CRMPainelView leads={leadsFiltrados} onAbrirLead={setLeadSelecionadoId} />
          </div>
        )}
      </div>

      {/* ── Filtros mobile (bottom sheet) ── */}
      <BottomSheet open={filtrosAbertos && isMobile} onClose={() => setFiltrosAbertos(false)} title="Filtros">
        <CRMFiltrosBar leads={leads} filtros={filtros} onChange={setFiltros} />
      </BottomSheet>

      {/* ── Modal nova lead ── */}
      {modalNovaAberto && (
        <CRMModalNovaLead
          perfilAtivo={perfilAtivo}
          onCriar={adicionarLead}
          onFechar={() => setModalNovaAberto(false)}
        />
      )}

      {/* ── Drawer lateral ── */}
      {leadSelecionado && !isMobile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 backdrop-blur-[2px]" onClick={() => setLeadSelecionadoId(null)} />
          <div className="fixed top-0 right-0 h-full w-[420px] z-40 bg-[var(--bg-surface-2)] border-l border-[var(--border)] shadow-2xl flex flex-col">
            <CRMLeadDrawer
              lead={leadSelecionado}
              onClose={() => setLeadSelecionadoId(null)}
              onSalvarNotas={(notas) => { atualizarLead(leadSelecionado.id, { notas }); success('Notas salvas') }}
              onRegistrarContato={handleRegistrarContato}
              onMudarEstagio={(status) => handleMudarEstagio(leadSelecionado.id, status)}
              onMudarTier={(tier) => handleMudarTier(leadSelecionado.id, tier)}
              onAgendarPasso={(data, acao) => handleAgendarPasso(leadSelecionado.id, data, acao)}
              onDeletar={(l) => setDeletandoLead(l)}
            />
          </div>
        </>
      )}

      <BottomSheet open={!!leadSelecionado && isMobile} onClose={() => setLeadSelecionadoId(null)} title={leadSelecionado?.nomeEmpresa}>
        {leadSelecionado && (
          <CRMLeadDrawer
            lead={leadSelecionado}
            onClose={() => setLeadSelecionadoId(null)}
            onSalvarNotas={(notas) => { atualizarLead(leadSelecionado.id, { notas }); success('Notas salvas') }}
            onRegistrarContato={handleRegistrarContato}
            onMudarEstagio={(status) => handleMudarEstagio(leadSelecionado.id, status)}
            onMudarTier={(tier) => handleMudarTier(leadSelecionado.id, tier)}
            onAgendarPasso={(data, acao) => handleAgendarPasso(leadSelecionado.id, data, acao)}
            onDeletar={(l) => setDeletandoLead(l)}
          />
        )}
      </BottomSheet>

      {/* ── Bulk actions (visão Quadro) ── */}
      {visao === 'quadro' && (
        <BulkActionsBar
          selecionados={selecionados.size}
          total={leadsFiltrados.length}
          onLimpar={() => setSelecionados(new Set())}
          onArquivar={() => setConfirmArquivarMassa(true)}
          onExcluirPermanente={isMaster ? () => setConfirmExcluirMassa(true) : undefined}
          processando={isProcessingMassa}
          campos={[
            {
              key: 'status', label: 'Mudar estágio',
              options: ESTAGIOS.map((e) => ({ value: e.id, label: e.label })),
              onAplicar: (status) => {
                Array.from(selecionados).forEach((id) => atualizarLead(id, { status: status as StatusLead }))
                setSelecionados(new Set())
              },
            },
          ]}
        />
      )}

      <ConfirmModal
        open={confirmArquivarMassa}
        title="Arquivar leads"
        message={`Arquivar ${selecionados.size} lead${selecionados.size !== 1 ? 's' : ''}? Você pode restaurar na aba Arquivados.`}
        confirmLabel="Arquivar"
        onConfirm={handleArquivarMassa}
        onCancel={() => setConfirmArquivarMassa(false)}
        danger={false}
      />

      <ConfirmModal
        open={confirmExcluirMassa}
        title="Excluir permanentemente"
        message={`Excluir ${selecionados.size} lead${selecionados.size !== 1 ? 's' : ''} definitivamente? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
        confirmText="CONFIRMAR"
        onConfirm={handleExcluirMassa}
        onCancel={() => setConfirmExcluirMassa(false)}
        danger
      />

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
