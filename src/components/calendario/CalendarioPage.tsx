'use client'

import { Segmentado } from '@/components/ui/Segmentado'
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
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Uma barra só: título, navegação, filtros, visão e ação (antes eram 4 faixas) */}
      <div className="toolbar">
        <h1 className="page-title" style={{ marginRight: 8 }}>Calendário</h1>
        <span className="toolbar-espaco" />
        {googleStatus?.configurado && googleStatus.link && (
          <a href={googleStatus.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }} title="Calendário central conectado (puriongt@gmail.com)">
            <ExternalLink size={12} /> Assinar no meu Gmail
          </a>
        )}
        <button onClick={() => { setModalDia(new Date()); setModalEvento(null); setCriandoNovo(true) }} className="btn btn-accent btn-sm">
          <Plus size={13} /> Novo evento
        </button>
      </div>

      <div className="toolbar">
        <button onClick={anterior} className="icon-btn" aria-label="Anterior"><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize', minWidth: 150, textAlign: 'center' }}>
          {visao === 'agenda' ? 'Próximos eventos' : formatarMesAno(referencia)}
        </span>
        <button onClick={proximo} className="icon-btn" aria-label="Próximo"><ChevronRight size={14} /></button>
        <button onClick={irParaHoje} className="btn btn-secondary btn-sm">Hoje</button>

        <select className="filtro" data-ativo={filtroTipo !== 'todos' || undefined} aria-label="Tipo de evento"
          value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoEvento | 'todos')}>
          <option value="todos">Todos os tipos</option>
          {(Object.keys(TIPO_EVENTO_LABEL) as TipoEvento[]).map((t) => <option key={t} value={t}>{TIPO_EVENTO_LABEL[t]}</option>)}
        </select>
        <select className="filtro" data-ativo={filtroResponsavel !== 'todos' || undefined} aria-label="Responsável"
          value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value as PerfilUsuario | 'todos')}>
          <option value="todos">Todos os sócios</option>
          {RESPONSAVEIS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>

        <span className="toolbar-espaco" />
        <Segmentado
          rotulo="Visão" valor={visao} onChange={setVisao}
          opcoes={[{ id: 'mes', label: 'Mês' }, { id: 'semana', label: 'Semana' }, { id: 'agenda', label: 'Agenda' }]}
        />
      </div>

      {googleStatus && !googleStatus.configurado && (
        <details className="nota-regras">
          <summary>Google Calendar não conectado — o calendário interno funciona normalmente</summary>
          <p>
            Para os eventos também aparecerem no Google Calendar da PURION (<strong>puriongt@gmail.com</strong>) e no celular dos sócios,
            configure a integração — o passo a passo está em <code>INTEGRACAO_GOOGLE.md</code>.
          </p>
        </details>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: visao === 'agenda' ? '1fr' : '1fr 260px' }}>
        <div>
          {visao === 'mes' && <VisaoMes mesReferencia={referencia} eventos={eventosFiltrados} onClickDia={abrirDia} onClickEvento={abrirEvento} />}
          {visao === 'semana' && <VisaoSemana dataReferencia={referencia} eventos={eventosFiltrados} onClickDia={abrirDia} onClickEvento={abrirEvento} />}
          {visao === 'agenda' && <VisaoAgenda eventos={eventosFiltrados} onClickEvento={abrirEvento} />}
        </div>

        {visao !== 'agenda' && (
          <div className="card-purion" style={{ padding: '14px 16px', height: 'fit-content' }}>
            <p className="kpi-label mb-3">Próximos 7 dias</p>
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
