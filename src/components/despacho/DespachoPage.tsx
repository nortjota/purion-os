'use client'

import { useMemo, useState } from 'react'
import { Truck, AlertTriangle, CheckCircle2, Copy, MapPin, Phone, Package, MessageCircle, Clock } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { useIsLogistica } from '@/hooks/useIsLogistica'
import { useMobile } from '@/hooks/useMobile'
import { useToast } from '@/components/ui/Toast'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { PERFIS_INFO } from '@/lib/socios'
import { frascosDaVenda } from '@/lib/escadaProdutos'
import {
  useDespacho, aguardandoDespacho, despachoAtrasado, despachadoHoje, horasDesde,
  mensagemM02, linkWhatsApp, TRANSPORTADORAS, HORAS_ALERTA_DESPACHO,
} from '@/hooks/useDespacho'

const VERDE = PERFIS_INFO.logistica.cor
const DOURADO = '#C9A84C'
const VERMELHO = '#EF4444'

function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtIdade(horas: number): string {
  if (horas < 1) return 'há menos de 1h'
  if (horas < 48) return `há ${Math.floor(horas)}h`
  return `há ${Math.floor(horas / 24)} dias`
}

function enderecoCompleto(v: Venda): string {
  const linha1 = [v.endereco, v.numero].filter(Boolean).join(', ')
  const partes = [
    linha1 + (v.complemento ? ` — ${v.complemento}` : ''),
    v.bairro,
    [v.cidade, v.uf].filter(Boolean).join('/'),
    v.cep ? `CEP ${v.cep}` : null,
  ].filter((p) => p && String(p).trim())
  return partes.join(' · ')
}

function nomeOperador(v: Venda): string {
  if (v.despachadoPor === 'logistica') return 'Logística · Goiânia'
  return v.despachadoPorNome || (v.despachadoPor ? PERFIS_INFO[v.despachadoPor as 'matheus']?.nome ?? v.despachadoPor : '—')
}

// ─────────────────────────────────────────────
// KPI
// ─────────────────────────────────────────────

function Kpi({ label, valor, cor, sub }: { label: string; valor: number; cor: string; sub?: string }) {
  return (
    <div className="kpi-card" style={{ flex: '1 1 150px', minWidth: 0 }}>
      <span style={{ fontSize: 12, color: '#B8B8B8' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: cor, lineHeight: 1.2 }}>{valor}</span>
      {sub && <span style={{ fontSize: 11, color: '#B8B8B8' }}>{sub}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────
// CARD: pedido a despachar
// ─────────────────────────────────────────────

function CardFila({ venda, onDespachar }: {
  venda: Venda
  onDespachar: (id: string, transportadora: string, codigo: string) => Promise<boolean>
}) {
  const { success } = useToast()
  const [transportadora, setTransportadora] = useState(venda.transportadora ?? '')
  const [codigo, setCodigo] = useState(venda.codigoRastreio ?? '')
  const [salvando, setSalvando] = useState(false)
  const horas = horasDesde(venda.dataVenda)
  const atrasado = despachoAtrasado(venda)
  const endereco = enderecoCompleto(venda)
  const podeSalvar = transportadora.trim() !== '' && codigo.trim() !== '' && !salvando

  async function copiarEndereco() {
    const texto = [venda.clienteNome, endereco, venda.clienteTelefone].filter(Boolean).join('\n')
    try { await navigator.clipboard.writeText(texto); success('Endereço copiado') } catch { /* sem clipboard */ }
  }

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    await onDespachar(venda.id, transportadora.trim(), codigo.trim().toUpperCase())
    setSalvando(false)
  }

  return (
    <div className="card-purion" style={{ padding: '14px 16px', borderLeft: `3px solid ${atrasado ? VERMELHO : VERDE}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {/* Dados do envio */}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{venda.clienteNome || 'Cliente sem nome'}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 99,
              background: atrasado ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.06)',
              color: atrasado ? '#FCA5A5' : '#B8B8B8',
            }}>
              <Clock size={11} /> {atrasado ? `Atrasado · ${fmtIdade(horas)}` : `Pago ${fmtIdade(horas)}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 14, color: '#F5F5F5' }}>
            <Package size={14} style={{ color: VERDE, flexShrink: 0 }} />
            <strong>{venda.quantidade}x</strong> {venda.produto || 'PURION GT'}
            <span style={{ fontSize: 12, color: '#E0E0E0', fontWeight: 600 }}>· {frascosDaVenda(venda)} frasco{frascosDaVenda(venda) !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 12, color: '#B8B8B8' }}>· {venda.canal.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, fontSize: 13, color: endereco ? '#E0E0E0' : '#FCA5A5' }}>
            <MapPin size={14} style={{ color: VERDE, flexShrink: 0, marginTop: 2 }} />
            <span style={{ flex: 1 }}>{endereco || 'Endereço não informado — confirmar com o Matheus'}</span>
            {endereco && (
              <button onClick={copiarEndereco} className="icon-btn" title="Copiar nome + endereço + telefone" style={{ width: 28, height: 28, flexShrink: 0 }}>
                <Copy size={13} />
              </button>
            )}
          </div>

          {venda.clienteTelefone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: '#B8B8B8' }}>
              <Phone size={13} style={{ flexShrink: 0 }} /> {venda.clienteTelefone}
            </div>
          )}
          {venda.observacoes && (
            <p style={{ fontSize: 12, color: '#B8B8B8', marginTop: 6 }}>Obs.: {venda.observacoes}</p>
          )}
        </div>

        {/* Lançar despacho */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select className="input-purion" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} style={{ fontSize: 14 }}>
            <option value="">Transportadora *</option>
            {TRANSPORTADORAS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            className="input-purion"
            placeholder="Código de rastreio *"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') salvar() }}
            style={{ fontSize: 14, textTransform: 'uppercase' }}
          />
          <button
            className="btn btn-primary"
            disabled={!podeSalvar}
            onClick={salvar}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, minHeight: 40, opacity: podeSalvar ? 1 : 0.5 }}
          >
            <Truck size={15} /> {salvando ? 'Salvando…' : 'Marcar como despachado'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CARD: pedido despachado
// ─────────────────────────────────────────────

function CardDespachado({ venda, mostrarM02, onMarcarM02 }: {
  venda: Venda
  mostrarM02: boolean
  onMarcarM02: (id: string) => void
}) {
  const { success } = useToast()
  const texto = mensagemM02(venda)
  const wa = linkWhatsApp(venda.clienteTelefone, texto)

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); success('Mensagem M02 copiada') } catch { /* sem clipboard */ }
  }

  return (
    <div className="card-purion" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <CheckCircle2 size={18} style={{ color: VERDE, flexShrink: 0 }} />
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5' }}>{venda.clienteNome}</p>
          <p style={{ fontSize: 13, color: '#E0E0E0', marginTop: 2 }}>
            {venda.transportadora ?? '—'} · <span style={{ fontFamily: 'monospace' }}>{venda.codigoRastreio ?? 'sem código'}</span>
          </p>
          <p style={{ fontSize: 12, color: '#B8B8B8', marginTop: 2 }}>
            {venda.quantidade}x {venda.produto || 'PURION GT'} · despachado {fmtDataHora(venda.dataEnvio)} por {nomeOperador(venda)}
          </p>
        </div>

        {mostrarM02 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {venda.m02EnviadaEm ? (
              <span style={{ fontSize: 12, color: '#86EFAC', fontWeight: 600 }}>M02 enviada {fmtDataHora(venda.m02EnviadaEm)}</span>
            ) : (
              <>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <MessageCircle size={13} /> M02 no WhatsApp
                  </a>
                )}
                <button onClick={copiar} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Copy size={12} /> Copiar M02
                </button>
                <button onClick={() => onMarcarM02(venda.id)} className="btn btn-primary btn-sm">Marcar M02 enviada</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 36, color: '#B8B8B8', fontSize: 14, border: '1px dashed var(--border)', borderRadius: 12 }}>
      <CheckCircle2 size={28} style={{ margin: '0 auto 8px', color: VERDE, opacity: 0.7 }} />
      {texto}
    </div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────

type Aba = 'fila' | 'atrasados' | 'hoje' | 'aviso'

/**
 * Fila de Despacho — pedido pago → Logística despacha em Goiânia → rastreio volta ao CRM.
 * Perfil 'logistica': tela inicial e única (fila + despachados hoje).
 * Sócios: painel completo (a despachar / atrasados / despachados hoje / aviso M02 pendente).
 */
export function DespachoPage() {
  const { vendas } = usePurionStore()
  const { isLogistica } = useIsLogistica()
  const isMobile = useMobile()
  const { despachar, marcarM02Enviada } = useDespacho()
  const [aba, setAba] = useState<Aba>('fila')

  const fila = useMemo(
    () => vendas.filter(aguardandoDespacho).sort((a, b) => a.dataVenda.localeCompare(b.dataVenda)),
    [vendas],
  )
  const atrasados = useMemo(() => fila.filter((v) => despachoAtrasado(v)), [fila])
  const hoje = useMemo(
    () => vendas.filter(despachadoHoje).sort((a, b) => (b.dataEnvio ?? '').localeCompare(a.dataEnvio ?? '')),
    [vendas],
  )
  const semAviso = useMemo(
    () => vendas
      .filter((v) => v.statusEntrega === 'postado' && !!v.codigoRastreio && !v.m02EnviadaEm)
      .sort((a, b) => (b.dataEnvio ?? '').localeCompare(a.dataEnvio ?? '')),
    [vendas],
  )

  const tabs = [
    { id: 'fila', label: 'A despachar', badge: fila.length },
    ...(!isLogistica ? [{ id: 'atrasados', label: `Atrasados (+${HORAS_ALERTA_DESPACHO}h)`, badge: atrasados.length }] : []),
    { id: 'hoje', label: 'Despachados hoje', badge: hoje.length },
    ...(!isLogistica ? [{ id: 'aviso', label: 'Avisar cliente (M02)', badge: semAviso.length }] : []),
  ]

  const listaFila = aba === 'atrasados' ? atrasados : fila

  return (
    <div className="page-content section-gap">
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: `${VERDE}1F`, border: `1px solid ${VERDE}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Truck size={20} style={{ color: VERDE }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="page-title" style={{ color: '#F5F5F5' }}>{isLogistica ? 'Fila de Despacho' : 'Despachos'}</h1>
          <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 2 }}>
            {isLogistica
              ? 'Pedidos pagos para despachar em Goiânia. Informe transportadora e rastreio ao postar.'
              : 'Acompanhe o trabalho da Logística · Goiânia: pedido pago → despacho → rastreio no CRM.'}
          </p>
        </div>
      </div>

      {/* Alerta de atraso */}
      {atrasados.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {atrasados.length} pedido{atrasados.length > 1 ? 's' : ''} pago{atrasados.length > 1 ? 's' : ''} há mais de {HORAS_ALERTA_DESPACHO}h sem despacho.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Kpi label="A despachar" valor={fila.length} cor={DOURADO} sub="pagos, aguardando envio" />
        <Kpi label="Atrasados" valor={atrasados.length} cor={atrasados.length > 0 ? VERMELHO : '#E0E0E0'} sub={`pagos há +${HORAS_ALERTA_DESPACHO}h`} />
        <Kpi label="Despachados hoje" valor={hoje.length} cor={VERDE} sub={hoje.reduce((s, v) => s + frascosDaVenda(v), 0) + ' frascos'} />
        {!isLogistica && <Kpi label="Sem aviso M02" valor={semAviso.length} cor={semAviso.length > 0 ? '#E8A838' : '#E0E0E0'} sub="rastreio não enviado ao cliente" />}
      </div>

      <InnerTabs tabs={tabs} activeTab={aba} onChange={(id) => setAba(id as Aba)} />

      {(aba === 'fila' || aba === 'atrasados') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listaFila.length === 0
            ? <Vazio texto={aba === 'atrasados' ? 'Nenhum pedido atrasado.' : 'Nenhum pedido pago aguardando despacho.'} />
            : listaFila.map((v) => <CardFila key={v.id} venda={v} onDespachar={despachar} />)}
        </div>
      )}

      {aba === 'hoje' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hoje.length === 0
            ? <Vazio texto="Nenhum despacho registrado hoje." />
            : hoje.map((v) => <CardDespachado key={v.id} venda={v} mostrarM02={!isLogistica} onMarcarM02={marcarM02Enviada} />)}
        </div>
      )}

      {aba === 'aviso' && !isLogistica && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: '#B8B8B8' }}>
            Não há envio automático de mensagens ao cliente no app: abra o WhatsApp com a M02 pronta (ou copie o texto) e marque como enviada.
          </p>
          {semAviso.length === 0
            ? <Vazio texto="Todos os clientes com rastreio já foram avisados." />
            : semAviso.map((v) => <CardDespachado key={v.id} venda={v} mostrarM02 onMarcarM02={marcarM02Enviada} />)}
        </div>
      )}

      {isMobile && <div style={{ height: 8 }} />}
    </div>
  )
}
