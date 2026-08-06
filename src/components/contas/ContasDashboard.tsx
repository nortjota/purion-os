'use client'

import { useState, useMemo } from 'react'
import { Plus, ExternalLink, Pencil, Trash2, ShieldAlert } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { ContaAcesso, CategoriaContaAcesso } from '@/store'
import { useIsMaster } from '@/hooks/useIsMaster'
import { useContas } from '@/hooks/useContas'
import { AcessoRestrito } from '@/components/auth/AcessoRestrito'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ContaModal } from './ContaModal'

const CATEGORIA_LABEL: Record<CategoriaContaAcesso, string> = {
  ads: 'Ads', pagamento: 'Pagamento', social: 'Social',
  infra: 'Infraestrutura', banco: 'Banco', legal: 'Jurídico',
}

const STATUS_BADGE: Record<string, string> = {
  ativo: 'badge-success', pendente: 'badge-warning', inativo: 'badge-neutral',
}

const STATUS_LABEL: Record<string, string> = { ativo: 'Ativo', pendente: 'Pendente', inativo: 'Inativo' }

const COR_RESPONSAVEL: Record<string, string> = { matheus: '#C9A84C', joao: '#5B8FE8', gabriel: '#4CAF7A' }

export function ContasDashboard() {
  const { isMaster, loading } = useIsMaster()
  const { contasAcessos } = usePurionStore()
  const { criarConta, atualizarConta, deletarConta } = useContas()

  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ContaAcesso | null>(null)
  const [deletando, setDeletando] = useState<ContaAcesso | null>(null)

  const responsaveis = useMemo(() => [...new Set(contasAcessos.map((c) => c.responsavel).filter(Boolean))], [contasAcessos])

  const filtradas = useMemo(() => contasAcessos.filter((c) => {
    if (filtroCategoria !== 'todos' && c.categoria !== filtroCategoria) return false
    if (filtroResponsavel !== 'todos' && c.responsavel !== filtroResponsavel) return false
    return true
  }), [contasAcessos, filtroCategoria, filtroResponsavel])

  const categoriasComConta = (Object.keys(CATEGORIA_LABEL) as CategoriaContaAcesso[]).filter(
    (cat) => filtradas.some((c) => c.categoria === cat)
  )

  if (loading) return null
  if (!isMaster) return <AcessoRestrito />

  function handleSalvar(dados: Omit<ContaAcesso, 'id' | 'updatedAt'>) {
    if (editando) atualizarConta(editando.id, dados)
    else criarConta(dados)
    setEditando(null)
  }

  return (
    <div className="page-content section-gap">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Contas & Acessos</h1>
          <p className="caption mt-1">{contasAcessos.length} contas cadastradas — acesso restrito ao administrador</p>
        </div>
        <button onClick={() => { setEditando(null); setModalAberto(true) }} className="btn btn-primary">
          <Plus size={15} /> Nova conta
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select className="select-purion" style={{ width: 'auto' }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="todos">Todas as categorias</option>
          {Object.entries(CATEGORIA_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select className="select-purion" style={{ width: 'auto' }} value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
          <option value="todos">Todos os responsáveis</option>
          {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <ShieldAlert size={14} className="text-[#C9A84C] shrink-0" />
        <p className="text-[12px] text-[#C9A84C]">Senhas não ficam aqui — apenas a referência de onde estão guardadas (vault_ref).</p>
      </div>

      {categoriasComConta.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma conta cadastrada</p>
          <p className="empty-state-subtitle">Clique em &quot;Nova conta&quot; para começar.</p>
        </div>
      )}

      {categoriasComConta.map((cat) => (
        <section key={cat}>
          <p className="kpi-label mb-3">{CATEGORIA_LABEL[cat]}</p>
          <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {filtradas.filter((c) => c.categoria === cat).map((conta) => {
              const cor = COR_RESPONSAVEL[conta.responsavel] ?? '#B8B8B8'
              return (
                <div key={conta.id} className="card-purion card-section group relative">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{conta.plataforma}</p>
                    <span className={`badge ${STATUS_BADGE[conta.status]}`}>{STATUS_LABEL[conta.status]}</span>
                  </div>
                  {conta.identificador && <p className="caption mb-1">{conta.identificador}</p>}
                  {conta.url && (
                    <a href={conta.url.startsWith('http') ? conta.url : `https://${conta.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] mb-2" style={{ color: '#5B8FE8' }}>
                      {conta.url} <ExternalLink size={10} />
                    </a>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {conta.responsavel && (
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: `${cor}25`, color: cor }}>
                          {conta.responsavel.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {conta.vaultRef && <span className="caption">🔒 {conta.vaultRef}</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditando(conta); setModalAberto(true) }} className="icon-btn border-0" style={{ width: 24, height: 24 }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeletando(conta)} className="icon-btn border-0" style={{ width: 24, height: 24 }}>
                        <Trash2 size={12} className="text-[#E85238]" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {modalAberto && (
        <ContaModal
          conta={editando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}

      <ConfirmModal
        open={!!deletando}
        title="Excluir Conta"
        message={`Deseja excluir "${deletando?.plataforma}"?`}
        onConfirm={() => { if (deletando) { deletarConta(deletando.id); setDeletando(null) } }}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}
