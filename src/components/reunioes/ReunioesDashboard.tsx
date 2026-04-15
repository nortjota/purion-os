'use client'

/**
 * PURION OS — Módulo 8: Reuniões & Decisões
 * Daily assíncrono, reuniões semanais, log de decisões estratégicas.
 */

import { useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronUp, Check, X, Minus, AlertTriangle, Clock } from 'lucide-react'
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
  joao:    'bg-blue-500 text-white',
  gabriel: 'bg-emerald-600 text-white',
}

const TIPO_REUNIAO_LABEL: Record<ReuniaoItem['tipo'], string> = {
  societaria:  'Societária',
  operacional: 'Operacional',
  parceiro:    'Parceiro',
  fornecedor:  'Fornecedor',
  outro:       'Outro',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[#FAFAF8] mb-4">Registrar Reunião</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Título</label>
            <input
              placeholder="ex: Alinhamento semanal"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as ReuniaoItem['tipo'] })}
                className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              >
                {Object.entries(TIPO_REUNIAO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Horário</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Duração (min)</label>
            <input
              type="number"
              value={form.duracao}
              onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-2">Participantes</label>
            <div className="flex gap-2">
              {SOCIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleParticipante(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    form.participantes.includes(s)
                      ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[#C9A84C]/30'
                      : 'bg-[#2A2A2A] text-[#6B6B6B] border border-transparent'
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
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Pauta (1 item por linha)</label>
            <textarea
              rows={3}
              placeholder="Item 1&#10;Item 2"
              value={form.pauta}
              onChange={(e) => setForm({ ...form, pauta: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Decisões (1 por linha, opcional)</label>
            <textarea
              rows={2}
              placeholder="Decisão 1&#10;Decisão 2"
              value={form.decisoes}
              onChange={(e) => setForm({ ...form, decisoes: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[#2A2A2A] rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Registrar
          </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-[#FAFAF8] mb-4">Nova Decisão Estratégica</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Título</label>
            <input
              placeholder="ex: Expandir para Goiânia"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C]"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Descrição / Contexto</label>
            <textarea
              rows={3}
              placeholder="Descreva a proposta, impacto e alternativas..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            />
          </div>
          <p className="text-[10px] text-[#6B6B6B]">Prazo para votação: 24h a partir de agora</p>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onFechar} className="flex-1 px-3 py-2 text-xs text-[#6B6B6B] border border-[#2A2A2A] rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            Propor
          </button>
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
  onSalvar: (entry: DailyEntry) => void
}) {
  const [historico, setHistorico] = useState(false)
  const [form, setForm] = useState({ ontemFiz: '', hojeFarei: '', bloqueadoEm: '' })

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

  const handleSalvar = () => {
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
    onSalvar(entry)
    setForm({ ontemFiz: '', hojeFarei: '', bloqueadoEm: '' })
  }

  const temBloqueio = ultimaEntry?.bloqueadoEm

  return (
    <div className={`bg-[#1A1A1A] border rounded-xl overflow-hidden ${temBloqueio ? 'border-amber-500/40' : 'border-[#2A2A2A]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A2A]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${SOCIO_COLOR[socio]}`}>
          {SOCIO_INICIAL[socio]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#FAFAF8]">{SOCIO_NOME[socio]}</p>
          <p className="text-[10px] text-[#6B6B6B]">{SOCIO_CARGO[socio]}</p>
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
        <div className="px-4 py-3 border-b border-[#2A2A2A] space-y-2">
          <p className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">
            Último update · {fmtDataSimples(ultimaEntry.data)}
          </p>
          {ultimaEntry.ontemFiz && (
            <div>
              <span className="text-[10px] text-[#6B6B6B]">Ontem fiz: </span>
              <span className="text-xs text-[#8A8A8A]">{ultimaEntry.ontemFiz}</span>
            </div>
          )}
          {ultimaEntry.hojeFarei && (
            <div>
              <span className="text-[10px] text-[#6B6B6B]">Hoje farei: </span>
              <span className="text-xs text-[#8A8A8A]">{ultimaEntry.hojeFarei}</span>
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
        <p className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">Novo update</p>
        <div>
          <label className="text-[10px] text-[#6B6B6B] block mb-0.5">Ontem fiz:</label>
          <textarea
            rows={2}
            value={form.ontemFiz}
            onChange={(e) => setForm({ ...form, ontemFiz: e.target.value })}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-md px-2.5 py-1.5 text-xs text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            placeholder="O que fiz ontem..."
          />
        </div>
        <div>
          <label className="text-[10px] text-[#6B6B6B] block mb-0.5">Hoje farei:</label>
          <textarea
            rows={2}
            value={form.hojeFarei}
            onChange={(e) => setForm({ ...form, hojeFarei: e.target.value })}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-md px-2.5 py-1.5 text-xs text-[#FAFAF8] outline-none focus:border-[#C9A84C] resize-none"
            placeholder="O que farei hoje..."
          />
        </div>
        <div>
          <label className="text-[10px] text-[#6B6B6B] block mb-0.5">Bloqueado em:</label>
          <textarea
            rows={1}
            value={form.bloqueadoEm}
            onChange={(e) => setForm({ ...form, bloqueadoEm: e.target.value })}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-md px-2.5 py-1.5 text-xs text-[#FAFAF8] outline-none focus:border-[rgba(232,168,56,0.4)] resize-none"
            placeholder="Algum impedimento? (opcional)"
          />
        </div>
        <button
          onClick={handleSalvar}
          className="w-full py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-md hover:bg-[#D4B568] transition-colors"
        >
          Salvar update
        </button>
      </div>

      {/* Histórico */}
      {historicoEntries.length > 1 && (
        <div className="border-t border-[#2A2A2A]">
          <button
            onClick={() => setHistorico((h) => !h)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] text-[#6B6B6B] hover:text-[#8A8A8A]"
          >
            <span>Histórico ({historicoEntries.length} entradas)</span>
            {historico ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {historico && (
            <div className="px-4 pb-3 space-y-2 max-h-[200px] overflow-y-auto">
              {historicoEntries.slice(1).map((e) => (
                <div key={e.id} className="bg-[#141414] rounded-md px-3 py-2 text-[10px] text-[#6B6B6B]">
                  <p className="text-[#4A4A4A] mb-1">{fmtDataSimples(e.data)}</p>
                  {e.ontemFiz && <p><span className="text-[#4A4A4A]">Fez: </span>{e.ontemFiz}</p>}
                  {e.hojeFarei && <p><span className="text-[#4A4A4A]">Planeja: </span>{e.hojeFarei}</p>}
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
    dailyEntries, adicionarDailyEntry,
    reunioes, adicionarReuniao,
    decisoes, adicionarDecisao, atualizarDecisao,
    perfilAtivo,
  } = usePurionStore()

  const [modalReuniao, setModalReuniao] = useState(false)
  const [modalDecisao, setModalDecisao] = useState(false)
  const [reuniaoExpandida, setReuniaoExpandida] = useState<string | null>(null)

  // Ordena reuniões por data decrescente
  const reunioesOrdenadas = useMemo(() =>
    [...reunioes].sort((a, b) => b.data.localeCompare(a.data)),
  [reunioes])

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
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-lg font-black tracking-widest text-[#FAFAF8] uppercase">Reuniões & Decisões</h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Daily assíncrono, reuniões semanais e decisões estratégicas</p>
      </div>

      {/* ══════════════════════════════════════
          SEÇÃO 1 — DAILY ASSÍNCRONO
      ══════════════════════════════════════ */}
      <section>
        <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-3">Daily Assíncrono</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SOCIOS.map((socio) => (
            <DailyCard
              key={socio}
              socio={socio}
              entries={dailyEntries}
              onSalvar={adicionarDailyEntry}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 2 — REUNIÕES SEMANAIS
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
            Reuniões ({reunioes.length})
          </h2>
          <button
            onClick={() => setModalReuniao(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            <Plus size={12} />
            Registrar reunião
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {reunioesOrdenadas.length === 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-8 text-center text-xs text-[#4A4A4A]">
              Nenhuma reunião registrada
            </div>
          )}
          {reunioesOrdenadas.map((reuniao) => {
            const expandida = reuniaoExpandida === reuniao.id
            const statusColor = {
              agendada: 'text-blue-400 bg-blue-400/10',
              realizada: 'text-emerald-400 bg-emerald-400/10',
              cancelada: 'text-[#6B6B6B] bg-[#2A2A2A]',
            }[reuniao.status]

            return (
              <div key={reuniao.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <button
                  onClick={() => setReuniaoExpandida((r) => r === reuniao.id ? null : reuniao.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#FAFAF8] truncate">{reuniao.titulo}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                        {reuniao.status === 'agendada' ? 'Agendada' : reuniao.status === 'realizada' ? 'Realizada' : 'Cancelada'}
                      </span>
                      <span className="text-[10px] text-[#4A4A4A] bg-[#2A2A2A] px-2 py-0.5 rounded-full">
                        {TIPO_REUNIAO_LABEL[reuniao.tipo]}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {fmtData(reuniao.data)} · {reuniao.duracao}min ·{' '}
                      {reuniao.participantes.map((p) => SOCIO_NOME[p]).join(', ')}
                    </p>
                  </div>
                  {expandida ? <ChevronUp size={14} className="text-[#6B6B6B] shrink-0" /> : <ChevronDown size={14} className="text-[#6B6B6B] shrink-0" />}
                </button>

                {expandida && (
                  <div className="px-4 pb-4 border-t border-[#2A2A2A] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reuniao.pauta.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">Pauta</p>
                        <ul className="space-y-1">
                          {reuniao.pauta.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#8A8A8A]">
                              <span className="text-[#4A4A4A] shrink-0">{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reuniao.decisoes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">Decisões</p>
                        <ul className="space-y-1">
                          {reuniao.decisoes.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#8A8A8A]">
                              <Check size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reuniao.ata && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">Ata</p>
                        <p className="text-xs text-[#8A8A8A] leading-relaxed">{reuniao.ata}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — DECISÕES ESTRATÉGICAS
      ══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest">
            Log de Decisões Estratégicas
          </h2>
          <button
            onClick={() => setModalDecisao(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#C9A84C] rounded-lg hover:bg-[#D4B568]"
          >
            <Plus size={12} />
            Nova decisão
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] gap-4 px-4 py-2.5 border-b border-[#2A2A2A]">
            {['Decisão', 'Proposto por', 'Data', 'Votos M · J · G', 'Status'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-[#4A4A4A] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {decisoes.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#4A4A4A]">Nenhuma decisão registrada</div>
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
                  <div key={socio} className="flex gap-0.5">
                    <button onClick={() => handleVotar(decisao.id, 'sim')} className="p-0.5 rounded hover:bg-emerald-400/20 text-emerald-400"><Check size={11} /></button>
                    <button onClick={() => handleVotar(decisao.id, 'nao')} className="p-0.5 rounded hover:bg-red-400/20 text-red-400"><X size={11} /></button>
                    <button onClick={() => handleVotar(decisao.id, 'abstencao')} className="p-0.5 rounded hover:bg-[#3A3A3A] text-[#6B6B6B]"><Minus size={11} /></button>
                  </div>
                )
              }
              const icon = voto === 'sim'
                ? <Check size={11} className="text-emerald-400" />
                : voto === 'nao'
                  ? <X size={11} className="text-red-400" />
                  : voto === 'abstencao'
                    ? <Minus size={11} className="text-[#6B6B6B]" />
                    : <span className="w-2.5 h-2.5 rounded-full border border-[#3A3A3A] inline-block" />
              return (
                <span key={socio} title={`${SOCIO_NOME[socio]}: ${voto}`} className="flex items-center">
                  {icon}
                </span>
              )
            }

            return (
              <div
                key={decisao.id}
                className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] gap-4 px-4 py-3.5 border-b border-[#2A2A2A] last:border-0 items-start hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                {/* Decisão */}
                <div>
                  <p className="text-xs font-semibold text-[#FAFAF8] leading-snug">{decisao.titulo}</p>
                  {decisao.descricao && (
                    <p className="text-[10px] text-[#4A4A4A] mt-0.5 line-clamp-2 leading-relaxed">{decisao.descricao}</p>
                  )}
                </div>

                {/* Proposto por */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${SOCIO_COLOR[decisao.propostoPor]}`}>
                    {SOCIO_INICIAL[decisao.propostoPor]}
                  </div>
                  <span className="text-xs text-[#8A8A8A]">{SOCIO_NOME[decisao.propostoPor]}</span>
                </div>

                {/* Data */}
                <span className="text-xs text-[#8A8A8A]">{fmtDataSimples(decisao.data)}</span>

                {/* Votos M · J · G */}
                <div className="flex items-center gap-2">
                  {(['matheus', 'joao', 'gabriel'] as PerfilUsuario[]).map((s) =>
                    renderVoto(decisao.votos[s], s)
                  )}
                </div>

                {/* Status */}
                <div>{statusBadge}</div>
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
    </div>
  )
}
