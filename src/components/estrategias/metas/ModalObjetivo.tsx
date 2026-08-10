'use client'

import { useState } from 'react'
import { X, Trash2, RotateCcw } from 'lucide-react'
import type { PerfilUsuario } from '@/store'
import type { EstrategiaObjetivo, EstrategiaFase, StatusObjetivo } from '@/hooks/useEstrategia'
import { RESPONSAVEIS } from '@/components/calendario/calendarioHelpers'
import { STATUS_OBJETIVO_LABEL, STATUS_OBJETIVO_OPCOES } from './metasHelpers'

export interface DadosObjetivo {
  titulo: string
  descricao: string | null
  categoria: string | null
  trimestre: string | null
  faseId: string | null
  parentId: string | null
  responsavel: PerfilUsuario | null
  equipe: string | null
  dataAlvo: string | null
  status?: StatusObjetivo
}

interface Props {
  objetivo: EstrategiaObjetivo | null
  fases: EstrategiaFase[]
  objetivosDisponiveisComoPai: EstrategiaObjetivo[]
  parentIdPadrao?: string | null
  onFechar: () => void
  onSalvar: (dados: DadosObjetivo) => void
  onDeletar?: () => void
  onReverterStatusAutomatico?: () => void
}

export function ModalObjetivo({
  objetivo, fases, objetivosDisponiveisComoPai, parentIdPadrao = null,
  onFechar, onSalvar, onDeletar, onReverterStatusAutomatico,
}: Props) {
  const [titulo, setTitulo]         = useState(objetivo?.titulo ?? '')
  const [descricao, setDescricao]   = useState(objetivo?.descricao ?? '')
  const [categoria, setCategoria]   = useState(objetivo?.categoria ?? '')
  const [trimestre, setTrimestre]   = useState(objetivo?.trimestre ?? '')
  const [faseId, setFaseId]         = useState(objetivo?.faseId ?? '')
  const [parentId, setParentId]     = useState(objetivo?.parentId ?? parentIdPadrao ?? '')
  const [responsavel, setResponsavel] = useState<PerfilUsuario | ''>(objetivo?.responsavel ?? '')
  const [equipe, setEquipe]         = useState(objetivo?.equipe ?? '')
  const [dataAlvo, setDataAlvo]     = useState(objetivo?.dataAlvo ?? '')
  const [statusOverride, setStatusOverride] = useState<StatusObjetivo | ''>('')

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      categoria: categoria.trim() || null,
      trimestre: trimestre.trim() || null,
      faseId: faseId || null,
      parentId: parentId || null,
      responsavel: responsavel || null,
      equipe: equipe.trim() || null,
      dataAlvo: dataAlvo || null,
      ...(statusOverride && { status: statusOverride }),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{objetivo ? 'Editar meta' : 'Nova meta'}</h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>

        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Nome do objetivo *</label>
            <input className="input-purion w-full" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="kpi-label mb-1 block">Descrição</label>
            <textarea className="input-purion w-full" rows={2} value={descricao ?? ''} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Fase / Trimestre</label>
              <select className="select-purion w-full" value={faseId} onChange={(e) => setFaseId(e.target.value)}>
                <option value="">—</option>
                {fases.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Trimestre</label>
              <input className="input-purion w-full" placeholder="Q3 2026" value={trimestre ?? ''} onChange={(e) => setTrimestre(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="kpi-label mb-1 block">Meta-mãe (sub-meta de...)</label>
            <select className="select-purion w-full" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Nenhuma — meta de topo</option>
              {objetivosDisponiveisComoPai
                .filter((o) => !objetivo || o.id !== objetivo.id)
                .map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Responsável</label>
              <select className="select-purion w-full" value={responsavel} onChange={(e) => setResponsavel(e.target.value as PerfilUsuario)}>
                <option value="">—</option>
                {RESPONSAVEIS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Equipe</label>
              <input className="input-purion w-full" placeholder="ex: Comercial" value={equipe ?? ''} onChange={(e) => setEquipe(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Categoria</label>
              <input className="input-purion w-full" placeholder="ex: Receita" value={categoria ?? ''} onChange={(e) => setCategoria(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Data-alvo</label>
              <input type="date" className="input-purion w-full" value={dataAlvo ?? ''} onChange={(e) => setDataAlvo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="kpi-label mb-1 block">
              Status {objetivo?.statusManual ? '(definido manualmente)' : '(calculado automaticamente)'}
            </label>
            <div className="flex gap-2">
              <select
                className="select-purion w-full"
                value={statusOverride || objetivo?.status || ''}
                onChange={(e) => setStatusOverride(e.target.value as StatusObjetivo)}
              >
                <option value="">Manter automático</option>
                {STATUS_OBJETIVO_OPCOES.map((s) => <option key={s} value={s}>{STATUS_OBJETIVO_LABEL[s]}</option>)}
              </select>
              {objetivo?.statusManual && onReverterStatusAutomatico && (
                <button type="button" onClick={onReverterStatusAutomatico} className="btn btn-secondary btn-sm" title="Voltar a calcular automaticamente">
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
              Sem escolha aqui, o status é recalculado sozinho comparando o progresso com o tempo até a data-alvo.
            </p>
          </div>

          <div className="flex justify-between gap-2 mt-2">
            <div>
              {objetivo && onDeletar && (
                <button type="button" onClick={onDeletar} className="btn btn-sm" style={{ background: 'rgba(232,82,56,0.15)', color: '#E85238' }}>
                  <Trash2 size={12} /> Excluir
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary">{objetivo ? 'Salvar' : 'Criar meta'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
