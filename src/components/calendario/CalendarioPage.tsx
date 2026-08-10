'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import type { EventoCalendario, TipoEvento, PerfilUsuario } from '@/store'
import { useEventosCalendario } from '@/hooks/useEventosCalendario'
import { VisaoMes } from './VisaoMes'
import { VisaoSemana } from './VisaoSemana'
import { VisaoAgenda } from './VisaoAgenda'
import { Proximos7Dias } from './Proximos7Dias'
import { ModalEvento, type DadosEvento } from './ModalEvento'
import {
  TIPO_EVENTO_LABEL, COR_TIPO_EVENTO, RESPONSAVEIS,
  formatarMesAno, addDays, addMonths, subMonths,
} from './calendarioHelpers'

type Visao = 'mes' | 'semana' | 'agenda'

interface GoogleStatus {
  configurado: boolean
  link: string | null
}

export function CalendarioPage() {
  const { eventos, criarEvento, atualizarEvento, deletarEvento, syncGoogle } = useEventosCalendario()

  const [visao, setVisao] = useState<Visao>('mes')
  const [referencia, setReferencia] = useState(new Date())
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | 'todos'>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<PerfilUsuario | 'todos'>('todos')
  const [modalDia, setModalDia] = useState<Date | null>(null)
  const [modalEvento, setModalEvento] = useState<EventoCalendario | null>(null)
  const [criandoNovo, setCriandoNovo] = useState(false)
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)

  useEffect(() => {
    fetch('/api/calendar/link')
      .then((r) => r.json())
      .then((json) => setGoogleStatus({ configurado: !!json.configurado, link: json.link ?? null }))
      .catch(() => setGoogleStatus({ configurado: false, link: null }))
  }, [])

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) => {
      if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false
      if (filtroResponsavel !== 'todos' && e.responsavel !== filtroResponsavel) return false
      return true
    })
  }, [eventos, filtroTipo, filtroResponsavel])

  function irParaHoje() { setReferencia(new Date()) }
  function anterior() { setReferencia((d) => visao === 'semana' ? addDays(d, -7) : subMonths(d, 1)) }
  function proximo() { setReferencia((d) => visao === 'semana' ? addDays(d, 7) : addMonths(d, 1)) }

  function abrirDia(dia: Date) {
    setModalDia(dia)
    setModalEvento(null)
    setCriandoNovo(true)
  }

  function abrirEvento(evento: EventoCalendario) {
    setModalEvento(evento)
    setModalDia(new Date(evento.dataInicio))
    setCriandoNovo(false)
  }

  function fecharModal() {
    setModalDia(null)
    setModalEvento(null)
    setCriandoNovo(false)
  }

  async function salvar(dados: DadosEvento) {
    if (modalEvento && !modalEvento.virtual) {
      await atualizarEvento(modalEvento.id, dados)
    } else {
      await criarEvento(dados)
    }
    fecharModal()
  }

  async function excluir() {
    if (modalEvento && !modalEvento.virtual) {
      await deletarEvento(modalEvento.id)
      fecharModal()
    }
  }

  return (
    <div className="page-content section-gap">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="caption mt-1">Reuniões, prazos, follow-ups B2B e datas importantes num só lugar</p>
        </div>
        <button onClick={() => { setModalDia(new Date()); setModalEvento(null); setCriandoNovo(true) }} className="btn btn-primary btn-sm">
          <Plus size={12} /> Novo evento
        </button>
      </div>

      {googleStatus && !googleStatus.configurado && (
        <div className="card-purion" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'rgba(232,168,56,0.3)', background: 'rgba(232,168,56,0.05)' }}>
          <AlertTriangle size={16} style={{ color: '#E8A838', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            O calendário interno já funciona sozinho. Para os eventos também aparecerem no Google Calendar da PURION (<strong>puriongt@gmail.com</strong>) e no celular dos sócios, configure a integração — veja o passo a passo em <code>INTEGRACAO_GOOGLE.md</code>.
          </p>
        </div>
      )}
      {googleStatus?.configurado && googleStatus.link && (
        <div className="card-purion" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Calendário central conectado (puriongt@gmail.com).</span>
          <a href={googleStatus.link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={11} /> Assinar no meu Gmail
          </a>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={anterior} className="icon-btn"><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize', minWidth: 140 }}>
            {visao === 'agenda' ? 'Próximos eventos' : formatarMesAno(referencia)}
          </span>
          <button onClick={proximo} className="icon-btn"><ChevronRight size={14} /></button>
          <button onClick={irParaHoje} className="btn btn-secondary btn-sm">hoje</button>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
          {(['mes', 'semana', 'agenda'] as Visao[]).map((v) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className="px-3 py-1.5 rounded-md text-xs font-medium capitalize"
              style={visao === v ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setFiltroTipo('todos')}
          className="px-3 py-1.5 rounded-md text-xs font-medium"
          style={filtroTipo === 'todos' ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
        >
          Todos os tipos
        </button>
        {(Object.keys(TIPO_EVENTO_LABEL) as TipoEvento[]).map((t) => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={filtroTipo === t ? { background: `${COR_TIPO_EVENTO[t]}22`, color: COR_TIPO_EVENTO[t] } : { color: 'var(--text-secondary)' }}
          >
            {TIPO_EVENTO_LABEL[t]}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <button
          onClick={() => setFiltroResponsavel('todos')}
          className="px-3 py-1.5 rounded-md text-xs font-medium"
          style={filtroResponsavel === 'todos' ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
        >
          Todos
        </button>
        {RESPONSAVEIS.map((r) => (
          <button
            key={r.id}
            onClick={() => setFiltroResponsavel(r.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={filtroResponsavel === r.id ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : { color: 'var(--text-secondary)' }}
          >
            {r.nome}
          </button>
        ))}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: visao === 'agenda' ? '1fr' : '1fr 260px' }}>
        <div>
          {visao === 'mes' && <VisaoMes mesReferencia={referencia} eventos={eventosFiltrados} onClickDia={abrirDia} onClickEvento={abrirEvento} />}
          {visao === 'semana' && <VisaoSemana dataReferencia={referencia} eventos={eventosFiltrados} onClickDia={abrirDia} onClickEvento={abrirEvento} />}
          {visao === 'agenda' && <VisaoAgenda eventos={eventosFiltrados} onClickEvento={abrirEvento} />}
        </div>

        {visao !== 'agenda' && (
          <div className="card-purion" style={{ padding: '14px 16px', height: 'fit-content' }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Próximos 7 dias</p>
            <Proximos7Dias eventos={eventosFiltrados} onClickEvento={abrirEvento} />
          </div>
        )}
      </div>

      {(criandoNovo || modalEvento) && modalDia && (
        <ModalEvento
          evento={modalEvento}
          dataPadrao={modalDia}
          onFechar={fecharModal}
          onSalvar={salvar}
          onDeletar={modalEvento && !modalEvento.virtual ? excluir : undefined}
          onSincronizarGoogle={modalEvento && !modalEvento.virtual ? () => syncGoogle(modalEvento) : undefined}
        />
      )}
    </div>
  )
}
