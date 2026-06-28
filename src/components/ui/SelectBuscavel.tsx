'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export interface OpcaoBuscavel {
  value: string
  label: string
  sublabel?: string
}

interface SelectBuscavelProps {
  opcoes: OpcaoBuscavel[]
  valor: string | null
  onSelecionar: (value: string | null) => void
  placeholder?: string
  vazio?: string
}

export function SelectBuscavel({ opcoes, valor, onSelecionar, placeholder = 'Buscar...', vazio = 'Nenhum resultado' }: SelectBuscavelProps) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selecionado = opcoes.find((o) => o.value === valor) ?? null

  const filtradas = opcoes.filter((o) =>
    o.label.toLowerCase().includes(busca.toLowerCase()) ||
    (o.sublabel ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      {selecionado && !aberto ? (
        <div className="input-purion flex items-center justify-between cursor-pointer" onClick={() => setAberto(true)}>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14 }}>{selecionado.label}</p>
            {selecionado.sublabel && <p className="caption truncate">{selecionado.sublabel}</p>}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelecionar(null); setBusca('') }}
            className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="input-purion flex items-center gap-2">
          <Search size={13} className="text-[var(--text-secondary)] shrink-0" />
          <input
            autoFocus={aberto}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setAberto(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none"
            style={{ fontSize: 14 }}
          />
        </div>
      )}

      {aberto && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg border overflow-y-auto z-50"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', maxHeight: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        >
          {filtradas.length === 0 ? (
            <div className="px-3 py-3 text-center caption">{vazio}</div>
          ) : filtradas.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onSelecionar(o.value); setBusca(''); setAberto(false) }}
              className="w-full text-left px-3 py-2 hover:bg-[rgba(201,168,76,0.08)] transition-colors"
            >
              <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{o.label}</p>
              {o.sublabel && <p className="caption">{o.sublabel}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
