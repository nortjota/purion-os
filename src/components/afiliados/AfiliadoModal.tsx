'use client'

import { useState } from 'react'
import { X, Copy, Check, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react'
import type { Afiliado, TipoComissao } from '@/hooks/useAfiliados'

type Props = {
  afiliado?: Afiliado
  onSalvar: (dados: Omit<Afiliado, 'id' | 'link_afiliado' | 'criado_em' | 'atualizado_em'>) => Promise<void>
  onFechar: () => void
}

const PASSOS = ['Dados Pessoais', 'Comissão', 'Dados Bancários', 'Confirmação']

const PIX_TIPOS = [
  { value: 'cpf',       label: 'CPF' },
  { value: 'cnpj',      label: 'CNPJ' },
  { value: 'email',     label: 'E-mail' },
  { value: 'telefone',  label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

function gerarCodigoLocal(nome: string): string {
  const letras = nome.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '')
  const base   = letras.slice(0, 4) || 'AFIL'
  return `PURION-${base}`
}

export function AfiliadoModal({ afiliado, onSalvar, onFechar }: Props) {
  const editando = !!afiliado
  const [passo, setPasso] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado]   = useState(false)
  const [erro, setErro]         = useState('')

  const [form, setForm] = useState({
    nome:             afiliado?.nome             ?? '',
    email:            afiliado?.email            ?? '',
    whatsapp:         afiliado?.whatsapp         ?? '',
    instagram:        afiliado?.instagram        ?? '',
    tiktok:           afiliado?.tiktok           ?? '',
    youtube:          afiliado?.youtube          ?? '',
    seguidores_total: afiliado?.seguidores_total ?? 0,
    nicho:            afiliado?.nicho            ?? '',
    codigo:           afiliado?.codigo           ?? '',
    tipo_comissao:    (afiliado?.tipo_comissao   ?? 'percentual') as TipoComissao,
    valor_comissao:   afiliado?.valor_comissao   ?? 10,
    desconto_cliente: afiliado?.desconto_cliente ?? 0,
    tipo_desconto:    (afiliado?.tipo_desconto   ?? 'percentual') as TipoComissao,
    pix_tipo:         afiliado?.pix_tipo         ?? '',
    pix_chave:        afiliado?.pix_chave        ?? '',
    banco_nome:       afiliado?.banco_nome       ?? '',
    banco_agencia:    afiliado?.banco_agencia    ?? '',
    banco_conta:      afiliado?.banco_conta      ?? '',
    status:           afiliado?.status           ?? 'ativo' as const,
  })

  const set = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  const linkGerado = form.codigo ? `https://puriongt.com.br?ref=${form.codigo}` : ''

  function validarPasso(): string {
    if (passo === 0) {
      if (!form.nome.trim()) return 'Nome é obrigatório'
      if (!form.email.trim() || !form.email.includes('@')) return 'E-mail inválido'
    }
    if (passo === 1) {
      if (!form.codigo.trim()) return 'Código é obrigatório. Clique em "Gerar" ou digite manualmente.'
      if (form.valor_comissao <= 0) return 'Valor de comissão deve ser maior que zero'
    }
    return ''
  }

  function avancar() {
    const e = validarPasso()
    if (e) { setErro(e); return }
    setErro('')
    setPasso(p => p + 1)
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await onSalvar({
        nome:             form.nome,
        email:            form.email,
        whatsapp:         form.whatsapp    || undefined,
        instagram:        form.instagram   || undefined,
        tiktok:           form.tiktok      || undefined,
        youtube:          form.youtube     || undefined,
        seguidores_total: form.seguidores_total,
        nicho:            form.nicho       || undefined,
        codigo:           form.codigo,
        tipo_comissao:    form.tipo_comissao,
        valor_comissao:   form.valor_comissao,
        desconto_cliente: form.desconto_cliente,
        tipo_desconto:    form.tipo_desconto,
        pix_tipo:         form.pix_tipo    || undefined,
        pix_chave:        form.pix_chave   || undefined,
        banco_nome:       form.banco_nome  || undefined,
        banco_agencia:    form.banco_agencia || undefined,
        banco_conta:      form.banco_conta || undefined,
        status:           form.status,
      })
      onFechar()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const INPUT = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
  }

  const LABEL = { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }

  const CAMPO = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  )

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)',
          width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {editando ? 'Editar afiliado' : 'Novo afiliado'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Passo {passo + 1} de {PASSOS.length} — {PASSOS[passo]}
            </p>
          </div>
          <button onClick={onFechar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Indicador de passos */}
        <div style={{ display: 'flex', padding: '12px 24px 0', gap: 6 }}>
          {PASSOS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= passo ? '#C9A84C' : 'var(--border)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px 24px', flex: 1 }}>

          {/* Passo 1 — Dados pessoais */}
          {passo === 0 && (
            <>
              <CAMPO label="Nome completo *">
                <input style={INPUT} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Maria Silva" />
              </CAMPO>
              <CAMPO label="E-mail *">
                <input style={INPUT} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="maria@exemplo.com" />
              </CAMPO>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CAMPO label="WhatsApp">
                  <input style={INPUT} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="61999990000" />
                </CAMPO>
                <CAMPO label="Nicho">
                  <input style={INPUT} value={form.nicho} onChange={e => set('nicho', e.target.value)} placeholder="Beleza, automotivo…" />
                </CAMPO>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CAMPO label="Instagram">
                  <input style={INPUT} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@usuario" />
                </CAMPO>
                <CAMPO label="TikTok">
                  <input style={INPUT} value={form.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="@usuario" />
                </CAMPO>
                <CAMPO label="YouTube">
                  <input style={INPUT} value={form.youtube} onChange={e => set('youtube', e.target.value)} placeholder="@canal" />
                </CAMPO>
                <CAMPO label="Total de seguidores">
                  <input style={INPUT} type="number" value={form.seguidores_total} onChange={e => set('seguidores_total', Number(e.target.value))} />
                </CAMPO>
              </div>
            </>
          )}

          {/* Passo 2 — Comissão */}
          {passo === 1 && (
            <>
              <CAMPO label="Código de rastreamento *">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...INPUT, fontFamily: 'monospace', flex: 1 }}
                    value={form.codigo}
                    onChange={e => set('codigo', e.target.value.toUpperCase())}
                    placeholder="PURION-MARI"
                  />
                  <button
                    onClick={() => set('codigo', gerarCodigoLocal(form.nome))}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg-surface)', cursor: 'pointer', color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap',
                    }}
                  >
                    <RefreshCw size={13} /> Gerar
                  </button>
                </div>
                {form.codigo && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Link: https://puriongt.com.br?ref={form.codigo}
                  </p>
                )}
              </CAMPO>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CAMPO label="Tipo de comissão">
                  <select style={{ ...INPUT }} value={form.tipo_comissao} onChange={e => set('tipo_comissao', e.target.value)}>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </CAMPO>
                <CAMPO label={`Valor da comissão (${form.tipo_comissao === 'percentual' ? '%' : 'R$'})`}>
                  <input style={INPUT} type="number" step="0.01" min="0" value={form.valor_comissao} onChange={e => set('valor_comissao', Number(e.target.value))} />
                </CAMPO>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CAMPO label="Tipo de desconto para cliente">
                  <select style={{ ...INPUT }} value={form.tipo_desconto} onChange={e => set('tipo_desconto', e.target.value)}>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </CAMPO>
                <CAMPO label={`Desconto ao cliente (${form.tipo_desconto === 'percentual' ? '%' : 'R$'})`}>
                  <input style={INPUT} type="number" step="0.01" min="0" value={form.desconto_cliente} onChange={e => set('desconto_cliente', Number(e.target.value))} />
                </CAMPO>
              </div>
            </>
          )}

          {/* Passo 3 — Dados bancários */}
          {passo === 2 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <CAMPO label="Tipo de chave PIX">
                  <select style={{ ...INPUT }} value={form.pix_tipo} onChange={e => set('pix_tipo', e.target.value)}>
                    <option value="">Selecione</option>
                    {PIX_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </CAMPO>
                <CAMPO label="Chave PIX">
                  <input style={INPUT} value={form.pix_chave} onChange={e => set('pix_chave', e.target.value)} placeholder="Chave PIX" />
                </CAMPO>
              </div>
              <CAMPO label="Banco">
                <input style={INPUT} value={form.banco_nome} onChange={e => set('banco_nome', e.target.value)} placeholder="Ex: Nubank, Itaú…" />
              </CAMPO>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <CAMPO label="Agência">
                  <input style={INPUT} value={form.banco_agencia} onChange={e => set('banco_agencia', e.target.value)} placeholder="0001" />
                </CAMPO>
                <CAMPO label="Conta">
                  <input style={INPUT} value={form.banco_conta} onChange={e => set('banco_conta', e.target.value)} placeholder="12345-6" />
                </CAMPO>
              </div>
            </>
          )}

          {/* Passo 4 — Confirmação */}
          {passo === 3 && (
            <>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Resumo</p>
                {[
                  ['Nome', form.nome],
                  ['E-mail', form.email],
                  form.tiktok  ? ['TikTok', form.tiktok]   : null,
                  form.instagram ? ['Instagram', form.instagram] : null,
                  ['Código', form.codigo],
                  ['Comissão', `${form.valor_comissao}${form.tipo_comissao === 'percentual' ? '%' : ' R$'}`],
                  form.desconto_cliente > 0 ? ['Desconto ao cliente', `${form.desconto_cliente}${form.tipo_desconto === 'percentual' ? '%' : ' R$'}`] : null,
                  form.pix_chave ? ['PIX', `${form.pix_tipo?.toUpperCase() ?? ''}: ${form.pix_chave}`] : null,
                ].filter((x): x is string[] => x !== null).map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {linkGerado && (
                <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Link de afiliado gerado</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontSize: 12, color: '#C9A84C', flex: 1, wordBreak: 'break-all' }}>{linkGerado}</code>
                    <button
                      onClick={copiarLink}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(201,168,76,0.3)',
                        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#C9A84C', whiteSpace: 'nowrap',
                      }}
                    >
                      {copiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {erro && (
            <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
              {erro}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => { setErro(''); setPasso(p => p - 1) }}
            disabled={passo === 0}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: passo === 0 ? 'not-allowed' : 'pointer',
              opacity: passo === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--text-secondary)',
            }}
          >
            <ChevronLeft size={14} /> Voltar
          </button>

          {passo < PASSOS.length - 1 ? (
            <button
              onClick={avancar}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: '#C9A84C', color: '#0D0D0D', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: '#C9A84C', color: '#0D0D0D', fontWeight: 600,
                cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1, fontSize: 13,
              }}
            >
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar afiliado'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
