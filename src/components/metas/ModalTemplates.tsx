'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { PerfilUsuario } from '@/store'
import { SOCIOS, TEMPLATES_POR_SOCIO, corCategoria, CATEGORIAS } from './metasHelpers'

interface ModalTemplatesProps {
  socio: PerfilUsuario
  onFechar: () => void
  onAplicar: (indices: number[]) => void
}

export function ModalTemplates({ socio, onFechar, onAplicar }: ModalTemplatesProps) {
  const templates = TEMPLATES_POR_SOCIO[socio]
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set(templates.map((_, i) => i)))
  const nomeSocio = SOCIOS.find((s) => s.id === socio)?.nome ?? socio

  function toggle(i: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#C9A84C' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Modelo de metas — {nomeSocio}</h2>
          </div>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Metas prontas alinhadas ao funil da máquina de vendas. Desmarque o que não quiser criar.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {templates.map((t, i) => (
            <label
              key={i}
              className="card-purion flex items-center gap-3"
              style={{ padding: '10px 14px', cursor: 'pointer' }}
            >
              <input type="checkbox" checked={selecionados.has(i)} onChange={() => toggle(i)} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{t.titulo}</p>
                <span style={{ fontSize: 10, fontWeight: 600, color: corCategoria(t.categoria), textTransform: 'uppercase' }}>
                  {CATEGORIAS.find((c) => c.id === t.categoria)?.label}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C' }}>
                {t.valorAlvo} {t.unidade}
              </span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="btn btn-secondary">Cancelar</button>
          <button
            onClick={() => onAplicar(Array.from(selecionados))}
            disabled={selecionados.size === 0}
            className="btn btn-primary"
          >
            Adicionar {selecionados.size} meta{selecionados.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
