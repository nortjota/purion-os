'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CRMDashboard } from './CRMDashboard'
import { useCRM, toLead } from '@/hooks/useCRM'
import { useIsMaster } from '@/hooks/useIsMaster'
import { ArquivadosPanel } from '@/components/ui/ArquivadosPanel'
import type { Lead } from '@/store'

type TabId = 'pipeline' | 'arquivados'

export function CRMPage() {
  const [aba, setAba] = useState<TabId>('pipeline')
  const { restaurarLead } = useCRM()
  const { isMaster } = useIsMaster()

  if (aba === 'arquivados') {
    return (
      <div className="page-content section-gap">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="page-title">CRM B2B — Arquivados</h1>
            <p className="caption mt-1">Leads arquivados · restaure ou exclua permanentemente</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setAba('pipeline')}>
            <ArrowLeft size={13} /> Voltar ao pipeline
          </button>
        </div>
        <ArquivadosPanel<Lead>
          table="leads_crm"
          mapRow={toLead}
          renderTitle={(l) => l.nomeEmpresa}
          renderSubtitle={(l) => `${l.cidade} · ${l.regiao} · Tier ${l.tier}`}
          onRestore={restaurarLead}
          isMaster={isMaster}
        />
      </div>
    )
  }

  return <CRMDashboard onVerArquivados={() => setAba('arquivados')} />
}
