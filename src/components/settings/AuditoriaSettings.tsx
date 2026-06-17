'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { Download, ChevronDown, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  created_at: string
  usuario_nome: string
  usuario_id: string
  acao: 'INSERT' | 'UPDATE' | 'DELETE'
  modulo: string
  resumo: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

interface Counts {
  hoje: number
  semana: number
  total: number
}

interface BarData {
  usuario: string
  count: number
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function AuditoriaSettings() {
  const { success } = useToast()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<Counts>({ hoje: 0, semana: 0, total: 0 })
  const [barData, setBarData] = useState<BarData[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [usuarios, setUsuarios] = useState<string[]>([])
  const [modulos, setModulos] = useState<string[]>([])
  const [filterUsuario, setFilterUsuario] = useState('')
  const [filterModulo, setFilterModulo] = useState('')
  const [filterAcao, setFilterAcao] = useState('')
  const [filterInicio, setFilterInicio] = useState('')
  const [filterFim, setFilterFim] = useState('')

  const noSupabase = !supabase

  const loadLogs = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let q = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
      if (filterUsuario) q = q.eq('usuario_id', filterUsuario)
      if (filterModulo)  q = q.eq('modulo', filterModulo)
      if (filterAcao)    q = q.eq('acao', filterAcao)
      if (filterInicio)  q = q.gte('created_at', filterInicio)
      if (filterFim)     q = q.lte('created_at', filterFim + 'T23:59:59')

      const { data, error } = await q
      dbLog('SELECT', 'audit_log', error, `${data?.length ?? 0} rows`)
      if (data) {
        setLogs(data as AuditLog[])
        // counts
        const hoje = new Date().toISOString().split('T')[0]
        const semana = new Date(Date.now() - 7 * 864e5).toISOString()
        const hC = data.filter((l: AuditLog) => l.created_at.startsWith(hoje)).length
        const wC = data.filter((l: AuditLog) => l.created_at >= semana).length
        setCounts({ hoje: hC, semana: wC, total: data.length })
        // bar data
        const map = new Map<string, number>()
        data.forEach((l: AuditLog) => {
          const key = l.usuario_nome ?? l.usuario_id ?? 'Unknown'
          map.set(key, (map.get(key) ?? 0) + 1)
        })
        setBarData(Array.from(map.entries()).map(([usuario, count]) => ({ usuario, count })))
      }
    } catch {
      // audit_log may not exist
    } finally {
      setLoading(false)
    }
  }, [filterUsuario, filterModulo, filterAcao, filterInicio, filterFim])

  useEffect(() => {
    if (!supabase) return
    const loadMeta = async () => {
      const [{ data: perfis, error: perfisErr }, { data: mods, error: modsErr }] = await Promise.all([
        supabase!.from('perfis').select('id, nome'),
        supabase!.from('audit_log').select('modulo').limit(500),
      ])
      dbLog('SELECT', 'perfis', perfisErr, `${perfis?.length ?? 0} rows`)
      dbLog('SELECT', 'audit_log', modsErr, `${mods?.length ?? 0} rows`)
      if (perfis) setUsuarios(perfis.map((p: { id: string; nome: string }) => p.id))
      if (mods) {
        const uniq = [...new Set(mods.map((m: { modulo: string }) => m.modulo).filter(Boolean))] as string[]
        setModulos(uniq)
      }
    }
    loadMeta().catch(() => {})
    loadLogs()
  }, [loadLogs])

  const exportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Resumo']
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      l.usuario_nome ?? l.usuario_id,
      l.acao,
      l.modulo,
      l.resumo,
    ])
    downloadBlob([headers, ...rows].map(r => r.join(',')).join('\n'), 'auditoria.csv', 'text/csv')
    success('Auditoria exportada')
  }

  const maxBar = Math.max(...barData.map(b => b.count), 1)

  if (noSupabase) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Auditoria</h1>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-[var(--text-secondary)]">Conecte o Supabase e crie a tabela <code className="text-[#C9A84C]">audit_log</code> para ver o histórico de ações.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Auditoria</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Histórico completo de ações no sistema.</p>
        </div>
        <button className="btn btn-secondary flex items-center gap-2" onClick={exportCSV}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[['Hoje', counts.hoje], ['Esta semana', counts.semana], ['Total', counts.total]].map(([label, val]) => (
          <div key={label as string} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#C9A84C]">{val}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Ações por usuário (últimos 7 dias)</h2>
          <div className="space-y-2">
            {barData.map(b => (
              <div key={b.usuario} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)] w-24 truncate">{b.usuario}</span>
                <div className="flex-1 h-5 bg-[var(--bg-surface-2)] rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-[#C9A84C] transition-all"
                    style={{ width: `${(b.count / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-secondary)] w-6">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <select className="input-purion" value={filterUsuario} onChange={e => setFilterUsuario(e.target.value)}>
            <option value="">Todos usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className="input-purion" value={filterModulo} onChange={e => setFilterModulo(e.target.value)}>
            <option value="">Todos módulos</option>
            {modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input-purion" value={filterAcao} onChange={e => setFilterAcao(e.target.value)}>
            <option value="">Todas ações</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <div className="flex items-center gap-1">
            <label className="text-xs text-[#8A8A8A]">De</label>
            <input type="date" className="input-purion" value={filterInicio} onChange={e => setFilterInicio(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-[#8A8A8A]">Até</label>
            <input type="date" className="input-purion" value={filterFim} onChange={e => setFilterFim(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-secondary" onClick={loadLogs}>Filtrar</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-secondary)]">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-secondary)]">Nenhum registro encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['', 'Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Resumo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-[#8A8A8A] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedId === log.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{log.usuario_nome ?? log.usuario_id}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.acao === 'INSERT' ? 'bg-green-500/10 text-green-400'
                        : log.acao === 'DELETE' ? 'bg-red-500/10 text-red-400'
                        : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{log.modulo}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">{log.resumo}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={log.id + '-detail'} className="border-b border-[var(--border)] bg-[var(--bg-surface-2)]">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.before && (
                            <div>
                              <p className="font-semibold text-red-400 mb-1">Antes</p>
                              <pre className="font-mono text-[var(--text-secondary)] overflow-auto max-h-40">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <p className="font-semibold text-green-400 mb-1">Depois</p>
                              <pre className="font-mono text-[var(--text-secondary)] overflow-auto max-h-40">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
