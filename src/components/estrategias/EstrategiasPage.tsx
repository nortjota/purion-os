'use client'

import { BlocoOndeEstamos } from './BlocoOndeEstamos'
import { BlocoProgressoMetas } from './BlocoProgressoMetas'
import { BlocoDecisoes } from './BlocoDecisoes'
import { BlocoDetalhes } from './BlocoDetalhes'

export function EstrategiasPage() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 1000, margin: '0 auto' }}>
      <div>
        <h1 className="page-title">Estratégias</h1>
        <p className="caption mt-1">Onde estamos, o que estamos decidindo e como está o progresso</p>
      </div>

      <BlocoOndeEstamos />
      <BlocoProgressoMetas />
      <BlocoDecisoes />
      <BlocoDetalhes />
    </div>
  )
}
