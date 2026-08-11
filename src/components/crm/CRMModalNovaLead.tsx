'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Lead, Regiao, PerfilUsuario, TierLead, StatusLead, TipoEstabelecimento } from '@/store'
import { ESTAGIOS, SOCIOS } from './crmHelpers'

interface FormLead {
  nomeEmpresa: string
  nomeContato: string
  telefone: string
  email: string
  regiao: Regiao
  cidade: string
  responsavel: PerfilUsuario
  tier: TierLead
  status: StatusLead
  valorMedioMensal: string
  tipoEstabelecimento: TipoEstabelecimento
}

interface Props {
  perfilAtivo: PerfilUsuario
  onCriar: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void
  onFechar: () => void
}

export function CRMModalNovaLead({ perfilAtivo, onCriar, onFechar }: Props) {
  const [form, setForm] = useState<FormLead>({
    nomeEmpresa: '', nomeContato: '', telefone: '', email: '', regiao: 'DF', cidade: '',
    responsavel: perfilAtivo, tier: 'C', status: 'prospecto', valorMedioMensal: '',
    tipoEstabelecimento: 'estetica',
  })
  const [erro, setErro] = useState('')

  function set<K extends keyof FormLead>(k: K, v: FormLead[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.nomeEmpresa.trim()) { setErro('Informe o nome da empresa.'); return }
    onCriar({
      nomeEmpresa: form.nomeEmpresa.trim(),
      nomeContato: form.nomeContato.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      regiao: form.regiao,
      cidade: form.cidade.trim(),
      responsavel: form.responsavel,
      tier: form.tier,
      status: form.status,
      valorMedioMensal: form.valorMedioMensal ? Number(form.valorMedioMensal) : 0,
      ultimoPedido: null,
      notas: '',
      tipoEstabelecimento: form.tipoEstabelecimento,
      historicoInteracoes: [],
      tags: [],
      proximoPassoData: null,
      proximoPassoAcao: null,
      historicoEstagios: [],
    })
    onFechar()
  }

  const inputCls = 'input-purion'

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nova Lead B2B</h3>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input type="text" value={form.nomeEmpresa} onChange={(e) => set('nomeEmpresa', e.target.value)}
            placeholder="Nome da empresa *" className={inputCls} autoFocus maxLength={100} />

          <input type="text" value={form.nomeContato} onChange={(e) => set('nomeContato', e.target.value)}
            placeholder="Nome do contato" className={inputCls} maxLength={100} />

          <div className="grid grid-cols-2 gap-3">
            <input type="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)}
              placeholder="Telefone" className={inputCls} />
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="E-mail" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.cidade} onChange={(e) => set('cidade', e.target.value)}
              placeholder="Cidade" className={inputCls} />
            <select className="select-purion" value={form.regiao} onChange={(e) => set('regiao', e.target.value as Regiao)}>
              <option value="DF">DF</option>
              <option value="SP">SP</option>
              <option value="SC">SC</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select className="select-purion" value={form.tipoEstabelecimento} onChange={(e) => set('tipoEstabelecimento', e.target.value as TipoEstabelecimento)}>
              <option value="estetica">Estética</option>
              <option value="detailer">Detailer</option>
              <option value="concessionaria">Concessionária</option>
            </select>
            <select className="select-purion" value={form.tier} onChange={(e) => set('tier', e.target.value as TierLead)}>
              <option value="A">Tier A</option>
              <option value="B">Tier B</option>
              <option value="C">Tier C</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select className="select-purion" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)}>
              {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <select className="select-purion" value={form.status} onChange={(e) => set('status', e.target.value as StatusLead)}>
              {ESTAGIOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>

          <input type="number" min={0} value={form.valorMedioMensal} onChange={(e) => set('valorMedioMensal', e.target.value)}
            placeholder="Valor médio mensal (R$)" className={inputCls} />

          {erro && <p style={{ fontSize: 12, color: '#E85238' }}>{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1">Cadastrar lead</button>
          </div>
        </form>
      </div>
    </div>
  )
}
