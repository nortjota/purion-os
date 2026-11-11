'use client'

import { useMemo, useState } from 'react'
import { Repeat, Pencil, Check, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'
import { calcularKpisPlaybook } from '@/lib/kpisPlaybook'
import { AnimatedNumber, Stagger, StaggerItem } from '@/components/motion'

/** Valor monetário com count-up (R$ pt-BR) ou "—". */
const R$n = (v: number | null) => (v == null ? '—' : <AnimatedNumber value={v} prefix="R$ " decimals={2} />)
/** Fração 0–1 como % com count-up ou "—". */
const Pctn = (v: number | null) => (v == null ? '—' : <AnimatedNumber value={v * 100} suffix="%" decimals={1} />)

const fmtPct = (v: number | null) => (v == null ? '—' : formatPercent(v * 100, 1))

/** Verde só quando há resultado positivo de fato; zero fica neutro (não "comemora" R$ 0,00). */
const corResultado = (v: number) => (v > 0 ? 'var(--status-ok)' : v < 0 ? 'var(--status-danger)' : 'var(--text-primary)')

/** Linha de métrica: rótulo + detalhe à esquerda, valor em mono à direita. A fórmula fica no tooltip. */
function Linha({ label, valor, sub, formula, cor, children }: {
  label: string
  valor: React.ReactNode
  sub?: string
  formula: string
  cor?: string
  children?: React.ReactNode
}) {
  return (
    <div className="metrica-linha" title={formula}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="metrica-rotulo">{label}</p>
        {sub && <p className="metrica-sub">{sub}</p>}
        {children}
      </div>
      <span className="metrica-valor tnum" style={{ color: cor }}>{valor}</span>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <StaggerItem className="card-purion" style={{ padding: '14px 18px 6px', minWidth: 0 }}>
      <p className="kpi-label" style={{ marginBottom: 4 }}>{titulo}</p>
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
        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-primary)', textDecoration: 'underline', textUnderlineOffset: 3,
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

export type KpisPlaybookDados = ReturnType<typeof calcularKpisPlaybook>

/** Calcula os KPIs oficiais uma única vez para a tela (North Star + grupos). */
export function useKpisPlaybook(dias: 30 | 90): KpisPlaybookDados {
  const { vendas, despesas, configuracoes } = usePurionStore()
  const [agora] = useState(() => Date.now())
  return useMemo(() => calcularKpisPlaybook({
    vendas, despesas, dias,
    custoUnitario: configuracoes.custoProdutoUnitario,
    sessoesSite30d: Number(configuracoes.sessoesSite30d ?? 0),
    agora,
  }), [vendas, despesas, dias, configuracoes.custoProdutoUnitario, configuracoes.sessoesSite30d, agora])
}

/** North Star: clientes/parceiros ativos que recompram — a métrica que resume a empresa. */
export function NorthStar({ k }: { k: KpisPlaybookDados }) {
  const nsDelta = k.northStar.total - k.northStar.anterior
  return (
    <div
      className="card-purion north-star"
      title="North Star = clientes (B2C) e parceiros (B2B) com 2 ou mais pedidos pagos e o último pedido nos últimos 90 dias."
    >
      <div className="north-star-icone"><Repeat size={18} /></div>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p className="kpi-label" style={{ color: 'var(--brand-accent)' }}>North Star</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Clientes e parceiros ativos que recompram</p>
        <p className="caption">≥ 2 pedidos pagos, último nos últimos 90 dias</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <AnimatedNumber value={k.northStar.total} mode="odometer" style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }} />
        <span className="tnum" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{k.northStar.b2c} B2C · {k.northStar.b2b} B2B</span>
        <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: nsDelta > 0 ? 'var(--status-ok)' : nsDelta < 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
          {nsDelta > 0 ? '+' : ''}{nsDelta} vs 30 dias atrás
        </span>
      </div>
    </div>
  )
}

/** KPIs oficiais do Playbook 360, agrupados por pergunta de negócio. Passe o mouse para ver a fórmula. */
export function KpisPlaybook({ k, dias }: { k: KpisPlaybookDados; dias: 30 | 90 }) {
  const { configuracoes } = usePurionStore()
  const b2c = k.contribuicao.find((c) => c.canal === 'b2c')!
  const b2b = k.contribuicao.find((c) => c.canal === 'b2b')!

  return (
    <Stagger key={dias} className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
      <Grupo titulo={`Vendas · ${dias} dias`}>
        <Linha label="Receita líquida" valor={R$n(k.receitaLiquida)}
          sub={`itens ${formatCurrency(k.itensPagos)} − desc. ${formatCurrency(k.descontos)} − reemb. ${formatCurrency(k.reembolsos)}`}
          formula="Receita líquida = Σ itens pagos (valor unitário × quantidade) − Σ descontos − Σ reembolsos/estornos do período." />
        <Linha label="Pedidos pagos" valor={<AnimatedNumber value={k.pedidosPagos} />}
          formula="Pedidos pagos = nº de order_id ÚNICOS com status de pagamento 'pago' (order_id = pedido da loja ou id do pedido manual)." />
        <Linha label="Ticket médio" valor={R$n(k.ticketMedio)}
          formula="Ticket médio = receita líquida ÷ pedidos pagos." />
        <Linha label="Conversão do site (30d)" valor={Pctn(k.conversaoSite)}
          sub={`${k.pedidosSite30d} pedidos pagos do site`}
          formula="Conversão do site = pedidos pagos B2C do site nos últimos 30 dias ÷ sessões do site nos últimos 30 dias (informadas manualmente: GA4/Shopify).">
          <EditorSessoes valor={Number(configuracoes.sessoesSite30d ?? 0)} />
        </Linha>
      </Grupo>

      <Grupo titulo={`Margem & aquisição · ${dias} dias`}>
        <Linha label="Contribuição B2C" valor={R$n(b2c.contribuicao)} cor={corResultado(b2c.contribuicao)}
          sub={`margem ${fmtPct(b2c.margem)} · mídia+creators+frete ${formatCurrency(b2c.custosVariaveis)}`}
          formula="Contribuição B2C = receita líquida B2C − CMV (custo unitário × unidades) − taxas de pagamento − mídia paga (Meta/Google) − creators/UGC − logística rateada por unidades." />
        <Linha label="Contribuição B2B" valor={R$n(b2b.contribuicao)} cor={corResultado(b2b.contribuicao)}
          sub={`margem ${fmtPct(b2b.margem)} · CMV ${formatCurrency(b2b.cmv)}`}
          formula="Contribuição B2B = receita líquida B2B − CMV (custo unitário × unidades) − taxas de pagamento − logística rateada por unidades." />
        <Linha label="CAC novos compradores" valor={R$n(k.cac)}
          sub={`${formatCurrency(k.investimentoAquisicao)} ÷ ${k.novosCompradores} novos`}
          formula="CAC = (mídia paga Meta/Google + creators/UGC do período) ÷ clientes cuja 1ª compra paga ocorreu no período." />
      </Grupo>

      <Grupo titulo="Retenção & parceiros">
        <Linha label="Recompra 60d / 90d" valor={`${fmtPct(k.recompra60.taxa)} / ${fmtPct(k.recompra90.taxa)}`}
          sub={`${k.recompra60.recompraram}/${k.recompra60.base} · ${k.recompra90.recompraram}/${k.recompra90.base} clientes`}
          formula="Taxa de recompra N dias = clientes com 1ª compra há ≥ N dias que fizeram a 2ª compra paga em até N dias ÷ clientes dessa coorte." />
        <Linha label="Tempo até 2ª compra" valor={k.diasAte2aCompra == null ? '—' : `${formatNumber(k.diasAte2aCompra)} dias`}
          sub="mediana"
          formula="Tempo até 2ª compra = mediana de dias entre a 1ª e a 2ª compra paga de cada cliente que recomprou." />
        <Linha label="Satisfação pós-entrega" valor={k.satisfacao.media == null ? '—' : `${formatNumber(k.satisfacao.media, 1)} / 5`}
          sub={`${k.satisfacao.respostas} resposta${k.satisfacao.respostas !== 1 ? 's' : ''}`}
          formula="Satisfação pós-entrega = média das notas 1-5 registradas no Pós-venda no período." />
        <Linha label="Giro B2B (30d)" valor={k.giroB2B30d.porParceiro == null ? '—' : `${formatNumber(k.giroB2B30d.porParceiro, 1)} un/parceiro`}
          sub={`${k.giroB2B30d.unidades} un · ${k.giroB2B30d.parceiros} parceiros ativos`}
          formula="Giro B2B 30d = unidades B2B pagas nos últimos 30 dias ÷ parceiros B2B com pedido pago nos últimos 30 dias." />
      </Grupo>
    </Stagger>
  )
}
