'use client'

import { useState } from 'react'
import { GripVertical, Trash2, Plus, X } from 'lucide-react'
import type { KbBloco, TipoBloco, ConteudoBloco } from '@/store'
import { TIPO_BLOCO_LABEL, TIPOS_BLOCO_MENU, conteudoPadrao } from './conhecimentoHelpers'

interface BlocoRendererProps {
  bloco: KbBloco
  isDragging: boolean
  onAtualizar: (conteudo: ConteudoBloco) => void
  onDeletar: () => void
  onAdicionarAbaixo: (tipo: TipoBloco) => void
  onEnterAbaixo: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

const textoBase = 'w-full bg-transparent border-none outline-none resize-none text-[var(--text-primary)]'

export function BlocoRenderer({
  bloco, isDragging, onAtualizar, onDeletar, onAdicionarAbaixo, onEnterAbaixo,
  onDragStart, onDragEnd, onDragOver, onDrop,
}: BlocoRendererProps) {
  const [menuAberto, setMenuAberto] = useState(false)

  function handleKeyDownLinha(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnterAbaixo()
    }
  }

  function renderConteudo() {
    switch (bloco.tipo) {
      case 'titulo': {
        const c = bloco.conteudo as { texto: string }
        return (
          <input
            value={c.texto}
            onChange={(e) => onAtualizar({ texto: e.target.value })}
            onKeyDown={handleKeyDownLinha}
            placeholder="Título"
            className={`${textoBase} text-[28px] font-semibold leading-tight`}
          />
        )
      }
      case 'subtitulo': {
        const c = bloco.conteudo as { texto: string }
        return (
          <input
            value={c.texto}
            onChange={(e) => onAtualizar({ texto: e.target.value })}
            onKeyDown={handleKeyDownLinha}
            placeholder="Subtítulo"
            className={`${textoBase} text-[18px] font-semibold`}
            style={{ color: '#C9A84C' }}
          />
        )
      }
      case 'paragrafo': {
        const c = bloco.conteudo as { texto: string }
        return (
          <textarea
            value={c.texto}
            onChange={(e) => onAtualizar({ texto: e.target.value })}
            onKeyDown={handleKeyDownLinha}
            placeholder="Escreva algo…"
            rows={Math.max(1, c.texto.split('\n').length)}
            className={`${textoBase} text-[14px] leading-relaxed`}
          />
        )
      }
      case 'citacao': {
        const c = bloco.conteudo as { texto: string }
        return (
          <div className="pl-4" style={{ borderLeft: '3px solid #C9A84C' }}>
            <textarea
              value={c.texto}
              onChange={(e) => onAtualizar({ texto: e.target.value })}
              placeholder="Citação…"
              rows={Math.max(1, c.texto.split('\n').length)}
              className={`${textoBase} text-[14px] italic text-[var(--text-secondary)]`}
            />
          </div>
        )
      }
      case 'codigo': {
        const c = bloco.conteudo as { texto: string }
        return (
          <textarea
            value={c.texto}
            onChange={(e) => onAtualizar({ texto: e.target.value })}
            placeholder="código…"
            rows={Math.max(2, c.texto.split('\n').length)}
            className={`${textoBase} text-[13px] p-3 rounded-lg`}
            style={{ fontFamily: 'var(--font-geist-mono), monospace', background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
          />
        )
      }
      case 'callout': {
        const c = bloco.conteudo as { texto: string; emoji: string }
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <input
              value={c.emoji}
              onChange={(e) => onAtualizar({ ...c, emoji: e.target.value.slice(0, 2) })}
              className="bg-transparent border-none outline-none text-[18px] w-7 text-center shrink-0"
            />
            <textarea
              value={c.texto}
              onChange={(e) => onAtualizar({ ...c, texto: e.target.value })}
              placeholder="Destaque…"
              rows={Math.max(1, c.texto.split('\n').length)}
              className={`${textoBase} text-[14px] leading-relaxed`}
            />
          </div>
        )
      }
      case 'divisor':
        return <div className="h-px my-1" style={{ background: 'var(--border)' }} />
      case 'lista': {
        const c = bloco.conteudo as { itens: string[] }
        return (
          <div className="flex flex-col gap-1.5">
            {c.itens.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 group/item">
                <span className="text-[var(--text-secondary)] mt-1.5 select-none">•</span>
                <input
                  value={item}
                  onChange={(e) => {
                    const novos = [...c.itens]; novos[idx] = e.target.value
                    onAtualizar({ itens: novos })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const novos = [...c.itens]; novos.splice(idx + 1, 0, '')
                      onAtualizar({ itens: novos })
                    }
                    if (e.key === 'Backspace' && item === '' && c.itens.length > 1) {
                      e.preventDefault()
                      onAtualizar({ itens: c.itens.filter((_, i) => i !== idx) })
                    }
                  }}
                  className={`${textoBase} text-[14px] flex-1`}
                  placeholder="Item da lista"
                />
                <button
                  onClick={() => onAtualizar({ itens: c.itens.filter((_, i) => i !== idx) })}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity mt-1"
                >
                  <X size={12} className="text-[#E85238]" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onAtualizar({ itens: [...c.itens, ''] })}
              className="text-[12px] text-[var(--text-secondary)] hover:text-[#C9A84C] text-left mt-0.5"
            >
              + adicionar item
            </button>
          </div>
        )
      }
      case 'checklist': {
        const c = bloco.conteudo as { itens: Array<{ texto: string; feito: boolean }> }
        return (
          <div className="flex flex-col gap-1.5">
            {c.itens.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 group/item">
                <input
                  type="checkbox"
                  checked={item.feito}
                  onChange={(e) => {
                    const novos = [...c.itens]; novos[idx] = { ...item, feito: e.target.checked }
                    onAtualizar({ itens: novos })
                  }}
                  className="mt-1.5"
                  style={{ accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }}
                />
                <input
                  value={item.texto}
                  onChange={(e) => {
                    const novos = [...c.itens]; novos[idx] = { ...item, texto: e.target.value }
                    onAtualizar({ itens: novos })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const novos = [...c.itens]; novos.splice(idx + 1, 0, { texto: '', feito: false })
                      onAtualizar({ itens: novos })
                    }
                  }}
                  placeholder="Item do checklist"
                  className={`${textoBase} text-[14px] flex-1 ${item.feito ? 'line-through text-[var(--text-secondary)]' : ''}`}
                />
                <button
                  onClick={() => onAtualizar({ itens: c.itens.filter((_, i) => i !== idx) })}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity mt-1"
                >
                  <X size={12} className="text-[#E85238]" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onAtualizar({ itens: [...c.itens, { texto: '', feito: false }] })}
              className="text-[12px] text-[var(--text-secondary)] hover:text-[#C9A84C] text-left mt-0.5"
            >
              + adicionar item
            </button>
          </div>
        )
      }
      case 'tabela': {
        const c = bloco.conteudo as { colunas: string[]; linhas: string[][] }
        return (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-purion">
              <thead>
                <tr>
                  {c.colunas.map((col, ci) => (
                    <th key={ci}>
                      <input
                        value={col}
                        onChange={(e) => {
                          const novas = [...c.colunas]; novas[ci] = e.target.value
                          onAtualizar({ ...c, colunas: novas })
                        }}
                        className="bg-transparent border-none outline-none w-full text-[11px] uppercase font-semibold"
                      />
                    </th>
                  ))}
                  <th style={{ width: 28 }}>
                    <button onClick={() => onAtualizar({ ...c, colunas: [...c.colunas, 'Coluna'], linhas: c.linhas.map((l) => [...l, '']) })}>
                      <Plus size={12} className="text-[var(--text-secondary)]" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.linhas.map((linha, li) => (
                  <tr key={li}>
                    {linha.map((cel, ci) => (
                      <td key={ci}>
                        <input
                          value={cel}
                          onChange={(e) => {
                            const novas = c.linhas.map((l) => [...l])
                            novas[li][ci] = e.target.value
                            onAtualizar({ ...c, linhas: novas })
                          }}
                          className="bg-transparent border-none outline-none w-full text-[13px]"
                        />
                      </td>
                    ))}
                    <td>
                      <button onClick={() => onAtualizar({ ...c, linhas: c.linhas.filter((_, i) => i !== li) })}>
                        <X size={11} className="text-[#E85238]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => onAtualizar({ ...c, linhas: [...c.linhas, c.colunas.map(() => '')] })}
              className="text-[12px] text-[var(--text-secondary)] hover:text-[#C9A84C] mt-2"
            >
              + adicionar linha
            </button>
          </div>
        )
      }
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative flex items-start gap-2 py-1 rounded-lg transition-opacity"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1.5">
        <GripVertical size={14} className="text-[var(--text-secondary)] cursor-grab" />
      </div>

      <div className="flex-1 min-w-0">{renderConteudo()}</div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 relative">
        <button onClick={() => setMenuAberto(!menuAberto)} className="icon-btn border-0" style={{ width: 24, height: 24 }} title="Adicionar bloco abaixo">
          <Plus size={13} />
        </button>
        <button onClick={onDeletar} className="icon-btn border-0" style={{ width: 24, height: 24 }} title="Excluir bloco">
          <Trash2 size={13} className="text-[#E85238]" />
        </button>

        {menuAberto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg py-1 min-w-[150px] shadow-xl">
              {TIPOS_BLOCO_MENU.map((t) => (
                <button
                  key={t}
                  onClick={() => { onAdicionarAbaixo(t); setMenuAberto(false) }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  {TIPO_BLOCO_LABEL[t]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { conteudoPadrao }
