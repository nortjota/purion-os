import type { MetaDiaria, MetaChecklistItem, PerfilUsuario, CategoriaMeta, TipoMeta, EscopoMeta } from '@/store'

export type EscopoFiltro = PerfilUsuario | 'time'

export const SOCIOS: Array<{ id: PerfilUsuario; nome: string; cor: string; inicial: string }> = [
  { id: 'matheus', nome: 'Matheus', cor: '#C9A84C', inicial: 'M' },
  { id: 'joao',    nome: 'João',    cor: '#5B8FE8', inicial: 'J' },
  { id: 'gabriel', nome: 'Gabriel', cor: '#22C55E', inicial: 'G' },
]

export const CATEGORIAS: Array<{ id: CategoriaMeta; label: string; cor: string }> = [
  { id: 'ads',      label: 'Ads',      cor: '#5B8FE8' },
  { id: 'creators', label: 'Creators', cor: '#A855F7' },
  { id: 'b2b',      label: 'B2B',      cor: '#E8A838' },
  { id: 'producao', label: 'Produção', cor: '#22C55E' },
  { id: 'vendas',   label: 'Vendas',   cor: '#C9A84C' },
  { id: 'geral',    label: 'Geral',    cor: '#B8B8B8' },
]

export function corCategoria(cat: CategoriaMeta): string {
  return CATEGORIAS.find((c) => c.id === cat)?.cor ?? '#B8B8B8'
}

export function corSocio(socio: PerfilUsuario | null): string {
  return SOCIOS.find((s) => s.id === socio)?.cor ?? '#C9A84C'
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function deslocarData(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function formatarDataExtensa(data: string): string {
  const d = new Date(`${data}T12:00:00Z`)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
}

export function pctNumerica(meta: MetaDiaria): number {
  if (meta.valorAlvo == null || meta.valorAlvo <= 0) return meta.concluida ? 100 : 0
  return Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100))
}

export function pctChecklist(meta: MetaDiaria, itens: MetaChecklistItem[]): number {
  const doMeta = itens.filter((i) => i.metaId === meta.id)
  if (doMeta.length === 0) return meta.concluida ? 100 : 0
  const feitos = doMeta.filter((i) => i.feito).length
  return Math.round((feitos / doMeta.length) * 100)
}

export function progressoMeta(meta: MetaDiaria, itens: MetaChecklistItem[]): number {
  return meta.tipo === 'checklist' ? pctChecklist(meta, itens) : pctNumerica(meta)
}

// ─────────────────────────────────────────────
// Agrupamento por escopo/dia
// ─────────────────────────────────────────────

export function metasDoDia(metas: MetaDiaria[], data: string): MetaDiaria[] {
  return metas.filter((m) => m.data === data)
}

export function metasPorEscopo(metas: MetaDiaria[], escopo: EscopoFiltro): MetaDiaria[] {
  return escopo === 'time'
    ? metas.filter((m) => m.escopo === 'time')
    : metas.filter((m) => m.escopo === 'individual' && m.responsavel === escopo)
}

// ─────────────────────────────────────────────
// Streak — dias consecutivos com 100% das metas batidas
// ─────────────────────────────────────────────

export function calcularStreak(metasEscopo: MetaDiaria[]): number {
  const porDia = new Map<string, MetaDiaria[]>()
  metasEscopo.forEach((m) => {
    if (!porDia.has(m.data)) porDia.set(m.data, [])
    porDia.get(m.data)!.push(m)
  })

  const diaCompleto = (dataStr: string) => {
    const dia = porDia.get(dataStr)
    return !!dia && dia.length > 0 && dia.every((m) => m.concluida)
  }

  let streak = 0
  let cursor = hojeISO()
  if (!diaCompleto(cursor)) {
    cursor = deslocarData(cursor, -1)
  }
  while (diaCompleto(cursor)) {
    streak++
    cursor = deslocarData(cursor, -1)
  }
  return streak
}

// ─────────────────────────────────────────────
// Heatmap
// ─────────────────────────────────────────────

export interface DiaHeatmap {
  data: string
  pct: number
  total: number
  concluidas: number
}

export function gerarHeatmap(metasEscopo: MetaDiaria[], dias: number): DiaHeatmap[] {
  const porDia = new Map<string, MetaDiaria[]>()
  metasEscopo.forEach((m) => {
    if (!porDia.has(m.data)) porDia.set(m.data, [])
    porDia.get(m.data)!.push(m)
  })

  const resultado: DiaHeatmap[] = []
  const hoje = hojeISO()
  for (let i = dias - 1; i >= 0; i--) {
    const data = deslocarData(hoje, -i)
    const doDia = porDia.get(data) ?? []
    const concluidas = doDia.filter((m) => m.concluida).length
    const pct = doDia.length > 0 ? Math.round((concluidas / doDia.length) * 100) : -1
    resultado.push({ data, pct, total: doDia.length, concluidas })
  }
  return resultado
}

export function corHeatmap(pct: number): string {
  if (pct < 0) return 'rgba(255,255,255,0.04)'
  if (pct === 0) return 'rgba(239,68,68,0.25)'
  if (pct < 50) return 'rgba(34,197,94,0.25)'
  if (pct < 100) return 'rgba(34,197,94,0.55)'
  return '#22C55E'
}

// ─────────────────────────────────────────────
// Resumo semanal
// ─────────────────────────────────────────────

export interface ResumoSemanal {
  totalConcluidas: number
  totalMetas: number
  melhorDia: { data: string; pct: number } | null
  socioDestaque: { socio: PerfilUsuario; pct: number } | null
}

export function calcularResumoSemanal(metas: MetaDiaria[]): ResumoSemanal {
  const hoje = hojeISO()
  const inicioSemana = deslocarData(hoje, -6)
  const daSemana = metas.filter((m) => m.data >= inicioSemana && m.data <= hoje)

  const totalConcluidas = daSemana.filter((m) => m.concluida).length
  const totalMetas = daSemana.length

  const porDia = new Map<string, MetaDiaria[]>()
  daSemana.forEach((m) => {
    if (!porDia.has(m.data)) porDia.set(m.data, [])
    porDia.get(m.data)!.push(m)
  })
  let melhorDia: ResumoSemanal['melhorDia'] = null
  porDia.forEach((doDia, data) => {
    const pct = doDia.length > 0 ? Math.round((doDia.filter((m) => m.concluida).length / doDia.length) * 100) : 0
    if (!melhorDia || pct > melhorDia.pct) melhorDia = { data, pct }
  })

  let socioDestaque: ResumoSemanal['socioDestaque'] = null
  SOCIOS.forEach(({ id }) => {
    const doSocio = daSemana.filter((m) => m.escopo === 'individual' && m.responsavel === id)
    if (doSocio.length === 0) return
    const pct = Math.round((doSocio.filter((m) => m.concluida).length / doSocio.length) * 100)
    if (!socioDestaque || pct > socioDestaque.pct) socioDestaque = { socio: id, pct }
  })

  return { totalConcluidas, totalMetas, melhorDia, socioDestaque }
}

// ─────────────────────────────────────────────
// Templates de metas do negócio
// ─────────────────────────────────────────────

export interface TemplateMeta {
  titulo: string
  tipo: TipoMeta
  categoria: CategoriaMeta
  valorAlvo: number | null
  unidade: string | null
}

export const TEMPLATES_POR_SOCIO: Record<PerfilUsuario, TemplateMeta[]> = {
  joao: [
    { titulo: 'DMs para creators',    tipo: 'numerica', categoria: 'creators', valorAlvo: 5, unidade: 'dm' },
    { titulo: 'Criativo novo',        tipo: 'numerica', categoria: 'ads',      valorAlvo: 1, unidade: 'criativo' },
  ],
  matheus: [
    { titulo: 'Contatos B2B',  tipo: 'numerica', categoria: 'b2b',    valorAlvo: 3, unidade: 'contato' },
    { titulo: 'Follow-ups',    tipo: 'numerica', categoria: 'b2b',    valorAlvo: 2, unidade: 'follow-up' },
  ],
  gabriel: [
    { titulo: 'Frascos envasados', tipo: 'numerica', categoria: 'producao', valorAlvo: 150, unidade: 'frasco' },
  ],
}

export const TIPO_LABEL: Record<TipoMeta, string> = { numerica: 'Numérica', checklist: 'Checklist' }
export const ESCOPO_LABEL: Record<EscopoMeta, string> = { individual: 'Individual', time: 'Time' }
