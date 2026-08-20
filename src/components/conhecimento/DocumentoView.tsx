'use client'

import { Star, Trash2 } from 'lucide-react'
import type { KbDocumento, KbBloco, TipoBloco, ConteudoBloco } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { BlockEditor } from '@/components/blocks/BlockEditor'

interface DocumentoViewProps {
  documento: KbDocumento
  blocos: KbBloco[]
  podeExcluir: boolean
  onAtualizarDocumento: (id: string, dados: Partial<Pick<KbDocumento, 'titulo' | 'emoji' | 'resumo' | 'favorito'>>) => void
  onDeletarDocumento: (id: string) => void
  onCriarBloco: (documentoId: string, tipo: TipoBloco, conteudo: ConteudoBloco, ordem: number) => Promise<KbBloco | null>
  onAtualizarBloco: (id: string, dados: Partial<Pick<KbBloco, 'conteudo'>>) => void
  onDeletarBloco: (id: string) => void
  onReordenarBlocos: (atualizacoes: Array<{ id: string; ordem: number }>) => void
}

export function DocumentoView({
  documento, blocos, podeExcluir, onAtualizarDocumento, onDeletarDocumento,
  onCriarBloco, onAtualizarBloco, onDeletarBloco, onReordenarBlocos,
}: DocumentoViewProps) {
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
              {podeExcluir && (
                <button onClick={() => onDeletarDocumento(documento.id)} className="icon-btn border-0" title="Excluir documento">
                  <Trash2 size={15} className="text-[#E85238]" />
                </button>
              )}
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
        <BlockEditor
          blocos={blocos}
          onCriarBloco={(tipo, conteudo, ordem) => onCriarBloco(documento.id, tipo, conteudo, ordem)}
          onAtualizarBloco={(id, conteudo) => onAtualizarBloco(id, { conteudo })}
          onDeletarBloco={onDeletarBloco}
          onReordenarBlocos={onReordenarBlocos}
          placeholderVazio="+ Clique para adicionar o primeiro bloco"
        />
      </div>
    </div>
  )
}
