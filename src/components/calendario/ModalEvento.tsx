'use client'

import { useState } from 'react'
import { X, Trash2, RefreshCw } from 'lucide-react'
import type { EventoCalendario, TipoEvento, PerfilUsuario } from '@/store'
import { TIPO_EVENTO_LABEL, LEMBRETE_OPCOES, RESPONSAVEIS, corEvento } from './calendarioHelpers'

export interface DadosEvento {
  titulo: string
  descricao: string | null
  dataInicio: string
  dataFim: string | null
  diaInteiro: boolean
  tipo: TipoEvento
  responsavel: PerfilUsuario | null
  lembreteMinutos: number
}

interface ModalEventoProps {
  evento: EventoCalendario | null
  dataPadrao: Date
  onFechar: () => void
  onSalvar: (dados: DadosEvento) => void
  onDeletar?: () => void
  onSincronizarGoogle?: () => void
}

function toInputDate(iso: string) {
  return iso.slice(0, 10)
}
function toInputTime(iso: string) {
  return iso.slice(11, 16)
}

export function ModalEvento({ evento, dataPadrao, onFechar, onSalvar, onDeletar, onSincronizarGoogle }: ModalEventoProps) {
  const isVirtual = !!evento?.virtual
  const [titulo, setTitulo] = useState(evento?.titulo ?? '')
  const [descricao, setDescricao] = useState(evento?.descricao ?? '')
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? 'outro')
  const [diaInteiro, setDiaInteiro] = useState(evento?.diaInteiro ?? true)
  const [data, setData] = useState(evento ? toInputDate(evento.dataInicio) : dataPadrao.toISOString().slice(0, 10))
  const [hora, setHora] = useState(evento && !evento.diaInteiro ? toInputTime(evento.dataInicio) : '09:00')
  const [responsavel, setResponsavel] = useState<PerfilUsuario | ''>(evento?.responsavel ?? '')
  const [lembreteMinutos, setLembreteMinutos] = useState(evento?.lembreteMinutos ?? 60)

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || isVirtual) return
    const dataInicio = diaInteiro ? `${data}T12:00:00.000Z` : new Date(`${data}T${hora}:00`).toISOString()
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      dataInicio,
      dataFim: null,
      diaInteiro,
      tipo,
      responsavel: responsavel || null,
      lembreteMinutos,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, borderRadius: 999, background: evento ? corEvento(evento) : '#B8B8B8' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{evento ? (isVirtual ? 'Detalhe do evento' : 'Editar evento') : 'Novo evento'}</h2>
          </div>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>

        {isVirtual && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(91,143,232,0.08)', border: '1px solid rgba(91,143,232,0.2)', marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
            Este evento vem de <strong>{TIPO_EVENTO_LABEL[evento!.tipo]}</strong> ({evento!.origemTabela}) — edite direto no módulo de origem.
          </div>
        )}

        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Título *</label>
            <input className="input-purion w-full" value={titulo} onChange={(e) => setTitulo(e.target.value)} required disabled={isVirtual} autoFocus={!isVirtual} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Tipo</label>
              <select className="select-purion w-full" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)} disabled={isVirtual}>
                {(Object.keys(TIPO_EVENTO_LABEL) as TipoEvento[]).map((t) => (
                  <option key={t} value={t}>{TIPO_EVENTO_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Responsável</label>
              <select className="select-purion w-full" value={responsavel} onChange={(e) => setResponsavel(e.target.value as PerfilUsuario)} disabled={isVirtual}>
                <option value="">—</option>
                {RESPONSAVEIS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2" style={{ fontSize: 12, cursor: isVirtual ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} disabled={isVirtual} />
            Dia inteiro
          </label>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Data</label>
              <input type="date" className="input-purion w-full" value={data} onChange={(e) => setData(e.target.value)} disabled={isVirtual} required />
            </div>
            {!diaInteiro && (
              <div className="flex-1">
                <label className="kpi-label mb-1 block">Horário</label>
                <input type="time" className="input-purion w-full" value={hora} onChange={(e) => setHora(e.target.value)} disabled={isVirtual} />
              </div>
            )}
          </div>

          <div>
            <label className="kpi-label mb-1 block">Descrição</label>
            <textarea className="input-purion w-full" rows={2} value={descricao ?? ''} onChange={(e) => setDescricao(e.target.value)} disabled={isVirtual} />
          </div>

          <div>
            <label className="kpi-label mb-1 block">Lembrete</label>
            <select className="select-purion w-full" value={lembreteMinutos} onChange={(e) => setLembreteMinutos(Number(e.target.value))} disabled={isVirtual}>
              {LEMBRETE_OPCOES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
            </select>
          </div>

          {evento && !isVirtual && (
            <div className="flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>{evento.googleEventId ? '✓ Sincronizado com o Google Calendar' : 'Ainda não está no Google Calendar'}</span>
              {onSincronizarGoogle && (
                <button type="button" onClick={onSincronizarGoogle} className="btn btn-secondary btn-sm">
                  <RefreshCw size={11} /> Sincronizar
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 mt-2">
            <div>
              {evento && !isVirtual && onDeletar && (
                <button type="button" onClick={onDeletar} className="btn btn-sm" style={{ background: 'rgba(232,82,56,0.15)', color: '#E85238' }}>
                  <Trash2 size={12} /> Excluir
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onFechar} className="btn btn-secondary">{isVirtual ? 'Fechar' : 'Cancelar'}</button>
              {!isVirtual && <button type="submit" className="btn btn-primary">{evento ? 'Salvar' : 'Criar evento'}</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
