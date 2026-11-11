'use client'

import { Skeleton } from '@/components/motion/Skeleton'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  HeartHandshake, CheckCircle2, BellOff, MessageCircle, Mail, Phone, BookOpen, AlertTriangle,
  ChevronDown, ChevronUp, Star, Clock, ShieldAlert, RefreshCw,
} from 'lucide-react'
import { usePurionStore } from '@/store'
import type { Venda } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { InnerTabs } from '@/components/ui/InnerTabs'
import { usePosVenda, hojeLocalISO, type SinaisCliente } from '@/hooks/usePosVenda'
import { linkWhatsApp } from '@/hooks/useDespacho'
import { AnimatedList, AnimatedItem, AnimatedNumber } from '@/components/motion'
import {
  TIPO_FOLLOWUP, MENSAGENS, CANAL_LABEL, mensagemComercial, temReclamacaoAberta, MAX_LEMBRETES,
  type FollowUpTarefa,
} from '@/lib/posVenda'

const DOURADO = '#C9A84C'

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function diasAte(iso: string, hoje: string): number {
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86_400_000)
}

// ─────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────

function BadgeMensagem({ codigo }: { codigo: string | null }) {
  if (!codigo) return null
  const comercial = mensagemComercial(codigo)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 6,
      background: comercial ? 'rgba(232,168,56,0.15)' : 'rgba(201,168,76,0.12)',
      color: comercial ? '#F5C26B' : DOURADO,
      border: comercial ? '1px solid rgba(232,168,56,0.45)' : '1px solid transparent',
    }} title={comercial ? 'Mensagem comercial: só envie com opt-in de marketing' : MENSAGENS[codigo]?.titulo}>
      {codigo}{MENSAGENS[codigo] ? ` · ${MENSAGENS[codigo].titulo}` : ''}
      {comercial && <><ShieldAlert size={11} /> exige opt-in</>}
    </span>
  )
}

function IconeCanal({ canal }: { canal: FollowUpTarefa['canal'] }) {
  const Icon = canal === 'whatsapp' ? MessageCircle : canal === 'email' ? Mail : Phone
  return <Icon size={13} style={{ flexShrink: 0 }} />
}

// ─────────────────────────────────────────────
// Preferências do cliente (consentimentos + feedback)
// ─────────────────────────────────────────────

function Toggle({ label, ativo, onChange, alerta }: { label: string; ativo: boolean; onChange: (v: boolean) => void; alerta?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E0E0E0', cursor: 'pointer', minHeight: 32 }}>
      <input type="checkbox" checked={ativo} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: alerta ? '#EF4444' : DOURADO }} />
      {label}
    </label>
  )
}

function PainelCliente({ venda, onSinais, onFeedback }: {
  venda: Venda
  onSinais: (v: Venda, s: SinaisCliente) => void
  onFeedback: (v: Venda, nota: number) => void
}) {
  return (
    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#B8B8B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Consentimentos e contexto do cliente
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
        <Toggle label="Opt-in de pesquisa" ativo={!!venda.optInPesquisa} onChange={(v) => onSinais(venda, { optInPesquisa: v })} />
        <Toggle label="Opt-in de marketing" ativo={!!venda.optInMarketing} onChange={(v) => onSinais(venda, { optInMarketing: v })} />
        <Toggle label="Opt-out WhatsApp marketing" alerta ativo={!!venda.optOutWhatsappMarketing} onChange={(v) => onSinais(venda, { optOutWhatsappMarketing: v })} />
        <Toggle label="Comprou de presente" ativo={!!venda.compraPresente} onChange={(v) => onSinais(venda, { compraPresente: v })} />
        <Toggle label="Participa do estudo de consumo" ativo={!!venda.participaEstudo} onChange={(v) => onSinais(venda, { participaEstudo: v })} />
        <Toggle label="Sinal de reposição (frasco no fim)" ativo={!!venda.sinalReposicao} onChange={(v) => onSinais(venda, { sinalReposicao: v })} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#E0E0E0' }}>Satisfação pós-entrega:</span>
        {[1, 2, 3, 4, 5].map((n) => {
          const ativo = venda.satisfacao === n
          return (
            <button key={n} onClick={() => onFeedback(venda, n)} title={`${n}/5`} style={{
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              border: `1px solid ${ativo ? DOURADO : 'var(--border)'}`,
              background: ativo ? 'rgba(201,168,76,0.18)' : 'transparent',
              color: ativo ? DOURADO : '#E0E0E0',
            }}>
              {n}
            </button>
          )
        })}
        {venda.satisfacao != null && (
          <span style={{ fontSize: 12, color: venda.satisfacao >= 4 ? '#86EFAC' : venda.satisfacao <= 2 ? '#FCA5A5' : '#B8B8B8' }}>
            {venda.satisfacao >= 4 ? 'positivo → gera Avaliação/UGC' : venda.satisfacao <= 2 ? 'insatisfeito → suprime avaliação e oferta' : 'neutro'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Linha da fila
// ─────────────────────────────────────────────

function CardFollowUp({ t, venda, hoje, reclamacao, acoes }: {
  t: FollowUpTarefa
  venda: Venda | undefined
  hoje: string
  reclamacao: boolean
  acoes: {
    marcarFeito: (id: string) => void
    suprimir: (id: string, motivo: string) => void
    semResposta: (t: FollowUpTarefa) => void
    onSinais: (v: Venda, s: SinaisCliente) => void
    onFeedback: (v: Venda, nota: number) => void
  }
}) {
  const [aberto, setAberto] = useState(false)
  const info = TIPO_FOLLOWUP[t.tipo] ?? { label: t.tipo, cor: DOURADO }
  const dias = diasAte(t.dataPrevista, hoje)
  const atrasado = t.status === 'pendente' && dias < 0
  const fimJanela = t.janelaFim && t.status === 'pendente' && diasAte(t.janelaFim, hoje) < 0
  const wa = t.canal === 'whatsapp' && t.clienteTelefone ? linkWhatsApp(t.clienteTelefone, '') : null

  return (
    <div className="card-purion" style={{ padding: '12px 16px', borderLeft: `3px solid ${info.cor}`, opacity: t.status === 'pendente' ? 1 : 0.85 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{t.clienteNome || 'Cliente'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: info.cor }}>{info.label}</span>
            {t.lembretes > 0 && t.status === 'pendente' && (
              <span style={{ fontSize: 11, color: '#F5C26B' }}>lembrete {t.lembretes}/{MAX_LEMBRETES}</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 3 }}>{t.gatilho}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <BadgeMensagem codigo={t.mensagemCodigo} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E0E0E0' }}>
              <IconeCanal canal={t.canal} /> {CANAL_LABEL[t.canal]}
              {t.canal === 'whatsapp' && t.clienteTelefone ? ` · ${t.clienteTelefone}` : ''}
              {t.canal === 'email' && t.clienteEmail ? ` · ${t.clienteEmail}` : ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: atrasado ? '#FCA5A5' : '#B8B8B8' }}>
              <Clock size={12} />
              {t.status === 'pendente'
                ? (dias === 0 ? 'hoje' : dias > 0 ? `em ${dias}d (${fmtData(t.dataPrevista)})` : `atrasado ${-dias}d`)
                : t.status === 'feito' ? `feito ${fmtData(t.concluidoEm)}` : 'suprimido'}
              {fimJanela ? ' · janela encerrada' : ''}
            </span>
          </div>
          {t.status === 'suprimido' && t.motivoSupressao && (
            <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <BellOff size={12} /> {t.motivoSupressao}
            </p>
          )}
          {t.status === 'pendente' && reclamacao && (
            <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} /> Cliente com reclamação/troca em aberto no SAC
            </p>
          )}
        </div>

        {t.status === 'pendente' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                <MessageCircle size={13} /> Abrir WhatsApp
              </a>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => acoes.marcarFeito(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} /> Feito
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => acoes.semResposta(t)}
              title={t.lembretes >= MAX_LEMBRETES ? 'Já houve 1 lembrete: encerra o follow-up' : `Agenda 1 lembrete`}>
              {t.lembretes >= MAX_LEMBRETES ? 'Sem resposta · encerrar' : 'Sem resposta'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => acoes.suprimir(t.id, 'Suprimido manualmente')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <BellOff size={13} /> Suprimir
            </button>
          </div>
        )}
      </div>

      {venda && (
        <>
          <button onClick={() => setAberto((a) => !a)} style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
            color: '#B8B8B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Cliente: consentimentos, presente, estudo e nota
          </button>
          {aberto && <PainelCliente venda={venda} onSinais={acoes.onSinais} onFeedback={acoes.onFeedback} />}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────

type Aba = 'hoje' | 'proximos' | 'clientes' | 'historico'

export function PosVendaPage() {
  const isMobile = useMobile()
  const { vendas } = usePurionStore()
  const { tarefas, tickets, carregando, tabelaAusente, recarregar, marcarFeito, suprimir, semResposta, atualizarSinais, registrarFeedback } = usePosVenda()
  const [aba, setAba] = useState<Aba>('hoje')
  const hoje = hojeLocalISO()

  // Reaplica a supressão quando as vendas chegam/alteram (consentimentos, devoluções)
  useEffect(() => {
    if (vendas.length > 0) void Promise.resolve().then(recarregar)
  }, [vendas.length, recarregar])

  const vendaPorId = useMemo(() => new Map(vendas.map((v) => [v.id, v])), [vendas])
  const pendentes = tarefas.filter((t) => t.status === 'pendente')
  const filaHoje = pendentes.filter((t) => t.dataPrevista <= hoje)
  const atrasados = filaHoje.filter((t) => t.dataPrevista < hoje)
  const proximos = pendentes.filter((t) => t.dataPrevista > hoje)
  const historico = tarefas.filter((t) => t.status !== 'pendente').sort((a, b) => (b.concluidoEm ?? b.createdAt).localeCompare(a.concluidoEm ?? a.createdAt))
  const feitosHoje = tarefas.filter((t) => t.status === 'feito' && t.concluidoEm?.slice(0, 10) === hoje).length

  const entreguesRecentes = useMemo(() => {
    const limite = new Date(`${hoje}T00:00:00`).getTime() - 60 * 86_400_000
    return vendas
      .filter((v) => v.statusEntrega === 'entregue' && (!v.dataEntregaRealizada || new Date(v.dataEntregaRealizada).getTime() >= limite))
      .sort((a, b) => (b.dataEntregaRealizada ?? '').localeCompare(a.dataEntregaRealizada ?? ''))
  }, [vendas, hoje])

  const acoes = { marcarFeito, suprimir, semResposta, onSinais: atualizarSinais, onFeedback: registrarFeedback }

  function lista(itens: FollowUpTarefa[], vazio: string) {
    if (carregando) return <Skeleton rows={3} label="Carregando…" />
    if (itens.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 32, color: '#B8B8B8', fontSize: 14, border: '1px dashed var(--border)', borderRadius: 12 }}>
          <CheckCircle2 size={26} style={{ margin: '0 auto 8px', color: DOURADO, opacity: 0.7 }} />{vazio}
        </div>
      )
    }
    return (
      <AnimatedList gap={8}>
        {itens.map((t, i) => {
          const venda = vendaPorId.get(t.pedidoId)
          return (
            <AnimatedItem key={t.id} index={i}>
              <CardFollowUp t={t} venda={venda} hoje={hoje}
                reclamacao={venda ? temReclamacaoAberta(venda, tickets) : false} acoes={acoes} />
            </AnimatedItem>
          )
        })}
      </AnimatedList>
    )
  }

  return (
    <div className="page-content section-gap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <HeartHandshake size={20} style={{ color: DOURADO }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="page-title" style={{ color: '#F5F5F5' }}>Pós-venda</h1>
          <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 2 }}>
            Jornada de follow-up do Playbook 360: quem contatar hoje, com qual mensagem e por qual canal.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => recarregar()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <Link href="/conhecimento" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
            <BookOpen size={13} /> Biblioteca de Mensagens M01–M12
          </Link>
        </div>
      </div>

      {tabelaAusente && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.4)', color: '#F5C26B', fontSize: 13 }}>
          A tabela <strong>follow_up_tarefas</strong> ainda não existe. Rode <code>supabase/migration_pos_venda_followup.sql</code> no SQL Editor do Supabase.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Para contatar hoje', valor: filaHoje.length, cor: DOURADO },
          { label: 'Atrasados', valor: atrasados.length, cor: atrasados.length ? '#EF4444' : '#E0E0E0' },
          { label: 'Próximos', valor: proximos.length, cor: '#E0E0E0' },
          { label: 'Feitos hoje', valor: feitosHoje, cor: '#4CAF7A' },
        ].map((k) => (
          <div key={k.label} className="kpi-card" style={{ flex: '1 1 140px', minWidth: 0 }}>
            <span style={{ fontSize: 12, color: '#B8B8B8' }}>{k.label}</span>
            <AnimatedNumber value={k.valor} style={{ fontSize: 28, fontWeight: 700, color: k.cor, lineHeight: 1.2 }} />
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: 12, color: '#B8B8B8', lineHeight: 1.6 }}>
        <strong style={{ color: '#E0E0E0' }}>Supressão sempre ativa:</strong> reclamação/troca/atraso em aberto suprime avaliação, oferta e pesquisa ·
        opt-out de WhatsApp bloqueia mensagem comercial nesse canal · presente pesquisa a experiência de compra, não o consumo ·
        sem resposta: no máximo 1 lembrete, depois encerra. <span style={{ color: '#F5C26B' }}>M08 e M10 são comerciais e exigem opt-in.</span>
      </div>

      <InnerTabs
        tabs={[
          { id: 'hoje', label: 'Fila de hoje', badge: filaHoje.length },
          { id: 'proximos', label: 'Próximos', badge: proximos.length },
          { id: 'clientes', label: 'Clientes entregues (60d)', badge: entreguesRecentes.length },
          { id: 'historico', label: 'Histórico' },
        ]}
        activeTab={aba}
        onChange={(id) => setAba(id as Aba)}
      />

      {aba === 'hoje' && lista(filaHoje, 'Nenhum follow-up para hoje.')}
      {aba === 'proximos' && lista(proximos, 'Nenhum follow-up agendado.')}
      {aba === 'historico' && lista(historico.slice(0, 100), 'Sem histórico ainda.')}

      {aba === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: '#B8B8B8' }}>
            Marque consentimentos, presente, estudo, sinal de reposição e a nota do cliente. A jornada se ajusta sozinha.
          </p>
          {entreguesRecentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#B8B8B8', fontSize: 14, border: '1px dashed var(--border)', borderRadius: 12 }}>
              Nenhuma entrega confirmada nos últimos 60 dias.
            </div>
          ) : entreguesRecentes.map((v) => (
            <div key={v.id} className="card-purion" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{v.clienteNome || 'Cliente'}</span>
                <span style={{ fontSize: 12, color: '#B8B8B8' }}>entregue {fmtData(v.dataEntregaRealizada)} · {v.quantidade}x {v.produto || 'PURION GT'}</span>
                {v.satisfacao != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: DOURADO }}>
                    <Star size={12} /> {v.satisfacao}/5
                  </span>
                )}
                {temReclamacaoAberta(v, tickets) && (
                  <span style={{ fontSize: 12, color: '#FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={12} /> reclamação aberta
                  </span>
                )}
              </div>
              <PainelCliente venda={v} onSinais={atualizarSinais} onFeedback={registrarFeedback} />
            </div>
          ))}
        </div>
      )}

      {isMobile && <div style={{ height: 8 }} />}
    </div>
  )
}
