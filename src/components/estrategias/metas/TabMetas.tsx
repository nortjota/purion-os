'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import {
  useEstrategiaRoadmap, useMetricasCRM,
  type EstrategiaObjetivo, type EstrategiaResultado, type StatusObjetivo,
} from '@/hooks/useEstrategia'
import type { PerfilUsuario } from '@/store'
import { RESPONSAVEIS } from '@/components/calendario/calendarioHelpers'
import { STATUS_OBJETIVO_LABEL, STATUS_OBJETIVO_OPCOES } from './metasHelpers'
import { MetaListaView, type GrupoMetas } from './MetaListaView'
import { MetaPainelView } from './MetaPainelView'
import { ModalObjetivo, type DadosObjetivo } from './ModalObjetivo'
import { ModalResultado, type DadosResultado } from './ModalResultado'
import { DetalheObjetivo } from './DetalheObjetivo'

type Visao = 'lista' | 'painel'
const VISAO_STORAGE_KEY = 'purion:view:metas'

const TABS = [
  { id: 'lista',  label: 'Lista' },
  { id: 'painel', label: 'Painel' },
]

type ModalObjetivoState =
  | { modo: 'novo'; parentId: string | null }
  | { modo: 'editar'; objetivo: EstrategiaObjetivo }

type ModalResultadoState =
  | { modo: 'novo'; objetivoId: string; objetivoTitulo: string }
  | { modo: 'editar'; resultado: EstrategiaResultado; objetivoTitulo: string }

export function TabMetas() {
  const isMobile = useMobile()
  const {
    fases, objetivos, resultados, carregando,
    criarObjetivo, atualizarObjetivo, removerObjetivo, reverterStatusAutomatico,
    criarResultado, atualizarResultado, removerResultado,
  } = useEstrategiaRoadmap()
  const metricas = useMetricasCRM()
  const tarefas = usePurionStore((s) => s.tarefas)

  const [visao, setVisao] = useState<Visao>(() => {
    if (typeof window === 'undefined') return 'lista'
    return (localStorage.getItem(VISAO_STORAGE_KEY) as Visao) || 'lista'
  })
  function mudarVisao(id: string) {
    setVisao(id as Visao)
    if (typeof window !== 'undefined') localStorage.setItem(VISAO_STORAGE_KEY, id)
  }

  const [filtroStatus, setFiltroStatus] = useState<StatusObjetivo | 'todos'>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<PerfilUsuario | 'todos'>('todos')

  const [modalObjetivo, setModalObjetivo] = useState<ModalObjetivoState | null>(null)
  const [modalResultado, setModalResultado] = useState<ModalResultadoState | null>(null)
  const [objetivoDetalheId, setObjetivoDetalheId] = useState<string | null>(null)

  const objetivosTopo = useMemo(() => {
    return objetivos
      .filter((o) => !o.parentId)
      .filter((o) => filtroStatus === 'todos' || o.status === filtroStatus)
      .filter((o) => filtroResponsavel === 'todos' || o.responsavel === filtroResponsavel)
  }, [objetivos, filtroStatus, filtroResponsavel])

  const grupos: GrupoMetas[] = useMemo(() => {
    const ordenadas = [...fases].sort((a, b) => a.ordem - b.ordem)
    const porFase: GrupoMetas[] = ordenadas.map((f) => ({
      id: f.id,
      label: f.nome,
      objetivos: objetivosTopo.filter((o) => o.faseId === f.id),
    }))
    const semFase = objetivosTopo.filter((o) => !o.faseId || !ordenadas.some((f) => f.id === o.faseId))
    if (semFase.length > 0) porFase.push({ id: 'sem-fase', label: 'Outras metas', objetivos: semFase })
    return porFase
  }, [fases, objetivosTopo])

  const objetivoDetalhe = objetivoDetalheId ? objetivos.find((o) => o.id === objetivoDetalheId) ?? null : null

  function abrirNovaMeta(parentId: string | null) {
    setModalObjetivo({ modo: 'novo', parentId })
  }
  function abrirEditarMeta(o: EstrategiaObjetivo) {
    setModalObjetivo({ modo: 'editar', objetivo: o })
  }

  async function salvarObjetivo(dados: DadosObjetivo) {
    if (modalObjetivo?.modo === 'editar') {
      await atualizarObjetivo(modalObjetivo.objetivo.id, dados)
    } else {
      await criarObjetivo({ ...dados, parentId: dados.parentId ?? (modalObjetivo?.modo === 'novo' ? modalObjetivo.parentId : null) })
    }
    setModalObjetivo(null)
  }

  function confirmarExcluirObjetivo(o: EstrategiaObjetivo) {
    if (!window.confirm(`Excluir a meta "${o.titulo}"? Sub-metas e resultados-chave vinculados também serão removidos.`)) return
    removerObjetivo(o.id)
    setModalObjetivo(null)
    if (objetivoDetalheId === o.id) setObjetivoDetalheId(null)
  }

  function abrirNovoResultado(objetivoId: string) {
    const objetivoTitulo = objetivos.find((o) => o.id === objetivoId)?.titulo ?? ''
    setModalResultado({ modo: 'novo', objetivoId, objetivoTitulo })
  }
  function abrirEditarResultado(r: EstrategiaResultado, objetivoTitulo: string) {
    setModalResultado({ modo: 'editar', resultado: r, objetivoTitulo })
  }

  async function salvarResultado(dados: DadosResultado) {
    if (modalResultado?.modo === 'editar') {
      await atualizarResultado(modalResultado.resultado.id, dados)
    } else if (modalResultado?.modo === 'novo') {
      await criarResultado({ ...dados, objetivoId: modalResultado.objetivoId })
    }
    setModalResultado(null)
  }

  function confirmarExcluirResultado(id: string) {
    if (!window.confirm('Excluir este resultado-chave?')) return
    removerResultado(id)
    setModalResultado(null)
  }

  if (carregando) {
    return <div className="empty-state"><p className="empty-state-title">Carregando metas…</p></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isMobile ? (
            <select className="select-purion" value={visao} onChange={(e) => mudarVisao(e.target.value)}>
              {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : (
            <InnerTabs tabs={TABS} activeTab={visao} onChange={mudarVisao} />
          )}
          <select className="select-purion" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusObjetivo | 'todos')}>
            <option value="todos">Todos os status</option>
            {STATUS_OBJETIVO_OPCOES.map((s) => <option key={s} value={s}>{STATUS_OBJETIVO_LABEL[s]}</option>)}
          </select>
          <select className="select-purion" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value as PerfilUsuario | 'todos')}>
            <option value="todos">Todos os responsáveis</option>
            {RESPONSAVEIS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        <button onClick={() => abrirNovaMeta(null)} className="btn btn-primary btn-sm">
          <Plus size={12} /> Nova meta
        </button>
      </div>

      {visao === 'lista' ? (
        <MetaListaView
          grupos={grupos}
          todosObjetivos={objetivos}
          todosResultados={resultados}
          metricas={metricas}
          tarefas={tarefas}
          onSelecionarObjetivo={(o) => setObjetivoDetalheId(o.id)}
          onSelecionarResultado={(r, objetivoTitulo) => abrirEditarResultado(r, objetivoTitulo)}
          onNovaMeta={abrirNovaMeta}
          onNovoResultado={abrirNovoResultado}
        />
      ) : (
        <MetaPainelView
          objetivosTopo={objetivosTopo}
          todosObjetivos={objetivos}
          todosResultados={resultados}
          metricas={metricas}
          onSelecionarObjetivo={(o) => setObjetivoDetalheId(o.id)}
          onNovaMeta={() => abrirNovaMeta(null)}
        />
      )}

      {modalObjetivo && (
        <ModalObjetivo
          objetivo={modalObjetivo.modo === 'editar' ? modalObjetivo.objetivo : null}
          fases={fases}
          objetivosDisponiveisComoPai={objetivos}
          parentIdPadrao={modalObjetivo.modo === 'novo' ? modalObjetivo.parentId : undefined}
          onFechar={() => setModalObjetivo(null)}
          onSalvar={salvarObjetivo}
          onDeletar={modalObjetivo.modo === 'editar' ? () => confirmarExcluirObjetivo(modalObjetivo.objetivo) : undefined}
          onReverterStatusAutomatico={
            modalObjetivo.modo === 'editar' ? () => reverterStatusAutomatico(modalObjetivo.objetivo.id) : undefined
          }
        />
      )}

      {modalResultado && (
        <ModalResultado
          resultado={modalResultado.modo === 'editar' ? modalResultado.resultado : null}
          objetivoTitulo={modalResultado.objetivoTitulo}
          metricas={metricas}
          onFechar={() => setModalResultado(null)}
          onSalvar={salvarResultado}
          onDeletar={modalResultado.modo === 'editar' ? () => confirmarExcluirResultado(modalResultado.resultado.id) : undefined}
        />
      )}

      {objetivoDetalhe && (
        <DetalheObjetivo
          objetivo={objetivoDetalhe}
          todosObjetivos={objetivos}
          todosResultados={resultados}
          metricas={metricas}
          tarefas={tarefas}
          onFechar={() => setObjetivoDetalheId(null)}
          onEditar={() => abrirEditarMeta(objetivoDetalhe)}
          onDeletar={() => confirmarExcluirObjetivo(objetivoDetalhe)}
          onReverterStatusAutomatico={() => reverterStatusAutomatico(objetivoDetalhe.id)}
          onNovoResultado={() => abrirNovoResultado(objetivoDetalhe.id)}
          onSelecionarResultado={(r) => abrirEditarResultado(r, objetivoDetalhe.titulo)}
          onDeletarResultado={confirmarExcluirResultado}
          onSelecionarSubMeta={(sub) => setObjetivoDetalheId(sub.id)}
          onNovaSubMeta={() => abrirNovaMeta(objetivoDetalhe.id)}
        />
      )}
    </div>
  )
}
