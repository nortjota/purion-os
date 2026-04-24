'use client'

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, DollarSign,
  Package, Video, BookOpen, BarChart2, Brain,
  Settings, Plus, UserPlus, TrendingUp, TrendingDown,
  Boxes, UserCog, Calendar,
} from 'lucide-react'
import { usePurionStore } from '@/store'

const PAGES = [
  { label: 'Dashboard',      href: '/',              icon: LayoutDashboard },
  { label: 'CRM',            href: '/crm',           icon: Users           },
  { label: 'Tarefas',        href: '/tarefas',       icon: CheckSquare     },
  { label: 'Financeiro',     href: '/financeiro',    icon: DollarSign      },
  { label: 'Produção',       href: '/producao',      icon: Package         },
  { label: 'Creators',       href: '/creators',      icon: Video           },
  { label: 'Contabilidade',  href: '/contabilidade', icon: BookOpen        },
  { label: 'Tráfego',        href: '/trafego',       icon: BarChart2       },
  { label: 'Inteligência',   href: '/inteligencia',  icon: Brain           },
  { label: 'Configurações',  href: '/settings',      icon: Settings        },
]

const ACTIONS = [
  { label: 'Nova tarefa',        action: 'nova-tarefa',       icon: Plus         },
  { label: 'Novo lead',          action: 'novo-lead',         icon: UserPlus     },
  { label: 'Registrar receita',  action: 'registrar-receita', icon: TrendingUp   },
  { label: 'Registrar despesa',  action: 'registrar-despesa', icon: TrendingDown },
  { label: 'Novo lote',          action: 'novo-lote',         icon: Boxes        },
  { label: 'Adicionar creator',  action: 'adicionar-creator', icon: UserCog      },
  { label: 'Registrar daily',    action: 'registrar-daily',   icon: Calendar     },
]

function dispatch(action: string) {
  window.dispatchEvent(new CustomEvent('purion:action', { detail: { action } }))
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const { leads, tarefas } = usePurionStore()
  const [query, setQuery] = useState('')

  const filteredLeads = leads
    .filter((l) =>
      l.nomeEmpresa.toLowerCase().includes(query.toLowerCase()) ||
      l.nomeContato.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5)

  const filteredTarefas = tarefas
    .filter((t) => t.titulo.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <Command
        style={{
          width: 560, background: '#1A1A1A',
          border: '1px solid var(--border)', borderRadius: 16,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--border)' }}>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar páginas, ações ou registros..."
            style={{
              width: '100%', height: 52, background: 'transparent',
              border: 'none', outline: 'none', fontSize: 15,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <Command.List style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}>
          <Command.Empty style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            Nenhum resultado encontrado.
          </Command.Empty>

          <Command.Group heading="Páginas">
            {PAGES.map((page) => (
              <Command.Item
                key={page.href}
                value={page.label}
                onSelect={() => { router.push(page.href); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-primary)',
                }}
              >
                <page.icon size={15} style={{ color: '#C9A84C', flexShrink: 0 }} />
                {page.label}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Ações Rápidas">
            {ACTIONS.map((action) => (
              <Command.Item
                key={action.action}
                value={action.label}
                onSelect={() => { dispatch(action.action); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-primary)',
                }}
              >
                <action.icon size={15} style={{ color: '#5B8FE8', flexShrink: 0 }} />
                {action.label}
              </Command.Item>
            ))}
          </Command.Group>

          {(filteredLeads.length > 0 || filteredTarefas.length > 0) && (
            <Command.Group heading="Registros">
              {filteredLeads.map((lead) => (
                <Command.Item
                  key={`lead-${lead.id}`}
                  value={`lead-${lead.nomeEmpresa}`}
                  onSelect={() => { router.push('/crm'); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 14, color: 'var(--text-primary)',
                  }}
                >
                  <Users size={15} style={{ color: '#22C55E', flexShrink: 0 }} />
                  <span>{lead.nomeEmpresa}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Lead</span>
                </Command.Item>
              ))}
              {filteredTarefas.map((tarefa) => (
                <Command.Item
                  key={`tarefa-${tarefa.id}`}
                  value={`tarefa-${tarefa.titulo}`}
                  onSelect={() => { router.push('/tarefas'); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 14, color: 'var(--text-primary)',
                  }}
                >
                  <CheckSquare size={15} style={{ color: '#E8A838', flexShrink: 0 }} />
                  <span>{tarefa.titulo}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Tarefa</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}
