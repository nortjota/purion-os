'use client'

import { useState } from 'react'
import type { TipoBloco, ConteudoBloco } from '@/store'
import { BlocoRenderer, type BlocoBase } from './BlocoRenderer'
import { conteudoPadrao } from './blocksHelpers'

interface BlockEditorProps<T extends BlocoBase> {
  blocos: T[]
  onCriarBloco: (tipo: TipoBloco, conteudo: ConteudoBloco, ordem: number) => Promise<{ id: string } | null>
  onAtualizarBloco: (id: string, conteudo: ConteudoBloco) => void
  onDeletarBloco: (id: string) => void
  onReordenarBlocos: (atualizacoes: Array<{ id: string; ordem: number }>) => void
  placeholderVazio?: string
}

export function BlockEditor<T extends BlocoBase & { ordem: number }>({
  blocos, onCriarBloco, onAtualizarBloco, onDeletarBloco, onReordenarBlocos,
  placeholderVazio = "+ Digite '/' para comandos ou clique para começar a escrever",
}: BlockEditorProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null)
  const blocosOrdenados = [...blocos].sort((a, b) => a.ordem - b.ordem)

  async function handleAdicionarAbaixo(ordemAtual: number, tipo: TipoBloco) {
    await onCriarBloco(tipo, conteudoPadrao(tipo), ordemAtual + 0.5)
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
    <div className="flex flex-col gap-0.5">
      {blocosOrdenados.length === 0 && (
        <button
          onClick={() => onCriarBloco('paragrafo', conteudoPadrao('paragrafo'), 0)}
          className="text-[14px] text-[var(--text-secondary)] hover:text-[#C9A84C] py-2 text-left"
        >
          {placeholderVazio}
        </button>
      )}
      {blocosOrdenados.map((bloco) => (
        <BlocoRenderer
          key={bloco.id}
          bloco={bloco}
          isDragging={dragId === bloco.id}
          onAtualizar={(conteudo) => onAtualizarBloco(bloco.id, conteudo)}
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
  )
}
