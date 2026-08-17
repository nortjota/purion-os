'use client'

import { useState } from 'react'
import { Plus, Trash2, HandCoins } from 'lucide-react'
import { useAportesSocios } from '@/hooks/useAportesSocios'
import { formatarMoeda, formatarDataBR } from '@/lib/calculos'
import { SOCIOS } from '@/components/tarefas/tarefasHelpers'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { PerfilUsuario } from '@/store'

export function AportesSociosCard() {
  const { aportes, carregando, registrarAporte, removerAporte, totalPorSocio, totalGeral } = useAportesSocios()

  const [socio, setSocio] = useState<PerfilUsuario>('matheus')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState('')
  const [deletando, setDeletando] = useState<string | null>(null)

  async function handleAdicionar() {
    const v = parseFloat(valor.replace(',', '.'))
    if (!v || v <= 0) return
    await registrarAporte({ socio, valor: v, data, descricao: descricao.trim() || null })
    setValor('')
    setDescricao('')
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <HandCoins size={16} className="text-[#C9A84C]" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Aportes dos Sócios</h2>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Quanto cada sócio colocou do próprio bolso na empresa — não entra no faturamento.</p>

      {/* Totais por sócio */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {SOCIOS.map((s) => (
          <div key={s.id} className="rounded-lg p-3" style={{ background: 'var(--bg-surface-2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{
                width: 18, height: 18, borderRadius: 999, background: `${s.cor}25`, color: s.cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700,
              }}>
                {s.inicial}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{s.nome}</span>
            </div>
            <p className="text-base font-bold" style={{ color: s.cor }}>
              {formatarMoeda(totalPorSocio.get(s.id) ?? 0)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs text-[var(--text-secondary)]">Total aportado</span>
        <span className="text-sm font-bold text-[#C9A84C]">{formatarMoeda(totalGeral)}</span>
      </div>

      {/* Formulário de novo aporte */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Sócio</label>
          <select className="input-purion w-full" value={socio} onChange={(e) => setSocio(e.target.value as PerfilUsuario)}>
            {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Valor (R$)</label>
          <input type="number" step="0.01" min="0" className="input-purion w-full" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Data</label>
          <input type="date" className="input-purion w-full" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Descrição (opcional)</label>
          <input className="input-purion w-full" placeholder="ex: compra de insumos" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      </div>
      <button onClick={handleAdicionar} className="btn btn-primary btn-sm flex items-center gap-1 mb-5">
        <Plus size={13} /> Registrar aporte
      </button>

      {/* Histórico */}
      {carregando ? (
        <p className="text-xs text-[var(--text-secondary)]">Carregando…</p>
      ) : aportes.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">Nenhum aporte registrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {aportes.map((a) => {
            const s = SOCIOS.find((x) => x.id === a.socio)
            return (
              <div key={a.id} className="flex items-center gap-3" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 999, background: `${s?.cor ?? '#888'}25`, color: s?.cor ?? '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {s?.inicial ?? '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-primary)] truncate">{a.descricao || `Aporte de ${s?.nome ?? a.socio}`}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{formatarDataBR(a.data)}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: s?.cor ?? '#C9A84C' }}>{formatarMoeda(a.valor)}</span>
                <button onClick={() => setDeletando(a.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deletando}
        title="Excluir aporte"
        message="Deseja excluir este aporte?"
        onConfirm={() => { if (deletando) { removerAporte(deletando); setDeletando(null) } }}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}
