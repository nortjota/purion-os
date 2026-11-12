'use client'

import { useAcaoRapida } from '@/lib/acaoRapida'
import { useState, useMemo, useEffect } from 'react'
import { Plus, SlidersHorizontal, X, List, Columns3, GanttChart, CalendarDays, BarChart3 } from 'lucide-react'
import { Segmentado } from '@/components/ui/Segmentado'
import { MetricStrip, type MetricaFaixa } from '@/components/ui/MetricStrip'
import { usePurionStore } from '@/store'
import type { Tarefa, StatusTarefa } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useTarefas } from '@/hooks/useTarefas'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { type ColunaTarefa, type GroupBy } from './tarefasHelpers'
import { TarefaFiltros, FILTROS_VAZIOS, aplicarFiltros, type FiltrosTarefas } from './TarefaFiltros'
import { TarefaKanbanView } from './TarefaKanbanView'
import { TarefaListaView } from './TarefaListaView'
import { TarefaTimelineView } from './TarefaTimelineView'
import { TarefaCalendarView } from './TarefaCalendarView'
import { TarefaDashboardView } from './TarefaDashboardView'
import { TarefaModalNova } from './TarefaModalNova'
import { TarefaDetalhesPainel } from './TarefaDetalhesPainel'

type Visao = 'lista' | 'quadro' | 'cronograma' | 'calendario' | 'painel'

const TABS: ReadonlyArray<{ id: Visao; label: string; icon: typeof List }> = [
  { id: 'lista',      label: 'Lista',      icon: List },
  { id: 'quadro',     label: 'Quadro',     icon: Columns3 },
  { id: 'cronograma', label: 'Cronograma', icon: GanttChart },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'painel',     label: 'Painel',     icon: BarChart3 },
]

const VISOES_VALIDAS: Visao[] = ['lista', 'quadro', 'cronograma', 'calendario', 'painel']
const GROUP_OPTIONS: [GroupBy, string][] = [
  ['none',        'Sem agrupamento'],
  ['modulo',      'Por módulo'],
  ['status',      'Por status'],
  ['responsavel', 'Por responsável'],
  ['prioridade',  'Por prioridade'],
]

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'lista'
  const v = localStorage.getItem('purion:view:tarefas')
  return VISOES_VALIDAS.includes(v as Visao) ? (v as Visao) : 'lista'
}

export function TarefasDashboard() {
  const isMobile = useMobile()
  const { tarefas, perfilAtivo } = usePurionStore()
  const {
    adicionarTarefa, atualizarTarefa, deletarTarefa, reordenarTarefas,
    adicionarSubtarefa, atualizarSubtarefa, deletarSubtarefa, reordenarSubtarefas,
    adicionarComentario, deletarComentario, uploadAnexo, deletarAnexo,
  } = useTarefas()

  const [visao, setVisao] = useState<Visao>('lista')
  const [filtros, setFiltros] = useState<FiltrosTarefas>(FILTROS_VAZIOS)
  const [groupBy, setGroupBy] = useState<GroupBy>('modulo')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [modalNova, setModalNova] = useState<{ aberto: boolean; colunaId: ColunaTarefa; dueDatePre?: string }>({
    aberto: false, colunaId: 'pendente',
  })
  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<Tarefa | null>(null)
  useAcaoRapida('nova-tarefa', () => setModalNova({ aberto: true, colunaId: 'pendente' }))

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: Visao) {
    setVisao(v)
    if (typeof window !== 'undefined') localStorage.setItem('purion:view:tarefas', v)
  }

  const tarefasAtivas = useMemo(() => tarefas.filter((t) => t.status !== 'cancelada'), [tarefas])
  const tarefasFiltradas = useMemo(() => aplicarFiltros(tarefasAtivas, filtros), [tarefasAtivas, filtros])
  const tarefaSelecionada = useMemo(() => tarefas.find((t) => t.id === tarefaSelecionadaId) ?? null, [tarefas, tarefaSelecionadaId])

  const filtrosAtivosCount = Object.entries(filtros).filter(
    ([k, v]) => v !== FILTROS_VAZIOS[k as keyof FiltrosTarefas]
  ).length

  function handleNovaTarefa(colunaId: ColunaTarefa = 'pendente', dueDatePre?: string) {
    setModalNova({ aberto: true, colunaId, dueDatePre })
  }

  function handleCriar(dados: Omit<Tarefa, 'id' | 'createdAt' | 'subtarefas' | 'comentarios' | 'anexos'>) {
    adicionarTarefa(dados)
  }

  function handleConcluirRapido(t: Tarefa) {
    const novoStatus: StatusTarefa = t.status === 'concluida' ? 'pendente' : 'concluida'
    atualizarTarefa(t.id, {
      status: novoStatus,
      completedAt: novoStatus === 'concluida' ? new Date().toISOString() : null,
    })
  }

  function handleConfirmarDelete() {
    if (deletando) {
      deletarTarefa(deletando.id)
      if (tarefaSelecionadaId === deletando.id) setTarefaSelecionadaId(null)
      setDeletando(null)
    }
  }

  const px = isMobile ? 14 : 32

  // ── Números das tarefas em aberto; clicar aplica o filtro (clicar de novo remove) ──
  const metricas = useMemo<MetricaFaixa[]>(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const fim = new Date(); fim.setDate(fim.getDate() + 7)
    const fimSemana = fim.toISOString().slice(0, 10)
    const abertas = tarefasAtivas.filter((t) => t.status !== 'concluida')
    const atrasadas = abertas.filter((t) => t.dueDate && t.dueDate < hoje).length
    const paraHoje = abertas.filter((t) => t.dueDate === hoje).length
    const semana = abertas.filter((t) => t.dueDate && t.dueDate >= hoje && t.dueDate <= fimSemana).length
    const minhas = abertas.filter((t) => t.responsavel === perfilAtivo).length
    const bloqueadas = abertas.filter((t) => t.status === 'bloqueada').length
    const prazo = (v: FiltrosTarefas['prazo']) => () => setFiltros((f) => ({ ...f, prazo: f.prazo === v ? 'todos' : v }))
    return [
      { label: 'Em aberto', valor: abertas.length, sub: 'ver todas', onClick: () => setFiltros(FILTROS_VAZIOS), ativo: filtrosAtivosCount === 0 },
      { label: 'Atrasadas', valor: atrasadas, sub: 'prazo vencido', tom: atrasadas > 0 ? 'danger' : undefined, onClick: prazo('atrasadas'), ativo: filtros.prazo === 'atrasadas' },
      { label: 'Para hoje', valor: paraHoje, sub: 'vencem hoje', onClick: prazo('hoje'), ativo: filtros.prazo === 'hoje' },
      { label: 'Esta semana', valor: semana, sub: 'próximos 7 dias', onClick: prazo('semana'), ativo: filtros.prazo === 'semana' },
      { label: 'Minhas', valor: minhas, sub: 'sob minha responsabilidade', onClick: () => setFiltros((f) => ({ ...f, responsavel: f.responsavel === perfilAtivo ? 'todos' : perfilAtivo })), ativo: filtros.responsavel === perfilAtivo },
      { label: 'Bloqueadas', valor: bloqueadas, sub: 'aguardando algo', tom: bloqueadas > 0 ? 'warning' : undefined, onClick: () => setFiltros((f) => ({ ...f, status: f.status === 'bloqueada' ? 'todos' : 'bloqueada' })), ativo: filtros.status === 'bloqueada' },
    ]
  }, [tarefasAtivas, perfilAtivo, filtros, filtrosAtivosCount])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Cabeçalho: título, filtros e ação em uma linha; números clicáveis; visão ── */}
      <div style={{ padding: `${isMobile ? 14 : 24}px ${px}px 0`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="toolbar">
          <h1 className="page-title" style={{ marginRight: 8 }}>Tarefas</h1>
          <span className="caption tnum">
            {tarefasFiltradas.length} tarefa{tarefasFiltradas.length !== 1 ? 's' : ''}{filtrosAtivosCount > 0 ? ' no filtro' : ''}
          </span>
          <span className="toolbar-espaco" />

          {!isMobile && (visao === 'lista' || visao === 'quadro') && (
            <select className="filtro" data-ativo={groupBy !== 'none' || undefined} value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label="Agrupar por">
              {GROUP_OPTIONS.map(([v, label]) => <option key={v} value={v}>{v === 'none' ? label : `Agrupar: ${label.replace('Por ', '')}`}</option>)}
            </select>
          )}
          <button
            onClick={() => setFiltrosAbertos((o) => !o)}
            className="btn btn-secondary btn-sm" aria-expanded={filtrosAbertos}
            style={filtrosAtivosCount > 0 ? { borderColor: 'color-mix(in srgb, var(--foreground) 45%, transparent)' } : undefined}
          >
            <SlidersHorizontal size={13} />
            {!isMobile && 'Filtros'}
            {filtrosAtivosCount > 0 && (
              <span className="tnum" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>
                {filtrosAtivosCount}
              </span>
            )}
          </button>
          {!isMobile && (
            <button onClick={() => handleNovaTarefa()} className="btn btn-accent btn-sm">
              <Plus size={14} /> Nova tarefa
            </button>
          )}
        </div>

        {!isMobile && <MetricStrip metricas={metricas} rotulo="Resumo das tarefas" />}

        <div className="toolbar" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          <Segmentado rotulo="Visão" valor={visao} onChange={mudarVisao} opcoes={TABS} />
        </div>
      </div>

      {/* ── Painel de filtros (desktop inline) ── */}
      {filtrosAbertos && !isMobile && (
        <div style={{
          padding: '12px 32px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}>
          <TarefaFiltros tarefas={tarefasAtivas} filtros={filtros} onChange={setFiltros} />
          <button onClick={() => setFiltrosAbertos(false)} style={{ position: 'absolute', top: 10, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Área de conteúdo ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {visao === 'lista' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `14px ${px}px ${isMobile ? 90 : 16}px` }}>
            <TarefaListaView
              tarefas={tarefasFiltradas}
              groupBy={groupBy}
              onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
              onConcluirRapido={handleConcluirRapido}
              onNovaTarefa={handleNovaTarefa}
            />
          </div>
        )}

        {visao === 'quadro' && (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: `14px ${px}px` }}>
            <TarefaKanbanView
              tarefas={tarefasFiltradas}
              onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
              onNovaTarefa={handleNovaTarefa}
              onReordenar={reordenarTarefas}
            />
          </div>
        )}

        {visao === 'cronograma' && (
          <TarefaTimelineView
            tarefas={tarefasFiltradas}
            onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
            onAtualizarTarefa={atualizarTarefa}
          />
        )}

        {visao === 'calendario' && (
          <TarefaCalendarView
            tarefas={tarefasFiltradas}
            onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
            onNovaTarefa={(dueDate) => handleNovaTarefa('pendente', dueDate)}
            onAtualizarTarefa={atualizarTarefa}
          />
        )}

        {visao === 'painel' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `14px ${px}px ${isMobile ? 90 : 16}px` }}>
            <TarefaDashboardView tarefas={tarefasAtivas} />
          </div>
        )}
      </div>

      {/* ── FAB mobile — "+ Nova tarefa" flutuante acima da nav ── */}
      {isMobile && (
        <button
          onClick={() => handleNovaTarefa()}
          style={{
            position: 'fixed',
            bottom: 76,
            right: 16,
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,245,240,0.45)',
            zIndex: 40,
            fontSize: 22, fontWeight: 300,
          }}
          aria-label="Nova tarefa"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* ── Filtros mobile (bottom sheet) ── */}
      <BottomSheet open={filtrosAbertos && isMobile} onClose={() => setFiltrosAbertos(false)} title="Filtros">
        <TarefaFiltros tarefas={tarefasAtivas} filtros={filtros} onChange={setFiltros} />
      </BottomSheet>

      {/* ── Modal nova tarefa ── */}
      {modalNova.aberto && (
        <TarefaModalNova
          statusInicial={modalNova.colunaId}
          perfilAtivo={perfilAtivo}
          onCriar={handleCriar}
          onFechar={() => setModalNova({ aberto: false, colunaId: 'pendente' })}
        />
      )}

      {/* ── Painel detalhes ── */}
      {tarefaSelecionada && (
        <TarefaDetalhesPainel
          tarefa={tarefaSelecionada}
          onFechar={() => setTarefaSelecionadaId(null)}
          onSalvar={atualizarTarefa}
          onDeletar={(t) => setDeletando(t)}
          onAdicionarSubtarefa={adicionarSubtarefa}
          onAtualizarSubtarefa={atualizarSubtarefa}
          onDeletarSubtarefa={deletarSubtarefa}
          onReordenarSubtarefas={reordenarSubtarefas}
          onAdicionarComentario={adicionarComentario}
          onDeletarComentario={deletarComentario}
          onUploadAnexo={uploadAnexo}
          onDeletarAnexo={deletarAnexo}
        />
      )}

      {/* ── Confirmar delete ── */}
      <ConfirmModal
        open={!!deletando}
        title="Excluir Tarefa"
        message={`Deseja excluir "${deletando?.titulo}"? Você pode restaurar na Lixeira.`}
        onConfirm={handleConfirmarDelete}
        onCancel={() => setDeletando(null)}
      />
    </div>
  )
}
