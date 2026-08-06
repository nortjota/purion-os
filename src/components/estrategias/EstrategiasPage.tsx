'use client'

import { useState } from 'react'
import { Compass, Users, Megaphone, FlaskConical, UserCircle, Milestone } from 'lucide-react'
import { GrowthPage } from '@/components/growth/GrowthPage'
import { TabVisaoGeral } from './TabVisaoGeral'
import { TabB2B } from './TabB2B'
import { TabSocial } from './TabSocial'
import { TabCliente } from './TabCliente'
import { TabDecisoes } from './TabDecisoes'

type TabId = 'visao-geral' | 'b2b' | 'social' | 'growth' | 'cliente' | 'decisoes'

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Compass },
  { id: 'b2b',          label: 'B2B',         icon: Users },
  { id: 'social',       label: 'Redes Sociais', icon: Megaphone },
  { id: 'growth',       label: 'Growth',      icon: FlaskConical },
  { id: 'cliente',      label: 'Cliente / ICP', icon: UserCircle },
  { id: 'decisoes',     label: 'Decisões',    icon: Milestone },
]

export function EstrategiasPage() {
  const [aba, setAba] = useState<TabId>('visao-geral')

  return (
    <div className="page-content section-gap">
      <div>
        <h1 className="page-title">Estratégias</h1>
        <p className="caption mt-1">Centro de comando · direção, para quê, para quem e como executar</p>
      </div>

      {/* Navegação por tabs — desktop */}
      <div
        className="estrategias-tabs-desktop flex gap-1 p-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] w-fit"
        style={{ flexWrap: 'wrap' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
            style={aba === t.id
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
              : { color: 'var(--text-secondary)' }}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Navegação por tabs — mobile (menu) */}
      <select
        className="select-purion estrategias-tabs-mobile"
        value={aba}
        onChange={(e) => setAba(e.target.value as TabId)}
        style={{ display: 'none' }}
      >
        {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <div>
        {aba === 'visao-geral' && <TabVisaoGeral />}
        {aba === 'b2b' && <TabB2B />}
        {aba === 'social' && <TabSocial />}
        {aba === 'growth' && <GrowthPage embutido />}
        {aba === 'cliente' && <TabCliente />}
        {aba === 'decisoes' && <TabDecisoes />}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .estrategias-tabs-desktop { display: none !important; }
          .estrategias-tabs-mobile { display: block !important; width: 100%; }
        }
      `}</style>
    </div>
  )
}
