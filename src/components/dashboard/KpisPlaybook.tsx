'use client'

import { useMemo, useState } from 'react'
import { Repeat, Info, Pencil, Check, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'
import { calcularKpisPlaybook } from '@/lib/kpisPlaybook'
import { AnimatedNumber, Stagger, StaggerItem } from '@/components/motion'

/** Valor monetário com count-up (R$ pt-BR) ou "—". */
const R$n = (v: number | null) => (v == null ? '—' : <AnimatedNumber value={v} prefix="R$ " decimals={2} />)
/** Fração 0–1 como % com count-up ou "—". */
const Pctn = (v: number | null) => (v == null ? '—' : <AnimatedNumber value={v * 100} suffix="%" decimals={1} />)

const DOURADO = '#C9A84C'

const fmtPct = (v: number | null) => (v == null ? '—' : formatPercent(v * 100, 1))

function Kpi({ label, valor, sub, formula, cor = '#F5F5F5', children }: {
  label: string
  valor: React.ReactNode
  sub?: string
  formula: string
  cor?: string
  children?: React.ReactNode
}) {
  return (
    <StaggerItem className="kpi-card lift" style={{ minWidth: 0, gap: 2, display: 'flex', flexDirection: 'column' }} title={formula}>
      <span style={{ fontSize: 12, color: '#B8B8B8', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label} <Info size={11} style={{ opacity: 0.6 }} />
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: cor, lineHeight: 1.25, wordBreak: 'break-word' }}>{valor}</span>
      {sub && <span style={{ fontSize: 11, color: '#B8B8B8' }}>{sub}</span>}
      {children}
    </StaggerItem>
  )
}

/** Sessões do site nos últimos 30 dias — informadas manualmente (GA4/Shopify), salvas em configuracoes. */
function EditorSessoes({ valor }: { valor: number }) {
  const { salvarConfiguracoes } = useConfiguracoes()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(String(valor || ''))

  if (!editando) {
    return (
      <button onClick={() => { setTexto(String(valor || '')); setEditando(true) }} style={{
        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: DOURADO,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        <Pencil size={10} /> {valor > 0 ? `${formatNumber(valor)} sessões (30d)` : 'informar sessões (30d)'}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      <input
        className="input-purion"
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, ''))}
        placeholder="sessões 30d"
        style={{ height: 28, fontSize: 12, padding: '0 8px', width: 110 }}
        autoFocus
      />
      <button className="icon-btn" style={{ width: 28, height: 28 }} title="Salvar"
        onClick={async () => { if (await salvarConfiguracoes({ sessoesSite30d: Number(texto) || 0 })) setEditando(false) }}>
        <Check size={13} />
      </button>
      <button className="icon-btn" style={{ width: 28, height: 28 }} title="Cancelar" onClick={() => setEditando(false)}>
        <X size={13} />
      </button>
    </div>
  )
}

/** KPIs oficiais do Playbook 360 + North Star (clientes/parceiros ativos que recompram). */
export function KpisPlaybook() {
  const { vendas, despesas, configuracoes } = usePurionStore()
  const [dias, setDias] = useState<30 | 90>(30)
  const [agora] = useState(() => Date.now())

  const k = useMemo(() => calcularKpisPlaybook({
    vendas, despesas, dias,
    custoUnitario: configuracoes.custoProdutoUnitario,
    sessoesSite30d: Number(configuracoes.sessoesSite30d ?? 0),
    agora,
  }), [vendas, despesas, dias, configuracoes.custoProdutoUnitario, configuracoes.sessoesSite30d, agora])

  const nsDelta = k.northStar.total - k.northStar.anterior
  const b2c = k.contribuicao.find((c) => c.canal === 'b2c')!
  const b2b = k.contribuicao.find((c) => c.canal === 'b2b')!

  return (
    <section className="section-gap" style={{ gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p className="kpi-label" style={{ color: '#E0E0E0' }}>KPIs oficiais · Playbook 360</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {([30, 90] as const).map((d) => (
            <button key={d} onClick={() => setDias(d)} className="px-3 py-1 rounded-md text-xs font-medium"
              style={dias === d ? { background: 'rgba(201,168,76,0.15)', color: DOURADO } : { color: '#B8B8B8' }}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {/* North Star em destaque */}
      <div className="card-purion" style={{
        padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.02))',
        borderColor: 'rgba(201,168,76,0.4)',
      }} title="North Star = clientes (B2C) e parceiros (B2B) com 2 ou mais pedidos pagos e o último pedido nos últimos 90 dias.">
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'rgba(201,168,76,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Repeat size={22} style={{ color: DOURADO }} />
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <p style={{ fontSize: 12, color: DOURADO, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>North Star</p>
          <p style={{ fontSize: 15, color: '#F5F5F5', fontWeight: 600 }}>Clientes e parceiros ativos que recompram</p>
          <p style={{ fontSize: 12, color: '#B8B8B8', marginTop: 2 }}>≥ 2 pedidos pagos, último nos últimos 90 dias</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <AnimatedNumber value={k.northStar.total} mode="odometer" style={{ fontSize: 40, fontWeight: 800, color: DOURADO, lineHeight: 1 }} />
          <span style={{ fontSize: 13, color: '#E0E0E0' }}>{k.northStar.b2c} B2C · {k.northStar.b2b} B2B</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: nsDelta > 0 ? '#86EFAC' : nsDelta < 0 ? '#FCA5A5' : '#B8B8B8' }}>
            {nsDelta > 0 ? '+' : ''}{nsDelta} vs 30 dias atrás
          </span>
        </div>
      </div>

      <Stagger key={dias} className="cards-gap grid-mobile-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <Kpi label="Pedidos pagos" valor={<AnimatedNumber value={k.pedidosPagos} />} sub={`últimos ${dias} dias`}
          formula="Pedidos pagos = nº de order_id ÚNICOS com status de pagamento 'pago' (order_id = pedido da loja ou id do pedido manual)." />
        <Kpi label="Receita líquida" valor={R$n(k.receitaLiquida)} cor={DOURADO}
          sub={`itens ${formatCurrency(k.itensPagos)} − desc. ${formatCurrency(k.descontos)} − reemb. ${formatCurrency(k.reembolsos)}`}
          formula="Receita líquida = Σ itens pagos (valor unitário × quantidade) − Σ descontos − Σ reembolsos/estornos do período." />
        <Kpi label="Ticket médio" valor={R$n(k.ticketMedio)}
          formula="Ticket médio = receita líquida ÷ pedidos pagos." />
        <Kpi label="Contribuição B2C" valor={R$n(b2c.contribuicao)} cor={b2c.contribuicao >= 0 ? '#86EFAC' : '#FCA5A5'}
          sub={`margem ${fmtPct(b2c.margem)} · mídia+creators+frete ${formatCurrency(b2c.custosVariaveis)}`}
          formula="Contribuição B2C = receita líquida B2C − CMV (custo unitário × unidades) − taxas de pagamento − mídia paga (Meta/Google) − creators/UGC − logística rateada por unidades." />
        <Kpi label="Contribuição B2B" valor={R$n(b2b.contribuicao)} cor={b2b.contribuicao >= 0 ? '#86EFAC' : '#FCA5A5'}
          sub={`margem ${fmtPct(b2b.margem)} · CMV ${formatCurrency(b2b.cmv)}`}
          formula="Contribuição B2B = receita líquida B2B − CMV (custo unitário × unidades) − taxas de pagamento − logística rateada por unidades." />
        <Kpi label="CAC novos compradores" valor={R$n(k.cac)}
          sub={`${formatCurrency(k.investimentoAquisicao)} ÷ ${k.novosCompradores} novos`}
          formula="CAC = (mídia paga Meta/Google + creators/UGC do período) ÷ clientes cuja 1ª compra paga ocorreu no período." />
        <Kpi label="Conversão do site (30d)" valor={Pctn(k.conversaoSite)}
          sub={`${k.pedidosSite30d} pedidos pagos do site`}
          formula="Conversão do site = pedidos pagos B2C do site nos últimos 30 dias ÷ sessões do site nos últimos 30 dias (informadas manualmente: GA4/Shopify).">
          <EditorSessoes valor={Number(configuracoes.sessoesSite30d ?? 0)} />
        </Kpi>
        <Kpi label="Recompra 60d / 90d" valor={`${fmtPct(k.recompra60.taxa)} / ${fmtPct(k.recompra90.taxa)}`}
          sub={`${k.recompra60.recompraram}/${k.recompra60.base} · ${k.recompra90.recompraram}/${k.recompra90.base} clientes`}
          formula="Taxa de recompra N dias = clientes com 1ª compra há ≥ N dias que fizeram a 2ª compra paga em até N dias ÷ clientes dessa coorte." />
        <Kpi label="Tempo até 2ª compra" valor={k.diasAte2aCompra == null ? '—' : `${formatNumber(k.diasAte2aCompra)} dias`}
          sub="mediana"
          formula="Tempo até 2ª compra = mediana de dias entre a 1ª e a 2ª compra paga de cada cliente que recomprou." />
        <Kpi label="Satisfação pós-entrega" valor={k.satisfacao.media == null ? '—' : `${formatNumber(k.satisfacao.media, 1)} / 5`}
          sub={`${k.satisfacao.respostas} resposta${k.satisfacao.respostas !== 1 ? 's' : ''}`}
          formula="Satisfação pós-entrega = média das notas 1-5 registradas no Pós-venda no período." />
        <Kpi label="Giro B2B (30d)" valor={k.giroB2B30d.porParceiro == null ? '—' : `${formatNumber(k.giroB2B30d.porParceiro, 1)} un/parceiro`}
          sub={`${k.giroB2B30d.unidades} un · ${k.giroB2B30d.parceiros} parceiros ativos`}
          formula="Giro B2B 30d = unidades B2B pagas nos últimos 30 dias ÷ parceiros B2B com pedido pago nos últimos 30 dias." />
      </Stagger>
    </section>
  )
}
