'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Save, Trash2, Plus, GripVertical } from 'lucide-react'

interface KanbanColuna {
  id: string
  label: string
  cor: string
  tipo: 'ganho' | 'perdido' | 'normal'
}

interface CampoPersonalizado {
  id: string
  nome: string
  tipo: 'texto' | 'numero' | 'data' | 'select' | 'toggle' | 'url'
  obrigatorio: boolean
}

const DEFAULT_COLUNAS: KanbanColuna[] = [
  { id: '1', label: 'Identificado',      cor: '#3B82F6', tipo: 'normal' },
  { id: '2', label: 'Abordagem',          cor: '#8B5CF6', tipo: 'normal' },
  { id: '3', label: 'Proposta Enviada',   cor: '#F59E0B', tipo: 'normal' },
  { id: '4', label: 'Negociando',         cor: '#F97316', tipo: 'normal' },
  { id: '5', label: 'Fechado',            cor: '#22C55E', tipo: 'ganho'  },
  { id: '6', label: 'Perdido',            cor: '#EF4444', tipo: 'perdido'},
]

export function PipelineSettings() {
  const { success } = useToast()

  const [colunas, setColunas] = useState<KanbanColuna[]>(DEFAULT_COLUNAS)
  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [tiposEst, setTiposEst] = useState(['Estética', 'Detailer', 'Concessionária', 'Outro'])

  const [novaColunaNome, setNovaColunaNome] = useState('')
  const [novaColunaCor, setNovaColunaCor] = useState('#3B82F6')
  const [novoCampoNome, setNovoCampoNome] = useState('')
  const [novoCampoTipo, setNovoCampoTipo] = useState<CampoPersonalizado['tipo']>('texto')
  const [novoCampoObrig, setNovoCampoObrig] = useState(false)
  const [novoTipo, setNovoTipo] = useState('')

  const addColuna = () => {
    if (!novaColunaNome.trim()) return
    setColunas(prev => [...prev, { id: Date.now().toString(), label: novaColunaNome.trim(), cor: novaColunaCor, tipo: 'normal' }])
    setNovaColunaNome('')
  }

  const addCampo = () => {
    if (!novoCampoNome.trim()) return
    setCampos(prev => [...prev, { id: Date.now().toString(), nome: novoCampoNome.trim(), tipo: novoCampoTipo, obrigatorio: novoCampoObrig }])
    setNovoCampoNome('')
    setNovoCampoObrig(false)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Pipeline CRM</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Configure as colunas do Kanban e campos personalizados.</p>
      </div>

      {/* Colunas do Kanban */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Colunas do Kanban</h2>
        <div className="space-y-2 mb-4">
          {colunas.map(col => (
            <div key={col.id} className="flex items-center gap-2 bg-[var(--bg-surface-2)] rounded-lg px-3 py-2">
              <GripVertical size={14} className="text-[var(--text-secondary)] cursor-grab" />
              <input
                type="color"
                value={col.cor}
                onChange={e => setColunas(prev => prev.map(c => c.id === col.id ? { ...c, cor: e.target.value } : c))}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
              />
              <input
                className="input-purion flex-1 py-1"
                value={col.label}
                onChange={e => setColunas(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value } : c))}
              />
              <select
                className="input-purion py-1 text-xs"
                value={col.tipo}
                onChange={e => setColunas(prev => prev.map(c => c.id === col.id ? { ...c, tipo: e.target.value as KanbanColuna['tipo'] } : c))}
              >
                <option value="normal">Normal</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
              <button onClick={() => setColunas(prev => prev.filter(c => c.id !== col.id))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="color"
            value={novaColunaCor}
            onChange={e => setNovaColunaCor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer border border-[var(--border)] bg-transparent"
          />
          <input className="input-purion flex-1" placeholder="Nome da coluna..." value={novaColunaNome}
            onChange={e => setNovaColunaNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addColuna()} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={addColuna}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Campos Personalizados */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Campos Personalizados</h2>
        {campos.length > 0 && (
          <div className="space-y-2 mb-4">
            {campos.map(campo => (
              <div key={campo.id} className="flex items-center gap-2 bg-[var(--bg-surface-2)] rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-[var(--text-primary)]">{campo.nome}</span>
                <span className="text-xs bg-[var(--bg-surface)] px-2 py-0.5 rounded text-[var(--text-secondary)]">{campo.tipo}</span>
                {campo.obrigatorio && <span className="text-xs text-[#C9A84C]">Obrigatório</span>}
                <button onClick={() => setCampos(prev => prev.filter(c => c.id !== campo.id))}
                  className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {campos.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] mb-4">Nenhum campo personalizado adicionado.</p>
        )}
        <div className="flex gap-2 flex-wrap">
          <input className="input-purion flex-1 min-w-[150px]" placeholder="Nome do campo..." value={novoCampoNome}
            onChange={e => setNovoCampoNome(e.target.value)} />
          <select className="input-purion" value={novoCampoTipo}
            onChange={e => setNovoCampoTipo(e.target.value as CampoPersonalizado['tipo'])}>
            {(['texto', 'numero', 'data', 'select', 'toggle', 'url'] as const).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={novoCampoObrig} onChange={e => setNovoCampoObrig(e.target.checked)} />
            Obrigatório
          </label>
          <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={addCampo}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Tipos de Estabelecimento */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tipos de Estabelecimento</h2>
        <div className="space-y-2 mb-3">
          {tiposEst.map((tipo, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input-purion flex-1" value={tipo}
                onChange={e => setTiposEst(prev => prev.map((t, j) => j === i ? e.target.value : t))} />
              <button onClick={() => setTiposEst(prev => prev.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input-purion flex-1" placeholder="Novo tipo..." value={novoTipo}
            onChange={e => setNovoTipo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && novoTipo.trim()) { setTiposEst(prev => [...prev, novoTipo.trim()]); setNovoTipo('') }}} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1"
            onClick={() => { if (novoTipo.trim()) { setTiposEst(prev => [...prev, novoTipo.trim()]); setNovoTipo('') }}}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      <button onClick={() => success('Pipeline configurado')} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar pipeline
      </button>
    </div>
  )
}
