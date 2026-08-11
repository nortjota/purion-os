'use client'

import { useState } from 'react'
import { X, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import type { Lote, StatusLote, PerfilUsuario } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import {
  ESTAGIOS_LOTE, TESTES_OBRIGATORIOS, calcularCustoLote, formatarMoeda,
  estagioLoteConfig, normalizarStatusLote, SOCIOS,
} from './producaoHelpers'

function calcularStatusQC(lote: Lote): 'em_testes' | 'aprovado' | 'reprovado' {
  if (lote.testes.some((t) => t.resultado === 'reprovado')) return 'reprovado'
  const todosAprovados = TESTES_OBRIGATORIOS.every((req) =>
    lote.testes.find((t) => t.tipo === req.tipo && t.resultado === 'aprovado')
  )
  return todosAprovados ? 'aprovado' : 'em_testes'
}

interface Props {
  lote: Lote
  onClose: () => void
  onSalvar: (dados: Partial<Lote>) => void
  onDeletar: (lote: Lote) => void
}

export function ProducaoLoteDrawer({ lote, onClose, onSalvar, onDeletar }: Props) {
  const [quantidadeEnvasada, setQuantidadeEnvasada] = useState(String(lote.quantidadeAprovada || ''))
  const [notas, setNotas] = useState(lote.notas)
  const estagio = estagioLoteConfig(lote.status)
  const statusQC = calcularStatusQC(lote)

  function marcarTeste(tipo: string, resultado: 'aprovado' | 'reprovado') {
    const novosTestes = lote.testes.map((t) =>
      t.tipo === tipo ? { ...t, resultado, data: new Date().toISOString().slice(0, 10) } : t
    )
    if (!lote.testes.find((t) => t.tipo === tipo)) {
      novosTestes.push({ tipo: tipo as Lote['testes'][number]['tipo'], resultado, data: new Date().toISOString().slice(0, 10), observacoes: '' })
    }
    const qc = calcularStatusQC({ ...lote, testes: novosTestes })
    const novoStatus: StatusLote = qc === 'reprovado' ? 'reprovado' : lote.status
    onSalvar({ testes: novosTestes, status: novoStatus })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-sm font-black text-[var(--text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{lote.codigo}</h2>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: `${estagio.cor}20`, color: estagio.cor }}>{estagio.label}</span>
          </div>
          <p className="text-[11px] text-[#B8B8B8]">{lote.produto}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onDeletar(lote)} className="p-1.5 rounded-lg hover:bg-[rgba(232,82,56,0.1)] text-[#B8B8B8] hover:text-[#E85238] transition-colors"><Trash2 size={14} /></button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#B8B8B8] hover:text-[var(--text-primary)] transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
            <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wider mb-1">Qtd. produzida</p>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{lote.quantidadeProduzida} un.</p>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
            <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wider mb-1">Custo do lote</p>
            <p className="text-xs font-semibold text-[#C9A84C]">{formatarMoeda(calcularCustoLote(lote.quantidadeProduzida))}</p>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
            <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wider mb-1">Data início</p>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{formatarDataBR(lote.dataInicio)}</p>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
            <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wider mb-1">Conclusão</p>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{lote.dataConclusao ? formatarDataBR(lote.dataConclusao) : '—'}</p>
          </div>
        </div>

        {/* Quantidade envasada */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">Quantidade envasada (entra no estoque de prontos)</p>
          <div className="flex gap-2">
            <input
              type="number" min={0} value={quantidadeEnvasada}
              onChange={(e) => setQuantidadeEnvasada(e.target.value)}
              className="flex-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <button
              onClick={() => onSalvar({ quantidadeAprovada: parseInt(quantidadeEnvasada, 10) || 0 })}
              className="px-3 py-2 rounded-lg bg-[#C9A84C] text-[#0D0D0D] text-xs font-bold"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* Responsável */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">Responsável</p>
          <select
            value={lote.responsavel}
            onChange={(e) => onSalvar({ responsavel: e.target.value as PerfilUsuario })}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            {SOCIOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>

        {/* Checklist QC */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">Controle de qualidade</p>
          <div className="flex flex-col gap-2.5">
            {TESTES_OBRIGATORIOS.map((req) => {
              const teste = lote.testes.find((t) => t.tipo === req.tipo)
              const resultado = teste?.resultado ?? 'pendente'
              return (
                <div key={req.tipo} className="flex items-start gap-2.5 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-2.5">
                  {resultado === 'aprovado' ? (
                    <CheckCircle2 size={14} className="text-[#4CAF7A] shrink-0 mt-0.5" />
                  ) : resultado === 'reprovado' ? (
                    <XCircle size={14} className="text-[#E85238] shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{req.label}</span>
                    {teste?.data && <p className="text-[10px] text-[#A0A0A0]">{formatarDataBR(teste.data)}</p>}
                  </div>
                  {resultado === 'pendente' && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => marcarTeste(req.tipo, 'aprovado')} className="px-2 py-0.5 text-[10px] font-bold text-[#4CAF7A] border border-[rgba(76,175,122,0.3)] rounded hover:bg-[rgba(76,175,122,0.1)]">Aprovar</button>
                      <button onClick={() => marcarTeste(req.tipo, 'reprovado')} className="px-2 py-0.5 text-[10px] font-bold text-[#E85238] border border-[rgba(232,82,56,0.3)] rounded hover:bg-[rgba(232,82,56,0.1)]">Reprovar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Notas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium">Notas</p>
            <button onClick={() => onSalvar({ notas })} className="text-[10px] text-[#C9A84C] hover:underline">Salvar</button>
          </div>
          <textarea
            value={notas} onChange={(e) => setNotas(e.target.value)} rows={3}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-primary)] resize-none"
          />
        </div>

        {/* Mudar estágio */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">Estágio</p>
          <select
            value={lote.status}
            onChange={(e) => onSalvar({ status: e.target.value as StatusLote })}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            {ESTAGIOS_LOTE.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          {normalizarStatusLote(lote.status) !== 'concluido' && (
            <button
              onClick={() => onSalvar({ status: 'concluido', dataConclusao: new Date().toISOString().slice(0, 10) })}
              className="mt-2 w-full py-1.5 rounded-lg bg-[#4CAF7A] text-[#0D0D0D] text-xs font-bold"
            >
              Concluir lote e enviar ao estoque
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
