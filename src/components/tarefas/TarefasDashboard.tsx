'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, SlidersHorizontal, Layers, ChevronDown, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Tarefa, StatusTarefa } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InnerTabs } from '@/components/ui/InnerTabs'
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

const TABS = [
  { id: 'lista',      label: 'Lista'      },
  { id: 'quadro',     label: 'Quadro'     },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'calendario', label: 'Calendário' },
  { id: 'painel',     label: 'Painel'     },
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
  const [groupMenuAberto, setGroupMenuAberto] = useState(false)
  const [modalNova, setModalNova] = useState<{ aberto: boolean; colunaId: ColunaTarefa; dueDatePre?: string }>({
    aberto: false, colunaId: 'pendente',
  })
  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<Tarefa | null>(null)

  useEffect(() => { setVisao(carregarVisaoSalva()) }, [])

  function mudarVisao(v: string) {
    setVisao(v as Visao)
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

  const px = isMobile ? 14 : 24

  const btnStyle = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6,
    height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12,
    border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
    background: 'transparent',
    color: active ? '#C9A84C' : 'var(--text-secondary)',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: `16px ${px}px 0`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Tarefas
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Mobile: filtros button */}
            {isMobile && (
              <button
                onClick={() => setFiltrosAbertos(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 34, padding: '0 12px', borderRadius: 8, fontSize: 13,
                  border: `1px solid ${filtrosAtivosCount > 0 ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                  background: filtrosAtivosCount > 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
                  color: filtrosAtivosCount > 0 ? '#C9A84C' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={15} />
                {filtrosAtivosCount > 0 && (
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#C9A84C', color: '#0D0D0D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {filtrosAtivosCount}
                  </span>
                )}
              </button>
            )}

            {/* Desktop: Filtrar + Agrupar */}
            {!isMobile && (
              <>
                <button style={btnStyle(filtrosAtivosCount > 0)} onClick={() => setFiltrosAbertos((o) => !o)}>
                  <SlidersHorizontal size={13} />
                  Filtrar
                  {filtrosAtivosCount > 0 && (
                    <span style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                      {filtrosAtivosCount}
                    </span>
                  )}
                </button>

                <div style={{ position: 'relative' }}>
                  <button style={btnStyle(groupBy !== 'none')} onClick={() => setGroupMenuAberto((o) => !o)}>
                    <Layers size={13} />
                    Agrupar
                    <ChevronDown size={11} />
                  </button>
                  {groupMenuAberto && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setGroupMenuAberto(false)} />
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 4,
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '4px 0', zIndex: 50, minWidth: 170,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      }}>
                        {GROUP_OPTIONS.map(([v, label]) => (
                          <button key={v} onClick={() => { setGroupBy(v); setGroupMenuAberto(false) }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '8px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                              background: groupBy === v ? 'rgba(201,168,76,0.08)' : 'transparent',
                              color: groupBy === v ? '#C9A84C' : 'var(--text-primary)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Desktop: "+ Adicionar tarefa" */}
            {!isMobile && (
              <button
                onClick={() => handleNovaTarefa()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 32, padding: '0 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: '#C9A84C', color: '#0D0D0D', border: 'none', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Adicionar tarefa
              </button>
            )}
          </div>
        </div>

        {/* ── Abas de visão ── */}
        {isMobile ? (
          /* Pill tabs com scroll horizontal — muito mais mobile-friendly que um <select> */
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            paddingBottom: 10,
            /* hide scrollbar */
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => mudarVisao(tab.id)}
                style={{
                  flexShrink: 0,
                  height: 34, padding: '0 16px',
                  borderRadius: 20,
                  fontSize: 13, fontWeight: visao === tab.id ? 600 : 400,
                  background: visao === tab.id ? '#C9A84C' : 'var(--bg-surface)',
                  color: visao === tab.id ? '#0D0D0D' : 'var(--text-secondary)',
                  border: `1px solid ${visao === tab.id ? '#C9A84C' : 'var(--border)'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <InnerTabs tabs={TABS} activeTab={visao} onChange={mudarVisao} />
        )}
      </div>

      {/* ── Painel de filtros (desktop inline) ── */}
      {filtrosAbertos && !isMobile && (
        <div style={{
          padding: '12px 24px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
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
            background: '#C9A84C', color: '#0D0D0D',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(201,168,76,0.45)',
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
