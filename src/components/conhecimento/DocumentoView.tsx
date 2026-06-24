'use client'

import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import type { KbDocumento, KbBloco, TipoBloco, ConteudoBloco } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { BlocoRenderer, conteudoPadrao } from './BlocoRenderer'

interface DocumentoViewProps {
  documento: KbDocumento
  blocos: KbBloco[]
  onAtualizarDocumento: (id: string, dados: Partial<Pick<KbDocumento, 'titulo' | 'emoji' | 'resumo' | 'favorito'>>) => void
  onDeletarDocumento: (id: string) => void
  onCriarBloco: (documentoId: string, tipo: TipoBloco, conteudo: ConteudoBloco, ordem: number) => Promise<KbBloco | null>
  onAtualizarBloco: (id: string, dados: Partial<Pick<KbBloco, 'conteudo'>>) => void
  onDeletarBloco: (id: string) => void
  onReordenarBlocos: (atualizacoes: Array<{ id: string; ordem: number }>) => void
}

export function DocumentoView({
  documento, blocos, onAtualizarDocumento, onDeletarDocumento,
  onCriarBloco, onAtualizarBloco, onDeletarBloco, onReordenarBlocos,
}: DocumentoViewProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const blocosOrdenados = [...blocos].sort((a, b) => a.ordem - b.ordem)

  async function handleAdicionarAbaixo(ordemAtual: number, tipo: TipoBloco) {
    await onCriarBloco(documento.id, tipo, conteudoPadrao(tipo), ordemAtual + 0.5)
    // Renumerar para manter inteiros
    const reordenadas = [...blocosOrdenados]
    const idx = reordenadas.findIndex((b) => b.ordem === ordemAtual)
    onReordenarBlocos(reordenadas.map((b, i) => ({ id: b.id, ordem: i <= idx ? i : i + 1 })))
  }

  function handleDragStart(id: string) { setDragId(id) }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return }
    const lista = [...blocosOrdenados]
    const fromIdx = lista.findIndex((b) => b.id === dragId)
    const toIdx = lista.findIndex((b) => b.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); return }
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    onReordenarBlocos(lista.map((b, idx) => ({ id: b.id, ordem: idx })))
    setDragId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-8 py-10">

        {/* Header do documento */}
        <div className="mb-8">
          <input
            value={documento.emoji}
            onChange={(e) => onAtualizarDocumento(documento.id, { emoji: e.target.value.slice(0, 2) })}
            className="bg-transparent border-none outline-none text-[40px] mb-2 block"
            style={{ width: 60 }}
          />
          <div className="flex items-start justify-between gap-3">
            <input
              value={documento.titulo}
              onChange={(e) => onAtualizarDocumento(documento.id, { titulo: e.target.value })}
              placeholder="Título do documento"
              className="bg-transparent border-none outline-none text-[32px] font-semibold text-[var(--text-primary)] flex-1"
            />
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={() => onAtualizarDocumento(documento.id, { favorito: !documento.favorito })}
                className="icon-btn border-0"
                title={documento.favorito ? 'Remover dos favoritos' : 'Favoritar'}
              >
                <Star size={16} fill={documento.favorito ? '#C9A84C' : 'none'} className={documento.favorito ? 'text-[#C9A84C]' : 'text-[var(--text-secondary)]'} />
              </button>
              <button onClick={() => onDeletarDocumento(documento.id)} className="icon-btn border-0" title="Excluir documento">
                <Trash2 size={15} className="text-[#E85238]" />
              </button>
            </div>
          </div>
          <textarea
            value={documento.resumo}
            onChange={(e) => onAtualizarDocumento(documento.id, { resumo: e.target.value })}
            placeholder="Resumo (opcional)"
            rows={1}
            className="w-full bg-transparent border-none outline-none resize-none text-[14px] text-[var(--text-secondary)] mt-1"
          />
          <p className="caption mt-2">
            {documento.atualizadoPor ? `Atualizado por ${documento.atualizadoPor} em ${formatarDataBR(documento.updatedAt.slice(0, 10))}` : `Criado em ${formatarDataBR(documento.updatedAt.slice(0, 10))}`}
          </p>
        </div>

        {/* Blocos */}
        <div className="flex flex-col gap-0.5">
          {blocosOrdenados.length === 0 && (
            <button
              onClick={() => onCriarBloco(documento.id, 'paragrafo', conteudoPadrao('paragrafo'), 0)}
              className="text-[14px] text-[var(--text-secondary)] hover:text-[#C9A84C] py-2"
            >
              + Clique para adicionar o primeiro bloco
            </button>
          )}
          {blocosOrdenados.map((bloco) => (
            <BlocoRenderer
              key={bloco.id}
              bloco={bloco}
              isDragging={dragId === bloco.id}
              onAtualizar={(conteudo) => onAtualizarBloco(bloco.id, { conteudo })}
              onDeletar={() => onDeletarBloco(bloco.id)}
              onAdicionarAbaixo={(tipo) => handleAdicionarAbaixo(bloco.ordem, tipo)}
              onEnterAbaixo={() => handleAdicionarAbaixo(bloco.ordem, 'paragrafo')}
              onDragStart={() => handleDragStart(bloco.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(bloco.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
