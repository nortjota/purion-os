'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Camera, Music2, Clapperboard, Plus, X, Pencil, Trash2, Layers } from 'lucide-react'
import {
  useSocialEstrategia, DIAS_SEMANA,
  type SocialPilar, type SocialCalendarioItem, type NovoItemCalendario, type DiaSemana,
} from '@/hooks/useSocialEstrategia'

const DIA_LABEL: Record<DiaSemana, string> = {
  segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta',
  sexta: 'Sexta', sabado: 'Sábado', domingo: 'Domingo',
}

const REDES_FOCO = [
  { nome: 'Instagram', icon: Camera, cor: '#E1306C' },
  { nome: 'TikTok', icon: Music2, cor: '#00F2EA' },
  { nome: 'YouTube Shorts', icon: Clapperboard, cor: '#FF0000' },
]

// ─── Donut de pilares ──────────────────────────────────────────────

function DonutPilares({ pilares, selecionado, onSelecionar }: {
  pilares: SocialPilar[]
  selecionado: SocialPilar | null
  onSelecionar: (p: SocialPilar) => void
}) {
  const data = pilares.map((p) => ({ name: p.nome, value: p.percentual, id: p.id }))

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ width: 200, height: 200, flexShrink: 0 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              onClick={(_, idx) => onSelecionar(pilares[idx])}
              cursor="pointer"
            >
              {pilares.map((p) => (
                <Cell
                  key={p.id}
                  fill={p.cor ?? '#C9A84C'}
                  opacity={selecionado && selecionado.id !== p.id ? 0.35 : 1}
                  stroke="var(--bg-surface-2)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v}%`, 'Mix']}
              contentStyle={{ background: '#1A1A1A', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
        {pilares.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelecionar(p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
              background: selecionado?.id === p.id ? `${p.cor}18` : 'transparent',
              border: `1px solid ${selecionado?.id === p.id ? p.cor : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, background: p.cor ?? '#C9A84C', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{p.nome}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.cor ?? '#C9A84C' }}>{p.percentual}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ModalPilar({ pilar, onFechar, onSalvar }: {
  pilar: SocialPilar
  onFechar: () => void
  onSalvar: (dados: Partial<SocialPilar>) => void
}) {
  const [nome, setNome] = useState(pilar.nome)
  const [percentual, setPercentual] = useState(pilar.percentual)
  const [descricao, setDescricao] = useState(pilar.descricao ?? '')
  const [exemplos, setExemplos] = useState(pilar.exemplos.join('\n'))

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    onSalvar({
      nome: nome.trim(),
      percentual,
      descricao: descricao.trim() || null,
      exemplos: exemplos.split('\n').map((s) => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Editar Pilar</h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div>
            <label className="kpi-label mb-1 block">Nome</label>
            <input className="input-purion w-full" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Percentual do mix — {percentual}%</label>
            <input type="range" min={0} max={100} value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value))} style={{ width: '100%', accentColor: pilar.cor ?? '#C9A84C' }} />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Descrição</label>
            <textarea className="input-purion w-full" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="kpi-label mb-1 block">Exemplos (um por linha)</label>
            <textarea className="input-purion w-full" rows={3} value={exemplos} onChange={(e) => setExemplos(e.target.value)} />
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

// ─── Calendário editorial ──────────────────────────────────────────

const FORM_VAZIO: NovoItemCalendario = {
  diaSemana: 'segunda', rede: 'Instagram', pilar: '', formato: '', ideia: '', horario: '', responsavel: '',
}

function ModalItemCalendario({ editando, diaPadrao, onFechar, onSalvar }: {
  editando: SocialCalendarioItem | null
  diaPadrao: DiaSemana
  onFechar: () => void
  onSalvar: (dados: NovoItemCalendario) => void
}) {
  const [form, setForm] = useState<NovoItemCalendario>(
    editando
      ? { diaSemana: editando.diaSemana, rede: editando.rede, pilar: editando.pilar, formato: editando.formato, ideia: editando.ideia, horario: editando.horario ?? '', responsavel: editando.responsavel ?? '' }
      : { ...FORM_VAZIO, diaSemana: diaPadrao }
  )

  function set<K extends keyof NovoItemCalendario>(campo: K, val: NovoItemCalendario[K]) {
    setForm((f) => ({ ...f, [campo]: val }))
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rede.trim() || !form.ideia.trim()) return
    onSalvar(form)
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{editando ? 'Editar Post' : 'Novo Post'}</h2>
          <button onClick={onFechar} className="icon-btn"><X size={16} /></button>
        </div>
        <form onSubmit={submeter} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Dia</label>
              <select className="select-purion w-full" value={form.diaSemana} onChange={(e) => set('diaSemana', e.target.value as DiaSemana)}>
                {DIAS_SEMANA.map((d) => <option key={d} value={d}>{DIA_LABEL[d]}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Rede</label>
              <input className="input-purion w-full" value={form.rede} onChange={(e) => set('rede', e.target.value)} placeholder="Instagram, TikTok…" required />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Pilar</label>
              <input className="input-purion w-full" value={form.pilar} onChange={(e) => set('pilar', e.target.value)} placeholder="Ritual/ASMR…" />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Formato</label>
              <input className="input-purion w-full" value={form.formato} onChange={(e) => set('formato', e.target.value)} placeholder="Reels, Carrossel…" />
            </div>
          </div>
          <div>
            <label className="kpi-label mb-1 block">Ideia *</label>
            <textarea className="input-purion w-full" rows={2} value={form.ideia} onChange={(e) => set('ideia', e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Horário</label>
              <input className="input-purion w-full" value={form.horario ?? ''} onChange={(e) => set('horario', e.target.value)} placeholder="19h" />
            </div>
            <div className="flex-1">
              <label className="kpi-label mb-1 block">Responsável</label>
              <input className="input-purion w-full" value={form.responsavel ?? ''} onChange={(e) => set('responsavel', e.target.value)} placeholder="João…" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onFechar} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">{editando ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CardPost({ item, onEditar, onDeletar }: { item: SocialCalendarioItem; onEditar: () => void; onDeletar: () => void }) {
  return (
    <div className="card-purion" style={{ padding: '10px 12px', fontSize: 11 }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontWeight: 700, color: '#C9A84C' }}>{item.rede}</span>
        <div className="flex gap-1">
          <button onClick={onEditar} className="icon-btn" style={{ width: 20, height: 20 }}><Pencil size={10} /></button>
          <button onClick={onDeletar} className="icon-btn" style={{ width: 20, height: 20 }}><Trash2 size={10} /></button>
        </div>
      </div>
      {item.pilar && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.pilar} · {item.formato}</span>}
      <p style={{ marginTop: 4, lineHeight: 1.4 }}>{item.ideia}</p>
      <div className="flex items-center justify-between mt-1" style={{ color: 'var(--text-secondary)' }}>
        <span>{item.horario ?? '—'}</span>
        <span>{item.responsavel ?? ''}</span>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────

export function TabSocial() {
  const {
    pilares, calendario, carregando,
    atualizarPilar, criarItemCalendario, atualizarItemCalendario, deletarItemCalendario,
  } = useSocialEstrategia()

  const [pilarSelecionado, setPilarSelecionado] = useState<SocialPilar | null>(null)
  const [editandoPilar, setEditandoPilar] = useState<SocialPilar | null>(null)
  const [modalItem, setModalItem] = useState<{ dia: DiaSemana; editando: SocialCalendarioItem | null } | null>(null)

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando estratégia de redes…</p></div>
  }

  const ativo = pilarSelecionado ?? pilares[0] ?? null

  return (
    <div className="flex flex-col gap-6">
      {/* Redes-foco + objetivo */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {REDES_FOCO.map((r) => (
            <span key={r.nome} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 999, background: `${r.cor}18`, color: r.cor,
            }}>
              <r.icon size={12} /> {r.nome}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Objetivo dos 90 dias: <strong style={{ color: 'var(--text-primary)' }}>educar a categoria</strong> + <strong style={{ color: 'var(--text-primary)' }}>vender</strong> + <strong style={{ color: 'var(--text-primary)' }}>construir marca</strong>
        </p>
      </div>

      {/* Pilares de conteúdo */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={15} style={{ color: '#C9A84C' }} />
          <p style={{ fontSize: 14, fontWeight: 700 }}>5 Pilares de Conteúdo</p>
        </div>
        {pilares.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">Nenhum pilar cadastrado</p>
          </div>
        ) : (
          <>
            <DonutPilares pilares={pilares} selecionado={ativo} onSelecionar={setPilarSelecionado} />
            {ativo && (
              <div className="card-purion" style={{ padding: '14px 16px', marginTop: 12, borderColor: ativo.cor ?? undefined }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: 13, fontWeight: 700, color: ativo.cor ?? '#C9A84C' }}>{ativo.nome} — {ativo.percentual}%</p>
                  <button onClick={() => setEditandoPilar(ativo)} className="icon-btn"><Pencil size={12} /></button>
                </div>
                {ativo.descricao && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{ativo.descricao}</p>}
                {ativo.exemplos.length > 0 && (
                  <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.8 }}>
                    {ativo.exemplos.map((ex, i) => <li key={i}>{ex}</li>)}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Calendário editorial */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Calendário Editorial da Semana</p>
        <div className="social-cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: 10, overflowX: 'auto' }}>
          {DIAS_SEMANA.map((dia) => {
            const itens = calendario.filter((c) => c.diaSemana === dia)
            return (
              <div key={dia}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    {DIA_LABEL[dia]}
                  </span>
                  <button onClick={() => setModalItem({ dia, editando: null })} className="icon-btn" style={{ width: 20, height: 20 }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {itens.map((item) => (
                    <CardPost
                      key={item.id}
                      item={item}
                      onEditar={() => setModalItem({ dia, editando: item })}
                      onDeletar={() => deletarItemCalendario(item.id)}
                    />
                  ))}
                  {itens.length === 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6, padding: '8px 0' }}>Sem posts</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editandoPilar && (
        <ModalPilar
          pilar={editandoPilar}
          onFechar={() => setEditandoPilar(null)}
          onSalvar={(dados) => { atualizarPilar(editandoPilar.id, dados); setEditandoPilar(null) }}
        />
      )}

      {modalItem && (
        <ModalItemCalendario
          editando={modalItem.editando}
          diaPadrao={modalItem.dia}
          onFechar={() => setModalItem(null)}
          onSalvar={(dados) => {
            if (modalItem.editando) atualizarItemCalendario(modalItem.editando.id, dados)
            else criarItemCalendario(dados)
            setModalItem(null)
          }}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .social-cal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
