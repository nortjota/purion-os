'use client'

import { useState } from 'react'
import { Pencil, X, Ban, Sparkles } from 'lucide-react'
import { useIcpPersonas, type IcpPersona, type NovaPersona } from '@/hooks/useIcpPersonas'

function ListaEditavel({ label, valores, onChange }: { label: string; valores: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="kpi-label mb-1 block">{label} (um por linha)</label>
      <textarea className="input-purion w-full" rows={3} value={valores} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ModalPersona({ persona, onFechar, onSalvar }: {
  persona: IcpPersona
  onFechar: () => void
  onSalvar: (dados: Partial<NovaPersona>) => void
}) {
  const [nome, setNome] = useState(persona.nome)
  const [emoji, setEmoji] = useState(persona.emoji)
  const [demografia, setDemografia] = useState(persona.demografia)
  const [dores, setDores] = useState(persona.dores.join('\n'))
  const [desejos, setDesejos] = useState(persona.desejos.join('\n'))
  const [gatilho, setGatilho] = useState(persona.gatilho)
  const [jtbd, setJtbd] = useState(persona.jtbd)

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    onSalvar({
      nome: nome.trim(), emoji: emoji.trim() || '👤', demografia: demografia.trim(),
      dores: dores.split('\n').map((s) => s.trim()).filter(Boolean),
      desejos: desejos.split('\n').map((s) => s.trim()).filter(Boolean),
      gatilho: gatilho.trim(), jtbd: jtbd.trim(),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Editar Persona</h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div style={{ width: 70 }}>
              <label className="kpi-label mb-1 block">Emoji</label>
              <input className="input-purion w-full" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 18 }} />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Nome</label>
              <input className="input-purion w-full" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="kpi-label mb-1 block">Demografia</label>
            <textarea className="input-purion w-full" rows={2} value={demografia} onChange={(e) => setDemografia(e.target.value)} />
          </div>
          <ListaEditavel label="Dores" valores={dores} onChange={setDores} />
          <ListaEditavel label="Desejos" valores={desejos} onChange={setDesejos} />
          <div>
            <label className="kpi-label mb-1 block">Gatilho de compra</label>
            <textarea className="input-purion w-full" rows={2} value={gatilho} onChange={(e) => setGatilho(e.target.value)} />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Job To Be Done</label>
            <textarea className="input-purion w-full" rows={2} value={jtbd} onChange={(e) => setJtbd(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PersonaCard({ persona, onEditar }: { persona: IcpPersona; onEditar: () => void }) {
  const primaria = persona.tipo === 'primaria'
  return (
    <div
      className="card-purion"
      style={{
        padding: '24px', flex: 1, minWidth: 280,
        borderColor: primaria ? 'rgba(201,168,76,0.4)' : 'var(--border)',
        background: primaria ? 'rgba(201,168,76,0.05)' : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div style={{
            width: 52, height: 52, borderRadius: 14, fontSize: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: primaria ? 'rgba(201,168,76,0.15)' : 'var(--bg-surface-2)',
          }}>
            {persona.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p style={{ fontSize: 16, fontWeight: 800 }}>{persona.nome}</p>
              {primaria && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#C9A84C', color: '#000' }}>
                  PRIMÁRIA
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{persona.demografia}</p>
          </div>
        </div>
        <button onClick={onEditar} className="icon-btn"><Pencil size={13} /></button>
      </div>

      <div className="flex flex-col gap-3 mt-3">
        {persona.dores.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#E85238', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dores</p>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, marginTop: 4, lineHeight: 1.7 }}>
              {persona.dores.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        {persona.desejos.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4CAF7A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Desejos</p>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, marginTop: 4, lineHeight: 1.7 }}>
              {persona.desejos.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        {persona.gatilho && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(91,143,232,0.08)', border: '1px solid rgba(91,143,232,0.2)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#5B8FE8' }}>Gatilho de compra</p>
            <p style={{ fontSize: 12, marginTop: 2 }}>{persona.gatilho}</p>
          </div>
        )}
        {persona.jtbd && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>Job To Be Done</p>
            <p style={{ fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>&ldquo;{persona.jtbd}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function TabCliente() {
  const { personas, carregando, atualizarPersona } = useIcpPersonas()
  const [editando, setEditando] = useState<IcpPersona | null>(null)

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando personas…</p></div>
  }

  const ordenadas = [...personas].sort((a, b) => (a.tipo === 'primaria' ? -1 : 1) - (b.tipo === 'primaria' ? -1 : 1) || a.ordem - b.ordem)

  return (
    <div className="flex flex-col gap-6">
      {personas.length === 0 ? (
        <div className="empty-state">
          <Sparkles size={36} className="empty-state-icon" />
          <p className="empty-state-title">Nenhuma persona cadastrada</p>
          <p className="empty-state-subtitle">O Dono Exigente e o Presenteador aparecem aqui.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {ordenadas.map((p) => (
            <PersonaCard key={p.id} persona={p} onEditar={() => setEditando(p)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="card-purion" style={{ padding: '16px 20px', flex: 1, minWidth: 260 }}>
          <div className="flex items-center gap-2 mb-2">
            <Ban size={15} style={{ color: '#E85238' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>Anti-cliente</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Quem compra pelo preço mais baixo, quer commodity de aromatizante genérico e não valoriza fragrância
            como parte da identidade do ambiente. A PURION recusa esse cliente — competir por preço destrói a marca.
          </p>
        </div>
        <div className="card-purion" style={{ padding: '16px 20px', flex: 1, minWidth: 260, borderColor: 'rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} style={{ color: '#C9A84C' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>Princípio</p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            &ldquo;Vende estima, não desodorização.&rdquo;
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            Todo copy, produto e experiência reforça status e identidade — nunca apenas &ldquo;tirar cheiro ruim&rdquo;.
          </p>
        </div>
      </div>

      {editando && (
        <ModalPersona
          persona={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(dados) => { atualizarPersona(editando.id, dados); setEditando(null) }}
        />
      )}
    </div>
  )
}
