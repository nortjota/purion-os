'use client'

import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import type { Lead, TierLead, PerfilUsuario } from '@/store'
import { ESTAGIOS, SOCIOS, estagioNormalizado } from './crmHelpers'

export interface FiltrosCRM {
  busca: string
  tier: TierLead | 'todos'
  estagio: string
  cidade: string
  responsavel: PerfilUsuario | 'todos'
  followUp: 'todos' | 'hoje' | 'atrasado'
}

export const FILTROS_CRM_VAZIOS: FiltrosCRM = {
  busca: '', tier: 'todos', estagio: 'todos', cidade: 'todos', responsavel: 'todos', followUp: 'todos',
}

export function aplicarFiltrosCRM(leads: Lead[], f: FiltrosCRM): Lead[] {
  const hoje = new Date().toISOString().slice(0, 10)
  return leads.filter((l) => {
    if (f.busca.trim()) {
      const q = f.busca.trim().toLowerCase()
      if (!l.nomeEmpresa.toLowerCase().includes(q) && !l.nomeContato.toLowerCase().includes(q)) return false
    }
    if (f.tier !== 'todos' && l.tier !== f.tier) return false
    if (f.estagio !== 'todos' && estagioNormalizado(l.status) !== f.estagio) return false
    if (f.cidade !== 'todos' && l.cidade !== f.cidade) return false
    if (f.responsavel !== 'todos' && l.responsavel !== f.responsavel) return false
    if (f.followUp === 'hoje' && l.proximoPassoData?.slice(0, 10) !== hoje) return false
    if (f.followUp === 'atrasado' && (!l.proximoPassoData || l.proximoPassoData.slice(0, 10) >= hoje)) return false
    return true
  })
}

interface ChipDef { key: keyof FiltrosCRM; label: string }

function chipsAtivos(f: FiltrosCRM): ChipDef[] {
  const chips: ChipDef[] = []
  if (f.busca.trim())          chips.push({ key: 'busca', label: `Busca: "${f.busca.trim()}"` })
  if (f.tier !== 'todos')      chips.push({ key: 'tier', label: `Tier ${f.tier}` })
  if (f.estagio !== 'todos')   chips.push({ key: 'estagio', label: ESTAGIOS.find((e) => e.id === f.estagio)?.label ?? f.estagio })
  if (f.cidade !== 'todos')    chips.push({ key: 'cidade', label: f.cidade })
  if (f.responsavel !== 'todos') chips.push({ key: 'responsavel', label: SOCIOS.find((s) => s.id === f.responsavel)?.nome ?? f.responsavel })
  if (f.followUp !== 'todos')  chips.push({ key: 'followUp', label: f.followUp === 'hoje' ? 'Follow-up hoje' : 'Follow-up atrasado' })
  return chips
}

interface Props {
  leads: Lead[]
  filtros: FiltrosCRM
  onChange: (f: FiltrosCRM) => void
}

export function CRMFiltrosBar({ leads, filtros, onChange }: Props) {
  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((l) => { if (l.cidade) set.add(l.cidade) })
    return [...set].sort()
  }, [leads])

  function set<K extends keyof FiltrosCRM>(k: K, v: FiltrosCRM[K]) {
    onChange({ ...filtros, [k]: v })
  }

  const chips = chipsAtivos(filtros)
  const selectCls = 'select-purion'

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2.5 items-center">
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 40 }}
        >
          <Search size={14} color="var(--text-secondary)" />
          <input
            value={filtros.busca}
            onChange={(e) => set('busca', e.target.value)}
            placeholder="Buscar por empresa ou contato…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%', height: '100%' }}
          />
        </div>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.tier} onChange={(e) => set('tier', e.target.value as FiltrosCRM['tier'])}>
          <option value="todos">Todos os tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.estagio} onChange={(e) => set('estagio', e.target.value)}>
          <option value="todos">Todos os estágios</option>
          {ESTAGIOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>

        {cidadesDisponiveis.length > 0 && (
          <select className={selectCls} style={{ width: 'auto' }} value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)}>
            <option value="todos">Todas as cidades</option>
            {cidadesDisponiveis.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.responsavel} onChange={(e) => set('responsavel', e.target.value as FiltrosCRM['responsavel'])}>
          <option value="todos">Todos os responsáveis</option>
          {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select className={selectCls} style={{ width: 'auto' }} value={filtros.followUp} onChange={(e) => set('followUp', e.target.value as FiltrosCRM['followUp'])}>
          <option value="todos">Qualquer follow-up</option>
          <option value="hoje">Follow-up hoje</option>
          <option value="atrasado">Follow-up atrasado</option>
        </select>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 text-[12px]"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', borderRadius: 20, padding: '4px 10px' }}
            >
              {c.label}
              <button onClick={() => set(c.key, FILTROS_CRM_VAZIOS[c.key] as never)} style={{ display: 'flex', cursor: 'pointer' }}>
                <X size={11} />
              </button>
            </span>
          ))}
          <button onClick={() => onChange(FILTROS_CRM_VAZIOS)} className="text-[12px]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
