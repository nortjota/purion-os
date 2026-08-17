'use client'

import { useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Target, AlertTriangle } from 'lucide-react'
import { useEstrategiaRoadmap } from '@/hooks/useEstrategia'
import { useMedicoesMensais, percentualMedicao, percentualPonderado, corPercentual } from '@/hooks/useMetaG4'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'

/** Card estilo G4: percentual geral ponderado, distribuição verde/amarelo/vermelho, e o % de cada sócio. */
export function PainelMetasG4() {
  const ano = new Date().getFullYear()
  const mes = new Date().getMonth() + 1
  const { objetivos, carregando: carregandoObjetivos } = useEstrategiaRoadmap()
  const { medicaoDoMes, carregando: carregandoMedicoes } = useMedicoesMensais(ano)

  const objetivosTopo = useMemo(() => objetivos.filter((o) => !o.parentId && o.peso > 0), [objetivos])

  const getPct = useCallback((id: string) => percentualMedicao(medicaoDoMes(id, mes)), [medicaoDoMes, mes])

  const percentualGeral = useMemo(
    () => percentualPonderado(objetivosTopo, getPct),
    [objetivosTopo, getPct]
  )

  const distribuicao = useMemo(() => {
    let verde = 0, amarelo = 0, vermelho = 0, semDados = 0
    for (const o of objetivosTopo) {
      const pct = getPct(o.id)
      if (pct == null) semDados++
      else if (pct >= 90) verde++
      else if (pct >= 60) amarelo++
      else vermelho++
    }
    return { verde, amarelo, vermelho, semDados }
  }, [objetivosTopo, getPct])

  const porSocio = useMemo(() => {
    return SOCIOS.map((s) => {
      const metasDele = objetivosTopo.filter((o) => o.responsavel === s.id)
      return { socio: s, pct: percentualPonderado(metasDele, getPct), qtd: metasDele.length }
    }).filter((r) => r.qtd > 0)
  }, [objetivosTopo, getPct])

  const metasVermelhas = useMemo(
    () => objetivosTopo.filter((o) => { const p = getPct(o.id); return p != null && p < 60 }),
    [objetivosTopo, getPct]
  )

  if (carregandoObjetivos || carregandoMedicoes) return null
  if (objetivosTopo.length === 0) return null

  return (
    <Link href="/estrategias" className="block no-underline">
      <section className="card-purion p-4 hover:border-[rgba(201,168,76,0.35)] transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            <Target size={14} style={{ color: '#C9A84C' }} /> Painel de Metas do Ano — método G4
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: corPercentual(percentualGeral) }}>
            {percentualGeral != null ? `${percentualGeral}%` : '—'}
          </span>
        </div>

        {/* Distribuição verde/amarelo/vermelho */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <DistribuicaoItem cor="#22C55E" label="Verdes" valor={distribuicao.verde} />
          <DistribuicaoItem cor="#E8A838" label="Amarelas" valor={distribuicao.amarelo} />
          <DistribuicaoItem cor="#E85238" label="Vermelhas" valor={distribuicao.vermelho} />
          <DistribuicaoItem cor="#3A3A3A" label="Sem dados" valor={distribuicao.semDados} />
        </div>

        {/* Por sócio */}
        <div className="cards-gap grid-mobile-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${porSocio.length || 1}, 1fr)`, gap: 10, marginBottom: metasVermelhas.length > 0 ? 12 : 0 }}>
          {porSocio.map(({ socio, pct, qtd }) => (
            <div key={socio.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface-2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{
                  width: 18, height: 18, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700,
                }}>
                  {socio.inicial}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{socio.nome} · {qtd} meta{qtd !== 1 ? 's' : ''}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: corPercentual(pct) }}>{pct != null ? `${pct}%` : '—'}</span>
            </div>
          ))}
        </div>

        {/* Alerta metas vermelhas */}
        {metasVermelhas.length > 0 && (
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <p className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#E85238' }}>
              <AlertTriangle size={11} /> Precisam de atenção
            </p>
            <div className="flex flex-col gap-1">
              {metasVermelhas.slice(0, 4).map((o) => (
                <span key={o.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  · {o.titulo} <span style={{ color: '#E85238', fontWeight: 700 }}>{getPct(o.id)}%</span>
                </span>
              ))}
              {metasVermelhas.length > 4 && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+{metasVermelhas.length - 4} outras</span>
              )}
            </div>
          </div>
        )}
      </section>
    </Link>
  )
}

function DistribuicaoItem({ cor, label, valor }: { cor: string; label: string; valor: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ width: 9, height: 9, borderRadius: 3, background: cor, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{valor}</span>
    </span>
  )
}
