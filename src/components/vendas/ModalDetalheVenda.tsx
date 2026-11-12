'use client'

import Link from 'next/link'

import { X, User, MapPin, Package, CreditCard, Truck, Users, FileText, Building2, TrendingUp, Check } from 'lucide-react'
import type { Venda } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_BADGE,
  STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE,
  METODO_PAGAMENTO_LABEL, fmtR,
} from '@/lib/vendas-helpers'
import { usePurionStore } from '@/store'
import { useCatalogoSKU } from '@/hooks/useCatalogoSKU'
import { contribuicaoVenda, frascosDaVenda, codigoSkuDaVenda } from '@/lib/escadaProdutos'

interface EtapaTimeline { label: string; data: string | null; feita: boolean }

function Timeline({ etapas }: { etapas: EtapaTimeline[] }) {
  return (
    <div className="flex items-center" style={{ overflowX: 'auto' }}>
      {etapas.map((e, i) => (
        <div key={e.label} className="flex items-center" style={{ flex: i < etapas.length - 1 ? 1 : undefined, minWidth: 64 }}>
          <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: e.feita ? 'var(--status-ok)' : 'var(--bg-surface-2)',
                border: `1px solid ${e.feita ? '#8FD14F' : 'var(--border)'}`,
              }}
            >
              {e.feita && <Check size={11} color="#0B0B0B" />}
            </div>
            <span className="text-[10px] mt-1 text-center" style={{ color: e.feita ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: e.feita ? 600 : 400 }}>
              {e.label}
            </span>
            <span className="text-[9px] text-[#8A8A8A]">{e.data ? formatarDataBR(e.data.slice(0, 10)) : '—'}</span>
          </div>
          {i < etapas.length - 1 && (
            <div style={{ flex: 1, height: 1, background: e.feita ? 'var(--status-ok)' : 'var(--border)', marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Secao({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-[var(--brand-accent)] opacity-70" />
        <h4 className="text-[11px] font-bold text-[#B8B8B8] uppercase tracking-wider">{titulo}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Campo({ label, valor, destaque }: { label: string; valor: React.ReactNode; destaque?: boolean }) {
  if (!valor && valor !== 0) return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] text-[#B8B8B8] shrink-0">{label}</span>
      <span
        className="text-[12px] text-right break-all"
        style={{
          color: destaque ? 'var(--brand-accent)' : 'var(--text-primary)',
          fontWeight: destaque ? 700 : 500,
        }}
      >
        {valor}
      </span>
    </div>
  )
}

interface Props {
  venda: Venda
  onFechar: () => void
}

export function ModalDetalheVenda({ venda: v, onFechar }: Props) {
  const { creators, leads, configuracoes } = usePurionStore()
  const { porCodigo } = useCatalogoSKU()
  const creator = v.afiliadoCreatorId ? creators.find((c) => c.id === v.afiliadoCreatorId) : null
  const lead = v.leadId ? leads.find((l) => l.id === v.leadId) : null

  const endereco = [v.endereco, v.numero, v.complemento].filter(Boolean).join(', ')
  const enderecoCompleto = [endereco, v.bairro, v.cidade && v.uf ? `${v.cidade}/${v.uf}` : v.cidade ?? v.uf].filter(Boolean).join(' — ')

  // Contribuição = valor − custo de produção do SKU × qtd − custos variáveis proporcionais ao valor
  const sku = porCodigo(codigoSkuDaVenda(v))
  const frascos = frascosDaVenda(v)
  const contrib = contribuicaoVenda(v, v.skuCodigo ? sku : undefined, configuracoes)

  const etapasTimeline: EtapaTimeline[] = [
    { label: 'Criado',     data: v.createdAt, feita: true },
    { label: 'Pago',       data: v.statusPagamento === 'pago' ? v.updatedAt : null, feita: v.statusPagamento === 'pago' },
    { label: 'Despachado', data: v.dataEnvio, feita: !!v.dataEnvio },
    { label: 'Entregue',   data: v.dataEntregaRealizada, feita: !!v.dataEntregaRealizada },
  ]

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3
              className="font-black text-[var(--text-primary)] text-base"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {v.clienteNome || 'Detalhe da Venda'}
            </h3>
            <p className="text-xs text-[#B8B8B8] mt-0.5">
              <span className="text-[var(--text-primary)] font-semibold">{v.canal.toUpperCase()}</span>
              {v.pedidoAppmax && ` · Appmax #${v.pedidoAppmax}`}
              {' '}· {formatarDataBR(v.dataVenda.slice(0, 10))}
              {' '}· <Link href={`/clientes?venda=${v.id}`} onClick={onFechar} className="link-limpar" style={{ padding: 0 }}>Ficha do cliente</Link>
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg hover:bg-[#2A2C2B] text-[#B8B8B8] hover:text-[var(--text-primary)] transition-colors"
           aria-label="Fechar" title="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>

          {/* TIMELINE */}
          <div style={{ padding: '4px 0 8px' }}>
            <Timeline etapas={etapasTimeline} />
          </div>

          {/* CLIENTE */}
          <Secao icon={User} titulo="Cliente">
            <Campo label="Nome" valor={v.clienteNome || '—'} />
            <Campo label="Telefone" valor={v.clienteTelefone || null} />
            <Campo label="E-mail" valor={v.clienteEmail || null} />
            <Campo label="Documento" valor={v.clienteDocumento || null} />
          </Secao>

          {/* ENDEREÇO */}
          {(v.endereco || v.cidade) && (
            <Secao icon={MapPin} titulo="Endereço">
              {enderecoCompleto && <Campo label="Endereço" valor={enderecoCompleto} />}
              {v.cep && <Campo label="CEP" valor={v.cep} />}
            </Secao>
          )}

          {/* PRODUTO */}
          <Secao icon={Package} titulo="Produto">
            <Campo label="Produto" valor={v.produto || '—'} />
            {sku && <Campo label="SKU" valor={sku.nome} />}
            <Campo label="Quantidade (pedido)" valor={v.quantidade} />
            <Campo label="Frascos do estoque" valor={frascos === 0 ? '0 (amostra)' : frascos} />
            {v.valorUnitario != null && <Campo label="Valor Unitário" valor={fmtR(v.valorUnitario)} />}
            {v.desconto > 0 && <Campo label="Desconto" valor={fmtR(v.desconto)} />}
            <Campo label="Valor Total" valor={fmtR(v.valorTotal ?? v.valorLiquido)} destaque />
          </Secao>

          {/* CONTRIBUIÇÃO */}
          <Secao icon={TrendingUp} titulo="Contribuição">
            {contrib ? (
              <>
                <Campo label="Valor da venda" valor={fmtR(contrib.valor)} />
                <Campo label="Custo de produção" valor={`− ${fmtR(contrib.custoProducao)}`} />
                <Campo label="Custos variáveis (proporcionais)" valor={`− ${fmtR(contrib.custosVariaveis)}`} />
                <Campo label="Contribuição" valor={fmtR(contrib.contribuicao)} destaque />
                <p className="text-[11px] text-[#B8B8B8]">
                  Preço − custo de produção do SKU − custos variáveis (R$ {(configuracoes.custosVariaveis ?? 28).toFixed(2).replace('.', ',')} por frasco a {fmtR(configuracoes.precoB2C)}, proporcional ao valor).
                  {contrib.valor > 0 && ` Margem de contribuição: ${((contrib.contribuicao / contrib.valor) * 100).toFixed(0)}%.`}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-[var(--status-warning)]">Custo do SKU a validar (Discovery) — contribuição indisponível.</p>
            )}
          </Secao>

          {/* PAGAMENTO */}
          <Secao icon={CreditCard} titulo="Pagamento">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] text-[#B8B8B8]">Status</span>
              <span className={`badge ${STATUS_PAGAMENTO_BADGE[v.statusPagamento]}`}>
                {STATUS_PAGAMENTO_LABEL[v.statusPagamento]}
              </span>
            </div>
            <Campo label="Método" valor={METODO_PAGAMENTO_LABEL[v.metodoPagamento] ?? v.metodoPagamento} />
            {v.parcelas > 1 && <Campo label="Parcelas" valor={`${v.parcelas}×`} />}
            {v.taxa > 0 && <Campo label="Taxa" valor={fmtR(v.taxa)} />}
            {v.valorLiquido !== v.valorBruto && <Campo label="Valor Líquido" valor={fmtR(v.valorLiquido)} />}
          </Secao>

          {/* LOGÍSTICA */}
          <Secao icon={Truck} titulo="Logística">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] text-[#B8B8B8]">Entrega</span>
              <span className={`badge ${STATUS_ENTREGA_BADGE[v.statusEntrega]}`}>
                {STATUS_ENTREGA_LABEL[v.statusEntrega]}
              </span>
            </div>
            {v.transportadora && <Campo label="Transportadora" valor={v.transportadora} />}
            {v.codigoRastreio && <Campo label="Rastreio" valor={v.codigoRastreio} />}
            {v.dataEnvio && <Campo label="Envio" valor={formatarDataBR(v.dataEnvio.slice(0, 10))} />}
            {v.dataEntregaPrevista && <Campo label="Prev. Entrega" valor={formatarDataBR(v.dataEntregaPrevista.slice(0, 10))} />}
            {v.dataEntregaRealizada && <Campo label="Entregue em" valor={formatarDataBR(v.dataEntregaRealizada.slice(0, 10))} />}
          </Secao>

          {/* VÍNCULO B2B */}
          {lead && (
            <Secao icon={Building2} titulo="Estética parceira (CRM)">
              <Campo label="Estética" valor={lead.nomeEmpresa} />
              <Campo label="Cidade" valor={`${lead.cidade} · ${lead.regiao}`} />
              <Campo label="Tier" valor={lead.tier} />
            </Secao>
          )}

          {/* AFILIADO */}
          {(creator || v.afiliadoCodigo) && (
            <Secao icon={Users} titulo="Afiliado">
              {creator && <Campo label="Creator" valor={creator.nome} />}
              {v.afiliadoCodigo && <Campo label="Código" valor={v.afiliadoCodigo} />}
            </Secao>
          )}

          {/* OBSERVAÇÕES */}
          {(v.observacoes || v.responsavel) && (
            <Secao icon={FileText} titulo="Observações">
              {v.responsavel && <Campo label="Responsável" valor={v.responsavel} />}
              {v.observacoes && (
                <p className="text-[12px] text-[var(--text-secondary)] bg-[var(--bg-surface-2)] rounded-lg p-3 leading-relaxed">
                  {v.observacoes}
                </p>
              )}
            </Secao>
          )}
        </div>
      </div>
    </div>
  )
}
