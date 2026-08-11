'use client'

import { useState } from 'react'
import {
  X, Phone, Mail, MapPin, Clock, Plus, ChevronDown, MessageSquare,
  Trash2, CalendarClock, ShoppingBag, ArrowRightLeft,
} from 'lucide-react'
import type { Lead, StatusLead, TierLead } from '@/store'
import { formatarDataBR } from '@/lib/calculos'
import { useVendas } from '@/hooks/useVendas'
import {
  ESTAGIOS, TIER_CONFIG, formatarMoeda, diasDesde, estagioConfig,
  urgenciaProximoPasso, URGENCIA_COR, socioInfo,
} from './crmHelpers'

interface Props {
  lead: Lead
  onClose: () => void
  onSalvarNotas: (notas: string) => void
  onRegistrarContato: (texto: string) => void
  onMudarEstagio: (status: StatusLead) => void
  onMudarTier: (tier: TierLead) => void
  onAgendarPasso: (data: string, acao: string) => void
  onDeletar: (lead: Lead) => void
}

export function CRMLeadDrawer({
  lead, onClose, onSalvarNotas, onRegistrarContato, onMudarEstagio,
  onMudarTier, onAgendarPasso, onDeletar,
}: Props) {
  const { criarVenda } = useVendas()
  const [notasEdit, setNotasEdit] = useState(lead.notas)
  const [textoContato, setTextoContato] = useState('')
  const [passoData, setPassoData] = useState(lead.proximoPassoData ?? '')
  const [passoAcao, setPassoAcao] = useState(lead.proximoPassoAcao ?? '')
  const [vendaAberta, setVendaAberta] = useState(false)
  const [vendaQtd, setVendaQtd] = useState(1)
  const [vendaValorUnit, setVendaValorUnit] = useState(lead.valorMedioMensal || 0)
  const [salvandoVenda, setSalvandoVenda] = useState(false)

  const estagio = estagioConfig(lead.status)
  const tier = TIER_CONFIG[lead.tier]
  const info = socioInfo(lead.responsavel)
  const ultimoContato = lead.ultimoPedido ?? lead.updatedAt
  const diasSem = diasDesde(ultimoContato)
  const urgencia = urgenciaProximoPasso(lead.proximoPassoData)
  const historico = [...(lead.historicoEstagios ?? [])].reverse()

  async function handleRegistrarVenda() {
    setSalvandoVenda(true)
    await criarVenda({
      canal: 'b2b',
      clienteNome: lead.nomeEmpresa,
      clienteTelefone: lead.telefone,
      clienteEmail: lead.email,
      leadId: lead.id,
      cidade: lead.cidade,
      uf: lead.regiao,
      quantidade: vendaQtd,
      valorUnitario: vendaValorUnit,
      valorTotal: vendaQtd * vendaValorUnit,
      metodoPagamento: 'pix',
      statusPagamento: 'pago',
      responsavel: lead.responsavel,
      produto: 'Perfume PURION B2B',
    })
    setSalvandoVenda(false)
    setVendaAberta(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-sm font-black text-[var(--text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {lead.nomeEmpresa}
            </h2>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: tier.bg, color: tier.cor }}>
              {tier.label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: `${estagio.cor}20`, color: estagio.cor }}>
              {estagio.label}
            </span>
          </div>
          <p className="text-[11px] text-[#B8B8B8]">{lead.nomeContato}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onDeletar(lead)} className="p-1.5 rounded-lg hover:bg-[rgba(232,82,56,0.1)] text-[#B8B8B8] hover:text-[#E85238] transition-colors" title="Excluir lead">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#B8B8B8] hover:text-[var(--text-primary)] transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVendaAberta((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[rgba(76,175,122,0.3)] text-[#4CAF7A] hover:bg-[rgba(76,175,122,0.08)] transition-colors"
          >
            <ShoppingBag size={11} /> Registrar venda B2B
          </button>
        </div>

        {vendaAberta && (
          <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-[#A0A0A0] uppercase tracking-wider">Quantidade</label>
                <input type="number" min={1} value={vendaQtd} onChange={(e) => setVendaQtd(Number(e.target.value))}
                  className="w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="text-[9px] text-[#A0A0A0] uppercase tracking-wider">Valor unitário</label>
                <input type="number" min={0} value={vendaValorUnit} onChange={(e) => setVendaValorUnit(Number(e.target.value))}
                  className="w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" />
              </div>
            </div>
            <p className="text-[10px] text-[#A0A0A0]">Total: {formatarMoeda(vendaQtd * vendaValorUnit)}</p>
            <button
              onClick={handleRegistrarVenda}
              disabled={salvandoVenda}
              className="w-full py-1.5 rounded-lg bg-[#4CAF7A] text-[#0D0D0D] text-xs font-bold disabled:opacity-50"
            >
              {salvandoVenda ? 'Salvando…' : 'Confirmar venda'}
            </button>
          </div>
        )}

        {/* Contato */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium">Contato</p>
          <div className="space-y-1">
            {[
              { icon: Phone, text: lead.telefone },
              { icon: Mail,  text: lead.email },
              { icon: MapPin, text: `${lead.cidade} · ${lead.regiao}` },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Icon size={11} className="text-[#A0A0A0] shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Ticket médio', valor: formatarMoeda(lead.valorMedioMensal) + '/mês' },
            { label: 'Responsável', valor: info.nome },
            { label: 'Último contato', valor: diasSem === 0 ? 'Hoje' : `${diasSem}d atrás` },
            { label: 'Cadastrado', valor: formatarDataBR(lead.createdAt) },
          ].map(({ label, valor }) => (
            <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-2.5">
              <p className="text-[9px] text-[#A0A0A0] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{valor}</p>
            </div>
          ))}
        </div>

        {/* Tier editável */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">Tier</p>
          <div className="flex gap-1.5">
            {(['A', 'B', 'C'] as TierLead[]).map((t) => {
              const cfg = TIER_CONFIG[t]
              const ativo = lead.tier === t
              return (
                <button
                  key={t}
                  onClick={() => onMudarTier(t)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                  style={{
                    background: ativo ? cfg.bg : 'var(--bg-surface-2)',
                    color: ativo ? cfg.cor : 'var(--text-secondary)',
                    border: `1px solid ${ativo ? cfg.cor : 'var(--border)'}`,
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded bg-[#2A2A2A] text-[#B8B8B8] text-[9px] font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {/* Próximo passo */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <CalendarClock size={9} /> Próximo passo
          </p>
          {lead.proximoPassoData && urgencia && (
            <div className="mb-2 px-2 py-1 rounded text-[10px] inline-flex items-center gap-1" style={{ background: `${URGENCIA_COR[urgencia]}15`, color: URGENCIA_COR[urgencia] }}>
              {formatarDataBR(lead.proximoPassoData)} {lead.proximoPassoAcao ? `· ${lead.proximoPassoAcao}` : ''}
            </div>
          )}
          <div className="flex gap-2">
            <input type="date" value={passoData} onChange={(e) => setPassoData(e.target.value)}
              className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[rgba(201,168,76,0.4)]" />
            <input type="text" value={passoAcao} onChange={(e) => setPassoAcao(e.target.value)} placeholder="Ação (ex: ligar para fechar)"
              className="flex-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[#A0A0A0] focus:outline-none focus:border-[rgba(201,168,76,0.4)]" />
          </div>
          <button
            onClick={() => passoData && onAgendarPasso(passoData, passoAcao)}
            disabled={!passoData}
            className="mt-2 w-full py-1.5 rounded-lg bg-[#C9A84C] text-[#0D0D0D] text-xs font-bold disabled:opacity-40"
          >
            Agendar follow-up
          </button>
        </div>

        {/* Notas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium">Notas</p>
            <button onClick={() => onSalvarNotas(notasEdit)} className="text-[10px] text-[#C9A84C] hover:underline">Salvar</button>
          </div>
          <textarea
            value={notasEdit}
            onChange={(e) => setNotasEdit(e.target.value)}
            rows={4}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-primary)] placeholder-[#A0A0A0] resize-none focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors"
            placeholder="Observações sobre este lead..."
          />
        </div>

        {/* Registrar contato */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <MessageSquare size={9} /> Registrar contato
          </p>
          <div className="flex gap-2">
            <input
              type="text" value={textoContato} onChange={(e) => setTextoContato(e.target.value)}
              placeholder="Descrição do contato..."
              className="flex-1 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[#A0A0A0] focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textoContato.trim()) { onRegistrarContato(textoContato.trim()); setTextoContato('') }
              }}
            />
            <button
              onClick={() => { if (textoContato.trim()) { onRegistrarContato(textoContato.trim()); setTextoContato('') } }}
              className="px-3 py-2 rounded-lg bg-[#C9A84C] text-[#0D0D0D] text-xs font-bold hover:bg-[#D4B55E] transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Histórico de interações */}
        {(lead.historicoInteracoes?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2">
              Histórico de contatos ({lead.historicoInteracoes!.length})
            </p>
            <ul className="space-y-2">
              {[...lead.historicoInteracoes!].reverse().map((h) => (
                <li key={h.id} className="bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg p-2.5">
                  <p className="text-[10px] text-[#A0A0A0] mb-1">{h.timestamp}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{h.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Histórico de mudanças de estágio */}
        {historico.length > 0 && (
          <div>
            <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
              <ArrowRightLeft size={9} /> Histórico de estágio
            </p>
            <ul className="space-y-1.5">
              {historico.map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <Clock size={9} className="shrink-0 text-[#A0A0A0]" />
                  <span>{h.de ? estagioConfig(h.de).label : '—'} → <strong style={{ color: 'var(--text-primary)' }}>{estagioConfig(h.para).label}</strong></span>
                  <span className="text-[#8A8A8A] ml-auto shrink-0">{new Date(h.timestamp).toLocaleDateString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mover estágio */}
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
            <ChevronDown size={9} /> Mudar estágio
          </p>
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => onMudarEstagio(e.target.value as StatusLead)}
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] cursor-pointer appearance-none focus:outline-none focus:border-[rgba(201,168,76,0.4)] transition-colors"
            >
              {ESTAGIOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none" />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onMudarEstagio('cliente')}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border border-[rgba(76,175,122,0.3)] text-[#4CAF7A] hover:bg-[rgba(76,175,122,0.08)]"
            >
              Marcar ganho
            </button>
            <button
              onClick={() => onMudarEstagio('perdido')}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border border-[rgba(232,82,56,0.3)] text-[#E85238] hover:bg-[rgba(232,82,56,0.08)]"
            >
              Marcar perda
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
