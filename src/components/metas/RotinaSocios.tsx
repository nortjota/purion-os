'use client'

import { useMemo } from 'react'
import { Clock, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { CategoriaMeta, MetaDiaria, MetaChecklistItem } from '@/store'
import { SOCIOS_ATIVOS, type SocioAtivo } from '@/lib/socios'
import { useMobile } from '@/hooks/useMobile'
import { CATEGORIAS, corCategoria, progressoMeta, hojeISO, metasDoDia } from './metasHelpers'
import { ROTINAS, formatarDuracao, janelaBloco, type BlocoRotina } from './rotinaConfig'

const TOTAL_MIN = 240

function labelCategoria(c: CategoriaMeta) {
  return CATEGORIAS.find((x) => x.id === c)?.label ?? c
}

function LinhaMeta({ meta, itens }: { meta: MetaDiaria; itens: MetaChecklistItem[] }) {
  const pct = progressoMeta(meta, itens)
  const detalhe = meta.tipo === 'numerica'
    ? `${meta.valorAtual}/${meta.valorAlvo ?? '—'}${meta.unidade ? ` ${meta.unidade}` : ''}`
    : `${itens.filter((i) => i.metaId === meta.id && i.feito).length}/${itens.filter((i) => i.metaId === meta.id).length} itens`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      {meta.concluida
        ? <CheckCircle2 size={14} style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
        : <Circle size={14} style={{ color: '#8A8A8A', flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 13, color: meta.concluida ? '#B8B8B8' : '#F5F5F5', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.titulo}
      </span>
      <span style={{ fontSize: 12, color: '#B8B8B8', flexShrink: 0 }}>{detalhe}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? 'var(--status-ok)' : '#E0E0E0', width: 38, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  )
}

function CardBloco({
  bloco, idx, blocos, cor, metas, itens, onVerCategoria,
}: {
  bloco: BlocoRotina
  idx: number
  blocos: BlocoRotina[]
  cor: string
  metas: MetaDiaria[]
  itens: MetaChecklistItem[]
  onVerCategoria: (c: CategoriaMeta) => void
}) {
  const feitas = metas.filter((m) => m.concluida).length
  return (
    <div className="card-purion" style={{ padding: '14px 16px', borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `${cor}1F`, color: cor, fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {bloco.numero}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{bloco.titulo}</span>
            <span style={{ fontSize: 12, color: '#B8B8B8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {formatarDuracao(bloco.minutos)} · {janelaBloco(blocos, idx)}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 2 }}>{bloco.descricao}</p>
        </div>
        {metas.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: feitas === metas.length ? 'var(--status-ok)' : '#E0E0E0' }}>
            {feitas}/{metas.length} metas
          </span>
        )}
      </div>

      <div style={{ marginTop: 10, paddingLeft: 42 }}>
        {metas.length === 0 ? (
          <p style={{ fontSize: 12, color: '#B8B8B8' }}>Nenhuma meta de hoje ligada a este bloco.</p>
        ) : (
          metas.map((m) => <LinhaMeta key={m.id} meta={m} itens={itens} />)
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {bloco.categorias.map((c) => (
            <button
              key={c}
              onClick={() => onVerCategoria(c)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: `${corCategoria(c)}1F`, color: corCategoria(c),
                border: `1px solid ${corCategoria(c)}40`, cursor: 'pointer',
              }}
              title={`Ver metas de ${labelCategoria(c)}`}
            >
              {labelCategoria(c)} <ArrowRight size={11} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColunaRotina({ socio, onVerCategoria }: { socio: SocioAtivo; onVerCategoria: (c: CategoriaMeta) => void }) {
  const { metasDiarias, metaChecklistItens } = usePurionStore()
  const info = SOCIOS_ATIVOS.find((s) => s.id === socio)!
  const blocos = ROTINAS[socio]

  const metasHojeSocio = useMemo(
    () => metasDoDia(metasDiarias, hojeISO()).filter((m) => m.escopo === 'individual' && m.responsavel === socio),
    [metasDiarias, socio],
  )

  return (
    <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `${info.cor}1F`, border: `1px solid ${info.cor}55`, color: info.cor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        }}>
          {info.inicial}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5' }}>{info.nome} · 4h</p>
          <p style={{ fontSize: 12, color: '#B8B8B8' }}>{info.cidade} — {info.eixo}</p>
        </div>
      </div>

      {/* Barra proporcional dos blocos */}
      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
        {blocos.map((b) => (
          <div
            key={b.numero}
            title={`${b.titulo} · ${formatarDuracao(b.minutos)}`}
            style={{ width: `${(b.minutos / TOTAL_MIN) * 100}%`, background: info.cor, opacity: 1 - (b.numero - 1) * 0.18 }}
          />
        ))}
      </div>

      {blocos.map((b, i) => (
        <CardBloco
          key={b.numero}
          bloco={b}
          idx={i}
          blocos={blocos}
          cor={info.cor}
          metas={metasHojeSocio.filter((m) => b.categorias.includes(m.categoria))}
          itens={metaChecklistItens}
          onVerCategoria={onVerCategoria}
        />
      ))}
    </div>
  )
}

/** Aba "Minha Rotina": agenda de 4h por sócio, em blocos ligados às metas do dia. */
export function RotinaSocios({ socioPrimeiro, onVerCategoria }: {
  socioPrimeiro?: SocioAtivo
  onVerCategoria: (c: CategoriaMeta) => void
}) {
  const isMobile = useMobile()
  const ordem: SocioAtivo[] = socioPrimeiro === 'joao' ? ['joao', 'matheus'] : ['matheus', 'joao']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#B8B8B8' }}>
        Guia do dia: 4 horas em 4 blocos. Cada bloco mostra as metas de hoje que ele alimenta — clique numa categoria para abrir essas metas.
      </p>
      <div style={{ display: 'flex', gap: isMobile ? 24 : 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {ordem.map((s) => <ColunaRotina key={s} socio={s} onVerCategoria={onVerCategoria} />)}
      </div>
    </div>
  )
}
