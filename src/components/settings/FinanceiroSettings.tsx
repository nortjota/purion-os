'use client'

import { useState, useMemo } from 'react'
import { usePurionStore } from '@/store'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { useToast } from '@/components/ui/Toast'
import { Save, Trash2, Plus, BarChart2, RefreshCw } from 'lucide-react'

const SPLIT_COLORS = ['#C9A84C', '#3B82F6', '#22C55E', '#A855F7', '#EF4444']
const SPLIT_LABELS = ['Estoque', 'Marketing', 'Caixa', 'Desenvolvimento', 'Societário']

export function FinanceiroSettings() {
  const { configuracoes } = usePurionStore()
  const { salvarConfiguracoes } = useConfiguracoes()
  const { success, error } = useToast()

  // Precificação
  const [markup, setMarkup] = useState(Math.round(configuracoes.markupPadrao * 100))
  const [margemMinima, setMargemMinima] = useState(Math.round(configuracoes.margemMinimaAlvo * 100))
  const [alertaMargem, setAlertaMargem] = useState(Math.round(configuracoes.alertaMargemAbaixoDe * 100))
  const [formula, setFormula] = useState<'margem' | 'markup'>('margem')
  const [custoProduto, setCustoProduto] = useState(50)

  const precoSugerido = useMemo(() => {
    if (formula === 'margem') return custoProduto / (1 - margemMinima / 100)
    return custoProduto * (1 + markup / 100)
  }, [formula, custoProduto, margemMinima, markup])

  // Splits
  const [splitEstoque, setSplitEstoque] = useState(Math.round(configuracoes.splitEstoque * 100))
  const [splitMarketing, setSplitMarketing] = useState(Math.round(configuracoes.splitMarketing * 100))
  const [splitCaixa, setSplitCaixa] = useState(Math.round(configuracoes.splitOperacional * 100))
  const [splitDev, setSplitDev] = useState(Math.round(configuracoes.splitReserva * 100))
  const [splitSocietario, setSplitSocietario] = useState(Math.round(configuracoes.splitSocietario * 100))

  const splitValues = [splitEstoque, splitMarketing, splitCaixa, splitDev, splitSocietario]
  const splitSetters = [setSplitEstoque, setSplitMarketing, setSplitCaixa, setSplitDev, setSplitSocietario]
  const totalSplit = splitValues.reduce((a, b) => a + b, 0)

  // Categorias
  const [catReceita, setCatReceita] = useState(['Venda Site', 'Venda B2B', 'Marketplace', 'Outros'])
  const [catDespesa, setCatDespesa] = useState(['Estoque', 'Marketing', 'Operacional', 'Societário', 'Outros'])
  const [centrosCusto, setCentrosCusto] = useState([
    { id: '1', nome: 'Matheus – Comercial' },
    { id: '2', nome: 'João – Marketing' },
    { id: '3', nome: 'Gabriel – Produção' },
  ])
  const [newCatReceita, setNewCatReceita] = useState('')
  const [newCatDespesa, setNewCatDespesa] = useState('')
  const [newCentro, setNewCentro] = useState('')

  const handleSave = async () => {
    if (totalSplit !== 100) {
      error('A soma dos splits deve ser 100%')
      return
    }
    await salvarConfiguracoes({
      markupPadrao: markup / 100,
      margemMinimaAlvo: margemMinima / 100,
      alertaMargemAbaixoDe: alertaMargem / 100,
      splitEstoque: splitEstoque / 100,
      splitMarketing: splitMarketing / 100,
      splitOperacional: splitCaixa / 100,
      splitReserva: splitDev / 100,
      splitSocietario: splitSocietario / 100,
    })
    success('Configurações financeiras salvas')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Financeiro</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Precificação, reinvestimento e categorias.</p>
      </div>

      {/* Precificação */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Precificação</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Markup %</label>
              <input type="number" className="input-purion w-full" value={markup}
                onChange={e => setMarkup(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Margem mínima alvo %</label>
              <input type="number" className="input-purion w-full" value={margemMinima}
                onChange={e => setMargemMinima(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Alerta margem abaixo de %</label>
              <input type="number" className="input-purion w-full" value={alertaMargem}
                onChange={e => setAlertaMargem(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8A8A] block mb-1">Fórmula de precificação</label>
            <select className="input-purion w-full" value={formula}
              onChange={e => setFormula(e.target.value as 'margem' | 'markup')}>
              <option value="margem">Custo / (1 - margem)</option>
              <option value="markup">Custo × (1 + markup)</option>
            </select>
          </div>
          <div className="bg-[var(--bg-surface-2)] rounded-lg p-4 flex items-end gap-4">
            <div className="flex-1">
              <label className="text-xs text-[#8A8A8A] block mb-1">Custo do produto R$</label>
              <input type="number" className="input-purion w-full" value={custoProduto}
                onChange={e => setCustoProduto(Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#8A8A8A] mb-1">Preço sugerido</p>
              <p className="text-xl font-bold text-[#C9A84C]">
                R$ {precoSugerido.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reinvestimento */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Split de Reinvestimento</h2>
          </div>
          <button
            onClick={() => { [setSplitEstoque, setSplitMarketing, setSplitCaixa, setSplitDev, setSplitSocietario].forEach(s => s(20)) }}
            className="btn btn-sm btn-secondary flex items-center gap-1"
          >
            <RefreshCw size={12} /> Distribuir igualmente
          </button>
        </div>

        <div className="space-y-3">
          {SPLIT_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)] w-32">{label}</span>
              <input
                type="number"
                className="input-purion w-20"
                value={splitValues[i]}
                onChange={e => splitSetters[i](Number(e.target.value))}
              />
              <span className="text-xs text-[var(--text-secondary)]">%</span>
              <div className="flex-1 h-2 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${splitValues[i]}%`, background: SPLIT_COLORS[i] }}
                />
              </div>
            </div>
          ))}
          <div className={`text-sm font-bold mt-2 ${totalSplit === 100 ? 'text-green-400' : 'text-red-400'}`}>
            Total: {totalSplit}% {totalSplit === 100 ? '✓' : `(faltam ${100 - totalSplit}%)`}
          </div>
        </div>
      </div>

      {/* Categorias de Receita */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Categorias de Receita</h2>
        <div className="space-y-2 mb-3">
          {catReceita.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input-purion flex-1" value={cat}
                onChange={e => setCatReceita(prev => prev.map((c, j) => j === i ? e.target.value : c))} />
              <button onClick={() => setCatReceita(prev => prev.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input-purion flex-1" placeholder="Nova categoria..." value={newCatReceita}
            onChange={e => setNewCatReceita(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCatReceita.trim()) { setCatReceita(prev => [...prev, newCatReceita.trim()]); setNewCatReceita('') }}} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1"
            onClick={() => { if (newCatReceita.trim()) { setCatReceita(prev => [...prev, newCatReceita.trim()]); setNewCatReceita('') }}}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Categorias de Despesa */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Categorias de Despesa</h2>
        <div className="space-y-2 mb-3">
          {catDespesa.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input-purion flex-1" value={cat}
                onChange={e => setCatDespesa(prev => prev.map((c, j) => j === i ? e.target.value : c))} />
              <button onClick={() => setCatDespesa(prev => prev.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input-purion flex-1" placeholder="Nova categoria..." value={newCatDespesa}
            onChange={e => setNewCatDespesa(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCatDespesa.trim()) { setCatDespesa(prev => [...prev, newCatDespesa.trim()]); setNewCatDespesa('') }}} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1"
            onClick={() => { if (newCatDespesa.trim()) { setCatDespesa(prev => [...prev, newCatDespesa.trim()]); setNewCatDespesa('') }}}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Centros de Custo */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Centros de Custo</h2>
        <div className="space-y-2 mb-3">
          {centrosCusto.map((centro) => (
            <div key={centro.id} className="flex items-center gap-2">
              <input className="input-purion flex-1" value={centro.nome}
                onChange={e => setCentrosCusto(prev => prev.map(c => c.id === centro.id ? { ...c, nome: e.target.value } : c))} />
              <button onClick={() => setCentrosCusto(prev => prev.filter(c => c.id !== centro.id))}
                className="text-red-400 hover:text-red-300 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input-purion flex-1" placeholder="Novo centro de custo..." value={newCentro}
            onChange={e => setNewCentro(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCentro.trim()) { setCentrosCusto(prev => [...prev, { id: Date.now().toString(), nome: newCentro.trim() }]); setNewCentro('') }}} />
          <button className="btn btn-sm btn-secondary flex items-center gap-1"
            onClick={() => { if (newCentro.trim()) { setCentrosCusto(prev => [...prev, { id: Date.now().toString(), nome: newCentro.trim() }]); setNewCentro('') }}}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar configurações
      </button>
    </div>
  )
}
