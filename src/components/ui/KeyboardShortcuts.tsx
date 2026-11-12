'use client'

import { dispararAcaoRapida } from '@/lib/acaoRapida'
import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface ShortcutEntry {
  keys: string
  description: string
}

const SHORTCUTS: Record<string, ShortcutEntry[]> = {
  Navegação: [
    { keys: 'G + D', description: 'Início' },
    { keys: 'G + V', description: 'Vendas' },
    { keys: 'G + C', description: 'CRM' },
    { keys: 'G + E', description: 'Despachos' },
    { keys: 'G + M', description: 'Metas' },
    { keys: 'G + T', description: 'Tarefas' },
    { keys: 'G + F', description: 'Financeiro' },
    { keys: 'G + P', description: 'Produção' },
    { keys: 'G + S', description: 'Configurações' },
  ],
  'Nova Entrada': [
    { keys: 'N + T', description: 'Nova tarefa' },
    { keys: 'N + L', description: 'Novo lead' },
    { keys: 'N + V', description: 'Nova venda B2C' },
  ],
  Sistema: [
    { keys: 'Ctrl + K', description: 'Abrir paleta de comandos' },
    { keys: '?', description: 'Ver atalhos de teclado' },
    { keys: 'Escape', description: 'Fechar modais' },
  ],
}

export function KeyboardShortcuts() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  // Open command palette
  useHotkeys('ctrl+k,meta+k', (e) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('purion:open-palette'))
  }, { enableOnFormTags: false })

  // Navigation shortcuts
  useHotkeys('g+d', () => router.push('/'),         { enableOnFormTags: false })
  useHotkeys('g+c', () => router.push('/crm'),      { enableOnFormTags: false })
  useHotkeys('g+v', () => router.push('/vendas'),   { enableOnFormTags: false })
  useHotkeys('g+e', () => router.push('/despacho'), { enableOnFormTags: false })
  useHotkeys('g+m', () => router.push('/metas'),    { enableOnFormTags: false })
  useHotkeys('g+t', () => router.push('/tarefas'),  { enableOnFormTags: false })
  useHotkeys('g+f', () => router.push('/financeiro'),{ enableOnFormTags: false })
  useHotkeys('g+p', () => router.push('/producao'), { enableOnFormTags: false })
  useHotkeys('g+s', () => router.push('/settings'), { enableOnFormTags: false })

  // Show shortcuts
  useHotkeys('shift+/', () => setShowModal(true), { enableOnFormTags: false })

  // Close all modals
  useHotkeys('escape', () => {
    window.dispatchEvent(new CustomEvent('purion:close-all'))
    setShowModal(false)
  }, { enableOnFormTags: false })

  // Quick actions
  useHotkeys('n+t', () => { dispararAcaoRapida('nova-tarefa'); router.push('/tarefas') }, { enableOnFormTags: false })
  useHotkeys('n+l', () => { dispararAcaoRapida('novo-lead'); router.push('/crm') },      { enableOnFormTags: false })
  useHotkeys('n+v', () => { dispararAcaoRapida('nova-venda-b2c'); router.push('/vendas') }, { enableOnFormTags: false })

  // Listen for purion:open-palette to show modal
  useEffect(() => {
    const handle = () => setShowModal(false)
    const abrir = () => setShowModal(true)
    window.addEventListener('purion:close-all', handle)
    window.addEventListener('purion:open-shortcuts', abrir)
    return () => {
      window.removeEventListener('purion:close-all', handle)
      window.removeEventListener('purion:open-shortcuts', abrir)
    }
  }, [])

  if (!showModal) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
    >
      <div
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24, maxWidth: 560, width: '90%',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Atalhos de Teclado</h2>
          <button
            onClick={() => setShowModal(false)}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'var(--bg-surface-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {Object.entries(SHORTCUTS).map(([group, entries]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {group}
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {entries.map((entry) => (
                <div
                  key={entry.keys}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entry.description}</span>
                  <kbd style={{
                    fontSize: 11, fontFamily: 'monospace',
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '3px 8px',
                    color: 'var(--text-primary)',
                  }}>
                    {entry.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
