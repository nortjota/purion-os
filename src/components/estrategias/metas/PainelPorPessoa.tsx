'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { EstrategiaObjetivo } from '@/hooks/useEstrategia'
import type { PerfilUsuario } from '@/store'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import { somaPesos, MAX_METAS_RECOMENDADO_POR_SOCIO, PRIORIDADE_COR } from './metasHelpers'

interface Props {
  responsavel: PerfilUsuario
  objetivos: EstrategiaObjetivo[]
}

/** Painel do G4: soma dos pesos deve fechar em 100%, e no máximo 3-5 metas por pessoa (foco). */
export function PainelPorPessoa({ responsavel, objetivos }: Props) {
  const socio = SOCIOS.find((s) => s.id === responsavel)
  const soma = somaPesos(objetivos)
  const pesoFechado = Math.abs(soma - 100) < 0.01
  const excessoFoco = objetivos.length > MAX_METAS_RECOMENDADO_POR_SOCIO

  if (objetivos.length === 0) return null

  return (
    <div className="card-purion" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {socio && (
            <span style={{
              width: 22, height: 22, borderRadius: 999, background: `${socio.cor}25`, color: socio.cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
            }}>
              {socio.inicial}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700 }}>{socio?.nome ?? responsavel} — {objetivos.length} meta{objetivos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {pesoFechado ? <CheckCircle2 size={13} style={{ color: '#22C55E' }} /> : <AlertTriangle size={13} style={{ color: '#E8A838' }} />}
          <span style={{ fontSize: 13, fontWeight: 800, color: pesoFechado ? '#22C55E' : '#E8A838' }}>{soma}%</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>de peso somado</span>
        </div>
      </div>

      {/* Barra empilhada de pesos, coloridas por prioridade */}
      <div className="flex" style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-surface-2)' }}>
        {objetivos.filter((o) => o.peso > 0).map((o) => (
          <div
            key={o.id}
            title={`${o.titulo} — ${o.peso}%`}
            style={{ width: `${Math.min(o.peso, 100)}%`, background: PRIORIDADE_COR[o.prioridade], height: '100%' }}
          />
        ))}
      </div>

      {!pesoFechado && (
        <p style={{ fontSize: 11, color: '#E8A838', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={11} />
          {soma < 100
            ? `Faltam ${(100 - soma).toFixed(0)}% de peso para fechar 100% — o método G4 exige que a soma das metas de cada pessoa feche redondo.`
            : `Passou ${(soma - 100).toFixed(0)}% do total — ajuste os pesos para fechar em 100%.`}
        </p>
      )}

      {excessoFoco && (
        <p style={{ fontSize: 11, color: '#E85238', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={11} />
          {objetivos.length} metas é foco disperso — o G4 recomenda no máximo {MAX_METAS_RECOMENDADO_POR_SOCIO} metas por pessoa.
        </p>
      )}
    </div>
  )
}
