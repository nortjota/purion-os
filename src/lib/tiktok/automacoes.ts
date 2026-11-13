/**
 * Action Center — regras puras. Não publicam, não gastam: só apontam o que fazer.
 * Alertas com `criaTarefa` viram tarefas (modulo='tiktok') de forma idempotente:
 * a chave (origem_tipo, origem_id, regra) é única no banco.
 */
import { AMOSTRA_MIN, percentil, type TotaisVideo } from './inteligencia'
import { jaPublicado, ordemStatus, STATUS_INFO, type Colaboracao, type Entrega, type Video } from './tipos'

export type RegraAcao =
  | 'atrasado' | 'aprovacao_parada' | 'gravar' | 'sem_metrica' | 'revisar' | 'escalar'
  | 'entrega_atrasada' | 'amostra_sem_conteudo' | 'direitos_vencendo' | 'sem_data'

export interface AlertaAcao {
  id: string                  // `${regra}:${origemId}` — estável
  regra: RegraAcao
  origemTipo: 'tt_video' | 'tt_colaboracao' | 'tt_entrega'
  origemId: string
  titulo: string
  detalhe: string
  prioridade: 'alta' | 'media' | 'baixa'
  prazo: string | null         // YYYY-MM-DD
  responsavel: string
  sugestao: boolean            // true = sugestão (não é obrigação)
  criaTarefa: boolean
}

const DIA = 86_400_000
const hojeISO = (agora: Date) => agora.toISOString().slice(0, 10)
const diasEntre = (a: string, b: Date) => Math.floor((b.getTime() - new Date(a.length === 10 ? `${a}T12:00:00Z` : a).getTime()) / DIA)
const somarDias = (agora: Date, n: number) => new Date(agora.getTime() + n * DIA).toISOString().slice(0, 10)

export interface EntradaAutomacoes {
  videos: Video[]
  colaboracoes: Colaboracao[]
  entregas: Entrega[]
  totais: Map<string, TotaisVideo>
  nomeCreator?: (id: string) => string
  /** responsáveis que aprovam (master/admin) — recebem as aprovações paradas */
  aprovador?: string
  agora?: Date
}

export function gerarAlertas({ videos, colaboracoes, entregas, totais, nomeCreator = () => 'creator', aprovador = 'matheus', agora = new Date() }: EntradaAutomacoes): AlertaAcao[] {
  const hoje = hojeISO(agora)
  const out: AlertaAcao[] = []
  const add = (a: Omit<AlertaAcao, 'id'>) => out.push({ ...a, id: `${a.regra}:${a.origemId}` })
  const ativos = videos.filter((v) => v.status !== 'arquivado')

  for (const v of ativos) {
    const nome = `${v.codigo} · ${v.titulo}`
    // atrasado: data prevista passou e ainda não publicou
    if (v.dataPrevista && v.dataPrevista < hoje && !jaPublicado(v.status) && v.status !== 'agendado') {
      add({ regra: 'atrasado', origemTipo: 'tt_video', origemId: v.id, titulo: `Atrasado: ${nome}`,
        detalhe: `Previsto para ${formatarData(v.dataPrevista)}, está em ${STATUS_INFO[v.status].label}`,
        prioridade: 'alta', prazo: hoje, responsavel: v.responsavel, sugestao: false, criaTarefa: true })
    }
    // aprovação parada há mais de 2 dias
    if ((v.status === 'aprovacao_roteiro' || v.status === 'aprovacao_final') && diasEntre(v.statusDesde, agora) >= 2) {
      add({ regra: 'aprovacao_parada', origemTipo: 'tt_video', origemId: v.id, titulo: `${STATUS_INFO[v.status].label}: ${nome}`,
        detalhe: `Aguardando há ${diasEntre(v.statusDesde, agora)} dias`, prioridade: 'alta', prazo: hoje,
        responsavel: aprovador, sugestao: false, criaTarefa: true })
    }
    // gravação: roteiro aprovado → tarefa de gravar
    if (v.status === 'producao') {
      add({ regra: 'gravar', origemTipo: 'tt_video', origemId: v.id, titulo: `Gravar ${nome}`,
        detalhe: v.dataGravacao ? `Gravação marcada para ${formatarData(v.dataGravacao)}` : 'Roteiro aprovado — defina a data de gravação',
        prioridade: 'media', prazo: v.dataGravacao ?? somarDias(agora, 3), responsavel: v.responsavel, sugestao: false, criaTarefa: true })
    }
    // em produção sem data prevista
    if (ordemStatus(v.status) >= ordemStatus('roteiro') && !jaPublicado(v.status) && !v.dataPrevista) {
      add({ regra: 'sem_data', origemTipo: 'tt_video', origemId: v.id, titulo: `Sem data de publicação: ${nome}`,
        detalhe: 'Defina a data para aparecer no calendário', prioridade: 'baixa', prazo: null,
        responsavel: v.responsavel, sugestao: false, criaTarefa: false })
    }
    // publicado há 3+ dias sem métrica
    const t = totais.get(v.id)
    if (jaPublicado(v.status) && t?.publicadoEm && diasEntre(t.publicadoEm, agora) >= 3 && t.views === 0) {
      add({ regra: 'sem_metrica', origemTipo: 'tt_video', origemId: v.id, titulo: `Lançar métricas de ${nome}`,
        detalhe: `Publicado há ${diasEntre(t.publicadoEm, agora)} dias e ainda sem números`, prioridade: 'media', prazo: hoje,
        responsavel: v.responsavel, sugestao: false, criaTarefa: true })
    }
    // direitos de uso vencendo em 7 dias
    if (v.direitosAte && v.direitosAte >= hoje && v.direitosAte <= somarDias(agora, 7)) {
      add({ regra: 'direitos_vencendo', origemTipo: 'tt_video', origemId: v.id, titulo: `Direito de uso vence: ${nome}`,
        detalhe: `Válido até ${formatarData(v.direitosAte)} — renovar ou tirar dos anúncios`, prioridade: 'media', prazo: v.direitosAte,
        responsavel: v.responsavel, sugestao: false, criaTarefa: true })
    }
  }

  // revisar / escalar — só com amostra suficiente no mesmo pilar
  const maduros = ativos.filter((v) => {
    const t = totais.get(v.id)
    return t?.publicadoEm && t.views > 0 && diasEntre(t.publicadoEm, agora) >= 7
  })
  const porPilar = new Map<string, Video[]>()
  for (const v of maduros) { const k = v.pilar ?? '—'; porPilar.set(k, [...(porPilar.get(k) ?? []), v]) }
  for (const [pilar, lista] of porPilar) {
    if (lista.length < AMOSTRA_MIN) continue
    const views = lista.map((v) => totais.get(v.id)!.views)
    const p25 = percentil(views, 0.25)!, p75 = percentil(views, 0.75)!
    for (const v of lista) {
      const t = totais.get(v.id)!
      if (t.views < p25) {
        add({ regra: 'revisar', origemTipo: 'tt_video', origemId: v.id, titulo: `Revisar ${v.codigo} · ${v.titulo}`,
          detalhe: `${t.views.toLocaleString('pt-BR')} views, abaixo de 75% dos vídeos de "${pilar}" (n=${lista.length}). Ver gancho e primeiros 3s.`,
          prioridade: 'baixa', prazo: null, responsavel: v.responsavel, sugestao: true, criaTarefa: false })
      } else if (t.views > p75 && t.vendas > 0 && v.direitosUso.startsWith('ads')) {
        add({ regra: 'escalar', origemTipo: 'tt_video', origemId: v.id, titulo: `Candidato a Spark Ad: ${v.codigo} · ${v.titulo}`,
          detalhe: `Top 25% de "${pilar}" (n=${lista.length}) com ${t.vendas} venda(s) e direito para anúncio. Decisão de investir é manual.`,
          prioridade: 'media', prazo: null, responsavel: v.responsavel, sugestao: true, criaTarefa: false })
      }
    }
  }

  // creators
  const colabPorId = new Map(colaboracoes.map((c) => [c.id, c]))
  for (const e of entregas) {
    const c = colabPorId.get(e.colaboracaoId)
    if (!c || e.status !== 'pendente' || !e.prazo || e.prazo >= hoje) continue
    add({ regra: 'entrega_atrasada', origemTipo: 'tt_entrega', origemId: e.id, titulo: `Entrega atrasada: ${nomeCreator(c.creatorId)}`,
      detalhe: `${e.descricao} — prazo ${formatarData(e.prazo)}`, prioridade: 'alta', prazo: hoje,
      responsavel: c.responsavel, sugestao: false, criaTarefa: true })
  }
  for (const c of colaboracoes) {
    if (c.etapa === 'amostra_enviada' && diasEntre(c.updatedAt, agora) >= 7) {
      add({ regra: 'amostra_sem_conteudo', origemTipo: 'tt_colaboracao', origemId: c.id, titulo: `Cobrar conteúdo: ${nomeCreator(c.creatorId)}`,
        detalhe: `Amostra enviada há ${diasEntre(c.updatedAt, agora)} dias sem avanço`, prioridade: 'media', prazo: hoje,
        responsavel: c.responsavel, sugestao: false, criaTarefa: true })
    }
    if (c.direitosAte && c.direitosAte >= hoje && c.direitosAte <= somarDias(agora, 7)) {
      add({ regra: 'direitos_vencendo', origemTipo: 'tt_colaboracao', origemId: c.id, titulo: `Direitos de ${nomeCreator(c.creatorId)} vencem`,
        detalhe: `Válidos até ${formatarData(c.direitosAte)}`, prioridade: 'media', prazo: c.direitosAte,
        responsavel: c.responsavel, sugestao: false, criaTarefa: true })
    }
  }

  const peso = { alta: 0, media: 1, baixa: 2 }
  return out.sort((a, b) => Number(a.sugestao) - Number(b.sugestao) || peso[a.prioridade] - peso[b.prioridade] || (a.prazo ?? '9').localeCompare(b.prazo ?? '9'))
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a.slice(2)}`
}
