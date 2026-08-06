'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check, Trash2, GripVertical, X } from 'lucide-react'
import type { MetaDiaria, MetaChecklistItem } from '@/store'
import { corCategoria, progressoMeta, CATEGORIAS } from './metasHelpers'
import { Confetti } from './Confetti'

interface MetaCardProps {
  meta: MetaDiaria
  itens: MetaChecklistItem[]
  cor: string
  onIncrementar: () => void
  onDecrementar: () => void
  onDefinirValor: (valor: number) => void
  onEditar: (dados: { titulo?: string; valorAlvo?: number | null; unidade?: string | null }) => void
  onConcluir: (concluida: boolean) => void
  onDeletar: () => void
  onAdicionarItem: (texto: string) => void
  onRemoverItem: (id: string) => void
  onMarcarItem: (id: string, feito: boolean) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragging?: boolean
}

export function MetaCard({
  meta, itens, cor,
  onIncrementar, onDecrementar, onDefinirValor, onEditar, onConcluir, onDeletar,
  onAdicionarItem, onRemoverItem, onMarcarItem,
  draggable, onDragStart, onDragOver, onDrop, isDragging,
}: MetaCardProps) {
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTemp, setTituloTemp] = useState(meta.titulo)
  const [editandoAlvo, setEditandoAlvo] = useState(false)
  const [alvoTemp, setAlvoTemp] = useState(String(meta.valorAlvo ?? ''))
  const [editandoValor, setEditandoValor] = useState(false)
  const [valorTemp, setValorTemp] = useState(String(meta.valorAtual))
  const [novoItem, setNovoItem] = useState('')
  const [mostrarConfete, setMostrarConfete] = useState(false)
  const eraConcluidaRef = useRef(meta.concluida)

  const meusItens = itens.filter((i) => i.metaId === meta.id).sort((a, b) => a.ordem - b.ordem)
  const pct = progressoMeta(meta, itens)
  const catCor = corCategoria(meta.categoria)
  const catLabel = CATEGORIAS.find((c) => c.id === meta.categoria)?.label ?? meta.categoria

  useEffect(() => {
    if (!editandoTitulo) setTituloTemp(meta.titulo)
    if (!editandoAlvo) setAlvoTemp(String(meta.valorAlvo ?? ''))
    if (!editandoValor) setValorTemp(String(meta.valorAtual))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.titulo, meta.valorAlvo, meta.valorAtual])

  useEffect(() => {
    if (!eraConcluidaRef.current && meta.concluida) {
      setMostrarConfete(true)
      const t = setTimeout(() => setMostrarConfete(false), 750)
      return () => clearTimeout(t)
    }
    eraConcluidaRef.current = meta.concluida
  }, [meta.concluida])

  function salvarTitulo() {
    setEditandoTitulo(false)
    const t = tituloTemp.trim()
    if (t && t !== meta.titulo) onEditar({ titulo: t })
    else setTituloTemp(meta.titulo)
  }

  function salvarAlvo() {
    setEditandoAlvo(false)
    const v = Number(alvoTemp)
    if (alvoTemp.trim() && !Number.isNaN(v) && v > 0 && v !== meta.valorAlvo) onEditar({ valorAlvo: v })
    else setAlvoTemp(String(meta.valorAlvo ?? ''))
  }

  function submeterNovoItem(e: React.FormEvent) {
    e.preventDefault()
    if (!novoItem.trim()) return
    onAdicionarItem(novoItem.trim())
    setNovoItem('')
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="card-purion"
      style={{
        padding: '14px 16px',
        position: 'relative',
        borderColor: meta.concluida ? 'rgba(34,197,94,0.4)' : undefined,
        background: meta.concluida ? 'rgba(34,197,94,0.04)' : undefined,
        opacity: isDragging ? 0.4 : 1,
        cursor: draggable ? 'grab' : undefined,
        transition: 'opacity 150ms ease, border-color 200ms ease, background 200ms ease',
      }}
    >
      <AnimatePresence>{mostrarConfete && <Confetti />}</AnimatePresence>

      <div className="flex items-start gap-2 mb-2">
        {draggable && (
          <span style={{ color: 'var(--text-secondary)', opacity: 0.5, marginTop: 2, flexShrink: 0 }}>
            <GripVertical size={13} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editandoTitulo ? (
            <input
              autoFocus
              className="input-purion w-full"
              style={{ fontSize: 13, height: 28, padding: '0 8px' }}
              value={tituloTemp}
              onChange={(e) => setTituloTemp(e.target.value)}
              onBlur={salvarTitulo}
              onKeyDown={(e) => { if (e.key === 'Enter') salvarTitulo(); if (e.key === 'Escape') { setTituloTemp(meta.titulo); setEditandoTitulo(false) } }}
            />
          ) : (
            <p
              onClick={() => setEditandoTitulo(true)}
              style={{
                fontSize: 13, fontWeight: 600, cursor: 'text',
                textDecoration: meta.concluida ? 'line-through' : undefined,
                color: meta.concluida ? 'var(--text-secondary)' : 'var(--text-primary)',
              }}
              title="Clique para editar"
            >
              {meta.titulo}
            </p>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, color: catCor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {catLabel}
          </span>
        </div>

        <button
          onClick={() => onConcluir(!meta.concluida)}
          title={meta.concluida ? 'Reabrir meta' : 'Marcar como concluída'}
          className="icon-btn"
          style={{
            width: 24, height: 24, flexShrink: 0,
            color: meta.concluida ? '#22C55E' : 'var(--text-secondary)',
            background: meta.concluida ? 'rgba(34,197,94,0.12)' : undefined,
          }}
        >
          <Check size={13} />
        </button>
        <button onClick={onDeletar} title="Excluir meta" className="icon-btn" style={{ width: 24, height: 24, flexShrink: 0 }}>
          <Trash2 size={12} />
        </button>
      </div>

      {meta.tipo === 'numerica' ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <button onClick={onDecrementar} className="icon-btn" style={{ width: 22, height: 22 }}>
                <Minus size={11} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, padding: '0 2px' }}>
                {editandoValor ? (
                  <input
                    autoFocus
                    type="number"
                    className="input-purion"
                    style={{ width: 54, height: 24, fontSize: 12, padding: '0 6px' }}
                    value={valorTemp}
                    onChange={(e) => setValorTemp(e.target.value)}
                    onBlur={() => {
                      setEditandoValor(false)
                      const v = Number(valorTemp)
                      if (valorTemp.trim() && !Number.isNaN(v) && v >= 0 && v !== meta.valorAtual) onDefinirValor(v)
                      else setValorTemp(String(meta.valorAtual))
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setValorTemp(String(meta.valorAtual)); setEditandoValor(false) } }}
                  />
                ) : (
                  <span
                    onClick={() => setEditandoValor(true)}
                    style={{ fontWeight: 700, color: cor, cursor: 'text' }}
                    title="Clique para digitar o valor exato"
                  >
                    {meta.valorAtual}
                  </span>
                )}
                <span style={{ color: 'var(--text-secondary)' }}>/</span>
                {editandoAlvo ? (
                  <input
                    autoFocus
                    type="number"
                    className="input-purion"
                    style={{ width: 60, height: 24, fontSize: 12, padding: '0 6px' }}
                    value={alvoTemp}
                    onChange={(e) => setAlvoTemp(e.target.value)}
                    onBlur={salvarAlvo}
                    onKeyDown={(e) => { if (e.key === 'Enter') salvarAlvo(); if (e.key === 'Escape') { setAlvoTemp(String(meta.valorAlvo ?? '')); setEditandoAlvo(false) } }}
                  />
                ) : (
                  <span
                    onClick={() => setEditandoAlvo(true)}
                    style={{ color: 'var(--text-secondary)', cursor: 'text' }}
                    title="Clique para editar o alvo"
                  >
                    {meta.valorAlvo ?? '—'} {meta.unidade ?? ''}
                  </span>
                )}
              </span>
              <button onClick={onIncrementar} className="icon-btn" style={{ width: 22, height: 22 }}>
                <Plus size={11} />
              </button>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.concluida ? '#22C55E' : cor }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', background: meta.concluida ? '#22C55E' : cor, borderRadius: 999 }}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {meusItens.filter((i) => i.feito).length} / {meusItens.length} itens
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.concluida ? '#22C55E' : cor }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-surface-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
            <motion.div
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', background: meta.concluida ? '#22C55E' : cor, borderRadius: 999 }}
            />
          </div>
          <div className="flex flex-col gap-1">
            {meusItens.map((item) => (
              <div key={item.id} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={item.feito}
                  onChange={(e) => onMarcarItem(item.id, e.target.checked)}
                />
                <span style={{
                  flex: 1,
                  textDecoration: item.feito ? 'line-through' : undefined,
                  color: item.feito ? 'var(--text-secondary)' : 'var(--text-primary)',
                }}>
                  {item.texto}
                </span>
                <button onClick={() => onRemoverItem(item.id)} className="icon-btn" style={{ width: 18, height: 18 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={submeterNovoItem} className="flex items-center gap-1 mt-2">
            <Plus size={11} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              placeholder="Adicionar item…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text-primary)', padding: '2px 0',
              }}
            />
          </form>
        </div>
      )}
    </div>
  )
}
