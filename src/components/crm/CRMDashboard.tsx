'use client'

/**
 * PURION OS — CRM B2B
 * Pipeline de vendas estilo Asana: 5 visões (Quadro, Lista, Funil, Calendário, Painel),
 * drawer lateral com ações rápidas, alerta D+21 de reposição e filtros avançados.
 */

import { useState, useMemo, useEffect } from 'react'
import { Plus, SlidersHorizontal, Columns3, List, Filter, CalendarDays, BarChart3, Archive } from 'lucide-react'
import { Segmentado } from '@/components/ui/Segmentado'
import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import { formatarMoeda } from '@/lib/calculos'
import { usePurionStore } from '@/store'
import type { Lead, StatusLead, TierLead } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
import { ESTAGIOS, ESTAGIOS_ATIVOS, ESTAGIOS_GANHOS, estagioNormalizado } from './crmHelpers'

type Visao = 'quadro' | 'lista' | 'funil' | 'calendario' | 'painel'

const TABS: ReadonlyArray<{ id: Visao; label: string; icon: typeof List }> = [
  { id: 'quadro',     label: 'Quadro',     icon: Columns3 },
  { id: 'lista',      label: 'Lista',      icon: List },
  { id: 'funil',      label: 'Funil',      icon: Filter },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'painel',     label: 'Painel',     icon: BarChart3 },
]

const VISOES_VALIDAS: Visao[] = ['quadro', 'lista', 'funil', 'calendario', 'painel']

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'quadro'
  const v = localStorage.getItem('purion:view:crm-pipeline')
  return VISOES_VALIDAS.includes(v as Visao) ? (v as Visao) : 'quadro'
}

export function CRMDashboard({ onVerArquivados }: { onVerArquivados?: () => void } = {}) {
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

  function mudarVisao(v: Visao) {
    setVisao(v)
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

  const px = isMobile ? 14 : 32

  // ── Números do pipeline (sempre da base inteira; clicar aplica o filtro correspondente) ──
  const metricas = useMemo<MetricaFaixa[]>(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const ativos = leads.filter((l) => ESTAGIOS_ATIVOS.includes(estagioNormalizado(l.status)))
    const ganhos = leads.filter((l) => ESTAGIOS_GANHOS.includes(estagioNormalizado(l.status)))
    const abertos = leads.filter((l) => estagioNormalizado(l.status) !== 'perdido')
    const fuHoje = abertos.filter((l) => l.proximoPassoData?.slice(0, 10) === hoje).length
    const fuAtrasado = abertos.filter((l) => l.proximoPassoData && l.proximoPassoData.slice(0, 10) < hoje).length
    const reposicao = ganhos.filter((l) => {
      const dias = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000)
      return dias >= 14 && dias <= 35
    }).length
    const potencial = ativos.reduce((s, l) => s + (l.valorMedioMensal || 0), 0)
    const recorrente = ganhos.reduce((s, l) => s + (l.valorMedioMensal || 0), 0)
    const alternarFollowUp = (v: 'hoje' | 'atrasado') => setFiltros((f) => ({ ...f, followUp: f.followUp === v ? 'todos' : v }))
    return [
      { label: 'Em negociação', valor: ativos.length, sub: `${formatarMoeda(potencial)}/mês em potencial`, dica: 'Leads de Prospecto a Oportunidade. Potencial = soma do valor médio mensal estimado.' },
      { label: 'Parceiros ativos', valor: ganhos.length, sub: `${formatarMoeda(recorrente)}/mês estimado`, dica: 'Leads em Cliente ou Recorrente.' },
      { label: 'Follow-up hoje', valor: fuHoje, sub: 'clique para filtrar', onClick: () => alternarFollowUp('hoje'), ativo: filtros.followUp === 'hoje' },
      { label: 'Follow-up atrasado', valor: fuAtrasado, sub: 'clique para filtrar', tom: fuAtrasado > 0 ? 'danger' : undefined, onClick: () => alternarFollowUp('atrasado'), ativo: filtros.followUp === 'atrasado' },
      { label: 'Reposição a oferecer', valor: reposicao, sub: 'parceiros entre D+14 e D+35', tom: reposicao > 0 ? 'warning' : undefined, dica: 'Parceiros cujo último movimento foi há 14–35 dias: hora de oferecer reposição (alvo D+21).' },
    ]
  }, [leads, filtros.followUp])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Cabeçalho: título, visão e ações em UMA linha ── */}
      <div style={{ padding: `${isMobile ? 14 : 24}px ${px}px 0`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="toolbar">
          <div style={{ marginRight: 8 }}>
            <h1 className="page-title">CRM B2B</h1>
          </div>
          <span className="caption tnum">
            {leadsFiltrados.length} lead{leadsFiltrados.length !== 1 ? 's' : ''}{filtrosAtivosCount > 0 ? ' no filtro' : ''}
          </span>
          <span className="toolbar-espaco" />

          {visao === 'lista' && !isMobile && (
            <select className="filtro" value={groupBy} onChange={(e) => setGroupBy(e.target.value as LeadGroupBy)} aria-label="Agrupar por">
              <option value="estagio">Agrupar: estágio</option>
              <option value="tier">Agrupar: tier</option>
              <option value="none">Sem agrupar</option>
            </select>
          )}
          <button
            onClick={() => setFiltrosAbertos((o) => !o)}
            className="btn btn-secondary btn-sm" aria-expanded={filtrosAbertos}
            style={filtrosAtivosCount > 0 ? { borderColor: 'color-mix(in srgb, var(--foreground) 45%, transparent)' } : undefined}
          >
            <SlidersHorizontal size={13} />
            {!isMobile && 'Filtros'}
            {filtrosAtivosCount > 0 && (
              <span className="tnum" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>
                {filtrosAtivosCount}
              </span>
            )}
          </button>
          {onVerArquivados && !isMobile && (
            <button onClick={onVerArquivados} className="btn btn-ghost btn-sm" title="Leads arquivados">
              <Archive size={13} /> Arquivados
            </button>
          )}
          <button onClick={() => setModalNovaAberto(true)} className="btn btn-accent btn-sm">
            <Plus size={14} />
            {!isMobile && 'Nova lead'}
          </button>
        </div>

        {!isMobile && <MetricStrip metricas={metricas} rotulo="Resumo do pipeline" />}

        <div className="toolbar" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <Segmentado
            rotulo="Visão" valor={visao} onChange={mudarVisao}
            opcoes={isMobile ? TABS.map((t) => ({ id: t.id, label: '', icon: t.icon })) : TABS}
          />
        </div>
      </div>

      {/* ── Filtros (desktop inline) ── */}
      {filtrosAbertos && !isMobile && (
        <div style={{ padding: '12px 32px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
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
