'use client'

import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { ContaAcesso, CategoriaContaAcesso, StatusContaAcesso } from '@/store'

const CATEGORIAS: Array<{ id: CategoriaContaAcesso; label: string }> = [
  { id: 'ads', label: 'Ads' }, { id: 'pagamento', label: 'Pagamento' }, { id: 'social', label: 'Social' },
  { id: 'infra', label: 'Infraestrutura' }, { id: 'banco', label: 'Banco' }, { id: 'legal', label: 'Jurídico' },
]

const STATUS: Array<{ id: StatusContaAcesso; label: string }> = [
  { id: 'ativo', label: 'Ativo' }, { id: 'pendente', label: 'Pendente' }, { id: 'inativo', label: 'Inativo' },
]

interface ContaModalProps {
  conta: ContaAcesso | null
  onSalvar: (dados: Omit<ContaAcesso, 'id' | 'updatedAt'>) => void
  onFechar: () => void
}

export function ContaModal({ conta, onSalvar, onFechar }: ContaModalProps) {
  const [form, setForm] = useState({
    plataforma:    conta?.plataforma ?? '',
    categoria:     conta?.categoria ?? 'infra' as CategoriaContaAcesso,
    identificador: conta?.identificador ?? '',
    url:           conta?.url ?? '',
    responsavel:   conta?.responsavel ?? '',
    status:        conta?.status ?? 'pendente' as StatusContaAcesso,
    observacoes:   conta?.observacoes ?? '',
    vaultRef:      conta?.vaultRef ?? '',
  })
  const [erro, setErro] = useState('')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.plataforma.trim()) { setErro('Informe a plataforma.'); return }
    onSalvar({ ...form, plataforma: form.plataforma.trim() })
    onFechar()
  }

  const inputCls = 'input-purion'

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{conta ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input
            value={form.plataforma}
            onChange={(e) => set('plataforma', e.target.value)}
            placeholder="Plataforma *" className={inputCls} autoFocus
          />
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select value={form.categoria} onChange={(e) => set('categoria', e.target.value as CategoriaContaAcesso)} className={`${inputCls} appearance-none cursor-pointer`}>
                {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select value={form.status} onChange={(e) => set('status', e.target.value as StatusContaAcesso)} className={`${inputCls} appearance-none cursor-pointer`}>
                {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
            </div>
          </div>
          <input value={form.identificador} onChange={(e) => set('identificador', e.target.value)} placeholder="Identificador (login/e-mail)" className={inputCls} />
          <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="URL" className={inputCls} />
          <input value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Responsável" className={inputCls} />

          <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.2)] rounded-xl p-4 space-y-2">
            <p className="text-[11px] text-[#C9A84C] font-semibold">Senhas não ficam aqui — só a referência do cofre</p>
            <input
              value={form.vaultRef}
              onChange={(e) => set('vaultRef', e.target.value)}
              placeholder="Ex: Bitwarden, 1Password…"
              className={inputCls}
            />
          </div>

          <textarea value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Observações" rows={2} className={`${inputCls} resize-none`} />

          {erro && <p className="text-xs text-[#E85238]">{erro}</p>}

          <div className="modal-footer">
            <button type="button" onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
