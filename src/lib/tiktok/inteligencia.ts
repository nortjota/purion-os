/**
 * Creative Intelligence — funções puras (sem banco), testadas em __tests__.
 * Regra de ouro: nenhuma conclusão com amostra pequena.
 */
import type { Metrica, Publicacao, Video } from './tipos'

/** Mínimo de vídeos por grupo para comparar ou recomendar. */
export const AMOSTRA_MIN = 8
/** Mínimo de semanas diferentes (evita um único dia viral distorcer). */
export const SEMANAS_MIN = 3

export interface TotaisVideo {
  views: number
  likes: number
  comentarios: number
  compartilhamentos: number
  salvos: number
  conclusaoPct: number | null
  gasto: number
  vendas: number
  receita: number
  publicadoEm: string | null
}

export const TOTAIS_VAZIOS: TotaisVideo = { views: 0, likes: 0, comentarios: 0, compartilhamentos: 0, salvos: 0, conclusaoPct: null, gasto: 0, vendas: 0, receita: 0, publicadoEm: null }

/**
 * Métricas são snapshots acumulados por dia: vale o mais recente de cada publicação
 * (em empate de data, a fonte oficial de API vence o lançamento manual).
 */
export function ultimoSnapshotPorPublicacao(metricas: Metrica[]): Map<string, Metrica> {
  const prioridade = (o: string) => (o.startsWith('api') ? 3 : o === 'csv' ? 2 : 1)
  const mapa = new Map<string, Metrica>()
  for (const m of metricas) {
    const atual = mapa.get(m.publicacaoId)
    if (!atual || m.dataReferencia > atual.dataReferencia
      || (m.dataReferencia === atual.dataReferencia && prioridade(m.origem) > prioridade(atual.origem))) {
      mapa.set(m.publicacaoId, m)
    }
  }
  return mapa
}

export function totaisPorVideo(
  publicacoes: Publicacao[],
  metricas: Metrica[],
  vendas: Array<{ videoId: string | null; valor: number }> = [],
): Map<string, TotaisVideo> {
  const ult = ultimoSnapshotPorPublicacao(metricas)
  const mapa = new Map<string, TotaisVideo>()
  const pesoConclusao = new Map<string, { soma: number; peso: number }>()
  for (const p of publicacoes) {
    const t = mapa.get(p.videoId) ?? { ...TOTAIS_VAZIOS }
    if (!t.publicadoEm || p.publicadoEm < t.publicadoEm) t.publicadoEm = p.publicadoEm
    const m = ult.get(p.id)
    if (m) {
      t.views += m.views; t.likes += m.likes; t.comentarios += m.comentarios
      t.compartilhamentos += m.compartilhamentos; t.salvos += m.salvos; t.gasto += m.gasto ?? 0
      if (m.conclusaoPct != null) {
        const pc = pesoConclusao.get(p.videoId) ?? { soma: 0, peso: 0 }
        const peso = Math.max(m.views, 1)
        pc.soma += m.conclusaoPct * peso; pc.peso += peso
        pesoConclusao.set(p.videoId, pc)
      }
    }
    mapa.set(p.videoId, t)
  }
  for (const [id, pc] of pesoConclusao) { const t = mapa.get(id); if (t) t.conclusaoPct = pc.soma / pc.peso }
  for (const v of vendas) {
    if (!v.videoId) continue
    const t = mapa.get(v.videoId) ?? { ...TOTAIS_VAZIOS }
    t.vendas += 1; t.receita += v.valor
    mapa.set(v.videoId, t)
  }
  return mapa
}

export const engajamento = (t: TotaisVideo) => t.views > 0 ? (t.likes + t.comentarios + t.compartilhamentos + t.salvos) / t.views : 0

export function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null
  const ord = [...valores].sort((a, b) => a - b)
  const pos = (ord.length - 1) * p
  const base = Math.floor(pos)
  const resto = pos - base
  return ord[base + 1] !== undefined ? ord[base] + resto * (ord[base + 1] - ord[base]) : ord[base]
}
export const mediana = (v: number[]) => percentil(v, 0.5)

/** Semana ISO aproximada (ano-semana) para contar semanas distintas. */
export function chaveSemana(iso: string): string {
  const d = new Date(iso)
  const inicioAno = Date.UTC(d.getUTCFullYear(), 0, 1)
  return `${d.getUTCFullYear()}-${Math.floor((d.getTime() - inicioAno) / (7 * 86_400_000))}`
}

export type Dimensao = 'ganchoTipo' | 'formato' | 'pilar' | 'creatorId' | 'campanhaId' | 'duracao'
export const DIMENSOES: Record<Dimensao, string> = {
  ganchoTipo: 'Tipo de gancho', formato: 'Formato', pilar: 'Pilar', creatorId: 'Creator', campanhaId: 'Campanha', duracao: 'Duração',
}

export function faixaDuracao(seg: number | null): string | null {
  if (seg == null) return null
  if (seg <= 15) return 'até 15s'
  if (seg <= 30) return '16–30s'
  if (seg <= 60) return '31–60s'
  return '60s+'
}

export interface GrupoDesempenho {
  chave: string
  n: number
  semanas: number
  medianaViews: number | null
  medianaConclusao: number | null
  medianaEngajamento: number | null
  vendasPorMilViews: number | null
  suficiente: boolean
}

/** Agrupa vídeos publicados por uma dimensão e calcula medianas. */
export function desempenhoPorDimensao(videos: Video[], totais: Map<string, TotaisVideo>, dim: Dimensao): GrupoDesempenho[] {
  const grupos = new Map<string, Array<{ v: Video; t: TotaisVideo }>>()
  for (const v of videos) {
    const t = totais.get(v.id)
    if (!t || !t.publicadoEm || t.views === 0) continue
    const chave = dim === 'duracao' ? faixaDuracao(v.duracaoSeg) : (v[dim] as string | null)
    if (!chave) continue
    const lista = grupos.get(chave) ?? []
    lista.push({ v, t })
    grupos.set(chave, lista)
  }
  return [...grupos.entries()].map(([chave, itens]) => {
    const semanas = new Set(itens.map((i) => chaveSemana(i.t.publicadoEm!))).size
    const views = itens.map((i) => i.t.views)
    const conclusoes = itens.map((i) => i.t.conclusaoPct).filter((c): c is number => c != null)
    const somaViews = views.reduce((s, x) => s + x, 0)
    const somaVendas = itens.reduce((s, i) => s + i.t.vendas, 0)
    return {
      chave, n: itens.length, semanas,
      medianaViews: mediana(views),
      medianaConclusao: mediana(conclusoes),
      medianaEngajamento: mediana(itens.map((i) => engajamento(i.t))),
      vendasPorMilViews: somaViews > 0 ? (somaVendas / somaViews) * 1000 : null,
      suficiente: itens.length >= AMOSTRA_MIN && semanas >= SEMANAS_MIN,
    }
  }).sort((a, b) => (b.medianaViews ?? 0) - (a.medianaViews ?? 0))
}

export interface ComparacaoVariantes {
  vencedor: string | null
  diferencaPct: number | null
  motivo: string
}

/**
 * Compara duas variantes pela taxa (ex.: conclusão ou vendas/views).
 * Só declara vencedor com volume mínimo em ambas e diferença acima do limiar.
 */
export function compararVariantes(
  a: { rotulo: string; views: number; taxa: number | null },
  b: { rotulo: string; views: number; taxa: number | null },
  { viewsMin = 1000, limiar = 0.15 } = {},
): ComparacaoVariantes {
  if (a.views < viewsMin || b.views < viewsMin) {
    return { vencedor: null, diferencaPct: null, motivo: `Amostra insuficiente: cada versão precisa de ${viewsMin.toLocaleString('pt-BR')} views` }
  }
  if (a.taxa == null || b.taxa == null || Math.max(a.taxa, b.taxa) === 0) {
    return { vencedor: null, diferencaPct: null, motivo: 'Sem a métrica de comparação nas duas versões' }
  }
  const [maior, menor] = a.taxa >= b.taxa ? [a, b] : [b, a]
  const dif = menor.taxa! > 0 ? (maior.taxa! - menor.taxa!) / menor.taxa! : 1
  if (dif < limiar) return { vencedor: null, diferencaPct: dif, motivo: `Diferença de ${(dif * 100).toFixed(0)}% está abaixo de ${(limiar * 100).toFixed(0)}%: empate técnico` }
  return { vencedor: maior.rotulo, diferencaPct: dif, motivo: `Versão ${maior.rotulo} ${(dif * 100).toFixed(0)}% acima` }
}
