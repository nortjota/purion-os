'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Trash2, Paperclip, Send, ChevronDown, AlertTriangle,
  Image as ImageIcon, FileText, Clock, GripVertical,
} from 'lucide-react'
import type { Tarefa, StatusTarefa, PrioridadeTarefa, PerfilUsuario, RecorrenciaTarefa, Subtarefa } from '@/store'
import { formatarDataBR, formatarDataRelativa } from '@/lib/calculos'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  SOCIOS, MODULOS, STATUS_LABEL, PRIORIDADE_CONFIG, RECORRENCIA_LABEL, prazoVisual, socioInfo,
} from './tarefasHelpers'

interface TarefaDetalhesPainelProps {
  tarefa: Tarefa
  onFechar: () => void
  onSalvar: (id: string, dados: Partial<Tarefa>) => void
  onDeletar: (tarefa: Tarefa) => void
  onAdicionarSubtarefa: (tarefaId: string, titulo: string, ordem: number) => void
  onAtualizarSubtarefa: (id: string, dados: Partial<Pick<Subtarefa, 'titulo' | 'concluida' | 'ordem'>>) => void
  onDeletarSubtarefa: (id: string) => void
  onReordenarSubtarefas: (atualizacoes: Array<{ id: string; ordem: number }>) => void
  onAdicionarComentario: (tarefaId: string, texto: string) => void
  onDeletarComentario: (id: string) => void
  onUploadAnexo: (tarefaId: string, file: File) => void
  onDeletarAnexo: (id: string, url: string) => void
}

function isImagem(tipo: string) { return tipo.startsWith('image/') }

function formatarKb(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

export function TarefaDetalhesPainel(props: TarefaDetalhesPainelProps) {
  const { tarefa, onFechar, onSalvar, onDeletar } = props
  const isMobile = useMobile()

  const [titulo, setTitulo] = useState(tarefa.titulo)
  const [descricao, setDescricao] = useState(tarefa.descricao)
  const [novaSubtarefa, setNovaSubtarefa] = useState('')
  const [novoComentario, setNovoComentario] = useState('')
  const [dragSubId, setDragSubId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const prazo = prazoVisual(tarefa.dueDate, tarefa.status)
  const inicioInfo = socioInfo(tarefa.responsavel)
  const subConcluidas = tarefa.subtarefas.filter((s) => s.concluida).length
  const subTotal = tarefa.subtarefas.length
  const progresso = subTotal > 0 ? Math.round((subConcluidas / subTotal) * 100) : 0

  function salvarTitulo() {
    const t = titulo.trim()
    if (t && t !== tarefa.titulo) onSalvar(tarefa.id, { titulo: t })
  }
  function salvarDescricao() {
    if (descricao !== tarefa.descricao) onSalvar(tarefa.id, { descricao })
  }

  function handleAddSubtarefa(e: React.FormEvent) {
    e.preventDefault()
    const t = novaSubtarefa.trim()
    if (!t) return
    const ordem = tarefa.subtarefas.length > 0 ? Math.max(...tarefa.subtarefas.map((s) => s.ordem)) + 1 : 0
    props.onAdicionarSubtarefa(tarefa.id, t, ordem)
    setNovaSubtarefa('')
  }

  function handleAddComentario(e: React.FormEvent) {
    e.preventDefault()
    const t = novoComentario.trim()
    if (!t) return
    props.onAdicionarComentario(tarefa.id, t)
    setNovoComentario('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) props.onUploadAnexo(tarefa.id, file)
    e.target.value = ''
  }

  function handleSubDragStart(id: string) { setDragSubId(id) }
  function handleSubDrop(targetId: string) {
    if (!dragSubId || dragSubId === targetId) { setDragSubId(null); return }
    const lista = [...tarefa.subtarefas].sort((a, b) => a.ordem - b.ordem)
    const fromIdx = lista.findIndex((s) => s.id === dragSubId)
    const toIdx = lista.findIndex((s) => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragSubId(null); return }
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    props.onReordenarSubtarefas(lista.map((s, idx) => ({ id: s.id, ordem: idx })))
    setDragSubId(null)
  }

  const conteudo = (
    <div className="flex flex-col gap-6">
      {/* Título */}
      <div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={salvarTitulo}
          className="w-full bg-transparent border-none outline-none text-[18px] font-semibold text-[var(--text-primary)]"
          placeholder="Título da tarefa"
        />
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          onBlur={salvarDescricao}
          placeholder="Adicionar descrição…"
          rows={3}
          className="w-full bg-transparent border-none outline-none resize-none text-[13px] text-[var(--text-secondary)] mt-1"
        />
      </div>

      {/* Selects: responsável, status, prioridade, módulo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-purion">Responsável</label>
          <select className="select-purion" value={tarefa.responsavel} onChange={(e) => onSalvar(tarefa.id, { responsavel: e.target.value as PerfilUsuario })}>
            {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label-purion">Status</label>
          <select className="select-purion" value={tarefa.status} onChange={(e) => onSalvar(tarefa.id, { status: e.target.value as StatusTarefa, completedAt: e.target.value === 'concluida' ? new Date().toISOString() : null })}>
            {(Object.keys(STATUS_LABEL) as StatusTarefa[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label-purion">Prioridade</label>
          <select className="select-purion" value={tarefa.prioridade} onChange={(e) => onSalvar(tarefa.id, { prioridade: e.target.value as PrioridadeTarefa })}>
            {(Object.keys(PRIORIDADE_CONFIG) as PrioridadeTarefa[]).map((p) => <option key={p} value={p}>{PRIORIDADE_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="label-purion">Módulo</label>
          <select className="select-purion" value={tarefa.modulo} onChange={(e) => onSalvar(tarefa.id, { modulo: e.target.value })}>
            {MODULOS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Motivo de bloqueio */}
      {tarefa.status === 'bloqueada' && (
        <div className="bg-[rgba(232,168,56,0.06)] border border-[rgba(232,168,56,0.2)] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#E8A838] font-semibold">
            <AlertTriangle size={12} /> Motivo do bloqueio
          </div>
          <textarea
            defaultValue={tarefa.motivoBloqueio ?? ''}
            onBlur={(e) => onSalvar(tarefa.id, { motivoBloqueio: e.target.value })}
            placeholder="Descreva o bloqueio…" rows={2}
            className="w-full bg-[var(--bg-primary)] border border-[rgba(232,168,56,0.2)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:border-[rgba(232,168,56,0.5)]"
          />
        </div>
      )}

      {/* Datas */}
      <div>
        <p className="kpi-label mb-2.5">Datas</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label-purion">Início</label>
            <input type="date" className="input-purion" value={tarefa.startDate ?? ''} onChange={(e) => onSalvar(tarefa.id, { startDate: e.target.value || null })} />
          </div>
          <div>
            <label className="label-purion">Lembrete</label>
            <input type="datetime-local" className="input-purion" value={tarefa.lembreteEm ?? ''} onChange={(e) => onSalvar(tarefa.id, { lembreteEm: e.target.value || null })} />
          </div>
        </div>
        <label className="label-purion">Prazo</label>
        <input type="date" className="input-purion mb-2" value={tarefa.dueDate ?? ''} onChange={(e) => onSalvar(tarefa.id, { dueDate: e.target.value || null })} />
        {tarefa.dueDate && prazo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: prazo.bg }}>
            <Clock size={13} style={{ color: prazo.cor }} />
            <span className="text-[12px] font-semibold" style={{ color: prazo.cor }}>
              {prazo.label || formatarDataRelativa(tarefa.dueDate)}
            </span>
            <span className="caption">· {formatarDataBR(tarefa.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Recorrência */}
      <div>
        <p className="kpi-label mb-2.5">Recorrência</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <select className="select-purion" value={tarefa.recorrencia} onChange={(e) => onSalvar(tarefa.id, { recorrencia: e.target.value as RecorrenciaTarefa })}>
              {Object.entries(RECORRENCIA_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          {tarefa.recorrencia !== 'nenhuma' && (
            <div>
              <input type="date" className="input-purion" placeholder="Repetir até" value={tarefa.recorrenciaAte ?? ''} onChange={(e) => onSalvar(tarefa.id, { recorrenciaAte: e.target.value || null })} />
            </div>
          )}
        </div>
      </div>

      {/* Estimativa */}
      <div>
        <label className="label-purion">Estimativa (minutos)</label>
        <input type="number" min={0} className="input-purion" value={tarefa.estimativaMin ?? ''} placeholder="ex: 60"
          onChange={(e) => onSalvar(tarefa.id, { estimativaMin: e.target.value ? Number(e.target.value) : null })} />
      </div>

      {/* Subtarefas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="kpi-label">Subtarefas {subTotal > 0 && `(${subConcluidas}/${subTotal})`}</p>
        </div>
        {subTotal > 0 && (
          <div className="progress-bar mb-3">
            <div className="progress-fill" style={{ width: `${progresso}%` }} />
          </div>
        )}
        <div className="flex flex-col gap-1.5 mb-2">
          {[...tarefa.subtarefas].sort((a, b) => a.ordem - b.ordem).map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => handleSubDragStart(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleSubDrop(s.id)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg group"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', opacity: dragSubId === s.id ? 0.4 : 1 }}
            >
              <GripVertical size={12} className="text-[var(--text-secondary)] cursor-grab opacity-40" />
              <input
                type="checkbox"
                checked={s.concluida}
                onChange={(e) => props.onAtualizarSubtarefa(s.id, { concluida: e.target.checked })}
                style={{ accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }}
              />
              <span className={`text-[13px] flex-1 ${s.concluida ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                {s.titulo}
              </span>
              <button onClick={() => props.onDeletarSubtarefa(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} className="text-[#E85238]" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddSubtarefa} className="flex gap-2">
          <input
            value={novaSubtarefa}
            onChange={(e) => setNovaSubtarefa(e.target.value)}
            placeholder="Adicionar subtarefa…"
            className="input-purion"
            style={{ height: 36, fontSize: 13 }}
          />
          <button type="submit" className="icon-btn"><Plus size={14} /></button>
        </form>
      </div>

      {/* Anexos */}
      <div>
        <p className="kpi-label mb-2.5">Anexos</p>
        <div className="flex flex-col gap-2 mb-2">
          {tarefa.anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg group" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
              {isImagem(a.tipo) ? (
                <img src={a.url} alt={a.nome} className="w-9 h-9 rounded object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded flex items-center justify-center shrink-0" style={{ background: 'var(--bg-surface)' }}>
                  <FileText size={15} className="text-[var(--text-secondary)]" />
                </div>
              )}
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                <p className="text-[12px] text-[var(--text-primary)] truncate">{a.nome}</p>
                <p className="caption">{formatarKb(a.tamanhoKb)}</p>
              </a>
              <button onClick={() => props.onDeletarAnexo(a.id, a.url)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} className="text-[#E85238]" />
              </button>
            </div>
          ))}
        </div>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">
          <Paperclip size={13} /> Anexar arquivo
        </button>
        <p className="caption mt-1">Limite de 10MB por arquivo</p>
      </div>

      {/* Comentários */}
      <div>
        <p className="kpi-label mb-2.5">Comentários</p>
        <div className="flex flex-col gap-3 mb-3">
          {tarefa.comentarios.length === 0 && <p className="caption">Nenhum comentário ainda.</p>}
          {tarefa.comentarios.map((c) => (
            <div key={c.id} className="group">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">{c.autor}</span>
                <div className="flex items-center gap-2">
                  <span className="caption">{formatarDataRelativa(c.createdAt.slice(0, 10))}</span>
                  <button onClick={() => props.onDeletarComentario(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={11} className="text-[#E85238]" />
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{c.texto}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddComentario} className="flex gap-2">
          <input
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Escrever um comentário…"
            className="input-purion"
            style={{ height: 36, fontSize: 13 }}
          />
          <button type="submit" className="icon-btn"><Send size={13} /></button>
        </form>
      </div>

      {/* Excluir */}
      <button onClick={() => onDeletar(tarefa)} className="btn btn-danger btn-sm w-full">
        <Trash2 size={13} /> Excluir tarefa
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open onClose={onFechar} title={tarefa.titulo}>
        {conteudo}
      </BottomSheet>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150 }}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 480, maxWidth: '92vw',
          background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', zIndex: 151,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <span className="caption">Detalhes da tarefa</span>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {conteudo}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
