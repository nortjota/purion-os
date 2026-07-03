'use client'

import { X, User, MapPin, Package, CreditCard, Truck, Users, FileText } from 'lucide-react'
import type { Venda } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import {
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_BADGE,
  STATUS_ENTREGA_LABEL, STATUS_ENTREGA_BADGE,
  METODO_PAGAMENTO_LABEL, fmtR,
} from '@/lib/vendas-helpers'
import { usePurionStore } from '@/store'

function Secao({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-[var(--gold)] opacity-70" />
        <h4 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{titulo}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Campo({ label, valor, destaque }: { label: string; valor: React.ReactNode; destaque?: boolean }) {
  if (!valor && valor !== 0) return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] text-[#6B6B6B] shrink-0">{label}</span>
      <span
        className="text-[12px] text-right break-all"
        style={{
          color: destaque ? '#C9A84C' : 'var(--text-primary)',
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
  const { creators } = usePurionStore()
  const creator = v.afiliadoCreatorId ? creators.find((c) => c.id === v.afiliadoCreatorId) : null

  const endereco = [v.endereco, v.numero, v.complemento].filter(Boolean).join(', ')
  const enderecoCompleto = [endereco, v.bairro, v.cidade && v.uf ? `${v.cidade}/${v.uf}` : v.cidade ?? v.uf].filter(Boolean).join(' — ')

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3
              className="font-black text-[var(--text-primary)] text-base"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {v.clienteNome || 'Detalhe da Venda'}
            </h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              <span className="text-[#C9A84C] font-semibold">{v.canal.toUpperCase()}</span>
              {v.pedidoAppmax && ` · Appmax #${v.pedidoAppmax}`}
              {' '}· {formatarDataBR(v.dataVenda.slice(0, 10))}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#6B6B6B] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>

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
            <Campo label="Quantidade" valor={v.quantidade} />
            {v.valorUnitario != null && <Campo label="Valor Unitário" valor={fmtR(v.valorUnitario)} />}
            {v.desconto > 0 && <Campo label="Desconto" valor={fmtR(v.desconto)} />}
            <Campo label="Valor Total" valor={fmtR(v.valorTotal ?? v.valorLiquido)} destaque />
          </Secao>

          {/* PAGAMENTO */}
          <Secao icon={CreditCard} titulo="Pagamento">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] text-[#6B6B6B]">Status</span>
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
              <span className="text-[11px] text-[#6B6B6B]">Entrega</span>
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
