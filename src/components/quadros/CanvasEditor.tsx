'use client'

import { useEffect, useRef, useCallback, useState, memo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQuadros } from '@/hooks/useQuadros'
import type { QuadroNo, QuadroConexao } from '@/store'

// ── Handle style ──────────────────────────────────────────────────────────────
const HANDLE_STYLE: React.CSSProperties = {
  background: 'rgba(201,168,76,0.8)',
  border: '2px solid rgba(255,255,255,0.4)',
  width: 10,
  height: 10,
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function isDark(hex: string): boolean {
  if (!hex || hex.length < 7) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

const CORES = ['#FFD93D', '#C9A84C', '#3B82F6', '#4CAF7A', '#EC4899', '#8B5CF6', '#2A2A2A']

const textareaBase: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: 1.5,
}

// ── PostItNode ────────────────────────────────────────────────────────────────
const PostItNode = memo(function PostItNode({ data, selected }: NodeProps) {
  const conteudo = (data.conteudo ?? '') as string
  const cor = (data.cor ?? '#FFD93D') as string
  const onChange = data.onChange as ((v: string) => void) | undefined
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(conteudo)
  useEffect(() => { setText(conteudo) }, [conteudo])
  const textColor = isDark(cor) ? '#fff' : '#1a1a1a'

  return (
    <div style={{
      background: cor, minHeight: 120, padding: '10px 12px', borderRadius: 8,
      border: `2px solid ${selected ? 'rgba(255,255,255,0.8)' : 'transparent'}`,
      boxShadow: selected ? '0 0 0 3px rgba(201,168,76,0.5),0 6px 20px rgba(0,0,0,0.5)' : '0 4px 14px rgba(0,0,0,0.45)',
      fontFamily: 'inherit',
    }}>
      <Handle type="target" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left}   style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  style={HANDLE_STYLE} />
      {editing ? (
        <textarea
          autoFocus value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); if (text !== conteudo) onChange?.(text) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setText(conteudo) } e.stopPropagation() }}
          className="nodrag"
          style={{ ...textareaBase, minHeight: 100, color: textColor }}
        />
      ) : (
        <p onDoubleClick={() => setEditing(true)} style={{ margin: 0, fontSize: 14, minHeight: 100, color: textColor, whiteSpace: 'pre-wrap', lineHeight: 1.5, cursor: 'text', userSelect: 'none' }}>
          {text || <em style={{ opacity: 0.5, fontStyle: 'normal' }}>Duplo-clique para editar...</em>}
        </p>
      )}
    </div>
  )
})

// ── CaixaNode ─────────────────────────────────────────────────────────────────
const CaixaNode = memo(function CaixaNode({ data, selected }: NodeProps) {
  const conteudo = (data.conteudo ?? '') as string
  const cor = (data.cor ?? '#C9A84C') as string
  const onChange = data.onChange as ((v: string) => void) | undefined
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(conteudo)
  useEffect(() => { setText(conteudo) }, [conteudo])

  return (
    <div style={{
      background: 'var(--bg-surface,#1C1C1E)',
      border: `2px solid ${selected ? '#C9A84C' : cor}`,
      borderRadius: 10, minHeight: 100, overflow: 'hidden',
      boxShadow: selected ? '0 0 0 2px rgba(201,168,76,0.35)' : '0 2px 10px rgba(0,0,0,0.4)',
      fontFamily: 'inherit',
    }}>
      <Handle type="target" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left}   style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  style={HANDLE_STYLE} />
      <div style={{ background: cor, height: 6 }} />
      <div style={{ padding: '10px 12px' }}>
        {editing ? (
          <textarea
            autoFocus value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { setEditing(false); if (text !== conteudo) onChange?.(text) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setText(conteudo) } e.stopPropagation() }}
            className="nodrag"
            style={{ ...textareaBase, minHeight: 80, color: 'var(--text-primary,#F0F0F0)' }}
          />
        ) : (
          <p onDoubleClick={() => setEditing(true)} style={{ margin: 0, fontSize: 14, minHeight: 80, color: 'var(--text-primary,#F0F0F0)', whiteSpace: 'pre-wrap', lineHeight: 1.5, cursor: 'text', userSelect: 'none' }}>
            {text || <em style={{ opacity: 0.35, fontStyle: 'normal' }}>Duplo-clique para editar...</em>}
          </p>
        )}
      </div>
    </div>
  )
})

// ── TextoNode ─────────────────────────────────────────────────────────────────
const TextoNode = memo(function TextoNode({ data, selected }: NodeProps) {
  const conteudo = (data.conteudo ?? '') as string
  const cor = (data.cor ?? '#C9A84C') as string
  const onChange = data.onChange as ((v: string) => void) | undefined
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(conteudo)
  useEffect(() => { setText(conteudo) }, [conteudo])

  return (
    <div style={{ minHeight: 40, padding: '4px 6px', border: `1px dashed ${selected ? cor : 'transparent'}`, borderRadius: 6, fontFamily: 'inherit' }}>
      <Handle type="target" position={Position.Top}    style={{ ...HANDLE_STYLE, opacity: selected ? 1 : 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ ...HANDLE_STYLE, opacity: selected ? 1 : 0 }} />
      <Handle type="target" position={Position.Left}   style={{ ...HANDLE_STYLE, opacity: selected ? 1 : 0 }} />
      <Handle type="source" position={Position.Right}  style={{ ...HANDLE_STYLE, opacity: selected ? 1 : 0 }} />
      {editing ? (
        <textarea
          autoFocus value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); if (text !== conteudo) onChange?.(text) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setText(conteudo) } e.stopPropagation() }}
          className="nodrag"
          style={{ ...textareaBase, fontSize: 18, fontWeight: 600, color: cor, lineHeight: 1.4 }}
        />
      ) : (
        <p onDoubleClick={() => setEditing(true)} style={{ margin: 0, fontSize: 18, fontWeight: 600, color: cor || 'var(--text-primary,#F0F0F0)', whiteSpace: 'pre-wrap', lineHeight: 1.4, cursor: 'text', userSelect: 'none' }}>
          {text || <em style={{ opacity: 0.35, fontStyle: 'normal', fontSize: 14 }}>Texto livre...</em>}
        </p>
      )}
    </div>
  )
})

// ── Node types (module-level — never recreated) ───────────────────────────────
const nodeTypes = { postit: PostItNode, caixa: CaixaNode, texto: TextoNode }

// ── Conversions ───────────────────────────────────────────────────────────────
function noToRFNode(no: QuadroNo, onChange: (id: string, v: string) => void): Node {
  return {
    id: no.id,
    type: no.tipo,
    position: { x: no.posX, y: no.posY },
    data: { conteudo: no.conteudo, cor: no.cor, onChange: (v: string) => onChange(no.id, v) },
    style: { width: no.largura },
  }
}

function conexaoToEdge(c: QuadroConexao): Edge {
  return {
    id: c.id,
    source: c.origemId,
    target: c.destinoId,
    label: c.label || undefined,
    type: 'smoothstep',
    style: { stroke: '#C9A84C', strokeWidth: 2 },
  }
}

// ── CanvasEditor ──────────────────────────────────────────────────────────────
export function CanvasEditor({ quadroId }: { quadroId: string }) {
  const { quadros, criarNo, editarNo: editarNoFn, moverNo, deletarNo, carregarNos, criarConexao, deletarConexao, carregarConexoes } = useQuadros()
  const quadroInfo = quadros.find((q) => q.id === quadroId)
  const quadroNome = quadroInfo?.nome ?? 'Quadro'
  const quadroEmoji = quadroInfo?.emoji ?? '🧠'

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [corAtual, setCorAtual] = useState('#FFD93D')
  const [carregando, setCarregando] = useState(true)

  const moverNoRef    = useRef(moverNo)
  const editarNoRef   = useRef(editarNoFn)
  const deletarNoRef  = useRef(deletarNo)
  const deletarConRef = useRef(deletarConexao)
  useEffect(() => {
    moverNoRef.current    = moverNo
    editarNoRef.current   = editarNoFn
    deletarNoRef.current  = deletarNo
    deletarConRef.current = deletarConexao
  })

  const handleContentChange = useCallback((nodeId: string, v: string) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, conteudo: v } } : n))
    editarNoRef.current(nodeId, { conteudo: v })
  }, [setNodes])

  const buildRFNodes = useCallback((nos: QuadroNo[]) => {
    return nos.map((no) => noToRFNode(no, handleContentChange))
  }, [handleContentChange])

  // ── Load + realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setCarregando(false); return }
    const sb = supabase
    let cancelled = false

    async function load() {
      setCarregando(true)
      const [nos, conexoes] = await Promise.all([carregarNos(quadroId), carregarConexoes(quadroId)])
      if (cancelled) return
      setNodes(buildRFNodes(nos))
      setEdges(conexoes.map(conexaoToEdge))
      setCarregando(false)
    }
    load()

    const ch = sb
      .channel(`quadro-ed-${quadroId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quadro_nos', filter: `quadro_id=eq.${quadroId}` }, async () => {
        if (cancelled) return
        const nos = await carregarNos(quadroId)
        if (!cancelled) setNodes(buildRFNodes(nos))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quadro_conexoes', filter: `quadro_id=eq.${quadroId}` }, async () => {
        if (cancelled) return
        const conexoes = await carregarConexoes(quadroId)
        if (!cancelled) setEdges(conexoes.map(conexaoToEdge))
      })
      .subscribe()

    return () => {
      cancelled = true
      sb.removeChannel(ch)
    }
  }, [quadroId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event handlers ────────────────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return
    const conexao = await criarConexao(quadroId, params.source, params.target)
    if (conexao) {
      setEdges((eds) => addEdge({ ...params, id: conexao.id, type: 'smoothstep', style: { stroke: '#C9A84C', strokeWidth: 2 } }, eds))
    }
  }, [quadroId, criarConexao, setEdges])

  const onNodeDragStop = useCallback((_evt: MouseEvent | TouchEvent, node: Node) => {
    moverNoRef.current(node.id, node.position.x, node.position.y)
  }, [])

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach((n) => deletarNoRef.current(n.id))
  }, [])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach((e) => deletarConRef.current(e.id))
  }, [])

  async function addNode(tipo: QuadroNo['tipo']) {
    const x = 180 + Math.random() * 300
    const y = 100 + Math.random() * 250
    const no = await criarNo(quadroId, tipo, x, y, corAtual)
    if (no) setNodes((prev) => [...prev, noToRFNode(no, handleContentChange)])
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary,#888)', background: '#111' }}>
        Carregando quadro...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 52, flexShrink: 0,
        background: 'var(--bg-surface,#1C1C1E)',
        borderBottom: '1px solid var(--border,rgba(255,255,255,0.08))',
      }}>
        <Link href="/quadros" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary,#888)', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border)', marginRight: 6 }}>
          <ArrowLeft size={13} /> Quadros
        </Link>
        <span style={{ fontSize: 18 }}>{quadroEmoji}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary,#F0F0F0)', marginRight: 4 }}>{quadroNome}</span>
        <div style={{ width: 1, height: 22, background: 'var(--border,rgba(255,255,255,0.1))', margin: '0 4px' }} />
        <button onClick={() => addNode('postit')} className="btn btn-secondary btn-sm">+ Post-it</button>
        <button onClick={() => addNode('caixa')}  className="btn btn-secondary btn-sm">+ Caixa</button>
        <button onClick={() => addNode('texto')}  className="btn btn-secondary btn-sm">+ Texto</button>
        <div style={{ width: 1, height: 22, background: 'var(--border,rgba(255,255,255,0.1))', margin: '0 4px' }} />
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {CORES.map((cor) => (
            <button key={cor} onClick={() => setCorAtual(cor)} title={cor} style={{ width: 18, height: 18, borderRadius: '50%', background: cor, border: `2px solid ${corAtual === cor ? '#fff' : 'transparent'}`, cursor: 'pointer', outline: 'none', padding: 0, flexShrink: 0 }} />
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary,#666)' }}>
          Del = deletar · Duplo-clique = editar · Arraste handle = conectar
        </span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          deleteKeyCode="Delete"
          fitView
          fitViewOptions={{ padding: 0.3 }}
          style={{ background: '#111111' }}
          attributionPosition="bottom-right"
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2a2a" />
          <Controls style={{ background: 'var(--bg-surface,#1C1C1E)', border: '1px solid var(--border,rgba(255,255,255,0.1))', borderRadius: 8 }} />
          <MiniMap
            style={{ background: 'var(--bg-surface,#1C1C1E)', border: '1px solid var(--border,rgba(255,255,255,0.1))', borderRadius: 8 }}
            nodeColor={(n) => ((n.data as Record<string, unknown>).cor as string) || '#C9A84C'}
            maskColor="rgba(0,0,0,0.5)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
