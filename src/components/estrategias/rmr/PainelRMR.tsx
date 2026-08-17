'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, History, Target } from 'lucide-react'
import { useEstrategiaRoadmap, type EstrategiaObjetivo } from '@/hooks/useEstrategia'
import {
  useMedicoesMensais, useRMR, percentualMedicao, corPercentual, percentualPonderado,
} from '@/hooks/useMetaG4'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import { PRIORIDADE_COR, PRIORIDADE_LABEL_CURTO } from '../metas/metasHelpers'

const MESES_NOME_COMPLETO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type FiltroFaixa = 'todas' | '100' | '80' | '60' | 'abaixo60'

const FILTROS: Array<{ id: FiltroFaixa; label: string }> = [
  { id: 'todas',    label: 'Todas' },
  { id: '100',      label: '100%' },
  { id: '80',       label: '>=80%' },
  { id: '60',       label: '>=60%' },
  { id: 'abaixo60', label: '<60%' },
]

function passaFiltro(pct: number | null, filtro: FiltroFaixa): boolean {
  if (filtro === 'todas') return true
  if (pct == null) return filtro === 'abaixo60'
  if (filtro === '100') return pct >= 100
  if (filtro === '80') return pct >= 80
  if (filtro === '60') return pct >= 60
  return pct < 60
}

export function PainelRMR() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [filtro, setFiltro] = useState<FiltroFaixa>('todas')
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  const { objetivos, carregando: carregandoObjetivos } = useEstrategiaRoadmap()
  const { medicaoDoMes, registrarMedicao, carregando: carregandoMedicoes } = useMedicoesMensais(ano)
  const { reunioes, salvarRMR, concluirRMR, reuniaoDoMes } = useRMR()

  const objetivosTopo = useMemo(() => objetivos.filter((o) => !o.parentId), [objetivos])
  const reuniaoAtual = reuniaoDoMes(ano, mes)

  const percentualGeral = useMemo(
    () => percentualPonderado(objetivosTopo, (id) => percentualMedicao(medicaoDoMes(id, mes))),
    [objetivosTopo, medicaoDoMes, mes]
  )

  const [resumo, setResumo] = useState(reuniaoAtual?.resumo ?? '')
  const [gargalo, setGargalo] = useState(reuniaoAtual?.gargaloPrincipal ?? '')
  const [decisao, setDecisao] = useState(reuniaoAtual?.decisao ?? '')

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
    const r = reuniaoDoMes(novoAno, novoMes)
    setResumo(r?.resumo ?? '')
    setGargalo(r?.gargaloPrincipal ?? '')
    setDecisao(r?.decisao ?? '')
  }

  function irParaHistorico(a: number, m: number) {
    setAno(a); setMes(m)
    const r = reuniaoDoMes(a, m)
    setResumo(r?.resumo ?? '')
    setGargalo(r?.gargaloPrincipal ?? '')
    setDecisao(r?.decisao ?? '')
    setMostrarHistorico(false)
  }

  const porResponsavel = useMemo(() => {
    return SOCIOS.map((s) => {
      const metas = objetivosTopo
        .filter((o) => o.responsavel === s.id)
        .map((o) => ({ objetivo: o, pct: percentualMedicao(medicaoDoMes(o.id, mes)) }))
        .filter((item) => passaFiltro(item.pct, filtro))
        .sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1)) // piores primeiro — foco no que precisa de atenção
      return { socio: s, metas }
    }).filter((g) => g.metas.length > 0)
  }, [objetivosTopo, medicaoDoMes, mes, filtro])

  async function salvarCampoReuniao(campo: 'resumo' | 'gargaloPrincipal' | 'decisao', valor: string) {
    await salvarRMR(ano, mes, { [campo]: valor.trim() || null })
  }

  async function salvarObservacaoMeta(objetivo: EstrategiaObjetivo, observacao: string) {
    const existente = medicaoDoMes(objetivo.id, mes)
    await registrarMedicao({
      objetivoId: objetivo.id,
      ano, mes,
      valorMeta: existente?.valorMeta ?? null,
      valorRealizado: existente?.valorRealizado ?? null,
      observacao: observacao.trim() || null,
    })
  }

  async function handleConcluir() {
    if (!window.confirm(`Concluir a RMR de ${MESES_NOME_COMPLETO[mes - 1]}/${ano}? Isso salva o snapshot do percentual geral (${percentualGeral ?? '—'}%).`)) return
    await concluirRMR(ano, mes, percentualGeral)
  }

  const carregando = carregandoObjetivos || carregandoMedicoes

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando RMR…</p></div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: navegação de mês + percentual geral */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="icon-btn"><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
            {MESES_NOME_COMPLETO[mes - 1]} / {ano}
          </span>
          <button onClick={() => mudarMes(1)} className="icon-btn"><ChevronRight size={14} /></button>
          {reuniaoAtual?.concluida && (
            <span className="badge badge-success flex items-center gap-1"><CheckCircle2 size={10} /> RMR concluída</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMostrarHistorico((v) => !v)} className="btn btn-secondary btn-sm">
            <History size={12} /> Histórico
          </button>
          <div className="text-right">
            <p className="kpi-label mb-0.5">Percentual geral (ponderado)</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: corPercentual(percentualGeral) }}>
              {percentualGeral != null ? `${percentualGeral}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {mostrarHistorico && (
        <div className="card-purion" style={{ padding: '12px 16px' }}>
          <p className="kpi-label mb-2">RMRs anteriores</p>
          {reunioes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nenhuma RMR registrada ainda.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {reunioes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => irParaHistorico(r.ano, r.mes)}
                  className="flex items-center justify-between"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, textAlign: 'left' }}
                >
                  <span style={{ fontSize: 12 }}>{MESES_NOME_COMPLETO[r.mes - 1]}/{r.ano}</span>
                  <span className="flex items-center gap-2">
                    {r.percentualGeral != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: corPercentual(r.percentualGeral) }}>{r.percentualGeral}%</span>
                    )}
                    {r.concluida ? <CheckCircle2 size={12} style={{ color: '#22C55E' }} /> : <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>rascunho</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtro rápido por faixa */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className="btn btn-sm"
            style={filtro === f.id
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
              : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de metas por responsável, piores primeiro */}
      {objetivosTopo.length === 0 ? (
        <div className="empty-state">
          <Target size={36} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma meta cadastrada</p>
          <p className="empty-state-subtitle">Cadastre metas com peso na aba Metas para acompanhar a RMR.</p>
        </div>
      ) : porResponsavel.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma meta nessa faixa</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {porResponsavel.map(({ socio, metas }) => (
            <div key={socio.id} className="card-purion" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ padding: '10px 14px', background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                }}>
                  {socio.inicial}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{socio.nome}</span>
              </div>
              <div className="flex flex-col">
                {metas.map(({ objetivo, pct }) => (
                  <LinhaMetaRMR
                    key={objetivo.id}
                    objetivo={objetivo}
                    pct={pct}
                    observacao={medicaoDoMes(objetivo.id, mes)?.observacao ?? ''}
                    onSalvarObservacao={(obs) => salvarObservacaoMeta(objetivo, obs)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campos da reunião */}
      <div className="card-purion" style={{ padding: '16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Reunião Mensal de Resultados</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Resumo / ata</label>
            <textarea
              className="input-purion w-full" rows={3}
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              onBlur={() => salvarCampoReuniao('resumo', resumo)}
              placeholder="O que aconteceu no mês, principais destaques…"
            />
          </div>
          <div>
            <label className="kpi-label mb-1 block flex items-center gap-1.5">
              <AlertTriangle size={11} style={{ color: '#E85238' }} /> Gargalo principal do ciclo
            </label>
            <input
              className="input-purion w-full"
              value={gargalo}
              onChange={(e) => setGargalo(e.target.value)}
              onBlur={() => salvarCampoReuniao('gargaloPrincipal', gargalo)}
              placeholder="O único maior obstáculo do mês"
            />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Decisão do ciclo</label>
            <textarea
              className="input-purion w-full" rows={2}
              value={decisao}
              onChange={(e) => setDecisao(e.target.value)}
              onBlur={() => salvarCampoReuniao('decisao', decisao)}
              placeholder="O que foi decidido para o próximo ciclo"
            />
          </div>
          <div className="flex justify-end">
            {reuniaoAtual?.concluida ? (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Concluída em {reuniaoAtual.concluidaEm ? new Date(reuniaoAtual.concluidaEm).toLocaleDateString('pt-BR') : '—'}
              </span>
            ) : (
              <button onClick={handleConcluir} className="btn btn-primary btn-sm">
                <CheckCircle2 size={12} /> Concluir RMR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LinhaMetaRMR({ objetivo, pct, observacao, onSalvarObservacao }: {
  objetivo: EstrategiaObjetivo
  pct: number | null
  observacao: string
  onSalvarObservacao: (obs: string) => void
}) {
  const [texto, setTexto] = useState(observacao)
  const cor = corPercentual(pct)

  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
            background: `${PRIORIDADE_COR[objetivo.prioridade]}20`, color: PRIORIDADE_COR[objetivo.prioridade], flexShrink: 0,
          }}>
            {PRIORIDADE_LABEL_CURTO[objetivo.prioridade]}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objetivo.titulo}</span>
          {objetivo.peso > 0 && <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>peso {objetivo.peso}%</span>}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
          background: `${cor}20`, color: cor,
        }}>
          {pct != null ? `${pct}%` : 'sem dados'}
        </span>
      </div>
      <textarea
        className="input-purion w-full"
        rows={1}
        style={{ fontSize: 12, minHeight: 32 }}
        placeholder="Nota do mês — o que causou, plano de ação…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto !== observacao) onSalvarObservacao(texto) }}
      />
    </div>
  )
}
