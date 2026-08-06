'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { TipoMeta, CategoriaMeta, EscopoMeta, PerfilUsuario } from '@/store'
import { CATEGORIAS, TIPO_LABEL } from './metasHelpers'

export interface NovaMetaCompleta {
  titulo: string
  tipo: TipoMeta
  categoria: CategoriaMeta
  valorAlvo: number | null
  unidade: string | null
  recorrente: boolean
  itensChecklist: string[]
}

interface ModalMetaCompletaProps {
  escopo: EscopoMeta
  responsavel: PerfilUsuario | null
  tituloInicial?: string
  onFechar: () => void
  onSalvar: (dados: NovaMetaCompleta) => void
}

export function ModalMetaCompleta({ escopo, responsavel, tituloInicial, onFechar, onSalvar }: ModalMetaCompletaProps) {
  const [titulo, setTitulo] = useState(tituloInicial ?? '')
  const [tipo, setTipo] = useState<TipoMeta>('numerica')
  const [categoria, setCategoria] = useState<CategoriaMeta>('geral')
  const [valorAlvo, setValorAlvo] = useState('1')
  const [unidade, setUnidade] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [itens, setItens] = useState<string[]>([])
  const [novoItem, setNovoItem] = useState('')

  function adicionarItem() {
    if (!novoItem.trim()) return
    setItens((prev) => [...prev, novoItem.trim()])
    setNovoItem('')
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (tipo === 'checklist' && itens.length === 0) return
    onSalvar({
      titulo: titulo.trim(),
      tipo,
      categoria,
      valorAlvo: tipo === 'numerica' ? (Number(valorAlvo) || 1) : null,
      unidade: unidade.trim() || null,
      recorrente,
      itensChecklist: itens,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            Nova meta{escopo === 'time' ? ' do time' : responsavel ? ` — ${responsavel}` : ''}
          </h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Título *</label>
            <input className="input-purion w-full" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Tipo</label>
              <select className="select-purion w-full" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMeta)}>
                {(['numerica', 'checklist'] as TipoMeta[]).map((t) => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Categoria</label>
              <select className="select-purion w-full" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaMeta)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {tipo === 'numerica' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="kpi-label mb-1 block">Alvo</label>
                <input type="number" min={1} className="input-purion w-full" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="kpi-label mb-1 block">Unidade</label>
                <input className="input-purion w-full" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="contatos, dms…" />
              </div>
            </div>
          ) : (
            <div>
              <label className="kpi-label mb-1 block">Itens do checklist *</label>
              <div className="flex flex-col gap-1 mb-2">
                {itens.map((item, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{item}</span>
                    <button type="button" onClick={() => setItens((prev) => prev.filter((_, idx) => idx !== i))} className="icon-btn" style={{ width: 20, height: 20 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-purion w-full"
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem() } }}
                  placeholder="Adicionar item e Enter"
                />
                <button type="button" onClick={adicionarItem} className="btn btn-secondary btn-sm"><Plus size={12} /></button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2" style={{ fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
            Meta recorrente (renasce todo dia)
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar meta</button>
          </div>
        </form>
      </div>
    </div>
  )
}
