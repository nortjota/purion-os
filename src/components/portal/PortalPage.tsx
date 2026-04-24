'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Afiliado, AfiliadoVenda, AfiliadoClique, AfiliadoPagamento } from '@/hooks/useAfiliados'

type Material = {
  id: string
  titulo: string
  tipo: string
  url: string
  descricao?: string
}

type Props = {
  afiliado: Afiliado
  vendas: AfiliadoVenda[]
  cliques: Pick<AfiliadoClique, 'afiliado_id' | 'converteu' | 'criado_em'>[]
  pagamentos: AfiliadoPagamento[]
  materiais: Material[]
}

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then(m => ({ default: m.QRCodeCanvas })),
  { ssr: false, loading: () => <div style={{ width: 150, height: 150, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} /> }
)

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS_COM: Record<string, { label: string; color: string }> = {
  pendente:  { label: 'Pendente',  color: '#F59E0B' },
  aprovada:  { label: 'Aprovada',  color: '#3B82F6' },
  paga:      { label: 'Paga',      color: '#10B981' },
  cancelada: { label: 'Cancelada', color: '#EF4444' },
}

const STATUS_BADGE = {
  ativo:     { c: '#10B981', b: 'rgba(16,185,129,0.15)',  label: 'Ativo'     },
  pausado:   { c: '#F59E0B', b: 'rgba(245,158,11,0.15)',  label: 'Pausado'   },
  pendente:  { c: '#3B82F6', b: 'rgba(59,130,246,0.15)',  label: 'Pendente'  },
  bloqueado: { c: '#EF4444', b: 'rgba(239,68,68,0.15)',   label: 'Bloqueado' },
}

function CopyTextBlock({ label, texto }: { label: string; texto: string }) {
  const [copiado, setCopiado] = useState(false)
  function copiar() {
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'rgba(229,229,229,0.5)', fontWeight: 500 }}>{label}</span>
        <button onClick={copiar} style={{ fontSize: 11, color: copiado ? '#10B981' : '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {copiado ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.6)', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 12px', margin: 0, lineHeight: 1.6 }}>
        {texto}
      </p>
    </div>
  )
}

export function PortalPage({ afiliado, vendas, cliques, pagamentos, materiais }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [periodo, setPeriodo] = useState<'mes' | 'tudo'>('mes')

  const linkAfiliado = afiliado.link_afiliado ?? `https://puriongt.com.br?ref=${afiliado.codigo}`

  const mesInicio = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
  }, [])

  const vendasOk = useMemo(
    () => vendas.filter(v => v.status_venda !== 'cancelada'),
    [vendas]
  )

  const vendasPeriodo = useMemo(
    () => periodo === 'tudo' ? vendasOk : vendasOk.filter(v => v.data_venda >= mesInicio),
    [vendasOk, periodo, mesInicio]
  )

  const cliquesPeriodo = useMemo(
    () => periodo === 'tudo' ? cliques : cliques.filter(c => c.criado_em >= mesInicio),
    [cliques, periodo, mesInicio]
  )

  const metricas = useMemo(() => ({
    totalCliques: cliquesPeriodo.length,
    totalVendas:  vendasPeriodo.length,
    receita:      vendasPeriodo.reduce((s, v) => s + v.valor_liquido, 0),
    comissao:     vendasPeriodo.reduce((s, v) => s + v.comissao_valor, 0),
  }), [cliquesPeriodo, vendasPeriodo])

  const comPendente = vendas.filter(v => v.status_comissao === 'pendente').reduce((s, v) => s + v.comissao_valor, 0)
  const comPaga     = vendas.filter(v => v.status_comissao === 'paga').reduce((s, v) => s + v.comissao_valor, 0)

  const chartData = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(hoje)
      d.setDate(d.getDate() - (13 - i))
      const dia = d.toISOString().slice(0, 10)
      return {
        dia:   d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count: cliques.filter(c => c.criado_em.startsWith(dia)).length,
      }
    })
  }, [cliques])

  const maxCliques = Math.max(...chartData.map(d => d.count), 1)

  function copiarLink() {
    navigator.clipboard.writeText(linkAfiliado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function compartilhar() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'PURION — Fragrância Automotiva Premium',
          text: 'Compre pelo meu link e garanta o melhor perfume para seu carro!',
          url: linkAfiliado,
        })
      } catch {
        // user dismissed
      }
    } else {
      copiarLink()
    }
  }

  const st = STATUS_BADGE[afiliado.status as keyof typeof STATUS_BADGE] ?? STATUS_BADGE.pendente

  const CARD: React.CSSProperties = {
    background: '#161616',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#E5E5E5', fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.12em' }}>PURION</span>
        <span style={{ fontSize: 11, color: 'rgba(229,229,229,0.3)' }}>|</span>
        <span style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)' }}>Portal do Afiliado</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Boas-vindas */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E5E5E5', margin: 0 }}>
              Olá, {afiliado.nome.split(' ')[0]}!
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: st.c, background: st.b, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {st.label}
            </span>
          </div>
          {afiliado.data_inicio && (
            <p style={{ fontSize: 13, color: 'rgba(229,229,229,0.4)', margin: 0 }}>
              Parceiro PURION desde {new Date(afiliado.data_inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Link de afiliado */}
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>
            Seu link de afiliado
          </p>
          <div style={{ background: 'rgba(201,168,76,0.08)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: '#C9A84C', wordBreak: 'break-all', margin: 0, fontFamily: 'monospace' }}>
              {linkAfiliado}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <button
              onClick={copiarLink}
              style={{
                height: 44, borderRadius: 10, border: 'none',
                background: copiado ? '#10B981' : '#C9A84C',
                color: '#0D0D0D', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                transition: 'background 200ms',
              }}
            >
              {copiado ? '✓ Copiado!' : 'Copiar link'}
            </button>
            <button
              onClick={compartilhar}
              style={{
                height: 44, borderRadius: 10,
                border: '1px solid rgba(201,168,76,0.35)',
                background: 'transparent', color: '#C9A84C',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              ↑ Compartilhar
            </button>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 12, display: 'inline-block' }}>
              <QRCodeCanvas value={linkAfiliado} size={150} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(229,229,229,0.35)', textAlign: 'center', margin: 0 }}>
              Salve o QR Code para compartilhar offline
            </p>
          </div>

          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(201,168,76,0.04)', borderRadius: 8, borderLeft: '2px solid rgba(201,168,76,0.3)' }}>
            <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
              Use este link em <strong style={{ color: 'rgba(229,229,229,0.7)' }}>todas as suas publicações</strong> sobre a PURION — Instagram, TikTok, bio, Stories e WhatsApp.
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: 0 }}>Suas métricas</p>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 2, gap: 2 }}>
              {(['mes', 'tudo'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    background: periodo === p ? '#C9A84C' : 'transparent',
                    color: periodo === p ? '#0D0D0D' : 'rgba(229,229,229,0.5)',
                    transition: 'all 150ms',
                  }}
                >
                  {p === 'mes' ? 'Mês atual' : 'Tudo'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Cliques',        value: metricas.totalCliques.toLocaleString('pt-BR'), color: '#3B82F6' },
              { label: 'Vendas',         value: String(metricas.totalVendas),                   color: '#10B981' },
              { label: 'Receita gerada', value: fmt(metricas.receita),                          color: '#C9A84C' },
              { label: 'Sua comissão',   value: fmt(metricas.comissao),                         color: '#C9A84C' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 11, color: 'rgba(229,229,229,0.4)', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0, wordBreak: 'break-all' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart — cliques 14 dias */}
          <p style={{ fontSize: 11, color: 'rgba(229,229,229,0.4)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cliques por dia — últimos 14 dias
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3 }}>
                <div
                  title={`${d.dia}: ${d.count} cliques`}
                  style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    background: d.count > 0 ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.05)',
                    height: `${Math.max(3, (d.count / maxCliques) * 52)}px`,
                    transition: 'height 400ms ease',
                  }}
                />
                {i % 3 === 0 && (
                  <span style={{ fontSize: 8, color: 'rgba(229,229,229,0.25)', whiteSpace: 'nowrap' }}>{d.dia}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comissões */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 14px' }}>Comissões</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#F59E0B', margin: '0 0 4px', fontWeight: 600 }}>Pendente</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', margin: 0 }}>{fmt(comPendente)}</p>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#10B981', margin: '0 0 4px', fontWeight: 600 }}>Recebida</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#10B981', margin: 0 }}>{fmt(comPaga)}</p>
            </div>
          </div>

          {pagamentos.length > 0 ? (
            <>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(229,229,229,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                Histórico de pagamentos
              </p>
              {pagamentos.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < pagamentos.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#E5E5E5', margin: 0, fontWeight: 600 }}>{fmt(p.valor_total)}</p>
                    <p style={{ fontSize: 11, color: 'rgba(229,229,229,0.4)', margin: '2px 0 0' }}>
                      {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'} · {p.metodo?.toUpperCase() ?? '—'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                    Pago
                  </span>
                </div>
              ))}
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.3)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
              Nenhum pagamento registrado ainda
            </p>
          )}
        </div>

        {/* Vendas */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 14px' }}>Suas vendas</p>
          {vendas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 22, margin: '0 0 8px' }}>🎯</p>
              <p style={{ fontSize: 13, color: 'rgba(229,229,229,0.4)', margin: 0 }}>Nenhuma venda ainda — compartilhe seu link!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 380 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Data', 'Pedido', 'Valor', 'Comissão', 'Status'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(229,229,229,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendas.slice(0, 10).map(v => {
                    const sc = STATUS_COM[v.status_comissao] ?? { label: v.status_comissao, color: 'rgba(229,229,229,0.4)' }
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '9px 8px', color: 'rgba(229,229,229,0.45)', whiteSpace: 'nowrap' }}>{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '9px 8px', color: '#E5E5E5' }}>{v.pedido_ref ?? v.pedido_id.slice(0, 8)}</td>
                        <td style={{ padding: '9px 8px', color: '#E5E5E5', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(v.valor_liquido)}</td>
                        <td style={{ padding: '9px 8px', color: '#C9A84C', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(v.comissao_valor)}</td>
                        <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Materiais */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Materiais de divulgação</p>
          <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.35)', margin: '0 0 16px' }}>Conteúdos prontos disponibilizados pela PURION</p>

          {materiais.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
              {materiais.map(m => (
                <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 72, background: 'rgba(201,168,76,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 28 }}>
                      {m.tipo === 'imagem' ? '🖼' : m.tipo === 'video' ? '🎥' : '📄'}
                    </span>
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#E5E5E5', margin: '0 0 8px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titulo}</p>
                    <a href={m.url} download target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', textAlign: 'center', padding: '6px', borderRadius: 6, background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'rgba(229,229,229,0.25)', margin: 0 }}>Materiais em breve</p>
            </div>
          )}

          {/* Textos prontos */}
          <div style={{ padding: 14, background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
              Legendas prontas para copiar
            </p>
            <CopyTextBlock
              label="Instagram / Facebook"
              texto={`Pessoal! Encontrei o melhor perfume para carro ✨ A PURION tem fragrâncias premium incríveis! Use meu link e garanta o seu: ${linkAfiliado} 🚗 #PURION #PerfumeAutomotivo`}
            />
            <CopyTextBlock
              label="TikTok / Reels"
              texto={`Seu carro merece cheirar bem! Entra no link da bio e usa o meu código ${afiliado.codigo} para garantir o desconto 🚗✨`}
            />
            <CopyTextBlock
              label="WhatsApp"
              texto={`Oi! Conhece a PURION? São fragrâncias automotivas premium incríveis! Compre pelo meu link: ${linkAfiliado}`}
            />
          </div>
        </div>

        {/* Informações da parceria */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 14px' }}>Sua parceria</p>
          {([
            ['Seu código', afiliado.codigo],
            ['Comissão por venda', `${afiliado.valor_comissao}${afiliado.tipo_comissao === 'percentual' ? '%' : ' R$'}`],
            afiliado.desconto_cliente > 0
              ? ['Desconto ao cliente', `${afiliado.desconto_cliente}${afiliado.tipo_desconto === 'percentual' ? '%' : ' R$'}`]
              : null,
            afiliado.pix_chave
              ? ['PIX cadastrado', `${afiliado.pix_tipo?.toUpperCase()} — ****${afiliado.pix_chave.slice(-4)}`]
              : ['PIX', 'Não cadastrado — contate a PURION'],
            afiliado.data_inicio
              ? ['Início', new Date(afiliado.data_inicio).toLocaleDateString('pt-BR')]
              : null,
          ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v], i, arr) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'rgba(229,229,229,0.45)' }}>{k}</span>
              <span style={{ fontSize: 13, color: '#E5E5E5', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}

          <a
            href={`/portal/${afiliado.codigo}/instrucoes`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, height: 40, borderRadius: 10, border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'background 150ms' }}
          >
            Como usar meu link →
          </a>
        </div>

        {/* Dicas */}
        <div style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C', margin: '0 0 4px' }}>Como gerar mais vendas com seu link</p>
          <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.4)', margin: '0 0 16px' }}>Dicas da PURION para maximizar seus resultados</p>
          {[
            { titulo: 'Stories diários', desc: 'Histórias autênticas mostrando o produto em uso convertem muito mais do que posts comuns.' },
            { titulo: 'Link sempre na bio', desc: 'Mantenha seu link de afiliado na bio do Instagram e TikTok — é a maior fonte de cliques.' },
            { titulo: 'Reels e TikTok', desc: 'Vídeos curtos (15–30s) mostrando a experiência de cheiro têm altíssimo alcance orgânico.' },
            { titulo: 'Grupos de WhatsApp', desc: 'Compartilhe em grupos de carro, auto entusiastas e comunidades da sua cidade.' },
            { titulo: 'Horários ideais', desc: '18h–22h nos dias de semana e 10h–14h nos fins de semana são os melhores momentos.' },
          ].map(({ titulo, desc }, i) => (
            <div key={titulo} style={{ display: 'flex', gap: 12, marginBottom: i < 4 ? 14 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', flexShrink: 0, marginTop: 6 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 2px' }}>{titulo}</p>
                <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.45)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, padding: '16px 0' }}>
          <p style={{ fontSize: 11, color: 'rgba(229,229,229,0.2)', margin: 0 }}>
            PURION © {new Date().getFullYear()} · Portal do Afiliado · {afiliado.codigo}
          </p>
        </div>
      </div>
    </div>
  )
}
