import type { CategoriaMeta } from '@/store'
import type { SocioAtivo } from '@/lib/socios'

/**
 * Agenda de 4h por sócio, dividida em blocos.
 * Guia visual de organização do dia — não é timer.
 * Cada bloco aponta para as categorias de metas que ele "alimenta".
 */
export interface BlocoRotina {
  numero: number
  minutos: number
  titulo: string
  descricao: string
  categorias: CategoriaMeta[]
}

export const ROTINAS: Record<SocioAtivo, BlocoRotina[]> = {
  matheus: [
    { numero: 1, minutos: 90, titulo: 'B2B de campo',        descricao: 'Prospecção + 4 abordagens + follow-ups D+21',           categorias: ['b2b'] },
    { numero: 2, minutos: 60, titulo: 'Pós-venda & CRM',     descricao: 'Rotina de 20min, responder clientes, pesquisas',        categorias: ['posvenda'] },
    { numero: 3, minutos: 45, titulo: 'Caixa & logística',   descricao: 'Pedidos pagos, contribuição, coordenar Goiânia',        categorias: ['financeiro', 'logistica'] },
    { numero: 4, minutos: 45, titulo: 'Fechamento ativo',    descricao: 'Ligações, propostas, atualizar placar',                 categorias: ['vendas'] },
  ],
  joao: [
    { numero: 1, minutos: 90, titulo: 'Conteúdo/produção',   descricao: '1 criativo: roteiro → captação → edição',               categorias: ['conteudo'] },
    { numero: 2, minutos: 60, titulo: 'Creators & UGC',      descricao: 'DMs, acompanhar quem postou, PURION GARAGE',            categorias: ['creators'] },
    { numero: 3, minutos: 45, titulo: 'Tráfego/ads',         descricao: 'Campanhas, métricas, UTMs, experimento ICE',            categorias: ['ads'] },
    { numero: 4, minutos: 45, titulo: 'Site & growth',       descricao: 'Página, carrinho, funil, growth review',                categorias: ['growth'] },
  ],
}

/** "1h30" / "45min" */
export function formatarDuracao(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Janela relativa dentro das 4h: "0:00–1:30" */
export function janelaBloco(blocos: BlocoRotina[], idx: number): string {
  const inicio = blocos.slice(0, idx).reduce((s, b) => s + b.minutos, 0)
  const fim = inicio + blocos[idx].minutos
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  return `${fmt(inicio)}–${fmt(fim)}`
}
