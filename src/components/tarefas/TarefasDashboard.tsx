'use client'

/**
 * PURION OS — Módulo de Tarefas
 * Gestor de tarefas completo: kanban + lista, subtarefas, recorrência,
 * comentários, anexos e filtros combináveis.
 */

import { useState, useMemo, useEffect } from 'react'
import { LayoutGrid, List, Plus, AlertTriangle, CheckSquare, Users, SlidersHorizontal, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Tarefa, StatusTarefa } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useTarefas } from '@/hooks/useTarefas'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SOCIOS, isVencida, type ColunaTarefa } from './tarefasHelpers'
import { TarefaFiltros, FILTROS_VAZIOS, aplicarFiltros, type FiltrosTarefas } from './TarefaFiltros'
import { TarefaKanbanView } from './TarefaKanbanView'
import { TarefaListaView } from './TarefaListaView'
import { TarefaModalNova } from './TarefaModalNova'
import { TarefaDetalhesPainel } from './TarefaDetalhesPainel'

type Visao = 'kanban' | 'lista'

function carregarVisaoSalva(): Visao {
  if (typeof window === 'undefined') return 'kanban'
  const v = localStorage.getItem('purion:view:tarefas')
  return v === 'lista' ? 'lista' : 'kanban'
}

export function TarefasDashboard() {
  const isMobile = useMobile()
  const { tarefas, perfilAtivo } = usePurionStore()
  const {
    adicionarTarefa, atualizarTarefa, deletarTarefa, reordenarTarefas,
    adicionarSubtarefa, atualizarSubtarefa, deletarSubtarefa, reordenarSubtarefas,
    adicionarComentario, deletarComentario, uploadAnexo, deletarAnexo,
  } = useTarefas()

  const [visao, setVisao] = useState<Visao>('kanban')
  const [filtros, setFiltros] = useState<FiltrosTarefas>(FILTROS_VAZIOS)
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false)
  const [modalNova, setModalNova] = useState<{ aberto: boolean; colunaId: ColunaTarefa }>({ aberto: false, colunaId: 'pendente' })
  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<Tarefa | null>(null)

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: Visao) {
    setVisao(v)
    if (typeof window !== 'undefined') localStorage.setItem('purion:view:tarefas', v)
  }

  const tarefasAtivas = useMemo(() => tarefas.filter((t) => t.status !== 'cancelada'), [tarefas])
  const tarefasFiltradas = useMemo(() => aplicarFiltros(tarefasAtivas, filtros), [tarefasAtivas, filtros])

  const tarefaSelecionada = useMemo(
    () => tarefas.find((t) => t.id === tarefaSelecionadaId) ?? null,
    [tarefas, tarefaSelecionadaId]
  )

  // ── Métricas rápidas ──
  const metricas = useMemo(() => {
    const abertas = tarefasAtivas.filter((t) => t.status !== 'concluida').length
    const atrasadas = tarefasAtivas.filter((t) => isVencida(t.dueDate, t.status)).length
    const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
    const concluidasSemana = tarefas.filter((t) => t.completedAt && new Date(t.completedAt) >= seteDiasAtras).length
    const porSocio = SOCIOS.map((s) => ({
      ...s,
      total: tarefasAtivas.filter((t) => t.responsavel === s.id && t.status !== 'concluida').length,
    }))
    return { abertas, atrasadas, concluidasSemana, porSocio }
  }, [tarefasAtivas, tarefas])

  function handleNovaTarefa(colunaId: ColunaTarefa) {
    setModalNova({ aberto: true, colunaId })
  }

  function handleCriar(dados: Omit<Tarefa, 'id' | 'createdAt' | 'subtarefas' | 'comentarios' | 'anexos'>) {
    adicionarTarefa(dados)
  }

  function handleConcluirRapido(t: Tarefa) {
    const novoStatus: StatusTarefa = t.status === 'concluida' ? 'pendente' : 'concluida'
    atualizarTarefa(t.id, { status: novoStatus, completedAt: novoStatus === 'concluida' ? new Date().toISOString() : null })
  }

  function handleConfirmarDelete() {
    if (deletando) {
      deletarTarefa(deletando.id)
      if (tarefaSelecionadaId === deletando.id) setTarefaSelecionadaId(null)
      setDeletando(null)
    }
  }

  const filtrosAtivosCount = Object.entries(filtros).filter(([k, v]) => v !== FILTROS_VAZIOS[k as keyof FiltrosTarefas]).length

  return (
    <div className="page-content section-gap max-w-[1600px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="caption mt-1">Gestão completa de tarefas — kanban, prazos, subtarefas e colaboração</p>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => mudarVisao('kanban')}
                className="flex items-center justify-center w-8 h-7 rounded-md transition-colors duration-150"
                style={{ background: visao === 'kanban' ? '#C9A84C' : 'transparent', color: visao === 'kanban' ? '#0D0D0D' : 'var(--text-secondary)' }}
                title="Visão Kanban"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => mudarVisao('lista')}
                className="flex items-center justify-center w-8 h-7 rounded-md transition-colors duration-150"
                style={{ background: visao === 'lista' ? '#C9A84C' : 'transparent', color: visao === 'lista' ? '#0D0D0D' : 'var(--text-secondary)' }}
                title="Visão Lista"
              >
                <List size={14} />
              </button>
            </div>
          )}
          <button onClick={() => handleNovaTarefa('pendente')} className="btn btn-primary">
            <Plus size={15} /> Nova tarefa
          </button>
        </div>
      </div>

      {/* ── Métricas rápidas ── */}
      <div className="cards-gap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Total Abertas</span>
            <CheckSquare size={14} className="text-[var(--text-secondary)] opacity-60" />
          </div>
          <span className="kpi-value">{metricas.abertas}</span>
        </div>
        <div className="kpi-card" style={metricas.atrasadas > 0 ? { borderColor: 'rgba(232,82,56,0.3)' } : {}}>
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Atrasadas</span>
            <AlertTriangle size={14} className="text-[#E85238] opacity-70" />
          </div>
          <span className="kpi-value" style={{ color: metricas.atrasadas > 0 ? '#E85238' : 'var(--gold)' }}>{metricas.atrasadas}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Concluídas (7d)</span>
            <CheckSquare size={14} className="text-[#4CAF7A] opacity-70" />
          </div>
          <span className="kpi-value" style={{ color: '#4CAF7A' }}>{metricas.concluidasSemana}</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Por Sócio</span>
            <Users size={14} className="text-[var(--text-secondary)] opacity-60" />
          </div>
          <div className="flex items-center gap-3">
            {metricas.porSocio.map((s) => (
              <span key={s.id} className="flex items-center gap-1" title={s.nome}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: `${s.cor}25`, color: s.cor }}>{s.inicial}</span>
                <span className="text-[12px] font-semibold" style={{ color: s.cor }}>{s.total}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      {isMobile ? (
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltrosMobileAbertos(true)} className="btn btn-secondary btn-sm flex-1">
            <SlidersHorizontal size={13} /> Filtros {filtrosAtivosCount > 0 && `(${filtrosAtivosCount})`}
          </button>
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
            <button onClick={() => mudarVisao('kanban')} className="flex items-center justify-center w-8 h-7 rounded-md" style={{ background: visao === 'kanban' ? '#C9A84C' : 'transparent', color: visao === 'kanban' ? '#0D0D0D' : 'var(--text-secondary)' }}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => mudarVisao('lista')} className="flex items-center justify-center w-8 h-7 rounded-md" style={{ background: visao === 'lista' ? '#C9A84C' : 'transparent', color: visao === 'lista' ? '#0D0D0D' : 'var(--text-secondary)' }}>
              <List size={14} />
            </button>
          </div>
        </div>
      ) : (
        <TarefaFiltros tarefas={tarefasAtivas} filtros={filtros} onChange={setFiltros} />
      )}

      {/* ── Conteúdo: kanban ou lista ── */}
      {visao === 'kanban' ? (
        <TarefaKanbanView
          tarefas={tarefasFiltradas}
          onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
          onNovaTarefa={handleNovaTarefa}
          onReordenar={reordenarTarefas}
        />
      ) : (
        <TarefaListaView
          tarefas={tarefasFiltradas}
          onAbrirTarefa={(t) => setTarefaSelecionadaId(t.id)}
          onConcluirRapido={handleConcluirRapido}
        />
      )}

      {/* ── Filtros mobile (bottom sheet) ── */}
      <BottomSheet
        open={filtrosMobileAbertos}
        onClose={() => setFiltrosMobileAbertos(false)}
        title="Filtros"
      >
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

      {/* ── Painel de detalhes ── */}
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
