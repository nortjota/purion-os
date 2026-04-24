'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Save, Trash2, Plus, ChevronDown, ChevronRight, Star } from 'lucide-react'

interface SKU {
  id: string
  nome: string
  descricao: string
  notasOlfativas: string
  concentracao: string
  volumeMl: number
  ativo: boolean
  expanded?: boolean
}

interface ChecklistItem {
  id: string
  nome: string
  obrigatorio: boolean
}

interface Fornecedor {
  id: string
  nome: string
  contato: string
  produtos: string
  prazoMedio: number
  avaliacao: number
}

export function ProducaoSettings() {
  const { success } = useToast()

  const [skus, setSkus] = useState<SKU[]>([
    { id: '1', nome: 'Noir', descricao: 'Amadeirado intenso', notasOlfativas: 'Oud, Cedro, Baunilha', concentracao: '25%', volumeMl: 50, ativo: true },
    { id: '2', nome: 'Urban', descricao: 'Cítrico moderno', notasOlfativas: 'Bergamota, Vetiver, Musgo', concentracao: '20%', volumeMl: 50, ativo: true },
    { id: '3', nome: 'Coastal', descricao: 'Aquático fresco', notasOlfativas: 'Marinha, Cedro Branco, Almíscar', concentracao: '20%', volumeMl: 50, ativo: true },
  ])

  const [formatoLote, setFormatoLote] = useState('LOTE-{ANO}-{SEQ}')
  const [loteAutomatico, setLoteAutomatico] = useState(true)

  const previewLote = formatoLote.replace('{ANO}', '2025').replace('{SEQ}', '001')

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', nome: 'Duração', obrigatorio: true },
    { id: '2', nome: 'Mancha', obrigatorio: true },
    { id: '3', nome: 'Estabilidade Térmica', obrigatorio: true },
    { id: '4', nome: 'Válvula', obrigatorio: true },
    { id: '5', nome: 'Cego', obrigatorio: false },
  ])
  const [novoCheck, setNovoCheck] = useState('')

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [novoForn, setNovoForn] = useState({ nome: '', contato: '', produtos: '', prazoMedio: 7, avaliacao: 5 })

  const moveCheck = (id: string, dir: 'up' | 'down') => {
    setChecklist(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const next = [...prev]
      const target = dir === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Produção</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">SKUs, lotes, testes e fornecedores.</p>
      </div>

      {/* SKUs */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">SKUs</h2>
        <div className="space-y-2">
          {skus.map(sku => (
            <div key={sku.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
                onClick={() => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, expanded: !s.expanded } : s))}
              >
                {sku.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{sku.nome}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sku.ativo ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {sku.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, ativo: !s.ativo } : s)) }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded border border-[var(--border)]"
                >
                  Toggle
                </button>
              </div>
              {sku.expanded && (
                <div className="p-3 border-t border-[var(--border)] space-y-3 bg-[var(--bg-surface-2)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#8A8A8A] block mb-1">Nome</label>
                      <input className="input-purion w-full" value={sku.nome}
                        onChange={e => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, nome: e.target.value } : s))} />
                    </div>
                    <div>
                      <label className="text-xs text-[#8A8A8A] block mb-1">Concentração</label>
                      <input className="input-purion w-full" value={sku.concentracao}
                        onChange={e => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, concentracao: e.target.value } : s))} />
                    </div>
                    <div>
                      <label className="text-xs text-[#8A8A8A] block mb-1">Volume (ml)</label>
                      <input type="number" className="input-purion w-full" value={sku.volumeMl}
                        onChange={e => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, volumeMl: Number(e.target.value) } : s))} />
                    </div>
                    <div>
                      <label className="text-xs text-[#8A8A8A] block mb-1">Descrição</label>
                      <input className="input-purion w-full" value={sku.descricao}
                        onChange={e => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, descricao: e.target.value } : s))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-[#8A8A8A] block mb-1">Notas Olfativas</label>
                      <input className="input-purion w-full" value={sku.notasOlfativas}
                        onChange={e => setSkus(prev => prev.map(s => s.id === sku.id ? { ...s, notasOlfativas: e.target.value } : s))} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Formato de Lote */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Formato de Lote</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Formato</label>
            <input className="input-purion w-full" value={formatoLote}
              onChange={e => setFormatoLote(e.target.value)} />
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            Preview: <span className="font-mono text-[#C9A84C]">{previewLote}</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={loteAutomatico} onChange={e => setLoteAutomatico(e.target.checked)} />
            Numeração automática
          </label>
        </div>
      </div>

      {/* Checklist de Testes */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Checklist de Testes</h2>
        <div className="space-y-2 mb-3">
          {checklist.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 bg-[var(--bg-surface-2)] rounded-lg px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveCheck(item.id, 'up')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs leading-none">▲</button>
                <button onClick={() => moveCheck(item.id, 'down')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs leading-none">▼</button>
              </div>
              <span className="flex-1 text-sm text-[var(--text-primary)]">{item.nome}</span>
              <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={item.obrigatorio}
                  onChange={e => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, obrigatorio: e.target.checked } : c))} />
                Obrigatório
              </label>
              <button onClick={() => setChecklist(prev => prev.filter(c => c.id !== item.id))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input-purion flex-1" placeholder="Novo teste..." value={novoCheck}
            onChange={e => setNovoCheck(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && novoCheck.trim()) { setChecklist(prev => [...prev, { id: Date.now().toString(), nome: novoCheck.trim(), obrigatorio: false }]); setNovoCheck('') }}} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1"
            onClick={() => { if (novoCheck.trim()) { setChecklist(prev => [...prev, { id: Date.now().toString(), nome: novoCheck.trim(), obrigatorio: false }]); setNovoCheck('') }}}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Fornecedores */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Fornecedores</h2>
        {fornecedores.length > 0 && (
          <div className="space-y-2 mb-4">
            {fornecedores.map(f => (
              <div key={f.id} className="flex items-start gap-3 bg-[var(--bg-surface-2)] rounded-lg px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{f.nome}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{f.contato} · {f.produtos} · Prazo: {f.prazoMedio}d</p>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < f.avaliacao ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[var(--border)]'} />
                    ))}
                  </div>
                </div>
                <button onClick={() => setFornecedores(prev => prev.filter(x => x.id !== f.id))}
                  className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2 border border-[var(--border)] rounded-lg p-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Novo fornecedor</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Nome</label>
              <input className="input-purion w-full" value={novoForn.nome}
                onChange={e => setNovoForn(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Contato</label>
              <input className="input-purion w-full" value={novoForn.contato}
                onChange={e => setNovoForn(p => ({ ...p, contato: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Produtos</label>
              <input className="input-purion w-full" value={novoForn.produtos}
                onChange={e => setNovoForn(p => ({ ...p, produtos: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Prazo médio (dias)</label>
              <input type="number" className="input-purion w-full" value={novoForn.prazoMedio}
                onChange={e => setNovoForn(p => ({ ...p, prazoMedio: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Avaliação (1-5)</label>
              <input type="number" min={1} max={5} className="input-purion w-full" value={novoForn.avaliacao}
                onChange={e => setNovoForn(p => ({ ...p, avaliacao: Number(e.target.value) }))} />
            </div>
          </div>
          <button
            className="btn btn-sm btn-secondary flex items-center gap-1 mt-2"
            onClick={() => {
              if (!novoForn.nome.trim()) return
              setFornecedores(prev => [...prev, { ...novoForn, id: Date.now().toString() }])
              setNovoForn({ nome: '', contato: '', produtos: '', prazoMedio: 7, avaliacao: 5 })
            }}>
            <Plus size={13} /> Adicionar fornecedor
          </button>
        </div>
      </div>

      <button onClick={() => success('Configurações de produção salvas')} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar produção
      </button>
    </div>
  )
}
