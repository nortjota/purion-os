'use client'

import { BlocoOndeEstamos } from './BlocoOndeEstamos'
import { BlocoProgressoMetas } from './BlocoProgressoMetas'
import { BlocoDecisoes } from './BlocoDecisoes'
import { BlocoDetalhes } from './BlocoDetalhes'

export function EstrategiasPage() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1 className="page-title">Estratégias</h1>

      <BlocoOndeEstamos />
      <BlocoProgressoMetas />
      <BlocoDecisoes />
      <BlocoDetalhes />
    </div>
  )
}
