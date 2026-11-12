'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check, CalendarClock, MessageCircle, ArrowUpRight, CheckSquare, Users, HeartHandshake, Target,
  Headphones, Truck, CalendarX, PartyPopper,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import { useTarefas } from '@/hooks/useTarefas'
import { useCRM } from '@/hooks/useCRM'
import { usePosVenda, hojeLocalISO } from '@/hooks/usePosVenda'
import { useMetas } from '@/hooks/useMetas'
import { aguardandoDespacho, despachoAtrasado, linkWhatsApp } from '@/hooks/useDespacho'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { SOCIOS_ATIVOS, type SocioAtivo } from '@/lib/socios'
import { TIPO_FOLLOWUP } from '@/lib/posVenda'
import { Segmentado } from '@/components/ui/Segmentado'
import { MetricStrip } from '@/components/ui/MetricStrip'
import { useSocioAtual } from './useSocioAtual'

/**
 * MEU TRABALHO — uma fila só, por pessoa, com tudo que tem dono e prazo:
 * tarefas, follow-ups do CRM, follow-ups de pós-venda e metas do dia.
 * Cada linha resolve ali mesmo (concluir, adiar, abrir WhatsApp) sem trocar de módulo.
 * Embaixo, o que é do time e ainda não tem dono (SAC, despachos atrasados, reuniões sem registro).
 */

type Tipo = 'tarefa' | 'crm' | 'posvenda' | 'meta'
type Bloco = 'atrasado' | 'hoje' | 'semana'

interface Item {
  id: string
  tipo: Tipo
  titulo: string
  contexto: string
  data: string // YYYY-MM-DD
  href: string
  whatsapp?: string | null
  prioridadeAlta?: boolean
}

const TIPO_INFO: Record<Tipo, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  tarefa:   { label: 'Tarefa',    icon: CheckSquare },
  crm:      { label: 'CRM B2B',   icon: Users },
  posvenda: { label: 'Pós-venda', icon: HeartHandshake },
  meta:     { label: 'Meta do dia', icon: Target },
}

const BLOCO_INFO: Record<Bloco, { titulo: string; tom: string }> = {
  atrasado: { titulo: 'Atrasado', tom: 'var(--status-danger)' },
  hoje:     { titulo: 'Hoje', tom: 'var(--text-primary)' },
  semana:   { titulo: 'Próximos 7 dias', tom: 'var(--text-secondary)' },
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function rotuloData(data: string, hoje: string): string {
  if (data === hoje) return 'hoje'
  const dias = Math.round((new Date(`${data}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86_400_000)
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  if (dias < 0) return `há ${-dias} dias`
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

interface TicketResumo { id: string; numero: string; cliente_nome: string; assunto: string; prioridade: string; status: string }

export function MeuTrabalhoPage() {
  const socioLogado = useSocioAtual()
  const [socio, setSocio] = useState<SocioAtivo>(socioLogado)
  useEffect(() => { setSocio(socioLogado) }, [socioLogado])

  const { tarefas, leads, metasDiarias, vendas, reunioes } = usePurionStore()
  const { atualizarTarefa } = useTarefas()
  const { atualizarLead } = useCRM()
  const { tarefas: followUps, marcarFeito } = usePosVenda()
  const { concluirMeta } = useMetas()
  const { toast } = useToast()
  const hoje = hojeLocalISO()
  const limiteSemana = somarDias(hoje, 7)

  // ── tickets de SAC em aberto (sem dono no sistema: ficam na seção do time) ──
  const [tickets, setTickets] = useState<TicketResumo[]>([])
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.from('tickets_sac')
      .select('id, numero, cliente_nome, assunto, prioridade, status')
      .in('status', ['aberto', 'em_atendimento'])
      .order('criado_em', { ascending: true })
      .limit(20)
      .then(({ data, error }) => {
        dbLog('SELECT', 'tickets_sac (meu trabalho)', error, `${data?.length ?? 0} rows`)
        if (data) setTickets(data as TicketResumo[])
      })
  }, [])

  // ── fila pessoal ──
  const itens = useMemo<Item[]>(() => {
    const lista: Item[] = []
    tarefas
      .filter((t) => t.responsavel === socio && t.dueDate && !['concluida', 'cancelada'].includes(t.status))
      .forEach((t) => lista.push({
        id: t.id, tipo: 'tarefa', titulo: t.titulo,
        contexto: [t.modulo, t.status === 'bloqueada' ? 'bloqueada' : null].filter(Boolean).join(' · '),
        data: t.dueDate!.slice(0, 10), href: '/tarefas',
        prioridadeAlta: t.prioridade === 'alta' || t.prioridade === 'urgente',
      }))
    leads
      .filter((l) => l.responsavel === socio && l.proximoPassoData)
      .forEach((l) => lista.push({
        id: l.id, tipo: 'crm', titulo: l.proximoPassoAcao || `Follow-up com ${l.nomeEmpresa}`,
        contexto: [l.nomeEmpresa, l.nomeContato].filter(Boolean).join(' · '),
        data: l.proximoPassoData!.slice(0, 10), href: '/crm',
        whatsapp: l.telefone ? linkWhatsApp(l.telefone, '') : null,
      }))
    followUps
      .filter((f) => f.status === 'pendente' && f.responsavel === socio)
      .forEach((f) => lista.push({
        id: f.id, tipo: 'posvenda', titulo: `${TIPO_FOLLOWUP[f.tipo]?.label ?? f.tipo}${f.mensagemCodigo ? ` (${f.mensagemCodigo})` : ''}`,
        contexto: f.clienteNome, data: f.dataPrevista, href: '/posvenda',
        whatsapp: f.clienteTelefone ? linkWhatsApp(f.clienteTelefone, '') : null,
      }))
    metasDiarias
      .filter((m) => m.data === hoje && !m.concluida && (m.responsavel === socio || m.escopo === 'time'))
      .forEach((m) => lista.push({
        id: m.id, tipo: 'meta', titulo: m.titulo, contexto: m.escopo === 'time' ? 'meta do time' : 'meta individual',
        data: hoje, href: '/metas',
      }))
    return lista
      .filter((i) => i.data <= limiteSemana)
      .sort((a, b) => a.data.localeCompare(b.data) || Number(!!b.prioridadeAlta) - Number(!!a.prioridadeAlta))
  }, [tarefas, leads, followUps, metasDiarias, socio, hoje, limiteSemana])

  const blocos = useMemo(() => ({
    atrasado: itens.filter((i) => i.data < hoje),
    hoje: itens.filter((i) => i.data === hoje),
    semana: itens.filter((i) => i.data > hoje),
  }), [itens, hoje])

  const feitosHoje = useMemo(() => (
    tarefas.filter((t) => t.responsavel === socio && t.status === 'concluida' && t.completedAt?.slice(0, 10) === hoje).length
    + followUps.filter((f) => f.responsavel === socio && f.status === 'feito' && f.concluidoEm?.slice(0, 10) === hoje).length
    + metasDiarias.filter((m) => m.data === hoje && m.concluida && m.responsavel === socio).length
  ), [tarefas, followUps, metasDiarias, socio, hoje])

  // ── o que é do time e não tem dono ──
  const despachosAtrasados = useMemo(() => vendas.filter((v) => aguardandoDespacho(v) && despachoAtrasado(v)), [vendas])
  const reunioesSemRegistro = useMemo(
    () => reunioes.filter((r) => r.status === 'agendada' && r.data.slice(0, 10) < hoje),
    [reunioes, hoje],
  )

  // ── ações ──
  const [saindo, setSaindo] = useState<Set<string>>(new Set())
  const [concluidosAgora, setConcluidosAgora] = useState(0)
  function sumir(chave: string) { setSaindo((s) => new Set(s).add(chave)) }

  async function concluir(item: Item) {
    const chave = `${item.tipo}:${item.id}`
    sumir(chave)
    setConcluidosAgora((n) => n + 1)
    if (item.tipo === 'tarefa') {
      await atualizarTarefa(item.id, { status: 'concluida', completedAt: new Date().toISOString() })
      toast({
        type: 'success', title: 'Tarefa concluída', duration: 6000,
        action: { label: 'Desfazer', onClick: () => { void atualizarTarefa(item.id, { status: 'pendente', completedAt: null }) } },
      })
    } else if (item.tipo === 'crm') {
      const lead = leads.find((l) => l.id === item.id)
      await atualizarLead(item.id, {
        proximoPassoData: null, proximoPassoAcao: null, updatedAt: new Date().toISOString(),
        historicoInteracoes: [...(lead?.historicoInteracoes ?? []), {
          id: `int-${Date.now()}`, texto: `Follow-up feito: ${item.titulo}`, timestamp: new Date().toLocaleString('pt-BR'),
        }],
      })
      toast({ type: 'success', title: 'Follow-up registrado', description: 'Agende o próximo passo no CRM quando quiser.' })
    } else if (item.tipo === 'posvenda') {
      await marcarFeito(item.id)
    } else {
      await concluirMeta(item.id, true)
      toast({
        type: 'success', title: 'Meta concluída', duration: 6000,
        action: { label: 'Desfazer', onClick: () => { void concluirMeta(item.id, false) } },
      })
    }
  }

  async function adiar(item: Item) {
    const amanha = somarDias(hoje, 1)
    sumir(`${item.tipo}:${item.id}`)
    if (item.tipo === 'tarefa') await atualizarTarefa(item.id, { dueDate: amanha })
    else if (item.tipo === 'crm') await atualizarLead(item.id, { proximoPassoData: amanha })
    toast({ type: 'info', title: 'Adiado para amanhã' })
  }

  const visiveis = (lista: Item[]) => lista.filter((i) => !saindo.has(`${i.tipo}:${i.id}`))
  const total = visiveis(blocos.atrasado).length + visiveis(blocos.hoje).length
  const nomeSocio = SOCIOS_ATIVOS.find((s) => s.id === socio)?.nome ?? ''

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1100 }}>
      <div className="toolbar">
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 className="page-title">Meu trabalho</h1>
          <p className="caption mt-1">Tudo que está com {socio === socioLogado ? 'você' : nomeSocio} e tem prazo, em uma fila. Resolva daqui mesmo.</p>
        </div>
        <Segmentado
          rotulo="De quem" valor={socio} onChange={setSocio}
          opcoes={SOCIOS_ATIVOS.map((s) => ({ id: s.id as SocioAtivo, label: s.id === socioLogado ? `${s.nome} (você)` : s.nome }))}
        />
      </div>

      <MetricStrip
        rotulo="Resumo da fila"
        metricas={[
          { label: 'Atrasado', valor: visiveis(blocos.atrasado).length, sub: 'prazo vencido', tom: visiveis(blocos.atrasado).length > 0 ? 'danger' : undefined },
          { label: 'Hoje', valor: visiveis(blocos.hoje).length, sub: 'vence hoje' },
          { label: 'Próximos 7 dias', valor: visiveis(blocos.semana).length, sub: 'para planejar' },
          { label: 'Feito hoje', valor: feitosHoje + concluidosAgora, sub: 'concluído nesta data', tom: feitosHoje + concluidosAgora > 0 ? 'ok' : undefined },
        ]}
      />

      {total === 0 && (
        <div className="card-purion" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
          <PartyPopper size={18} style={{ color: 'var(--status-ok)', flexShrink: 0 }} />
          <p style={{ fontSize: 13.5 }}>
            Nada atrasado nem para hoje.{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {visiveis(blocos.semana).length > 0 ? 'Dá para adiantar o que vem nos próximos dias.' : 'Fila limpa.'}
            </span>
          </p>
        </div>
      )}

      {(['atrasado', 'hoje', 'semana'] as Bloco[]).map((b) => {
        const lista = visiveis(blocos[b])
        if (lista.length === 0) return null
        return (
          <section key={b} className="dash-secao">
            <p className="kpi-label" style={{ color: BLOCO_INFO[b].tom }}>{BLOCO_INFO[b].titulo} · {lista.length}</p>
            <div className="card-purion" style={{ padding: 4 }}>
              {lista.map((item) => {
                const { label, icon: Icon } = TIPO_INFO[item.tipo]
                const podeAdiar = item.tipo === 'tarefa' || item.tipo === 'crm'
                return (
                  <div key={`${item.tipo}:${item.id}`} className="trabalho-linha">
                    <button className="trabalho-check" onClick={() => concluir(item)} aria-label={`Concluir: ${item.titulo}`} title="Concluir">
                      <Check size={13} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="trabalho-titulo">
                        {item.prioridadeAlta && <span className="trabalho-prio" title="Prioridade alta">!</span>}
                        {item.titulo}
                      </p>
                      <p className="trabalho-contexto">
                        <Icon size={11} /> {label}{item.contexto ? ` · ${item.contexto}` : ''}
                      </p>
                    </div>
                    <span className="trabalho-data tnum" style={{ color: b === 'atrasado' ? 'var(--status-danger)' : undefined }}>
                      {rotuloData(item.data, hoje)}
                    </span>
                    <div className="trabalho-acoes">
                      {item.whatsapp && (
                        <a href={item.whatsapp} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Abrir WhatsApp" title="Abrir WhatsApp">
                          <MessageCircle size={13} />
                        </a>
                      )}
                      {podeAdiar && (
                        <button className="icon-btn" onClick={() => adiar(item)} aria-label="Adiar para amanhã" title="Adiar para amanhã">
                          <CalendarClock size={13} />
                        </button>
                      )}
                      <Link href={item.href} className="icon-btn" aria-label={`Abrir em ${label}`} title={`Abrir em ${label}`}>
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {(tickets.length > 0 || despachosAtrasados.length > 0 || reunioesSemRegistro.length > 0) && (
        <section className="dash-secao">
          <p className="kpi-label">Do time, sem dono definido</p>
          <div className="card-purion" style={{ padding: 4 }}>
            {despachosAtrasados.length > 0 && (
              <Link href="/despacho" className="trabalho-linha trabalho-linha-link">
                <Truck size={15} style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{despachosAtrasados.length} pedido{despachosAtrasados.length > 1 ? 's' : ''} pago{despachosAtrasados.length > 1 ? 's' : ''} há mais de 48h sem despacho</span>
                <ArrowUpRight size={13} />
              </Link>
            )}
            {tickets.length > 0 && (
              <Link href="/sac" className="trabalho-linha trabalho-linha-link">
                <Headphones size={15} style={{ color: tickets.some((t) => t.prioridade === 'urgente') ? 'var(--status-danger)' : 'var(--status-warning)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  {tickets.length} ticket{tickets.length > 1 ? 's' : ''} de SAC em aberto
                  {tickets.some((t) => t.prioridade === 'urgente') && <span style={{ color: 'var(--status-danger)' }}> · {tickets.filter((t) => t.prioridade === 'urgente').length} urgente(s)</span>}
                </span>
                <ArrowUpRight size={13} />
              </Link>
            )}
            {reunioesSemRegistro.length > 0 && (
              <Link href="/reunioes" className="trabalho-linha trabalho-linha-link">
                <CalendarX size={15} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{reunioesSemRegistro.length} reunião(ões) passaram sem registro — marque como realizada ou cancelada</span>
                <ArrowUpRight size={13} />
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
