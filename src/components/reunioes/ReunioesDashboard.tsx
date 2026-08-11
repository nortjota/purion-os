'use client'

/**
 * PURION OS — Módulo 8: Reuniões & Decisões
 * Daily assíncrono, reuniões semanais, log de decisões estratégicas.
 */

import { useState, useMemo, useEffect } from 'react'
import { Plus, ChevronDown, ChevronUp, Check, X, Minus, AlertTriangle, Clock, Trash2, Pencil, CalendarCheck2, CalendarOff, CalendarPlus } from 'lucide-react'
import { useMobile } from '@/hooks/useMobile'
import { useReunioes } from '@/hooks/useReunioes'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MiniCalendario } from './MiniCalendario'
import {
  usePurionStore,
  type PerfilUsuario,
  type ReuniaoItem,
  type DailyEntry,
  type DecisaoEstrategica,
  type VotoDecisao,
} from '@/store'

// DATA_REF = 2024-02-12 (demo reference)
const DATA_REF = new Date('2024-02-12T12:00:00Z')

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const SOCIOS: PerfilUsuario[] = ['matheus', 'joao', 'gabriel']

const SOCIO_NOME: Record<PerfilUsuario, string> = {
  matheus: 'Matheus',
  joao: 'João',
  gabriel: 'Gabriel',
}

const SOCIO_CARGO: Record<PerfilUsuario, string> = {
  matheus: 'Comercial · DF',
  joao: 'Marketing · SC',
  gabriel: 'Operações · SP',
}

const SOCIO_INICIAL: Record<PerfilUsuario, string> = {
  matheus: 'M',
  joao: 'J',
  gabriel: 'G',
}

const SOCIO_COLOR: Record<PerfilUsuario, string> = {
  matheus: 'bg-[#C9A84C] text-[#0D0D0D]',
  joao:    'bg-[#5B8FE8] text-white',
  gabriel: 'bg-[#22C55E] text-white',
}

const TIPO_REUNIAO_LABEL: Record<ReuniaoItem['tipo'], string> = {
  societaria:  'Societária',
  operacional: 'Operacional',
  parceiro:    'Parceiro',
  fornecedor:  'Fornecedor',
  outro:       'Outro',
}

const STATUS_REUNIAO_LABEL: Record<ReuniaoItem['status'], string> = {
  agendada:  'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
}

const STATUS_REUNIAO_COLOR: Record<ReuniaoItem['status'], string> = {
  agendada:  'text-blue-400 bg-blue-400/10',
  realizada: 'text-emerald-400 bg-emerald-400/10',
  cancelada: 'text-[#B8B8B8] bg-[#2A2A2A]',
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDataSimples(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })
}

function isPrazoExpirado(prazoVotacao: string): boolean {
  return DATA_REF > new Date(prazoVotacao)
}

function calcularStatusDecisao(
  votos: DecisaoEstrategica['votos'],
  status: DecisaoEstrategica['status']
): DecisaoEstrategica['status'] {
  if (status !== 'aberta') return status
  const lista = Object.values(votos)
  const sims = lista.filter((v) => v === 'sim').length
  const naos = lista.filter((v) => v === 'nao').length
  if (sims >= 2) return 'aprovada'
  if (naos >= 2) return 'rejeitada'
  return 'aberta'
}

// ─────────────────────────────────────────────
// MODAL NOVA REUNIÃO
// ─────────────────────────────────────────────

function ModalReuniao({ onSalvar, onFechar }: {
  onSalvar: (r: ReuniaoItem) => void
  onFechar: () => void
}) {
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'operacional' as ReuniaoItem['tipo'],
    data: '2024-02-12',
    hora: '19:00',
    duracao: '60',
    pauta: '',
    ata: '',
    decisoes: '',
    participantes: ['matheus', 'joao', 'gabriel'] as PerfilUsuario[],
  })

  const handleSubmit = () => {
    if (!form.titulo) return
    const reuniao: ReuniaoItem = {
      id: `reu-${Date.now()}`,
      titulo: form.titulo,
      tipo: form.tipo,
      status: 'agendada',
      data: `${form.data}T${form.hora}:00Z`,
      duracao: parseInt(form.duracao, 10) || 60,
      participantes: form.participantes,
      pauta: form.pauta.split('\n').filter(Boolean),
      ata: form.ata,
      decisoes: form.decisoes.split('\n').filter(Boolean),
      proximosPassos: [],
      createdAt: new Date().toISOString(),
    }
    onSalvar(reuniao)
  }

  const toggleParticipante = (socio: PerfilUsuario) => {
    setForm((f) => ({
      ...f,
      participantes: f.participantes.includes(socio)
        ? f.participantes.filter((p) => p !== socio)
        : [...f.participantes, socio],
    }))
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Reunião</h3>
        </div>
        <div className="p-7 flex flex-col gap-3">
          <div className="field-gap">
            <label className="label-purion">Título</label>
            <input
              placeholder="ex: Alinhamento semanal"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="input-purion"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="field-gap">
              <label className="label-purion">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as ReuniaoItem['tipo'] })}
                className="select-purion"
              >
                {Object.entries(TIPO_REUNIAO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field-gap">
              <label className="label-purion">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="input-purion"
              />
            </div>
            <div className="field-gap">
              <label className="label-purion">Horário</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="input-purion"
              />
            </div>
          </div>
          <div className="field-gap">
            <label className="label-purion">Duração (min)</label>
            <input
              type="number"
              value={form.duracao}
              onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              className="input-purion"
            />
          </div>
          <div>
            <label className="label-purion mb-2">Participantes</label>
            <div className="flex gap-2">
              {SOCIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleParticipante(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    form.participantes.includes(s)
                      ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[#C9A84C]/30'
                      : 'bg-[#2A2A2A] text-[#B8B8B8] border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${SOCIO_COLOR[s]}`}>
                    {SOCIO_INICIAL[s]}
                  </div>
                  {SOCIO_NOME[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="field-gap">
            <label className="label-purion">Pauta (1 item por linha)</label>
            <textarea
              rows={3}
              placeholder="Item 1&#10;Item 2"
              value={form.pauta}
              onChange={(e) => setForm({ ...form, pauta: e.target.value })}
              className="textarea-purion"
            />
          </div>
          <div className="field-gap">
            <label className="label-purion">Decisões (1 por linha, opcional)</label>
            <textarea
              rows={2}
              placeholder="Decisão 1&#10;Decisão 2"
              value={form.decisoes}
              onChange={(e) => setForm({ ...form, decisoes: e.target.value })}
              className="textarea-purion"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary btn-sm">Registrar</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL EDITAR REUNIÃO — todos os campos
// ─────────────────────────────────────────────

function ModalEditarReuniao({ reuniao, onSalvar, onFechar }: {
  reuniao: ReuniaoItem
  onSalvar: (dados: Partial<ReuniaoItem>) => void
  onFechar: () => void
}) {
  const [data, hora] = reuniao.data.includes('T')
    ? reuniao.data.split('T')
    : [reuniao.data, '12:00']
  const [form, setForm] = useState({
    titulo: reuniao.titulo,
    tipo: reuniao.tipo,
    status: reuniao.status,
    data,
    hora: hora.slice(0, 5),
    duracao: String(reuniao.duracao),
    pauta: reuniao.pauta.join('\n'),
    decisoes: reuniao.decisoes.join('\n'),
    ata: reuniao.ata,
    participantes: reuniao.participantes,
  })

  const toggleParticipante = (socio: PerfilUsuario) => {
    setForm((f) => ({
      ...f,
      participantes: f.participantes.includes(socio)
        ? f.participantes.filter((p) => p !== socio)
        : [...f.participantes, socio],
    }))
  }

  const handleSubmit = () => {
    if (!form.titulo) return
    onSalvar({
      titulo: form.titulo,
      tipo: form.tipo,
      status: form.status,
      data: `${form.data}T${form.hora}:00Z`,
      duracao: parseInt(form.duracao, 10) || 60,
      participantes: form.participantes,
      pauta: form.pauta.split('\n').filter(Boolean),
      decisoes: form.decisoes.split('\n').filter(Boolean),
      ata: form.ata,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Editar Reunião</h3>
        </div>
        <div className="p-7 flex flex-col gap-3">
          <div className="field-gap">
            <label className="label-purion">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="input-purion"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-gap">
              <label className="label-purion">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as ReuniaoItem['tipo'] })}
                className="select-purion"
              >
                {Object.entries(TIPO_REUNIAO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field-gap">
              <label className="label-purion">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ReuniaoItem['status'] })}
                className="select-purion"
              >
                {Object.entries(STATUS_REUNIAO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="field-gap">
              <label className="label-purion">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="input-purion"
              />
            </div>
            <div className="field-gap">
              <label className="label-purion">Horário</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="input-purion"
              />
            </div>
            <div className="field-gap">
              <label className="label-purion">Duração (min)</label>
              <input
                type="number"
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                className="input-purion"
              />
            </div>
          </div>
          <div>
            <label className="label-purion mb-2">Participantes</label>
            <div className="flex gap-2">
              {SOCIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleParticipante(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    form.participantes.includes(s)
                      ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[#C9A84C]/30'
                      : 'bg-[#2A2A2A] text-[#B8B8B8] border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${SOCIO_COLOR[s]}`}>
                    {SOCIO_INICIAL[s]}
                  </div>
                  {SOCIO_NOME[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="field-gap">
            <label className="label-purion">Pauta (1 item por linha)</label>
            <textarea
              rows={3}
              value={form.pauta}
              onChange={(e) => setForm({ ...form, pauta: e.target.value })}
              className="textarea-purion"
            />
          </div>
          <div className="field-gap">
            <label className="label-purion">Decisões tomadas (1 por linha)</label>
            <textarea
              rows={3}
              placeholder="Decisão 1&#10;Decisão 2"
              value={form.decisoes}
              onChange={(e) => setForm({ ...form, decisoes: e.target.value })}
              className="textarea-purion"
            />
          </div>
          <div className="field-gap">
            <label className="label-purion">Ata / Resumo da reunião</label>
            <textarea
              rows={4}
              placeholder="Resumo do que foi discutido e combinado..."
              value={form.ata}
              onChange={(e) => setForm({ ...form, ata: e.target.value })}
              className="textarea-purion"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary btn-sm">Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL NOVA DECISÃO
// ─────────────────────────────────────────────

function ModalDecisao({ onSalvar, onFechar, propostoPor }: {
  onSalvar: (d: DecisaoEstrategica) => void
  onFechar: () => void
  propostoPor: PerfilUsuario
}) {
  const [form, setForm] = useState({ titulo: '', descricao: '' })

  const handleSubmit = () => {
    if (!form.titulo) return
    const agora = DATA_REF
    const prazo = new Date(agora.getTime() + 24 * 3_600_000)
    const decisao: DecisaoEstrategica = {
      id: `dec-${Date.now()}`,
      titulo: form.titulo,
      descricao: form.descricao,
      propostoPor,
      data: agora.toISOString().slice(0, 10),
      prazoVotacao: prazo.toISOString(),
      votos: { matheus: 'pendente', joao: 'pendente', gabriel: 'pendente' },
      status: 'aberta',
      createdAt: agora.toISOString(),
    }
    onSalvar(decisao)
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nova Decisão Estratégica</h3>
        </div>
        <div className="p-7 flex flex-col gap-3">
          <div className="field-gap">
            <label className="label-purion">Título</label>
            <input
              placeholder="ex: Expandir para Goiânia"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="input-purion"
              autoFocus
            />
          </div>
          <div className="field-gap">
            <label className="label-purion">Descrição / Contexto</label>
            <textarea
              rows={3}
              placeholder="Descreva a proposta, impacto e alternativas..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="textarea-purion"
            />
          </div>
          <p className="caption">Prazo para votação: 24h a partir de agora</p>
        </div>
        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary btn-sm">Propor</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CARD DAILY POR SÓCIO
// ─────────────────────────────────────────────

function DailyCard({
  socio,
  entries,
  onSalvar,
}: {
  socio: PerfilUsuario
  entries: DailyEntry[]
  onSalvar: (entry: DailyEntry) => Promise<boolean>
}) {
  const [historico, setHistorico] = useState(false)
  const [form, setForm] = useState({ ontemFiz: '', hojeFarei: '', bloqueadoEm: '' })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  // Último entry do sócio
  const ultimaEntry = useMemo(() =>
    entries
      .filter((e) => e.socio === socio)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
  [entries, socio])

  const historicoEntries = useMemo(() =>
    entries
      .filter((e) => e.socio === socio)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 7),
  [entries, socio])

  const handleSalvar = async () => {
    if (!form.ontemFiz && !form.hojeFarei) return
    const entry: DailyEntry = {
      id: `day-${Date.now()}`,
      socio,
      data: DATA_REF.toISOString().slice(0, 10),
      ontemFiz: form.ontemFiz,
      hojeFarei: form.hojeFarei,
      bloqueadoEm: form.bloqueadoEm,
      createdAt: DATA_REF.toISOString(),
    }
    setSalvando(true)
    setSalvo(false)
    const ok = await onSalvar(entry)
    setSalvando(false)
    if (ok) {
      setForm({ ontemFiz: '', hojeFarei: '', bloqueadoEm: '' })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    }
  }

  const temBloqueio = ultimaEntry?.bloqueadoEm

  return (
    <div className={`bg-[var(--bg-surface)] border rounded-xl overflow-hidden ${temBloqueio ? 'border-amber-500/40' : 'border-[var(--border)]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${SOCIO_COLOR[socio]}`}>
          {SOCIO_INICIAL[socio]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">{SOCIO_NOME[socio]}</p>
          <p className="text-[10px] text-[#B8B8B8]">{SOCIO_CARGO[socio]}</p>
        </div>
        {temBloqueio && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <AlertTriangle size={10} />
            Bloqueado
          </span>
        )}
      </div>

      {/* Última entrada (leitura) */}
      {ultimaEntry && (
        <div className="px-4 py-3 border-b border-[var(--border)] space-y-2">
          <p className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
            Último update · {fmtDataSimples(ultimaEntry.data)}
          </p>
          {ultimaEntry.ontemFiz && (
            <div>
              <span className="text-[10px] text-[#B8B8B8]">Ontem fiz: </span>
              <span className="text-xs text-[var(--text-secondary)]">{ultimaEntry.ontemFiz}</span>
            </div>
          )}
          {ultimaEntry.hojeFarei && (
            <div>
              <span className="text-[10px] text-[#B8B8B8]">Hoje farei: </span>
              <span className="text-xs text-[var(--text-secondary)]">{ultimaEntry.hojeFarei}</span>
            </div>
          )}
          {ultimaEntry.bloqueadoEm && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-md p-2">
              <span className="text-[10px] font-bold text-amber-400">Bloqueado em: </span>
              <span className="text-xs text-amber-300/80">{ultimaEntry.bloqueadoEm}</span>
            </div>
          )}
        </div>
      )}

      {/* Formulário nova entrada */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">Novo update</p>
        <div>
          <label className="text-[10px] text-[#B8B8B8] block mb-0.5">Ontem fiz:</label>
          <textarea
            rows={2}
            value={form.ontemFiz}
            onChange={(e) => setForm({ ...form, ontemFiz: e.target.value })}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#C9A84C] resize-none"
            placeholder="O que fiz ontem..."
          />
        </div>
        <div>
          <label className="text-[10px] text-[#B8B8B8] block mb-0.5">Hoje farei:</label>
          <textarea
            rows={2}
            value={form.hojeFarei}
            onChange={(e) => setForm({ ...form, hojeFarei: e.target.value })}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#C9A84C] resize-none"
            placeholder="O que farei hoje..."
          />
        </div>
        <div>
          <label className="text-[10px] text-[#B8B8B8] block mb-0.5">Bloqueado em:</label>
          <textarea
            rows={1}
            value={form.bloqueadoEm}
            onChange={(e) => setForm({ ...form, bloqueadoEm: e.target.value })}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[rgba(232,168,56,0.4)] resize-none"
            placeholder="Algum impedimento? (opcional)"
          />
        </div>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-md hover:bg-[#D4B568] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {salvando ? 'Salvando...' : 'Salvar update'}
        </button>
        {salvo && (
          <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <Check size={11} />
            Update salvo com sucesso!
          </p>
        )}
      </div>

      {/* Histórico */}
      {historicoEntries.length > 1 && (
        <div className="border-t border-[var(--border)]">
          <button
            onClick={() => setHistorico((h) => !h)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] text-[#B8B8B8] hover:text-[var(--text-secondary)]"
          >
            <span>Histórico ({historicoEntries.length} entradas)</span>
            {historico ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {historico && (
            <div className="px-4 pb-3 space-y-2 max-h-[200px] overflow-y-auto">
              {historicoEntries.slice(1).map((e) => (
                <div key={e.id} className="bg-[var(--bg-surface-2)] rounded-md px-3 py-2 text-[10px] text-[#B8B8B8]">
                  <p className="text-[#A0A0A0] mb-1">{fmtDataSimples(e.data)}</p>
                  {e.ontemFiz && <p><span className="text-[#A0A0A0]">Fez: </span>{e.ontemFiz}</p>}
                  {e.hojeFarei && <p><span className="text-[#A0A0A0]">Planeja: </span>{e.hojeFarei}</p>}
                  {e.bloqueadoEm && <p className="text-amber-400/70"><span className="text-amber-500/60">Bloq: </span>{e.bloqueadoEm}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export function ReunioesDashboard() {
  const {
    dailyEntries,
    reunioes,
    decisoes,
    perfilAtivo,
  } = usePurionStore()

  const isMobile = useMobile()
  const {
    adicionarReuniao, atualizarReuniao, adicionarDecisao, atualizarDecisao, adicionarDaily,
    deletarReuniao, deletarDecisao,
  } = useReunioes()
  const [deletandoReuniao, setDeletandoReuniao] = useState<ReuniaoItem | null>(null)
  const [deletandoDecisao, setDeletandoDecisao] = useState<DecisaoEstrategica | null>(null)
  const [modalReuniao, setModalReuniao] = useState(false)
  const [modalDecisao, setModalDecisao] = useState(false)
  const [reuniaoExpandida, setReuniaoExpandida] = useState<string | null>(null)
  const [editandoReuniao, setEditandoReuniao] = useState<ReuniaoItem | null>(null)
  const [filtroReuniao, setFiltroReuniao] = useState<'proximas' | 'historico'>('proximas')
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [linkCalendario, setLinkCalendario] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calendar/link')
      .then((r) => r.json())
      .then((j) => setLinkCalendario(j.link ?? null))
      .catch(() => setLinkCalendario(null))
  }, [])

  // Próximas (agendadas) ordenadas pela mais próxima primeiro; histórico (realizada/cancelada) pela mais recente primeiro
  const reunioesProximas = useMemo(() =>
    reunioes.filter((r) => r.status === 'agendada').sort((a, b) => a.data.localeCompare(b.data)),
  [reunioes])
  const reunioesHistorico = useMemo(() =>
    reunioes.filter((r) => r.status !== 'agendada').sort((a, b) => b.data.localeCompare(a.data)),
  [reunioes])
  const reunioesBase = filtroReuniao === 'proximas' ? reunioesProximas : reunioesHistorico
  const reunioesExibidas = diaSelecionado
    ? reunioesBase.filter((r) => r.data.slice(0, 10) === diaSelecionado)
    : reunioesBase

  const handleVotar = (decisaoId: string, voto: VotoDecisao) => {
    const decisao = decisoes.find((d) => d.id === decisaoId)
    if (!decisao || decisao.status !== 'aberta') return
    const novosVotos = { ...decisao.votos, [perfilAtivo]: voto }
    const sims = Object.values(novosVotos).filter((v) => v === 'sim').length
    const naos = Object.values(novosVotos).filter((v) => v === 'nao').length
    const novoStatus: DecisaoEstrategica['status'] =
      sims >= 2 ? 'aprovada' : naos >= 2 ? 'rejeitada' : 'aberta'
    atualizarDecisao(decisaoId, { votos: novosVotos, status: novoStatus })
  }

  return (
    <div className="page-content section-gap">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reuniões & Decisões</h1>
          <p className="caption mt-1">Daily assíncrono, reuniões semanais e decisões estratégicas</p>
        </div>
        {linkCalendario && (
          <a href={linkCalendario} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <CalendarPlus size={13} /> Adicionar ao meu Google
          </a>
        )}
      </div>

      {/* ══════════════════════════════════════
          SEÇÃO 1 — DAILY ASSÍNCRONO
      ══════════════════════════════════════ */}
      <section>
        <p className="kpi-label mb-4">Daily Assíncrono</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SOCIOS.map((socio) => (
            <DailyCard
              key={socio}
              socio={socio}
              entries={dailyEntries}
              onSalvar={adicionarDaily}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 2 — REUNIÕES SEMANAIS
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="kpi-label">
            Reuniões ({reunioes.length})
          </p>
          <button
            onClick={() => setModalReuniao(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={12} />
            Registrar reunião
          </button>
        </div>

        {/* Filtro: Próximas / Histórico */}
        <div className="flex gap-1 mb-3 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit">
          {([
            { id: 'proximas' as const, label: `Próximas (${reunioesProximas.length})` },
            { id: 'historico' as const, label: `Histórico (${reunioesHistorico.length})` },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroReuniao(f.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={filtroReuniao === f.id
                ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
                : { color: 'var(--text-secondary)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
          <MiniCalendario reunioes={reunioesBase} diaSelecionado={diaSelecionado} onSelecionarDia={setDiaSelecionado} />

          <div className="flex flex-col gap-2">
            {diaSelecionado && (
              <button onClick={() => setDiaSelecionado(null)} className="text-xs text-[#C9A84C] text-left">
                ← Limpar filtro de dia ({fmtData(diaSelecionado)})
              </button>
            )}
            {reunioesExibidas.length === 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-4 py-8 text-center text-xs text-[#A0A0A0]">
                {filtroReuniao === 'proximas' ? 'Nenhuma reunião agendada' : 'Nenhuma reunião no histórico'}
              </div>
            )}
            {reunioesExibidas.map((reuniao) => {
              const expandida = reuniaoExpandida === reuniao.id

              return (
                <div key={reuniao.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setReuniaoExpandida((r) => r === reuniao.id ? null : reuniao.id)}
                      className="flex-1 min-w-0 flex items-center gap-4 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{reuniao.titulo}</p>
                          <span className="text-[10px] text-[#A0A0A0] bg-[#2A2A2A] px-2 py-0.5 rounded-full">
                            {TIPO_REUNIAO_LABEL[reuniao.tipo]}
                          </span>
                          {reuniao.googleEventId ? (
                            <span title="Sincronizado com o Google Calendar"><CalendarCheck2 size={12} className="text-emerald-500" /></span>
                          ) : (
                            <span title="Apenas no CRM (não sincronizado)"><CalendarOff size={12} className="text-[#A0A0A0]" /></span>
                          )}
                        </div>
                        <p className="text-xs text-[#B8B8B8] mt-0.5">
                          {fmtData(reuniao.data)} · {reuniao.duracao}min ·{' '}
                          {reuniao.participantes.map((p) => SOCIO_NOME[p]).join(', ')}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status — controle total entre agendada/realizada/cancelada */}
                    <select
                      value={reuniao.status}
                      onChange={(e) => {
                        const novoStatus = e.target.value as ReuniaoItem['status']
                        atualizarReuniao(reuniao.id, { status: novoStatus })
                        if (novoStatus === 'realizada' && !reuniao.ata) setEditandoReuniao({ ...reuniao, status: novoStatus })
                      }}
                      className={`text-[10px] font-bold rounded-full px-2 py-1 border-none outline-none cursor-pointer ${STATUS_REUNIAO_COLOR[reuniao.status]}`}
                    >
                      {Object.entries(STATUS_REUNIAO_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <span
                      onClick={() => setEditandoReuniao(reuniao)}
                      className="p-1 rounded hover:bg-[rgba(201,168,76,0.1)] text-[#A0A0A0] hover:text-[#C9A84C] transition-colors cursor-pointer"
                      title="Editar reunião"
                    ><Pencil size={12} /></span>
                    <span
                      onClick={() => setDeletandoReuniao(reuniao)}
                      className="p-1 rounded hover:bg-[rgba(232,82,56,0.1)] text-[#A0A0A0] hover:text-[#E85238] transition-colors cursor-pointer"
                    ><Trash2 size={12} /></span>
                    <button onClick={() => setReuniaoExpandida((r) => r === reuniao.id ? null : reuniao.id)}>
                      {expandida ? <ChevronUp size={14} className="text-[#B8B8B8]" /> : <ChevronDown size={14} className="text-[#B8B8B8]" />}
                    </button>
                  </div>
                </div>

                {expandida && (
                  <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reuniao.pauta.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-wider mb-2">Pauta</p>
                        <ul className="space-y-1">
                          {reuniao.pauta.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="text-[#A0A0A0] shrink-0">{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reuniao.decisoes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-wider mb-2">Decisões</p>
                        <ul className="space-y-1">
                          {reuniao.decisoes.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                              <Check size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reuniao.ata && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-[#B8B8B8] uppercase tracking-wider mb-2">Ata</p>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{reuniao.ata}</p>
                      </div>
                    )}
                    {reuniao.status === 'realizada' && !reuniao.ata && reuniao.decisoes.length === 0 && (
                      <div className="md:col-span-2">
                        <button onClick={() => setEditandoReuniao(reuniao)} className="btn btn-secondary btn-sm">
                          <Pencil size={11} /> Registrar ata e decisões
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — DECISÕES ESTRATÉGICAS
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label">
            Log de Decisões Estratégicas
          </p>
          <button
            onClick={() => setModalDecisao(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={12} />
            Nova decisão
          </button>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Cabeçalho — desktop only */}
          {!isMobile && (
            <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr_32px] gap-4 px-4 py-2.5 border-b border-[var(--border)]">
              {['Decisão', 'Proposto por', 'Data', 'Votos M · J · G', 'Status', ''].map((h) => (
                <span key={h} className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">{h}</span>
              ))}
            </div>
          )}

          {decisoes.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#A0A0A0]">Nenhuma decisão registrada</div>
          )}

          {[...decisoes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((decisao) => {
            const expirado = decisao.status === 'aberta' && isPrazoExpirado(decisao.prazoVotacao)
            const statusEfetivo = calcularStatusDecisao(decisao.votos, decisao.status)

            const statusBadge = {
              aberta: expirado
                ? <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full"><AlertTriangle size={9} />PRAZO EXPIRADO</span>
                : <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full"><Clock size={9} />Aberta</span>,
              aprovada: <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Aprovada 2×1</span>,
              rejeitada: <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Rejeitada</span>,
            }[statusEfetivo]

            const renderVoto = (voto: VotoDecisao, socio: PerfilUsuario) => {
              const podevotar = decisao.status === 'aberta' && voto === 'pendente'
              if (podevotar && socio === perfilAtivo) {
                return (
                  <div key={socio} className={`flex gap-1 ${isMobile ? 'flex-1' : ''}`}>
                    <button
                      onClick={() => handleVotar(decisao.id, 'sim')}
                      className={`rounded hover:bg-emerald-400/20 text-emerald-400 ${isMobile ? 'flex-1 py-2.5 flex items-center justify-center border border-emerald-400/30' : 'p-0.5'}`}
                    ><Check size={isMobile ? 16 : 11} /></button>
                    <button
                      onClick={() => handleVotar(decisao.id, 'nao')}
                      className={`rounded hover:bg-red-400/20 text-red-400 ${isMobile ? 'flex-1 py-2.5 flex items-center justify-center border border-red-400/30' : 'p-0.5'}`}
                    ><X size={isMobile ? 16 : 11} /></button>
                    <button
                      onClick={() => handleVotar(decisao.id, 'abstencao')}
                      className={`rounded hover:bg-[#3A3A3A] text-[#B8B8B8] ${isMobile ? 'flex-1 py-2.5 flex items-center justify-center border border-[var(--border)]' : 'p-0.5'}`}
                    ><Minus size={isMobile ? 16 : 11} /></button>
                  </div>
                )
              }
              const icon = voto === 'sim'
                ? <Check size={11} className="text-emerald-400" />
                : voto === 'nao'
                  ? <X size={11} className="text-red-400" />
                  : voto === 'abstencao'
                    ? <Minus size={11} className="text-[#B8B8B8]" />
                    : <span className="w-2.5 h-2.5 rounded-full border border-[#3A3A3A] inline-block" />
              return (
                <span key={socio} title={`${SOCIO_NOME[socio]}: ${voto}`} className="flex items-center">
                  {icon}
                </span>
              )
            }

            if (isMobile) {
              return (
                <div key={decisao.id} className="px-4 py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{decisao.titulo}</p>
                      {decisao.descricao && (
                        <p className="text-[10px] text-[#A0A0A0] mt-0.5 line-clamp-2">{decisao.descricao}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${SOCIO_COLOR[decisao.propostoPor]}`}>
                          {SOCIO_INICIAL[decisao.propostoPor]}
                        </div>
                        <span className="caption text-[10px]">{fmtDataSimples(decisao.data)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge}
                      <span
                        onClick={() => setDeletandoDecisao(decisao)}
                        className="p-1 rounded hover:bg-[rgba(232,82,56,0.1)] text-[#A0A0A0] hover:text-[#E85238] transition-colors cursor-pointer"
                      ><Trash2 size={11} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="caption text-[10px] shrink-0">Votos:</span>
                    <div className="flex gap-2 flex-1">
                      {(['matheus', 'joao', 'gabriel'] as PerfilUsuario[]).map((s) => (
                        <div key={s} className="flex-1">
                          <p className="caption text-[9px] text-center mb-1">{SOCIO_INICIAL[s]}</p>
                          {renderVoto(decisao.votos[s], s)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={decisao.id}
                className="group/dec grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr_32px] gap-4 px-4 py-3.5 border-b border-[var(--border)] last:border-0 items-start hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                {/* Decisão */}
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{decisao.titulo}</p>
                  {decisao.descricao && (
                    <p className="text-[10px] text-[#A0A0A0] mt-0.5 line-clamp-2 leading-relaxed">{decisao.descricao}</p>
                  )}
                </div>

                {/* Proposto por */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${SOCIO_COLOR[decisao.propostoPor]}`}>
                    {SOCIO_INICIAL[decisao.propostoPor]}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{SOCIO_NOME[decisao.propostoPor]}</span>
                </div>

                {/* Data */}
                <span className="text-xs text-[var(--text-secondary)]">{fmtDataSimples(decisao.data)}</span>

                {/* Votos M · J · G */}
                <div className="flex items-center gap-2">
                  {(['matheus', 'joao', 'gabriel'] as PerfilUsuario[]).map((s) =>
                    renderVoto(decisao.votos[s], s)
                  )}
                </div>

                {/* Status */}
                <div>{statusBadge}</div>

                {/* Ações */}
                <div className="flex items-center justify-center opacity-0 group-hover/dec:opacity-100 transition-opacity">
                  <span
                    onClick={() => setDeletandoDecisao(decisao)}
                    className="p-1 rounded hover:bg-[rgba(232,82,56,0.1)] text-[#A0A0A0] hover:text-[#E85238] transition-colors cursor-pointer"
                  ><Trash2 size={12} /></span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Modais ── */}
      {modalReuniao && (
        <ModalReuniao
          onSalvar={(r) => { adicionarReuniao(r); setModalReuniao(false) }}
          onFechar={() => setModalReuniao(false)}
        />
      )}
      {modalDecisao && (
        <ModalDecisao
          propostoPor={perfilAtivo}
          onSalvar={(d) => { adicionarDecisao(d); setModalDecisao(false) }}
          onFechar={() => setModalDecisao(false)}
        />
      )}
      {editandoReuniao && (
        <ModalEditarReuniao
          reuniao={editandoReuniao}
          onSalvar={(dados) => { atualizarReuniao(editandoReuniao.id, dados); setEditandoReuniao(null) }}
          onFechar={() => setEditandoReuniao(null)}
        />
      )}

      <ConfirmModal
        open={!!deletandoReuniao}
        title="Excluir Reunião"
        message={`Deseja excluir "${deletandoReuniao?.titulo}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => { if (deletandoReuniao) { deletarReuniao(deletandoReuniao.id); setDeletandoReuniao(null) } }}
        onCancel={() => setDeletandoReuniao(null)}
      />
      <ConfirmModal
        open={!!deletandoDecisao}
        title="Excluir Decisão"
        message={`Deseja excluir "${deletandoDecisao?.titulo}"? Você pode restaurar na Lixeira.`}
        onConfirm={() => { if (deletandoDecisao) { deletarDecisao(deletandoDecisao.id); setDeletandoDecisao(null) } }}
        onCancel={() => setDeletandoDecisao(null)}
      />
    </div>
  )
}
