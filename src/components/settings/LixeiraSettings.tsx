'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { supabase } from '@/lib/supabase'
import { RotateCcw, Trash2 } from 'lucide-react'

type Tab = 'tarefas' | 'leads' | 'financeiro' | 'lotes' | 'expedicao' | 'creators' | 'reunioes'

interface DeletedRecord {
  id: string
  titulo: string
  deleted_at: string
}

const TAB_CONFIG: { key: Tab; label: string; table: string; titleField: string }[] = [
  { key: 'tarefas',   label: 'Tarefas',    table: 'tarefas',           titleField: 'titulo'       },
  { key: 'leads',     label: 'Leads',      table: 'leads',             titleField: 'nome_empresa' },
  { key: 'financeiro',label: 'Financeiro', table: 'receitas',          titleField: 'descricao'    },
  { key: 'lotes',     label: 'Lotes',      table: 'lotes',             titleField: 'codigo'       },
  { key: 'expedicao', label: 'Expedição',  table: 'pedidos_expedicao', titleField: 'numero_pedido'},
  { key: 'creators',  label: 'Creators',   table: 'creators',          titleField: 'nome'         },
  { key: 'reunioes',  label: 'Reuniões',   table: 'reunioes',          titleField: 'titulo'       },
]

export function LixeiraSettings() {
  const { success, error } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('tarefas')
  const [records, setRecords] = useState<DeletedRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: '' })

  const currentTabConfig = TAB_CONFIG.find(t => t.key === activeTab)!

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const load = async () => {
      setLoading(true)
      const { data } = await sb
        .from(currentTabConfig.table)
        .select(`id, ${currentTabConfig.titleField}, deleted_at`)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecords((data as any[]).map((r) => ({
          id: r.id as string,
          titulo: (r[currentTabConfig.titleField] as string) ?? '—',
          deleted_at: r.deleted_at as string,
        })))
      } else {
        setRecords([])
      }
      setLoading(false)
    }
    load()
  }, [activeTab, currentTabConfig.table, currentTabConfig.titleField])

  const restore = async (id: string) => {
    if (!supabase) return
    const sb = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (sb.from(currentTabConfig.table) as any)
      .update({ deleted_at: null })
      .eq('id', id)
    if (err) { error('Erro ao restaurar'); return }
    setRecords(prev => prev.filter(r => r.id !== id))
    success('Registro restaurado')
  }

  const hardDelete = async (id: string) => {
    if (!supabase) return
    const sb = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (sb.from(currentTabConfig.table) as any)
      .delete()
      .eq('id', id)
    if (err) { error('Erro ao excluir'); return }
    setRecords(prev => prev.filter(r => r.id !== id))
    success('Excluído permanentemente')
  }

  if (!supabase) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Lixeira</h1>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-[var(--text-secondary)]">Conecte o Supabase para ver registros excluídos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Lixeira</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Restaure ou exclua permanentemente registros deletados.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-[var(--border)] pb-0">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-secondary)] text-sm">Carregando...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)] text-sm">Nenhum registro excluído nesta categoria.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[#8A8A8A] font-medium">Nome/Título</th>
                <th className="text-left px-4 py-3 text-xs text-[#8A8A8A] font-medium">Excluído em</th>
                <th className="text-left px-4 py-3 text-xs text-[#8A8A8A] font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">{r.titulo}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {new Date(r.deleted_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => restore(r.id)}
                        className="p-1.5 rounded-lg hover:bg-green-500/10 text-[var(--text-secondary)] hover:text-green-400" title="Restaurar">
                        <RotateCcw size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete({ open: true, id: r.id })}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400" title="Excluir permanentemente">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete.open}
        title="Excluir permanentemente"
        message="Esta ação não pode ser desfeita. O registro será excluído definitivamente."
        confirmLabel="Excluir permanentemente"
        onConfirm={() => { hardDelete(confirmDelete.id); setConfirmDelete({ open: false, id: '' }) }}
        onCancel={() => setConfirmDelete({ open: false, id: '' })}
        danger
      />
    </div>
  )
}
