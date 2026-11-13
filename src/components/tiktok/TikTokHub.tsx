'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Database, RefreshCw } from 'lucide-react'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { recarregarTikTok, useTikTokStore, useTikTokSync } from '@/hooks/useTikTok'
import { useIsLogistica } from '@/hooks/useIsLogistica'
import { OverviewTikTok } from './OverviewTikTok'
import { StrategyHub } from './StrategyHub'
import { CreativeStudio } from './CreativeStudio'
import { CalendarioConteudo } from './CalendarioConteudo'
import { CreatorNetwork } from './CreatorNetwork'
import { ActionCenter } from './ActionCenter'
import { FichaVideo } from './FichaVideo'
import { useAlertas } from './useAlertas'
import { Vazio } from './comum'

const ABAS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'estrategia', label: 'Estratégia' },
  { id: 'studio',     label: 'Creative Studio' },
  { id: 'calendario', label: 'Calendário' },
  { id: 'creators',   label: 'Creators' },
  { id: 'acoes',      label: 'Ações' },
] as const
type Aba = typeof ABAS[number]['id']

/** Navegação do módulo: abas e a ficha do vídeo ficam na URL (links funcionam de qualquer lugar). */
export function useNavTikTok() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const ir = useCallback((mudar: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(mudar)) { if (v == null) p.delete(k); else p.set(k, v) }
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }, [params, pathname, router])
  return {
    abrirVideo: (id: string) => ir({ video: id }),
    fecharVideo: () => ir({ video: null }),
    irPara: (aba: Aba, extra: Record<string, string | null> = {}) => ir({ tab: aba, ...extra }),
  }
}

export function TikTokHub() {
  useTikTokSync()
  const params = useSearchParams()
  const { irPara, fecharVideo } = useNavTikTok()
  const estado = useTikTokStore((s) => s.estado)
  const erro = useTikTokStore((s) => s.erro)
  const videoAberto = params.get('video')
  const aba = (ABAS.find((a) => a.id === params.get('tab'))?.id ?? 'overview') as Aba
  const { isLogistica } = useIsLogistica()
  const alertas = useAlertas()
  const pendentes = alertas.filter((a) => !a.sugestao).length

  if (isLogistica) {
    return <div className="page-content"><Vazio icone={AlertTriangle} titulo="Sem acesso" texto="O módulo TikTok não está disponível para o perfil de logística." /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <InnerTabs
        tabs={ABAS.map((a) => ({ id: a.id, label: a.label, badge: a.id === 'acoes' && pendentes ? pendentes : undefined }))}
        activeTab={aba}
        onChange={(id) => irPara(id as Aba)}
        className="px-2 md:px-[14px]"
      />
      <div className="page-content">
        {estado === 'carregando' && <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />}
        {estado === 'sem_tabelas' && (
          <Vazio icone={Database} titulo="Falta rodar o SQL do módulo"
            texto="Rode supabase/migration_tiktok_command_center.sql no SQL Editor do Supabase e recarregue."
            acao={<button className="btn btn-secondary btn-sm" onClick={() => recarregarTikTok()}><RefreshCw size={13} /> Tentar de novo</button>} />
        )}
        {estado === 'erro' && (
          <Vazio icone={AlertTriangle} titulo="Não foi possível carregar o TikTok" texto={erro ?? undefined}
            acao={<button className="btn btn-secondary btn-sm" onClick={() => recarregarTikTok()}><RefreshCw size={13} /> Tentar de novo</button>} />
        )}
        {estado === 'ok' && (
          <>
            {aba === 'overview'   && <OverviewTikTok />}
            {aba === 'estrategia' && <StrategyHub />}
            {aba === 'studio'     && <CreativeStudio />}
            {aba === 'calendario' && <CalendarioConteudo />}
            {aba === 'creators'   && <CreatorNetwork />}
            {aba === 'acoes'      && <ActionCenter />}
          </>
        )}
      </div>
      {estado === 'ok' && videoAberto && <FichaVideo videoId={videoAberto} onFechar={fecharVideo} />}
    </div>
  )
}
