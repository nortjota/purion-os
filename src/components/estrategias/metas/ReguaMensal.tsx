'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { EstrategiaObjetivo, EstrategiaResultado } from '@/hooks/useEstrategia'
import {
  useMedicoesMensais, useValorAutoMensal, fonteAutoMensalDoObjetivo,
  percentualMedicao, corPercentual, calcularTendencia, MESES_LABEL,
} from '@/hooks/useMetaG4'
import { ModalMedicaoMensal, type DadosMedicaoMensal } from './ModalMedicaoMensal'

interface Props {
  objetivo: EstrategiaObjetivo
  todosResultados: EstrategiaResultado[]
}

const TENDENCIA_CFG = {
  melhorando: { cor: '#22C55E', Icon: TrendingUp,  label: 'Melhorando' },
  piorando:   { cor: '#E85238', Icon: TrendingDown, label: 'Piorando' },
  estavel:    { cor: '#B8B8B8', Icon: Minus,        label: 'Estável' },
}

export function ReguaMensal({ objetivo, todosResultados }: Props) {
  const ano = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const { carregando, medicaoDoMes, registrarMedicao } = useMedicoesMensais(ano)
  const valorAutoMensal = useValorAutoMensal()
  const fonteAuto = fonteAutoMensalDoObjetivo(objetivo.id, todosResultados)
  const [mesEditando, setMesEditando] = useState<number | null>(null)

  const percentuais = Array.from({ length: 12 }, (_, i) => percentualMedicao(medicaoDoMes(objetivo.id, i + 1)))
  const tendencia = calcularTendencia(percentuais)

  async function salvar(dados: DadosMedicaoMensal) {
    if (mesEditando == null) return
    await registrarMedicao({ objetivoId: objetivo.id, ano, mes: mesEditando, ...dados })
    setMesEditando(null)
  }

  const medicaoEditando = mesEditando != null ? medicaoDoMes(objetivo.id, mesEditando) : null
  const sugestaoAuto = mesEditando != null && fonteAuto ? valorAutoMensal(fonteAuto, ano, mesEditando) : null

  if (carregando) return null

  return (
    <div className="card-purion" style={{ padding: '14px 16px' }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Régua mensal — {ano}</span>
        {tendencia && (
          <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: TENDENCIA_CFG[tendencia].cor }}>
            {(() => { const Icon = TENDENCIA_CFG[tendencia].Icon; return <Icon size={12} /> })()}
            {TENDENCIA_CFG[tendencia].label}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
        {MESES_LABEL.map((label, i) => {
          const mes = i + 1
          const pct = percentuais[i]
          const cor = corPercentual(pct)
          const futuro = ano === new Date().getFullYear() && mes > mesAtual
          return (
            <button
              key={mes}
              onClick={() => setMesEditando(mes)}
              title={pct != null ? `${label}: ${pct}%` : `${label}: sem dados`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: futuro ? 0.4 : 1,
              }}
            >
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: 5, background: cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18,
              }}>
                {pct != null && <span style={{ fontSize: 8, fontWeight: 800, color: pct >= 60 ? '#0D0D0D' : '#F5F5F5' }}>{pct}</span>}
              </div>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3" style={{ flexWrap: 'wrap' }}>
        <Legenda cor="#22C55E" label=">=90%" />
        <Legenda cor="#E8A838" label="60-89%" />
        <Legenda cor="#E85238" label="<60%" />
        <Legenda cor="#3A3A3A" label="Sem dados" />
        {fonteAuto && <span style={{ fontSize: 10, color: '#5B8FE8', fontWeight: 600 }}>⚡ tem sugestão automática do CRM</span>}
      </div>

      {mesEditando != null && (
        <ModalMedicaoMensal
          objetivoTitulo={objetivo.titulo}
          ano={ano}
          mes={mesEditando}
          medicaoExistente={medicaoEditando}
          sugestaoAuto={sugestaoAuto}
          onFechar={() => setMesEditando(null)}
          onSalvar={salvar}
        />
      )}
    </div>
  )
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, borderRadius: 2, background: cor }} />
      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  )
}
