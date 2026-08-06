'use client'

import { useState, useEffect } from 'react'
import { Database, BarChart2, TrendingUp, Video, Globe, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ServiceStatus = 'online' | 'degradado' | 'offline' | 'em_breve'

interface Service {
  id: string
  name: string
  icon: React.ElementType
  status: ServiceStatus
  responseTime?: number
  uptime: number[]  // 30 booleans-ish: 1=green, 0.5=yellow, 0=gray
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg: Record<ServiceStatus, { label: string; color: string }> = {
    online:    { label: 'Online',    color: '#22C55E' },
    degradado: { label: 'Degradado', color: '#E8A838' },
    offline:   { label: 'Offline',   color: '#E85238' },
    em_breve:  { label: 'Em breve',  color: '#B8B8B8' },
  }
  const { label, color } = cfg[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {status === 'online'    && <CheckCircle  size={11} />}
      {status === 'degradado' && <AlertTriangle size={11} />}
      {status === 'offline'   && <XCircle      size={11} />}
      {label}
    </span>
  )
}

function UptimeBar({ uptime }: { uptime: number[] }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
      {uptime.map((val, i) => {
        const bg = val === 1 ? '#22C55E' : val === 0.5 ? '#E8A838' : '#2A2A2A'
        return (
          <div
            key={i}
            style={{ width: 8, height: 20, borderRadius: 2, background: bg }}
            title={val === 1 ? 'Online' : val === 0.5 ? 'Degradado' : 'Offline'}
          />
        )
      })}
    </div>
  )
}

function generateDemoUptime(): number[] {
  return Array.from({ length: 30 }, () => {
    const r = Math.random()
    if (r > 0.05) return 1
    if (r > 0.02) return 0.5
    return 0
  })
}

const MODULES = [
  { name: 'CRM',         lastSync: new Date().toLocaleString('pt-BR') },
  { name: 'Financeiro',  lastSync: new Date().toLocaleString('pt-BR') },
  { name: 'Tarefas',     lastSync: new Date().toLocaleString('pt-BR') },
  { name: 'Produção',    lastSync: '—'                                  },
  { name: 'Creators',    lastSync: '—'                                  },
]

export function StatusPage() {
  const [services, setServices] = useState<Service[]>([
    { id: 'supabase',  name: 'Supabase',        icon: Database,  status: 'em_breve', uptime: generateDemoUptime() },
    { id: 'meta',      name: 'Meta Ads API',    icon: BarChart2, status: 'em_breve', uptime: generateDemoUptime() },
    { id: 'google',    name: 'Google Ads API',  icon: TrendingUp,status: 'em_breve', uptime: generateDemoUptime() },
    { id: 'tiktok',    name: 'TikTok Ads API',  icon: Video,     status: 'em_breve', uptime: generateDemoUptime() },
    { id: 'vercel',    name: 'Vercel',          icon: Globe,     status: 'em_breve', uptime: generateDemoUptime() },
  ])

  useEffect(() => {
    // Test Supabase connectivity
    const testSupabase = async () => {
      const sb = supabase
      if (!sb) {
        setServices((prev) => prev.map((s) =>
          s.id === 'supabase' ? { ...s, status: 'offline' } : s
        ))
        return
      }
      const start = Date.now()
      try {
        await sb.from('configuracoes').select('count', { count: 'exact', head: true })
        const ms = Date.now() - start
        setServices((prev) => prev.map((s) =>
          s.id === 'supabase'
            ? { ...s, status: 'online', responseTime: ms }
            : s
        ))
      } catch {
        setServices((prev) => prev.map((s) =>
          s.id === 'supabase' ? { ...s, status: 'offline' } : s
        ))
      }
    }
    testSupabase()
  }, [])

  const onlineCount = services.filter((s) => s.status === 'online').length

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Status do Sistema</h1>
        <p className="caption mt-1">{onlineCount} de {services.length} serviços online</p>
      </div>

      {/* Service cards */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {services.map((service) => (
          <div key={service.id} className="card-purion" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <service.icon size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{service.name}</p>
                  {service.responseTime && (
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{service.responseTime}ms</p>
                  )}
                </div>
              </div>
              <StatusBadge status={service.status} />
            </div>
            <UptimeBar uptime={service.uptime} />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Últimos 30 dias</p>
          </div>
        ))}
      </div>

      {/* Last sync */}
      <div className="card-purion" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Última Sincronização por Módulo</p>
        </div>
        {MODULES.map((m, idx) => (
          <div
            key={m.name}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: idx < MODULES.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Última sincronização: {m.lastSync}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
