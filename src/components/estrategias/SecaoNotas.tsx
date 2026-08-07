'use client'

import { useRef } from 'react'
import { NotebookPen } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { SecaoEstrategia, ConteudoBloco } from '@/store'
import { useEstrategiaBlocos } from '@/hooks/useEstrategiaBlocos'
import { BlockEditor } from '@/components/blocks/BlockEditor'

const DEBOUNCE_MS = 600

export function SecaoNotas({ secao }: { secao: SecaoEstrategia }) {
  const { criarBloco, atualizarBloco, deletarBloco, reordenarBlocos } = useEstrategiaBlocos()
  const { estrategiaBlocos } = usePurionStore()
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const blocosDaSecao = estrategiaBlocos.filter((b) => b.secao === secao)

  function onAtualizarBlocoDebounced(id: string, conteudo: ConteudoBloco) {
    usePurionStore.getState().atualizarEstrategiaBloco(id, { conteudo })
    clearTimeout(debounceRef.current[id])
    debounceRef.current[id] = setTimeout(() => {
      atualizarBloco(id, { conteudo })
    }, DEBOUNCE_MS)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen size={15} style={{ color: '#C9A84C' }} />
        <p style={{ fontSize: 14, fontWeight: 700 }}>Notas & Documentação</p>
      </div>
      <div className="card-purion" style={{ padding: '18px 20px' }}>
        <BlockEditor
          blocos={blocosDaSecao}
          onCriarBloco={(tipo, conteudo, ordem) => criarBloco(secao, tipo, conteudo, ordem)}
          onAtualizarBloco={onAtualizarBlocoDebounced}
          onDeletarBloco={deletarBloco}
          onReordenarBlocos={reordenarBlocos}
          placeholderVazio="+ Digite '/' para comandos ou clique para começar a escrever…"
        />
      </div>
    </div>
  )
}
