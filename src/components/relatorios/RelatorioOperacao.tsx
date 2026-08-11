'use client'

import { useMemo } from 'react'
import { Package, Factory, ListChecks, AlertTriangle, Truck } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useEstoque } from '@/hooks/useEstoque'
import { WidgetContador, WidgetBarras, WidgetDonut, WidgetLista, type ItemLista } from '@/components/dashboard/widgets'
import { inicioPeriodo, type Periodo } from '@/components/dashboard/widgets/widgetHelpers'
import { ESTAGIOS_LOTE, normalizarStatusLote } from '@/components/producao/producaoHelpers'
import { formatarMoeda } from '@/lib/calculos'

interface Props { periodo: Periodo }

const STATUS_TAREFA_LABEL: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada', bloqueada: 'Bloqueada',
}
const STATUS_TAREFA_COR: Record<string, string> = {
  pendente: '#B8B8B8', em_andamento: '#5B8FE8', concluida: '#4CAF7A', cancelada: '#E85238', bloqueada: '#E8A838',
}

export function RelatorioOperacao({ periodo }: Props) {
  useEstoque()
  const { estoqueProduto, lotes, estoque, tarefas, vendas } = usePurionStore()

  const lotesAtivos = useMemo(() => lotes.filter((l) => !['concluido', 'reprovado'].includes(normalizarStatusLote(l.status))).length, [lotes])
  const tarefasPendentes = useMemo(() => tarefas.filter((t) => t.status === 'pendente' || t.status === 'em_andamento').length, [tarefas])
  const insumosAlerta = useMemo(() => estoque.filter((i) => i.quantidadeAtual < i.quantidadeMinima).length, [estoque])

  const lotesPorEstagio = useMemo(() => ESTAGIOS_LOTE.map((e) => ({
    name: e.label, value: lotes.filter((l) => normalizarStatusLote(l.status) === e.id).length, cor: e.cor,
  })).filter((d) => d.value > 0), [lotes])

  const tarefasPorStatus = useMemo(() => {
    const statusList = ['pendente', 'em_andamento', 'bloqueada', 'concluida']
    return statusList
      .map((s) => ({ name: STATUS_TAREFA_LABEL[s], value: tarefas.filter((t) => t.status === s).length, cor: STATUS_TAREFA_COR[s] }))
      .filter((d) => d.value > 0)
  }, [tarefas])

  const pedidosADespachar: ItemLista[] = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return vendas
      .filter((v) => v.statusPagamento === 'pago' && !['postado', 'em_transito', 'entregue', 'devolvido'].includes(v.statusEntrega) && new Date(v.dataVenda) >= inicio)
      .slice(0, 6)
      .map((v) => ({ id: v.id, titulo: v.clienteNome || 'Cliente', subtitulo: `${v.quantidade} frasco${v.quantidade !== 1 ? 's' : ''}`, valor: formatarMoeda(v.valorTotal ?? v.valorLiquido), cor: '#E8A838' }))
  }, [vendas, periodo])

  return (
    <div className="flex flex-col gap-4">
      <div className="cards-gap kpi-grid-mobile" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <WidgetContador label="Estoque de prontos" icon={Package} destaque valor={estoqueProduto ? String(estoqueProduto.quantidadeAtual) : '—'} href="/producao" />
        <WidgetContador label="Lotes ativos" icon={Factory} valor={String(lotesAtivos)} href="/producao" />
        <WidgetContador label="Tarefas pendentes" icon={ListChecks} valor={String(tarefasPendentes)} href="/tarefas" />
        <WidgetContador label="Insumos em alerta" icon={AlertTriangle} alerta={insumosAlerta > 0} valor={String(insumosAlerta)} href="/producao" />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <WidgetBarras title="Lotes por estágio" icon={Factory} data={lotesPorEstagio} href="/producao" />
        </div>
        <WidgetDonut title="Tarefas por status" icon={ListChecks} data={tarefasPorStatus} href="/tarefas" />
      </div>

      <div className="cards-gap grid-mobile-1" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
        <WidgetLista title="Pedidos a despachar" icon={Truck} items={pedidosADespachar} href="/vendas" emptyMessage="Nenhum pedido pago aguardando despacho" limite={6} />
      </div>
    </div>
  )
}
