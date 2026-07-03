'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Edit2, X, Brain } from 'lucide-react'
import { useQuadros } from '@/hooks/useQuadros'
import type { Quadro } from '@/store'

const EMOJIS = ['🧠', '📋', '🗂️', '💡', '🎯', '📊', '🚀', '🔗', '⚡', '🌟', '🛠️', '🎨']

function ModalQuadro({
  inicial,
  onSalvar,
  onFechar,
}: {
  inicial?: Partial<Quadro>
  onSalvar: (nome: string, emoji: string, descricao: string) => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [emoji, setEmoji] = useState(inicial?.emoji ?? '🧠')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')

  function submit() {
    if (!nome.trim()) return
    onSalvar(nome.trim(), emoji, descricao.trim())
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="modal-container" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            {inicial?.id ? 'Editar Quadro' : 'Novo Quadro'}
          </h2>
          <button className="icon-btn" onClick={onFechar}><X size={15} /></button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {/* Emoji picker */}
          <div>
            <label className="label-purion">Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 20,
                    background: emoji === e ? 'rgba(201,168,76,0.15)' : 'var(--bg-surface-2)',
                    border: `2px solid ${emoji === e ? '#C9A84C' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-purion">Nome do Quadro *</label>
            <input
              className="input-purion"
              style={{ marginTop: 4 }}
              placeholder="Ex: Estratégia de Lançamento"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              autoFocus
            />
          </div>

          <div>
            <label className="label-purion">Descrição</label>
            <textarea
              className="input-purion"
              style={{ marginTop: 4, resize: 'vertical', minHeight: 64 }}
              placeholder="Para que serve este quadro..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={!nome.trim()}>
            {inicial?.id ? 'Salvar' : 'Criar Quadro'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CardQuadro({ quadro, onEditar, onDeletar }: { quadro: Quadro; onEditar: () => void; onDeletar: () => void }) {
  const [hover, setHover] = useState(false)
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(quadro.updatedAt))

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        border: `1px solid ${hover ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #C9A84C, #8B5CF6)' }} />

      {/* Actions (hover) */}
      {hover && (
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 2 }}>
          <button
            className="icon-btn"
            onClick={(e) => { e.preventDefault(); onEditar() }}
            title="Editar"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="icon-btn"
            onClick={(e) => { e.preventDefault(); onDeletar() }}
            title="Deletar"
            style={{ width: 28, height: 28, borderRadius: 6, color: '#EF4444' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Card body (whole card is a link) */}
      <Link
        href={`/quadros/${quadro.id}`}
        style={{ display: 'block', padding: '18px 18px 14px', textDecoration: 'none' }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>{quadro.emoji}</div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {quadro.nome}
        </h3>
        {quadro.descricao && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 8 }}>
            {quadro.descricao}
          </p>
        )}
        <span className="caption">Atualizado em {dateFmt}</span>
      </Link>
    </div>
  )
}

export function QuadrosPage() {
  const { quadros, criarQuadro, editarQuadro, deletarQuadro } = useQuadros()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Quadro | null>(null)

  async function handleSalvar(nome: string, emoji: string, descricao: string) {
    if (editando) {
      await editarQuadro(editando.id, { nome, emoji, descricao })
      setEditando(null)
    } else {
      await criarQuadro(nome, emoji, descricao)
      setModalAberto(false)
    }
  }

  async function handleDeletar(quadro: Quadro) {
    if (!confirm(`Deletar "${quadro.nome}"? Todos os nós e conexões serão apagados.`)) return
    await deletarQuadro(quadro.id)
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={22} style={{ color: '#C9A84C' }} />
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Quadros</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Canvas colaborativo — post-its, fluxos e mapas mentais
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>
          <Plus size={15} />
          Novo Quadro
        </button>
      </div>

      {quadros.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 320, gap: 12, color: 'var(--text-secondary)',
          border: '1px dashed var(--border)', borderRadius: 16,
        }}>
          <Brain size={40} style={{ opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Nenhum quadro ainda</p>
          <button className="btn btn-primary btn-sm" onClick={() => setModalAberto(true)}>
            <Plus size={13} /> Criar primeiro quadro
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {quadros.map((q) => (
            <CardQuadro
              key={q.id}
              quadro={q}
              onEditar={() => setEditando(q)}
              onDeletar={() => handleDeletar(q)}
            />
          ))}

          {/* Add card */}
          <button
            onClick={() => setModalAberto(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, minHeight: 140,
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 14, cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Plus size={22} />
            <span style={{ fontSize: 13 }}>Novo quadro</span>
          </button>
        </div>
      )}

      {(modalAberto || editando) && (
        <ModalQuadro
          inicial={editando ?? undefined}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}
    </div>
  )
}
