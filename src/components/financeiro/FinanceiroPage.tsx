'use client'

import { useState } from 'react'
import { FinanceiroDashboard } from './FinanceiroDashboard'
import { FinanceiroDRE } from './FinanceiroDRE'

type Aba = 'painel' | 'dre'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'painel', label: 'Painel' },
  { id: 'dre',    label: 'DRE' },
]

export function FinanceiroPage() {
  const [aba, setAba] = useState<Aba>('painel')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-4 border-b border-[var(--border)] shrink-0">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className="relative px-4 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color: aba === a.id ? '#C9A84C' : '#B8B8B8',
            }}
          >
            {a.label}
            {aba === a.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                style={{ background: '#C9A84C' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {aba === 'painel' ? <FinanceiroDashboard /> : <FinanceiroDRE />}
      </div>
    </div>
  )
}
