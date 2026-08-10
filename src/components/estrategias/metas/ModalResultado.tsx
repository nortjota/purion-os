'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { EstrategiaResultado, FonteAuto, MetricasCRM } from '@/hooks/useEstrategia'
import { valorAutomaticoCRM } from '@/hooks/useEstrategia'
import { FONTE_AUTO_OPCOES } from './metasHelpers'

export interface DadosResultado {
  descricao: string
  meta: number
  atual: number
  unidade: string | null
  fonteAuto: FonteAuto | null
}

interface Props {
  resultado: EstrategiaResultado | null
  objetivoTitulo: string
  metricas: MetricasCRM
  onFechar: () => void
  onSalvar: (dados: DadosResultado) => void
  onDeletar?: () => void
}

export function ModalResultado({ resultado, objetivoTitulo, metricas, onFechar, onSalvar, onDeletar }: Props) {
  const [descricao, setDescricao] = useState(resultado?.descricao ?? '')
  const [meta, setMeta]           = useState(resultado?.meta ?? 0)
  const [atual, setAtual]         = useState(resultado?.atual ?? 0)
  const [unidade, setUnidade]     = useState(resultado?.unidade ?? '')
  const [fonteAuto, setFonteAuto] = useState<FonteAuto | ''>(resultado?.fonteAuto ?? '')

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim() || meta <= 0) return
    onSalvar({
      descricao: descricao.trim(),
      meta,
      atual: fonteAuto ? valorAutomaticoCRM(fonteAuto, metricas) : atual,
      unidade: unidade.trim() || null,
      fonteAuto: fonteAuto || null,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{resultado ? 'Editar resultado-chave' : 'Novo resultado-chave'}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{objetivoTitulo}</p>
          </div>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>

        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Descrição *</label>
            <input className="input-purion w-full" placeholder="ex: Fechar 20 parceiros B2B ativos" value={descricao} onChange={(e) => setDescricao(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="kpi-label mb-1 block">Fonte automática</label>
            <select className="select-purion w-full" value={fonteAuto} onChange={(e) => setFonteAuto(e.target.value as FonteAuto)}>
              <option value="">Manual — eu atualizo o valor atual</option>
              {FONTE_AUTO_OPCOES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
              Com fonte automática, o valor atual é puxado ao vivo do CRM e o progresso se atualiza sozinho.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Meta (valor-alvo) *</label>
              <input type="number" min={0} step="any" className="input-purion w-full" value={meta} onChange={(e) => setMeta(Number(e.target.value))} required />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Valor atual</label>
              {fonteAuto ? (
                <input className="input-purion w-full" disabled value={valorAutomaticoCRM(fonteAuto, metricas)} />
              ) : (
                <input type="number" min={0} step="any" className="input-purion w-full" value={atual} onChange={(e) => setAtual(Number(e.target.value))} />
              )}
            </div>
          </div>

          <div>
            <label className="kpi-label mb-1 block">Unidade</label>
            <input className="input-purion w-full" placeholder="ex: parceiros, R$, %" value={unidade ?? ''} onChange={(e) => setUnidade(e.target.value)} />
          </div>

          <div className="flex justify-between gap-2 mt-2">
            <div>
              {resultado && onDeletar && (
                <button type="button" onClick={onDeletar} className="btn btn-sm" style={{ background: 'rgba(232,82,56,0.15)', color: '#E85238' }}>
                  <Trash2 size={12} /> Excluir
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary">{resultado ? 'Salvar' : 'Criar resultado'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
