'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen, Building2, Calculator, Check, ClipboardCheck, Copy, Eye, EyeOff, Mail, MessageCircle, MessageSquareText, Pencil,
  Plus, RotateCcw, Search, Sparkles, X, Mic2,
} from 'lucide-react'
import { Segmentado } from '@/components/ui/Segmentado'
import { useToast } from '@/components/ui/Toast'
import { confirmar } from '@/components/ui/Confirmar'
import { useEstadoPersistido } from '@/hooks/useEstadoPersistido'
import { useGuias } from '@/hooks/useGuias'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { CANAIS, CHECKLISTS, ETAPAS, TOM_DE_VOZ, VARIAVEIS, type Canal, type Etapa, type Modelo } from '@/lib/conhecimento/conteudo'
import { CUSTO_PRODUCAO_FRASCO, PRECO_B2C_OFICIAL } from '@/lib/precificacao'
import { ESCADA_PADRAO } from '@/lib/escadaProdutos'

type Secao = 'mensagens' | 'empresa' | 'checklists' | 'calculadora' | 'voz'
const SECOES = [
  { id: 'mensagens', label: 'Mensagens prontas', icon: MessageSquareText },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
  { id: 'calculadora', label: 'Calculadora', icon: Calculator },
  { id: 'voz', label: 'Tom de voz', icon: Mic2 },
] as const

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true } catch { return false }
}

export function ConhecimentoHub() {
  const [secao, setSecao] = useEstadoPersistido<Secao>('kb-secao', 'mensagens')
  const [busca, setBusca] = useEstadoPersistido('kb-busca', '')

  return (
    <div className="page-content">
      <div className="dash">
        <header className="kb-topo">
          <div>
            <p className="t-label"><BookOpen size={12} style={{ display: 'inline', marginRight: 6 }} />Central de Conhecimento</p>
            <h1 className="kb-titulo">Tudo que a equipe copia, consulta e confere.</h1>
          </div>
          <label className="busca kb-busca"><Search size={14} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar mensagem, dado ou checklist…" /></label>
        </header>
        <div className="mobile-tabs-scroll"><Segmentado rotulo="Seções" valor={secao} onChange={setSecao} opcoes={SECOES} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={secao} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {secao === 'mensagens' && <Mensagens busca={busca} />}
            {secao === 'empresa' && <Empresa busca={busca} />}
            {secao === 'checklists' && <Checklists busca={busca} />}
            {secao === 'calculadora' && <Calculadora />}
            {secao === 'voz' && <TomDeVoz />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Mensagens prontas
// ─────────────────────────────────────────────

function preencher(texto: string, vars: Record<string, string>) {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k]?.trim() ? vars[k].trim() : m))
}

/** Destaca variáveis: preenchidas em verde, faltando em amarelo. */
function TextoComVariaveis({ texto, vars }: { texto: string; vars: Record<string, string> }) {
  const partes = texto.split(/(\{\w+\})/g)
  return (
    <>
      {partes.map((p, i) => {
        const m = p.match(/^\{(\w+)\}$/)
        if (!m) return <span key={i}>{p}</span>
        const v = vars[m[1]]?.trim()
        return v ? <mark key={i} className="kb-var kb-var-ok">{v}</mark> : <mark key={i} className="kb-var kb-var-falta">{m[1]}</mark>
      })}
    </>
  )
}

function Mensagens({ busca }: { busca: string }) {
  const { modelos, salvavel, salvarModelo, restaurarModelo, ocultarModelo, contarUso } = useGuias()
  const { perfil } = useAuthContext()
  const toast = useToast()
  const [etapa, setEtapa] = useEstadoPersistido<Etapa | 'todas'>('kb-etapa', 'todas')
  const [canal, setCanal] = useEstadoPersistido<Canal | 'todos'>('kb-canal', 'todos')
  const [vars, setVars] = useEstadoPersistido<Record<string, string>>('kb-vars', Object.fromEntries(VARIAVEIS.map((v) => [v.chave, v.padrao])))
  const [copiado, setCopiado] = useState<string | null>(null)
  const [editando, setEditando] = useState<Modelo | null>(null)
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? ''
  const v = { ...vars, seu_nome: vars.seu_nome || primeiroNome }

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return modelos
      .filter((m) => (etapa === 'todas' || m.etapa === etapa) && (canal === 'todos' || m.canal === canal)
        && (!q || `${m.titulo} ${m.quando} ${m.corpo} ${m.assunto ?? ''}`.toLowerCase().includes(q)))
      .sort((a, b) => b.usos - a.usos)
  }, [modelos, etapa, canal, busca])

  async function acaoCopiar(m: Modelo) {
    const texto = (m.assunto ? `Assunto: ${preencher(m.assunto, v)}\n\n` : '') + preencher(m.corpo, v)
    if (await copiar(texto)) { setCopiado(m.slug); setTimeout(() => setCopiado(null), 1600); contarUso(m.slug) }
    else toast.error('Não foi possível copiar', 'Selecione o texto manualmente')
  }

  const usadas = new Set(lista.flatMap((m) => [...(m.corpo + (m.assunto ?? '')).matchAll(/\{(\w+)\}/g)].map((x) => x[1])))

  return (
    <div className="dash">
      <div className="kb-vars card-purion">
        <p className="t-label"><Sparkles size={12} style={{ display: 'inline', marginRight: 6 }} />Preencha uma vez — todas as mensagens se ajustam</p>
        <div className="kb-vars-grade">
          {VARIAVEIS.filter((x) => usadas.has(x.chave)).map((x) => (
            <label key={x.chave} className="kb-var-campo">
              <span>{x.rotulo}</span>
              <input value={x.chave === 'seu_nome' ? v.seu_nome : vars[x.chave] ?? ''} onChange={(e) => setVars({ ...vars, [x.chave]: e.target.value })} placeholder={`{${x.chave}}`} />
            </label>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="kb-chips">
          <button className="kb-chip" data-ativo={etapa === 'todas' || undefined} onClick={() => setEtapa('todas')}>Todas</button>
          {(Object.keys(ETAPAS) as Etapa[]).map((e) => (
            <button key={e} className="kb-chip" data-ativo={etapa === e || undefined} onClick={() => setEtapa(e)}>{ETAPAS[e]}</button>
          ))}
        </div>
        <span className="toolbar-espaco" />
        <select className="filtro" data-ativo={canal !== 'todos' || undefined} value={canal} onChange={(e) => setCanal(e.target.value as Canal | 'todos')} aria-label="Canal">
          <option value="todos">Todos os canais</option>{(Object.keys(CANAIS) as Canal[]).map((c) => <option key={c} value={c}>{CANAIS[c]}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditando({ slug: `meu-${Date.now()}`, titulo: '', canal: 'whatsapp', etapa: etapa === 'todas' ? 'venda' : etapa, quando: '', corpo: '', personalizado: true })}>
          <Plus size={13} /> Nova mensagem
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state"><span className="empty-state-icon"><Search size={26} /></span><p className="empty-state-title">Nenhuma mensagem com esse filtro</p></div>
      ) : (
        <motion.div layout className="kb-grade">
          <AnimatePresence>
            {lista.map((m) => (
              <motion.article layout key={m.slug} className="kb-msg" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }}>
                <header className="kb-msg-topo">
                  <span className={`kb-canal kb-canal-${m.canal}`}>{m.canal === 'whatsapp' ? <MessageCircle size={12} /> : m.canal === 'email' ? <Mail size={12} /> : <MessageSquareText size={12} />}{CANAIS[m.canal]}</span>
                  {m.usos > 0 && <span className="caption tnum" title="Vezes copiada">{m.usos}×</span>}
                  {m.editado && <span className="badge badge-neutral">editada</span>}
                  {m.personalizado && <span className="badge badge-accent">da equipe</span>}
                </header>
                <h3 className="kb-msg-titulo">{m.titulo}</h3>
                <p className="kb-msg-quando">{m.quando}</p>
                {m.assunto && <p className="kb-msg-assunto"><strong>Assunto:</strong> <TextoComVariaveis texto={m.assunto} vars={v} /></p>}
                <div className="kb-msg-corpo"><TextoComVariaveis texto={m.corpo} vars={v} /></div>
                <footer className="kb-msg-acoes">
                  <motion.button whileTap={{ scale: 0.94 }} className="btn btn-primary btn-sm" onClick={() => acaoCopiar(m)}>
                    {copiado === m.slug ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </motion.button>
                  {m.canal === 'whatsapp' && (
                    <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(preencher(m.corpo, v))}`} onClick={() => contarUso(m.slug)}>
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  )}
                  {m.canal === 'email' && (
                    <a className="btn btn-ghost btn-sm" href={`mailto:?subject=${encodeURIComponent(preencher(m.assunto ?? '', v))}&body=${encodeURIComponent(preencher(m.corpo, v))}`} onClick={() => contarUso(m.slug)}>
                      <Mail size={13} /> E-mail
                    </a>
                  )}
                  <span className="toolbar-espaco" />
                  <button className="icon-btn" title="Editar" aria-label="Editar" onClick={() => setEditando(m)}><Pencil size={13} /></button>
                  {m.editado && <button className="icon-btn" title="Voltar ao texto padrão" aria-label="Restaurar" onClick={() => restaurarModelo(m.slug)}><RotateCcw size={13} /></button>}
                  <button className="icon-btn" title="Esconder" aria-label="Esconder" onClick={async () => {
                    if (await confirmar({ titulo: `Esconder "${m.titulo}"?`, mensagem: 'Some da lista para toda a equipe.', rotuloConfirmar: 'Esconder' })) {
                      const r = await ocultarModelo(m.slug); if (!r.ok) toast.error('Não foi possível', r.erro)
                    }
                  }}><EyeOff size={13} /></button>
                </footer>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {!salvavel && <p className="caption">Edições ainda não são salvas: rode <code>supabase/migration_conhecimento_guias.sql</code> no Supabase.</p>}
      {editando && <ModalModelo inicial={editando} onFechar={() => setEditando(null)} onSalvar={async (m) => {
        const r = await salvarModelo(m)
        if (!r.ok) { toast.error('Não foi possível salvar', r.erro); return false }
        toast.success('Mensagem salva', 'Vale para toda a equipe'); return true
      }} />}
    </div>
  )
}

function ModalModelo({ inicial, onFechar, onSalvar }: { inicial: Modelo; onFechar: () => void; onSalvar: (m: Modelo) => Promise<boolean> }) {
  const [m, setM] = useState<Modelo>(inicial)
  const [salvando, setSalvando] = useState(false)
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <form className="modal-container" style={{ maxWidth: 620 }} onSubmit={async (e) => {
        e.preventDefault()
        if (!m.titulo.trim() || !m.corpo.trim()) return
        setSalvando(true); const ok = await onSalvar({ ...m, titulo: m.titulo.trim() }); setSalvando(false); if (ok) onFechar()
      }}>
        <div className="modal-header"><h2 className="modal-title">{inicial.titulo ? 'Editar mensagem' : 'Nova mensagem'}</h2><button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar"><X size={14} /></button></div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="kb-form-linha">
            <label className="tt-campo"><span className="label-purion">Título</span><input className="input-purion" autoFocus value={m.titulo} onChange={(e) => setM({ ...m, titulo: e.target.value })} /></label>
            <label className="tt-campo"><span className="label-purion">Canal</span>
              <select className="select-purion" value={m.canal} onChange={(e) => setM({ ...m, canal: e.target.value as Canal })}>{(Object.keys(CANAIS) as Canal[]).map((c) => <option key={c} value={c}>{CANAIS[c]}</option>)}</select>
            </label>
            <label className="tt-campo"><span className="label-purion">Etapa</span>
              <select className="select-purion" value={m.etapa} onChange={(e) => setM({ ...m, etapa: e.target.value as Etapa })}>{(Object.keys(ETAPAS) as Etapa[]).map((c) => <option key={c} value={c}>{ETAPAS[c]}</option>)}</select>
            </label>
          </div>
          <label className="tt-campo"><span className="label-purion">Quando usar</span><input className="input-purion" value={m.quando} onChange={(e) => setM({ ...m, quando: e.target.value })} /></label>
          {m.canal === 'email' && <label className="tt-campo"><span className="label-purion">Assunto</span><input className="input-purion" value={m.assunto ?? ''} onChange={(e) => setM({ ...m, assunto: e.target.value })} /></label>}
          <label className="tt-campo"><span className="label-purion">Texto</span><textarea className="textarea-purion" rows={9} value={m.corpo} onChange={(e) => setM({ ...m, corpo: e.target.value })} /></label>
          <p className="caption">Variáveis: {VARIAVEIS.map((x) => `{${x.chave}}`).join(' ')}</p>
          <LinterTom texto={`${m.assunto ?? ''}\n${m.corpo}`} compacto />
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button><button className="btn btn-accent" disabled={salvando || !m.titulo.trim() || !m.corpo.trim()}>Salvar</button></div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────
// Empresa
// ─────────────────────────────────────────────

function Empresa({ busca }: { busca: string }) {
  const { fatos, salvarFato, salvavel } = useGuias()
  const toast = useToast()
  const [mostrarInternos, setMostrarInternos] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const q = busca.trim().toLowerCase()
  const visiveis = fatos.filter((f) => !q || `${f.rotulo} ${f.valor} ${f.grupo}`.toLowerCase().includes(q))
  const grupos = [...new Set(visiveis.map((f) => f.grupo))]

  return (
    <div className="kb-empresa">
      {grupos.map((g) => {
        const itens = visiveis.filter((f) => f.grupo === g)
        const interno = itens.some((f) => f.sensivel)
        return (
          <section key={g} className="card-purion kb-grupo">
            <header className="dash-secao-cabecalho">
              <span className="dash-secao-titulo">{g}</span>
              {interno && <button className="link-limpar" onClick={() => setMostrarInternos((x) => !x)}>{mostrarInternos ? <><EyeOff size={12} /> esconder</> : <><Eye size={12} /> mostrar</>}</button>}
            </header>
            <ul className="kb-fatos">
              {itens.map((f) => {
                const oculto = f.sensivel && !mostrarInternos
                return (
                  <li key={f.slug} className="kb-fato">
                    <span className="kb-fato-rotulo">{f.rotulo}</span>
                    {editando === f.slug ? (
                      <form className="kb-fato-edit" onSubmit={async (e) => {
                        e.preventDefault()
                        const val = String(new FormData(e.currentTarget).get('v') ?? '').trim()
                        const r = await salvarFato(f.slug, val); if (!r.ok) toast.error('Não foi possível salvar', r.erro)
                        setEditando(null)
                      }}>
                        <input name="v" className="input-purion" defaultValue={f.valor} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
                      </form>
                    ) : (
                      <button className="kb-fato-valor" data-oculto={oculto || undefined} data-vazio={!f.valor || undefined} disabled={!f.valor && !f.editavel}
                        onClick={async () => {
                          if (!f.valor) { if (f.editavel) setEditando(f.slug); return }
                          if (oculto) { setMostrarInternos(true); return }
                          if (await copiar(f.valor)) { setCopiado(f.slug); setTimeout(() => setCopiado(null), 1400) }
                        }} title={f.valor ? 'Clique para copiar' : 'Clique para preencher'}>
                        <span>{f.valor || 'preencher'}</span>
                        <AnimatePresence mode="wait" initial={false}>
                          {copiado === f.slug
                            ? <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}><Check size={13} /></motion.span>
                            : f.valor ? <motion.span key="c" className="kb-fato-copiar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Copy size={12} /></motion.span> : null}
                        </AnimatePresence>
                      </button>
                    )}
                    {f.editavel && editando !== f.slug && f.valor && <button className="icon-btn" aria-label={`Editar ${f.rotulo}`} onClick={() => setEditando(f.slug)}><Pencil size={12} /></button>}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {!salvavel && <p className="caption">Para salvar os dados preenchidos, rode <code>supabase/migration_conhecimento_guias.sql</code>.</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Checklists (marcação fica neste navegador)
// ─────────────────────────────────────────────

function lerMarcados(): Record<string, number[]> {
  try { return JSON.parse(localStorage.getItem('purion:kb-checklists') ?? '{}') } catch { return {} }
}

function Checklists({ busca }: { busca: string }) {
  const [marcados, setMarcados] = useState<Record<string, number[]>>({})
  useEffect(() => { Promise.resolve().then(() => setMarcados(lerMarcados())) }, [])
  const gravar = (n: Record<string, number[]>) => { setMarcados(n); try { localStorage.setItem('purion:kb-checklists', JSON.stringify(n)) } catch { /* modo privado */ } }
  const q = busca.trim().toLowerCase()
  const lista = CHECKLISTS.filter((c) => !q || `${c.titulo} ${c.quando} ${c.itens.join(' ')}`.toLowerCase().includes(q))

  return (
    <div className="kb-checklists">
      {lista.map((c) => {
        const feitos = marcados[c.slug] ?? []
        const pct = Math.round((feitos.length / c.itens.length) * 100)
        const completo = feitos.length === c.itens.length
        return (
          <section key={c.slug} className="card-purion kb-check" data-completo={completo || undefined}>
            <header className="kb-check-topo">
              <Anel pct={pct} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="kb-msg-titulo">{c.titulo}</h3>
                <p className="kb-msg-quando">{c.quando}</p>
              </div>
              {feitos.length > 0 && <button className="icon-btn" title="Recomeçar" aria-label="Recomeçar" onClick={() => gravar({ ...marcados, [c.slug]: [] })}><RotateCcw size={13} /></button>}
            </header>
            <ul className="kb-check-itens">
              {c.itens.map((item, i) => {
                const ok = feitos.includes(i)
                return (
                  <li key={i}>
                    <button className="kb-check-item" data-ok={ok || undefined} onClick={() => gravar({ ...marcados, [c.slug]: ok ? feitos.filter((x) => x !== i) : [...feitos, i] })}>
                      <motion.span className="kb-check-caixa" animate={{ scale: ok ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.25 }}>{ok && <Check size={12} />}</motion.span>
                      <span>{item}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <AnimatePresence>{completo && <motion.p className="kb-check-fim" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Tudo certo.</motion.p>}</AnimatePresence>
          </section>
        )
      })}
    </div>
  )
}

function Anel({ pct }: { pct: number }) {
  const r = 16, c = 2 * Math.PI * r
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="kb-anel" aria-label={`${pct}%`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <motion.circle cx="20" cy="20" r={r} fill="none" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} animate={{ strokeDashoffset: c - (pct / 100) * c }} transition={{ duration: 0.4 }} transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fill="var(--text-primary)" className="tnum">{pct}</text>
    </svg>
  )
}

// ─────────────────────────────────────────────
// Calculadora de pedido
// ─────────────────────────────────────────────

// custos variáveis decompostos (somam R$ 28 no frasco de R$ 97,90): taxa e imposto proporcionais ao preço,
// embalagem e perdas por frasco, frete por pedido.
const TAXA_PCT = 5 / PRECO_B2C_OFICIAL
const IMPOSTO_PCT = 7 / PRECO_B2C_OFICIAL
const EMBALAGEM_PERDA_FRASCO = 6 + 2
const FRETE_PEDIDO = 8

function Calculadora() {
  const [skuIdx, setSkuIdx] = useState(0)
  const sku = ESCADA_PADRAO[skuIdx]
  const [preco, setPreco] = useState(sku.preco ?? PRECO_B2C_OFICIAL)
  const [desconto, setDesconto] = useState(0)
  const [cac, setCac] = useState(0)
  const [freteGratis, setFreteGratis] = useState(true)
  const [cache, setCache] = useState(500)

  const frascos = Math.max(1, sku.qtdFrascos)
  const receita = preco * (1 - desconto / 100)
  const producao = CUSTO_PRODUCAO_FRASCO * frascos
  const variaveis = receita * (TAXA_PCT + IMPOSTO_PCT) + EMBALAGEM_PERDA_FRASCO * frascos + (freteGratis ? FRETE_PEDIDO : 0)
  const antesMarketing = receita - producao - variaveis
  const lucro = antesMarketing - cac
  const margem = receita > 0 ? (lucro / receita) * 100 : 0
  const vendasCache = antesMarketing > 0 ? Math.ceil(cache / antesMarketing) : null

  const linhas = [
    { rotulo: 'Receita', valor: receita, sinal: 1 },
    { rotulo: `Produção (${frascos} × ${brl(CUSTO_PRODUCAO_FRASCO)})`, valor: producao, sinal: -1 },
    { rotulo: 'Taxas, impostos, embalagem e frete', valor: variaveis, sinal: -1 },
    { rotulo: 'Anúncio / creator por venda', valor: cac, sinal: -1 },
  ]
  const max = Math.max(receita, 1)

  return (
    <div className="kb-calc">
      <section className="card-purion kb-calc-entradas">
        <p className="t-label">Pedido</p>
        <div className="kb-chips">
          {ESCADA_PADRAO.filter((s) => s.preco != null).map((s, i) => (
            <button key={s.codigo} className="kb-chip" data-ativo={skuIdx === i || undefined} onClick={() => { setSkuIdx(i); setPreco(s.preco ?? PRECO_B2C_OFICIAL) }}>{s.nome}</button>
          ))}
        </div>
        <Faixa rotulo="Preço" valor={preco} min={49} max={399} passo={0.1} fmt={brl} onChange={setPreco} />
        <Faixa rotulo="Desconto / cupom" valor={desconto} min={0} max={40} passo={1} fmt={(x) => `${x}%`} onChange={setDesconto} />
        <Faixa rotulo="Custo de anúncio ou creator por venda" valor={cac} min={0} max={120} passo={1} fmt={brl} onChange={setCac} />
        <label className="kb-toggle"><input type="checkbox" checked={freteGratis} onChange={(e) => setFreteGratis(e.target.checked)} /> Frete grátis (a marca paga {brl(FRETE_PEDIDO)})</label>
      </section>

      <section className="card-purion kb-calc-resultado">
        <p className="t-label">Sobra por pedido</p>
        <motion.p key={Math.round(lucro * 10)} className="kb-calc-lucro tnum" initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ color: lucro < 0 ? 'var(--status-danger)' : 'var(--brand-accent)' }}>{brl(lucro)}</motion.p>
        <p className="caption tnum">margem {margem.toFixed(1).replace('.', ',')}% · {lucro < 0 ? 'este pedido dá prejuízo' : 'pedido saudável'}</p>
        <div className="kb-cascata">
          {linhas.map((l) => (
            <div key={l.rotulo} className="kb-cascata-linha">
              <span>{l.rotulo}</span>
              <span className="kb-cascata-barra"><motion.span animate={{ width: `${(l.valor / max) * 100}%` }} transition={{ duration: 0.3 }} data-neg={l.sinal < 0 || undefined} /></span>
              <span className="tnum">{l.sinal < 0 ? '−' : ''}{brl(l.valor)}</span>
            </div>
          ))}
        </div>
        <div className="kb-calc-insights">
          <div><span className="kpi-label">Máximo por venda em anúncio</span><strong className="tnum">{brl(Math.max(0, antesMarketing))}</strong></div>
          <div>
            <span className="kpi-label">Vendas para pagar um cachê de</span>
            <input className="kb-calc-mini tnum" type="number" min={0} value={cache} onChange={(e) => setCache(Number(e.target.value || 0))} aria-label="Cachê" />
            <strong className="tnum">{vendasCache != null ? `${vendasCache} venda(s)` : '—'}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

function Faixa({ rotulo, valor, min, max, passo, fmt, onChange }: { rotulo: string; valor: number; min: number; max: number; passo: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="kb-faixa">
      <span className="kb-faixa-topo"><span>{rotulo}</span><strong className="tnum">{fmt(valor)}</strong></span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

// ─────────────────────────────────────────────
// Tom de voz + verificador de texto
// ─────────────────────────────────────────────

function TomDeVoz() {
  const [texto, setTexto] = useState('')
  return (
    <div className="dash">
      <section className="card-purion kb-essencia"><p>{TOM_DE_VOZ.essencia}</p></section>
      <div className="kb-regras">
        {TOM_DE_VOZ.regras.map((r) => (
          <div key={r.sim} className="kb-regra">
            <p className="kb-regra-sim"><Check size={13} /> {r.sim}</p>
            <p className="kb-regra-nao"><X size={13} /> {r.nao}</p>
          </div>
        ))}
      </div>
      <div className="kb-palavras">
        <div><p className="t-label">Palavras nossas</p><div className="kb-chips">{TOM_DE_VOZ.usamos.map((p) => <span key={p} className="kb-chip" data-ativo>{p}</span>)}</div></div>
        <div><p className="t-label">Evitamos</p><div className="kb-chips">{TOM_DE_VOZ.evitamos.map((p) => <span key={p} className="kb-chip kb-chip-nao">{p}</span>)}</div></div>
      </div>
      <section className="card-purion" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <p className="t-label">Teste seu texto antes de postar</p>
        <textarea className="textarea-purion" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui uma legenda, mensagem ou anúncio" />
        <LinterTom texto={texto} />
      </section>
    </div>
  )
}

function LinterTom({ texto, compacto }: { texto: string; compacto?: boolean }) {
  const t = texto.trim()
  const avisos = useMemo(() => {
    if (!t) return []
    const a: string[] = []
    const baixo = t.toLowerCase()
    for (const p of TOM_DE_VOZ.evitamos) if (baixo.includes(p)) a.push(`Troque "${p}"`)
    if (/!{2,}/.test(t)) a.push('Use um ponto final em vez de "!!"')
    const emojis = t.match(/\p{Extended_Pictographic}/gu)?.length ?? 0
    if (emojis > 1) a.push(`${emojis} emojis — no máximo um`)
    const gritos = t.match(/\b[A-ZÀ-Ú]{5,}\b/g)?.filter((w) => !['PURION', 'URGENTE'].includes(w)) ?? []
    if (gritos.length) a.push(`Caixa alta em "${gritos[0]}"`)
    const frases = t.split(/[.!?\n]+/).map((f) => f.trim()).filter(Boolean)
    const longa = frases.find((f) => f.split(/\s+/).length > 28)
    if (longa) a.push('Uma frase passa de 28 palavras — divida')
    return a
  }, [t])
  if (!t) return compacto ? null : <p className="caption">O verificador aponta palavras fora do tom, “!!”, excesso de emoji, caixa alta e frases longas.</p>
  return avisos.length === 0
    ? <p className="kb-lint-ok"><Check size={13} /> Dentro do tom PURION.</p>
    : <ul className="kb-lint">{avisos.map((x) => <li key={x}>{x}</li>)}</ul>
}
