// Tipos compartilhados entre route handlers e o dashboard de tráfego

export type TrafegoPeriod = '7d' | '14d' | '30d' | 'month'
export type TrafegoStatus = 'ok' | 'no_credentials' | 'auth_error' | 'api_error'

export interface TrafegoCampanha {
  id: string
  nome: string
  status: string
  gasto: number
  conversoes: number
  roas: number
  cpa: number
}

export interface TrafegoDaily {
  data: string   // 'DD/MM'
  gasto: number
}

export interface TrafegoApiResponse {
  status: TrafegoStatus
  gasto: number
  impressoes: number
  cliques: number
  ctr: number        // %
  cpm: number        // R$
  cpc: number        // R$
  conversoes: number
  cpa: number        // R$
  roas: number
  campanhas: TrafegoCampanha[]
  diario: TrafegoDaily[]
  ultimaAtualizacao: string
  erro?: string
}

export const TRAFEGO_VAZIO: TrafegoApiResponse = {
  status: 'ok',
  gasto: 0, impressoes: 0, cliques: 0,
  ctr: 0, cpm: 0, cpc: 0,
  conversoes: 0, cpa: 0, roas: 0,
  campanhas: [], diario: [],
  ultimaAtualizacao: new Date().toISOString(),
}
