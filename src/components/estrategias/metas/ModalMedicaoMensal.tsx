'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import type { MetaMedicaoMensal } from '@/hooks/useMetaG4'
import { MESES_LABEL } from '@/hooks/useMetaG4'

export interface DadosMedicaoMensal {
  valorMeta: number | null
  valorRealizado: number | null
  observacao: string | null
}

interface Props {
  objetivoTitulo: string
  ano: number
  mes: number
  medicaoExistente: MetaMedicaoMensal | null
  sugestaoAuto: number | null
  onFechar: () => void
  onSalvar: (dados: DadosMedicaoMensal) => void
}

export function ModalMedicaoMensal({ objetivoTitulo, ano, mes, medicaoExistente, sugestaoAuto, onFechar, onSalvar }: Props) {
  const [valorMeta, setValorMeta] = useState<string>(
    medicaoExistente?.valorMeta != null ? String(medicaoExistente.valorMeta) : ''
  )
  const [valorRealizado, setValorRealizado] = useState<string>(
    medicaoExistente?.valorRealizado != null ? String(medicaoExistente.valorRealizado) : (sugestaoAuto != null ? String(sugestaoAuto) : '')
  )
  const [observacao, setObservacao] = useState(medicaoExistente?.observacao ?? '')

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    onSalvar({
      valorMeta: valorMeta === '' ? null : Number(valorMeta),
      valorRealizado: valorRealizado === '' ? null : Number(valorRealizado),
      observacao: observacao.trim() || null,
    })
  }

  function usarSugestaoAuto() {
    if (sugestaoAuto != null) setValorRealizado(String(sugestaoAuto))
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{MESES_LABEL[mes - 1]}/{ano}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{objetivoTitulo}</p>
          </div>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>

        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Meta do mês</label>
              <input type="number" step="any" className="input-purion w-full" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} placeholder="0" />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Realizado</label>
              <input type="number" step="any" className="input-purion w-full" value={valorRealizado} onChange={(e) => setValorRealizado(e.target.value)} placeholder="0" />
            </div>
          </div>

          {sugestaoAuto != null && (
            <button
              type="button"
              onClick={usarSugestaoAuto}
              className="flex items-center gap-1.5"
              style={{ fontSize: 11, color: '#5B8FE8', background: 'rgba(91,143,232,0.08)', border: '1px solid rgba(91,143,232,0.2)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', width: 'fit-content' }}
            >
              <Zap size={11} /> Usar valor automático do CRM neste mês: {sugestaoAuto.toLocaleString('pt-BR')}
            </button>
          )}

          <div>
            <label className="kpi-label mb-1 block">Observação — o que causou, plano de ação</label>
            <textarea className="input-purion w-full" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="ex: caiu porque X, plano: Y" />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
