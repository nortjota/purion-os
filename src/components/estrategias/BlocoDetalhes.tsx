'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { useMobile } from '@/hooks/useMobile'
import { TabVisaoGeral } from './TabVisaoGeral'
import { TabB2B } from './TabB2B'
import { TabSocial } from './TabSocial'
import { TabCliente } from './TabCliente'
import { GrowthPage } from '@/components/growth/GrowthPage'
import { SecaoNotas } from './SecaoNotas'

type SubAba = 'visao-geral' | 'b2b' | 'social' | 'growth' | 'cliente'

const SUB_TABS: Array<{ id: SubAba; label: string }> = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'b2b',         label: 'B2B' },
  { id: 'social',      label: 'Social' },
  { id: 'growth',      label: 'Growth' },
  { id: 'cliente',     label: 'Cliente / ICP' },
]

/**
 * Tudo o que é denso (funil B2B, growth, pilares sociais, ICP, notas Notion de cada
 * seção) fica aqui — nada é apagado, só escondido por padrão para a tela principal
 * ficar limpa. Fechado ao carregar a página.
 */
export function BlocoDetalhes() {
  const isMobile = useMobile()
  const [aberto, setAberto] = useState(false)
  const [subAba, setSubAba] = useState<SubAba>('visao-geral')

  return (
    <section>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center justify-between w-full"
        style={{
          padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
        }}
      >
        <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          <Layers size={15} style={{ color: 'var(--text-secondary)' }} /> Detalhes estratégicos
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
            — funil B2B, growth, social, ICP e notas
          </span>
        </span>
        {aberto ? <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />}
      </button>

      {aberto && (
        <div className="flex flex-col gap-4" style={{ marginTop: 16 }}>
          {isMobile ? (
            <select className="select-purion" style={{ width: '100%' }} value={subAba} onChange={(e) => setSubAba(e.target.value as SubAba)}>
              {SUB_TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : (
            <InnerTabs tabs={SUB_TABS} activeTab={subAba} onChange={(id) => setSubAba(id as SubAba)} />
          )}

          <div>
            {subAba === 'visao-geral' && <TabVisaoGeral />}
            {subAba === 'b2b' && <TabB2B />}
            {subAba === 'social' && <TabSocial />}
            {subAba === 'growth' && (
              <div className="flex flex-col gap-5">
                <GrowthPage embutido />
                <SecaoNotas secao="growth" />
              </div>
            )}
            {subAba === 'cliente' && <TabCliente />}
          </div>
        </div>
      )}
    </section>
  )
}
