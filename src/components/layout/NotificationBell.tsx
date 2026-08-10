'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePurionStore } from '@/store'
import { useLembretesCalendario } from '@/hooks/useLembretesCalendario'

type Notif = {
  id: string
  titulo: string
  mensagem: string
  link?: string
  lida: boolean
  criado_em: string
  papel: string | null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export function NotificationBell() {
  const [open, setOpen]       = useState(false)
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const ref                   = useRef<HTMLDivElement>(null)
  const perfilAtivo           = usePurionStore((s) => s.perfilAtivo)

  useLembretesCalendario()

  const naoLidas = notifs.filter(n => !n.lida).length

  async function carregar() {
    if (!supabase) return
    const { data } = await supabase
      .from('notificacoes')
      .select('id, titulo, mensagem, link, lida, criado_em, papel')
      .or(`papel.is.null,papel.eq.${perfilAtivo}`)
      .order('criado_em', { ascending: false })
      .limit(10)
    if (data) setNotifs(data as Notif[])
  }

  useEffect(() => { carregar() }, [perfilAtivo])

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`notificacoes-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, carregar)
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [perfilAtivo])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function marcarLida(id: string) {
    if (!supabase) return
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, lida: true } : x))
  }

  async function marcarTodas() {
    if (!supabase) return
    const ids = notifs.filter(n => !n.lida).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notificacoes').update({ lida: true }).in('id', ids)
    setNotifs(n => n.map(x => ({ ...x, lida: true })))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notificações"
        className="icon-btn"
        style={{ width: 32, height: 32, position: 'relative' }}
      >
        <Bell size={15} />
        {naoLidas > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notificações</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {naoLidas > 0 && (
                <button onClick={marcarTodas} title="Marcar todas como lidas"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                  <CheckCheck size={13} /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhuma notificação ainda
            </div>
          ) : notifs.map(n => (
            <div
              key={n.id}
              onClick={() => { marcarLida(n.id); if (n.link) window.location.href = n.link }}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: n.lida ? 'transparent' : 'rgba(201,168,76,0.04)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              {!n.lida && (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A84C', flexShrink: 0, marginTop: 4 }} />
              )}
              <div style={{ flex: 1, marginLeft: n.lida ? 17 : 0 }}>
                <p style={{ fontSize: 12, fontWeight: n.lida ? 400 : 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{n.titulo}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>{n.mensagem}</p>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>{timeAgo(n.criado_em)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
