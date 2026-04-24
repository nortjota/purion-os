'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, ChevronRight, Bell, Search, Maximize2, X, Activity, DollarSign, Users, CheckSquare, Menu } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'

const MODULE_NAMES: Record<string, string> = {
  '/':                 'Command Center',
  '/crm':              'CRM B2B',
  '/tarefas':          'Tarefas',
  '/financeiro':       'Financeiro',
  '/producao':         'Produção',
  '/marketing':        'Marketing',
  '/creators':         'Creators',
  '/inteligencia':     'Inteligência',
  '/reunioes':         'Reuniões',
  '/trafego':          'Tráfego',
  '/contabilidade':    'Contabilidade',
  '/settings':         'Configurações',
  '/settings/empresa': 'Empresa',
  '/minha-atividade':  'Minha Atividade',
}

const PERFIL_INICIAIS: Record<string, string> = {
  matheus: 'M',
  gabriel: 'G',
  joao:    'J',
}

interface SearchResult {
  id: string
  label: string
  secondary: string
  href: string
  icon: React.ElementType
}

export function ContentHeader() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { theme, setTheme } = useTheme()
  const { perfilAtivo, leads, tarefas, creators, receitas, despesas, focusMode, setFocusMode, setMobileSidebarAberta } = usePurionStore()
  const { user, perfil } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Search state
  const [searchOpen, setSearchOpen]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Avatar dropdown
  const [avatarOpen, setAvatarOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }
      const q = searchQuery.toLowerCase()
      const results: SearchResult[] = []

      leads.filter((l) =>
        l.nomeEmpresa.toLowerCase().includes(q) || l.nomeContato.toLowerCase().includes(q)
      ).slice(0, 3).forEach((l) => {
        results.push({ id: `lead-${l.id}`, label: l.nomeEmpresa, secondary: l.nomeContato, href: '/crm', icon: Users })
      })

      tarefas.filter((t) => t.titulo.toLowerCase().includes(q)).slice(0, 3).forEach((t) => {
        results.push({ id: `tarefa-${t.id}`, label: t.titulo, secondary: t.modulo, href: '/tarefas', icon: CheckSquare })
      })

      creators.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 2).forEach((c) => {
        results.push({ id: `creator-${c.id}`, label: c.nome, secondary: c.nichoPrincipal, href: '/creators', icon: Activity })
      })

      receitas.filter((r) => r.descricao.toLowerCase().includes(q)).slice(0, 2).forEach((r) => {
        results.push({ id: `receita-${r.id}`, label: r.descricao, secondary: `R$ ${r.valor.toLocaleString('pt-BR')}`, href: '/financeiro', icon: DollarSign })
      })

      despesas.filter((d) => d.descricao.toLowerCase().includes(q)).slice(0, 2).forEach((d) => {
        results.push({ id: `despesa-${d.id}`, label: d.descricao, secondary: `R$ ${d.valor.toLocaleString('pt-BR')}`, href: '/financeiro', icon: DollarSign })
      })

      setSearchResults(results)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, leads, tarefas, creators, receitas, despesas])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setSearchQuery('')
      setSearchResults([])
    }
  }, [])

  const handleResultClick = useCallback((href: string) => {
    router.push(href)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }, [router])

  const moduleName = Object.entries(MODULE_NAMES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => key === '/' ? pathname === '/' : pathname.startsWith(key))?.[1] ?? ''

  const isDark = theme === 'dark'

  const inicial = perfil?.nome?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? PERFIL_INICIAIS[perfilAtivo]
    ?? 'U'

  const displayName = perfil?.nome ?? user?.email?.split('@')[0] ?? 'Usuário'

  return (
    <header className="purion-header" style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-primary)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      {/* ── DESKTOP header ── */}
      <div className="purion-header-desktop" style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 32px',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>PURION OS</span>
          {moduleName && (
            <>
              <ChevronRight size={12} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{moduleName}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {/* Focus Mode */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? 'Sair do foco' : 'Modo foco'}
            className="icon-btn"
            style={{ width: 32, height: 32 }}
          >
            <Maximize2 size={15} />
          </button>

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              overflow: 'hidden',
              width: searchOpen ? 280 : 0,
              transition: 'width 0.2s ease',
              position: 'absolute', right: 40, top: 0,
            }}>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar..."
                style={{
                  width: 280, height: 32,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '0 10px',
                  fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearchQuery(''); setSearchResults([]) } }}
              title="Buscar"
              className="icon-btn"
              style={{ width: 32, height: 32 }}
            >
              {searchOpen ? <X size={15} /> : <Search size={15} />}
            </button>

            {/* Search results dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                width: 320, background: 'var(--bg-surface)',
                border: '1px solid var(--border)', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                zIndex: 50, maxHeight: 320, overflowY: 'auto',
              }}>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.href)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <result.icon size={14} style={{ color: '#C9A84C', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.label}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{result.secondary}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              className="icon-btn"
              style={{ width: 32, height: 32 }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
          <button title="Notificações" className="icon-btn" style={{ width: 32, height: 32 }}>
            <Bell size={15} />
          </button>

          {/* Avatar with dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setAvatarOpen(!avatarOpen)}
              title={displayName}
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: '#C9A84C', color: '#0D0D0D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, userSelect: 'none', cursor: 'pointer',
                border: 'none',
              }}
            >
              {inicial}
            </button>

            {avatarOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setAvatarOpen(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 50, minWidth: 160, overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user?.email ?? ''}</p>
                  </div>
                  <button
                    onClick={() => { router.push('/minha-atividade'); setAvatarOpen(false) }}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                      fontSize: 13, color: 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Activity size={13} />
                    Minha Atividade
                  </button>
                  <button
                    onClick={() => { router.push('/settings'); setAvatarOpen(false) }}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                      fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <X size={13} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE header ── */}
      <div className="purion-header-mobile" style={{
        height: 52, display: 'none', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
      }}>
        {/* Left: Hamburger */}
        <button
          onClick={() => setMobileSidebarAberta(true)}
          title="Abrir menu"
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <Menu size={20} />
        </button>

        {/* Center: Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, userSelect: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.12em' }}>PURION</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>OS</span>
        </div>

        {/* Right: Bell + Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button title="Notificações" className="icon-btn" style={{ width: 32, height: 32, border: 'none' }}>
            <Bell size={18} />
          </button>
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="icon-btn"
              style={{ width: 32, height: 32, border: 'none' }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
