'use client'

import { useMemo, useState } from 'react'
import { usePurionStore } from '@/store'
import type { Venda, PerfilUsuario, StatusPagamentoVenda, StatusEntregaVenda } from '@/store'
import { useVendas, type NovaVendaManual } from '@/hooks/useVendas'
import { SelectBuscavel } from '@/components/ui/SelectBuscavel'

const VALOR_UNITARIO_B2B_PADRAO = 60
const QUANTIDADE_PADRAO_LOTE = 10

function nowLocalInput() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function ModalVendaB2B({ venda, onFechar }: { venda?: Venda; onFechar: () => void }) {
  const { leads } = usePurionStore()
  const { criarVenda, atualizarVenda } = useVendas()
  const editando = !!venda

  const [leadId, setLeadId] = useState<string | null>(venda?.leadId ?? null)
  const [form, setForm] = useState({
    clienteNome: venda?.clienteNome ?? '',
    clienteTelefone: venda?.clienteTelefone ?? '',
    cidade: venda?.cidade ?? '',
    quantidade: String(venda?.quantidade ?? QUANTIDADE_PADRAO_LOTE),
    valorUnitario: String(venda?.valorUnitario ?? VALOR_UNITARIO_B2B_PADRAO),
    desconto: String(venda?.desconto ?? 0),
    metodoPagamento: venda?.metodoPagamento ?? 'pix',
    parcelas: String(venda?.parcelas ?? 1),
    statusPagamento: (venda?.statusPagamento ?? 'pendente') as StatusPagamentoVenda,
    statusEntrega: (venda?.statusEntrega ?? 'aguardando') as StatusEntregaVenda,
    transportadora: venda?.transportadora ?? '',
    codigoRastreio: venda?.codigoRastreio ?? '',
    dataVenda: venda?.dataVenda ? venda.dataVenda.slice(0, 16) : nowLocalInput(),
    responsavel: (venda?.responsavel ?? 'matheus') as PerfilUsuario,
    observacoes: venda?.observacoes ?? '',
  })
  const [salvando, setSalvando] = useState(false)

  const opcoesLeads = useMemo(
    () => leads.map((l) => ({ value: l.id, label: l.nomeEmpresa, sublabel: [l.cidade, l.telefone].filter(Boolean).join(' · ') })),
    [leads]
  )

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(form.quantidade) || 0
    const unit = parseFloat(form.valorUnitario) || 0
    const desc = parseFloat(form.desconto) || 0
    return Math.max(0, qtd * unit - desc)
  }, [form.quantidade, form.valorUnitario, form.desconto])

  function set<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function selecionarLead(id: string | null) {
    setLeadId(id)
    if (!id) return
    const lead = leads.find((l) => l.id === id)
    if (lead) setForm((f) => ({ ...f, clienteNome: lead.nomeEmpresa, clienteTelefone: lead.telefone, cidade: lead.cidade }))
  }

  async function salvar() {
    if (!form.clienteNome.trim() || salvando) return
    setSalvando(true)

    const payload: NovaVendaManual = {
      canal: 'b2b',
      clienteNome: form.clienteNome.trim(),
      clienteTelefone: form.clienteTelefone || undefined,
      leadId,
      cidade: form.cidade || undefined,
      quantidade: parseInt(form.quantidade, 10) || QUANTIDADE_PADRAO_LOTE,
      valorUnitario: parseFloat(form.valorUnitario) || 0,
      desconto: parseFloat(form.desconto) || 0,
      valorTotal,
      metodoPagamento: form.metodoPagamento,
      parcelas: parseInt(form.parcelas, 10) || 1,
      statusPagamento: form.statusPagamento,
      statusEntrega: form.statusEntrega,
      transportadora: form.transportadora || undefined,
      codigoRastreio: form.codigoRastreio || undefined,
      dataVenda: new Date(form.dataVenda).toISOString(),
      responsavel: form.responsavel,
      observacoes: form.observacoes || undefined,
      produto: `Lote PURION GT (${form.quantidade} un.)`,
    }

    if (editando && venda) {
      await atualizarVenda(venda.id, payload)
    } else {
      await criarVenda(payload)
    }
    setSalvando(false)
    onFechar()
  }

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal-container max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editando ? 'Editar venda B2B' : 'Nova venda B2B (lote)'}</h3>
        </div>

        <div className="p-7 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label-purion">Estética parceira</label>
            <SelectBuscavel
              opcoes={opcoesLeads}
              valor={leadId}
              onSelecionar={selecionarLead}
              placeholder="Buscar estética cadastrada no CRM..."
              vazio="Nenhuma estética encontrada"
            />
          </div>
          <div className="col-span-2">
            <label className="label-purion">Nome do cliente/estética*</label>
            <input className="input-purion" value={form.clienteNome} onChange={(e) => set('clienteNome', e.target.value)} placeholder="Nome da estética" />
          </div>
          <div>
            <label className="label-purion">Telefone</label>
            <input className="input-purion" value={form.clienteTelefone} onChange={(e) => set('clienteTelefone', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Cidade</label>
            <input className="input-purion" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </div>

          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Lote</p></div>
          <div>
            <label className="label-purion">Quantidade (unidades)</label>
            <input type="number" min={1} className="input-purion" value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Valor unitário B2B (R$)</label>
            <input type="number" step="0.01" className="input-purion" value={form.valorUnitario} onChange={(e) => set('valorUnitario', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Desconto (R$)</label>
            <input type="number" step="0.01" className="input-purion" value={form.desconto} onChange={(e) => set('desconto', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Valor total</label>
            <div className="input-purion font-semibold" style={{ color: '#C9A84C' }}>
              {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>

          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Pagamento e logística</p></div>
          <div>
            <label className="label-purion">Método</label>
            <select className="select-purion" value={form.metodoPagamento} onChange={(e) => set('metodoPagamento', e.target.value)}>
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>
          <div>
            <label className="label-purion">Parcelas</label>
            <input type="number" min={1} className="input-purion" value={form.parcelas} onChange={(e) => set('parcelas', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Status do pagamento</label>
            <select className="select-purion" value={form.statusPagamento} onChange={(e) => set('statusPagamento', e.target.value as StatusPagamentoVenda)}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="estornado">Estornado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="label-purion">Status de entrega</label>
            <select className="select-purion" value={form.statusEntrega} onChange={(e) => set('statusEntrega', e.target.value as StatusEntregaVenda)}>
              <option value="aguardando">Aguardando</option>
              <option value="separando">Separando</option>
              <option value="postado">Postado</option>
              <option value="em_transito">Em trânsito</option>
              <option value="entregue">Entregue</option>
              <option value="devolvido">Devolvido</option>
            </select>
          </div>
          <div>
            <label className="label-purion">Transportadora</label>
            <input className="input-purion" value={form.transportadora} onChange={(e) => set('transportadora', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Código de rastreio</label>
            <input className="input-purion" value={form.codigoRastreio} onChange={(e) => set('codigoRastreio', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Data e hora da venda</label>
            <input type="datetime-local" className="input-purion" value={form.dataVenda} onChange={(e) => set('dataVenda', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Responsável</label>
            <select className="select-purion" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value as PerfilUsuario)}>
              <option value="matheus">Matheus</option>
              <option value="joao">João</option>
              <option value="gabriel">Gabriel</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-purion">Observações</label>
            <textarea rows={2} className="textarea-purion" value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onFechar} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={salvar} disabled={!form.clienteNome.trim() || salvando} className="btn btn-primary btn-sm">
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Registrar venda B2B'}
          </button>
        </div>
      </div>
    </div>
  )
}
