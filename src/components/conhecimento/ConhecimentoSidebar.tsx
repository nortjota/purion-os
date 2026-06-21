'use client'

import { useMemo } from 'react'
import { Search, Plus, Star } from 'lucide-react'
import type { KbCategoria, KbDocumento } from '@/store'
import { resolverIcone } from './conhecimentoHelpers'

interface ConhecimentoSidebarProps {
  categorias: KbCategoria[]
  documentos: KbDocumento[]
  documentoAtivoId: string | null
  busca: string
  onBuscaChange: (v: string) => void
  onSelecionar: (id: string) => void
  onNovoDocumento: (categoriaId: string | null) => void
}

export function ConhecimentoSidebar({
  categorias, documentos, documentoAtivoId, busca, onBuscaChange, onSelecionar, onNovoDocumento,
}: ConhecimentoSidebarProps) {
  const documentosFiltrados = useMemo(() => {
    if (!busca.trim()) return documentos
    const q = busca.trim().toLowerCase()
    return documentos.filter((d) => d.titulo.toLowerCase().includes(q) || d.resumo.toLowerCase().includes(q))
  }, [documentos, busca])

  const favoritos = documentosFiltrados.filter((d) => d.favorito)

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
      <div className="p-3 shrink-0">
        <div
          className="flex items-center gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 36 }}
        >
          <Search size={13} color="var(--text-secondary)" />
          <input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {favoritos.length > 0 && (
          <div className="mb-3">
            <p className="kpi-label px-2 mb-1">Favoritos</p>
            {favoritos.map((doc) => (
              <DocItem key={doc.id} doc={doc} ativo={documentoAtivoId === doc.id} onClick={() => onSelecionar(doc.id)} />
            ))}
          </div>
        )}

        {categorias.map((cat) => {
          const docsCategoria = documentosFiltrados.filter((d) => d.categoriaId === cat.id)
          if (busca.trim() && docsCategoria.length === 0) return null
          const Icon = resolverIcone(cat.icone)
          return (
            <div key={cat.id} className="mb-3">
              <div className="flex items-center justify-between px-2 mb-1 group">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: cat.cor }}>
                  <Icon size={12} />
                  {cat.nome}
                </span>
                <button
                  onClick={() => onNovoDocumento(cat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Novo documento nesta categoria"
                >
                  <Plus size={12} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              {docsCategoria.map((doc) => (
                <DocItem key={doc.id} doc={doc} ativo={documentoAtivoId === doc.id} onClick={() => onSelecionar(doc.id)} />
              ))}
              {docsCategoria.length === 0 && !busca.trim() && (
                <p className="px-2 caption" style={{ fontSize: 11 }}>Nenhum documento</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <button onClick={() => onNovoDocumento(null)} className="btn btn-primary btn-sm w-full">
          <Plus size={13} /> Novo documento
        </button>
      </div>
    </div>
  )
}

function DocItem({ doc, ativo, onClick }: { doc: KbDocumento; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-150"
      style={{
        background: ativo ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: ativo ? '#C9A84C' : 'var(--text-secondary)',
      }}
    >
      <span className="shrink-0">{doc.emoji}</span>
      <span className="text-[13px] truncate flex-1">{doc.titulo}</span>
      {doc.favorito && <Star size={11} fill="#C9A84C" className="text-[#C9A84C] shrink-0" />}
    </button>
  )
}
