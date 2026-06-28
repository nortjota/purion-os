'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePurionStore } from '@/store'
import type { Venda, PerfilUsuario, StatusPagamentoVenda, StatusEntregaVenda } from '@/store'
import { useVendas, type NovaVendaManual } from '@/hooks/useVendas'
import { SelectBuscavel } from '@/components/ui/SelectBuscavel'

const VALOR_UNITARIO_PADRAO = 119.90

function nowLocalInput() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function ModalVendaB2C({ venda, onFechar }: { venda?: Venda; onFechar: () => void }) {
  const { creators } = usePurionStore()
  const { criarVenda, atualizarVenda } = useVendas()
  const editando = !!venda

  const [form, setForm] = useState({
    clienteNome: venda?.clienteNome ?? '',
    clienteTelefone: venda?.clienteTelefone ?? '',
    clienteEmail: venda?.clienteEmail ?? '',
    clienteDocumento: venda?.clienteDocumento ?? '',
    cep: venda?.cep ?? '',
    endereco: venda?.endereco ?? '',
    numero: venda?.numero ?? '',
    complemento: venda?.complemento ?? '',
    bairro: venda?.bairro ?? '',
    cidade: venda?.cidade ?? '',
    uf: venda?.uf ?? '',
    quantidade: String(venda?.quantidade ?? 1),
    valorUnitario: String(venda?.valorUnitario ?? VALOR_UNITARIO_PADRAO),
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
  const [afiliadoCreatorId, setAfiliadoCreatorId] = useState<string | null>(venda?.afiliadoCreatorId ?? null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(form.quantidade) || 0
    const unit = parseFloat(form.valorUnitario) || 0
    const desc = parseFloat(form.desconto) || 0
    return Math.max(0, qtd * unit - desc)
  }, [form.quantidade, form.valorUnitario, form.desconto])

  const opcoesAfiliados = useMemo(
    () => creators.filter((c) => c.codigoDesconto).map((c) => ({ value: c.id, label: c.nome, sublabel: c.codigoDesconto })),
    [creators]
  )

  useEffect(() => {
    const cepLimpo = form.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) return
        setForm((f) => ({ ...f, endereco: d.logradouro || f.endereco, bairro: d.bairro || f.bairro, cidade: d.localidade || f.cidade, uf: d.uf || f.uf }))
      })
      .catch(() => {})
      .finally(() => setBuscandoCep(false))
  }, [form.cep])

  function set<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function salvar() {
    if (!form.clienteNome.trim() || salvando) return
    setSalvando(true)

    const payload: NovaVendaManual = {
      canal: 'b2c',
      clienteNome: form.clienteNome.trim(),
      clienteTelefone: form.clienteTelefone || undefined,
      clienteEmail: form.clienteEmail || undefined,
      clienteDocumento: form.clienteDocumento || undefined,
      cep: form.cep || undefined,
      endereco: form.endereco || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      uf: form.uf || undefined,
      quantidade: parseInt(form.quantidade, 10) || 1,
      valorUnitario: parseFloat(form.valorUnitario) || 0,
      desconto: parseFloat(form.desconto) || 0,
      valorTotal,
      metodoPagamento: form.metodoPagamento,
      parcelas: parseInt(form.parcelas, 10) || 1,
      statusPagamento: form.statusPagamento,
      statusEntrega: form.statusEntrega,
      transportadora: form.transportadora || undefined,
      codigoRastreio: form.codigoRastreio || undefined,
      afiliadoCreatorId,
      dataVenda: new Date(form.dataVenda).toISOString(),
      responsavel: form.responsavel,
      observacoes: form.observacoes || undefined,
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
      <div className="modal-container max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editando ? 'Editar venda' : 'Nova venda B2C'}</h3>
        </div>

        <div className="p-7 grid grid-cols-2 gap-3">
          {/* Cliente */}
          <div className="col-span-2"><p className="kpi-label mb-1">Cliente</p></div>
          <div className="col-span-2">
            <label className="label-purion">Nome*</label>
            <input className="input-purion" value={form.clienteNome} onChange={(e) => set('clienteNome', e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <label className="label-purion">Telefone</label>
            <input className="input-purion" value={form.clienteTelefone} onChange={(e) => set('clienteTelefone', e.target.value)} placeholder="(61) 99999-9999" />
          </div>
          <div>
            <label className="label-purion">E-mail</label>
            <input className="input-purion" value={form.clienteEmail} onChange={(e) => set('clienteEmail', e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="col-span-2">
            <label className="label-purion">CPF (opcional)</label>
            <input className="input-purion" value={form.clienteDocumento} onChange={(e) => set('clienteDocumento', e.target.value)} placeholder="000.000.000-00" />
          </div>

          {/* Endereço */}
          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Endereço de entrega</p></div>
          <div>
            <label className="label-purion">CEP {buscandoCep && <span className="caption">buscando...</span>}</label>
            <input className="input-purion" value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <label className="label-purion">Número</label>
            <input className="input-purion" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label-purion">Endereço</label>
            <input className="input-purion" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, avenida..." />
          </div>
          <div>
            <label className="label-purion">Complemento</label>
            <input className="input-purion" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Bairro</label>
            <input className="input-purion" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Cidade</label>
            <input className="input-purion" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">UF</label>
            <input className="input-purion" maxLength={2} value={form.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} placeholder="DF" />
          </div>

          {/* Produto */}
          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Produto</p></div>
          <div>
            <label className="label-purion">Quantidade</label>
            <input type="number" min={1} className="input-purion" value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} />
          </div>
          <div>
            <label className="label-purion">Valor unitário (R$)</label>
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

          {/* Pagamento */}
          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Pagamento</p></div>
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
            <label className="label-purion">Data e hora da venda</label>
            <input type="datetime-local" className="input-purion" value={form.dataVenda} onChange={(e) => set('dataVenda', e.target.value)} />
          </div>

          {/* Logística */}
          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Logística</p></div>
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
            <input className="input-purion" value={form.transportadora} onChange={(e) => set('transportadora', e.target.value)} placeholder="Correios, motoboy..." />
          </div>
          <div className="col-span-2">
            <label className="label-purion">Código de rastreio</label>
            <input className="input-purion" value={form.codigoRastreio} onChange={(e) => set('codigoRastreio', e.target.value)} />
          </div>

          {/* Afiliado + Responsável */}
          <div className="col-span-2 mt-2"><p className="kpi-label mb-1">Afiliado e responsável</p></div>
          <div className="col-span-2">
            <label className="label-purion">Afiliado (opcional)</label>
            <SelectBuscavel
              opcoes={opcoesAfiliados}
              valor={afiliadoCreatorId}
              onSelecionar={setAfiliadoCreatorId}
              placeholder="Buscar creator pelo nome ou código..."
              vazio="Nenhum creator com código encontrado"
            />
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
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Registrar venda'}
          </button>
        </div>
      </div>
    </div>
  )
}
