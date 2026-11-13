/** TikTok Command Center — tipos e rótulos (fonte única). */

export const STATUS_VIDEO = [
  'ideia', 'roteiro', 'aprovacao_roteiro', 'producao', 'edicao', 'aprovacao_final', 'agendado', 'publicado', 'analisado', 'arquivado',
] as const
export type StatusVideo = typeof STATUS_VIDEO[number]

export const STATUS_INFO: Record<StatusVideo, { label: string; cor: string; curto: string }> = {
  ideia:             { label: 'Ideia',               curto: 'Ideia',      cor: '#A7A9A6' },
  roteiro:           { label: 'Roteiro',             curto: 'Roteiro',    cor: '#9CC3DB' },
  aprovacao_roteiro: { label: 'Aprovar roteiro',     curto: 'Aprovar',    cor: '#E6C374' },
  producao:          { label: 'Gravação',            curto: 'Gravação',   cor: '#4A90D9' },
  edicao:            { label: 'Edição',              curto: 'Edição',     cor: '#8F7CE6' },
  aprovacao_final:   { label: 'Aprovar corte final', curto: 'Aprovar',    cor: '#E6C374' },
  agendado:          { label: 'Agendado',            curto: 'Agendado',   cor: '#8FD14F' },
  publicado:         { label: 'Publicado',           curto: 'Publicado',  cor: '#D4FC3C' },
  analisado:         { label: 'Analisado',           curto: 'Analisado',  cor: '#2E9E5B' },
  arquivado:         { label: 'Arquivado',           curto: 'Arquivado',  cor: '#6B6B6B' },
}

/** Colunas do quadro (arquivado fica fora). */
export const COLUNAS_STUDIO: StatusVideo[] = ['ideia', 'roteiro', 'aprovacao_roteiro', 'producao', 'edicao', 'aprovacao_final', 'agendado', 'publicado', 'analisado']

/** Mudanças de status que só master/admin podem fazer (aprovações). */
export function exigeAprovacao(de: StatusVideo, para: StatusVideo): boolean {
  return (de === 'aprovacao_roteiro' && ['producao', 'edicao', 'aprovacao_final', 'agendado', 'publicado'].includes(para))
    || (de === 'aprovacao_final' && ['agendado', 'publicado'].includes(para))
}

export const ordemStatus = (s: StatusVideo) => STATUS_VIDEO.indexOf(s)
export const jaPublicado = (s: StatusVideo) => s === 'publicado' || s === 'analisado'

export const OBJETIVOS = { awareness: 'Awareness', consideracao: 'Consideração', conversao: 'Conversão', recompra: 'Recompra', presente: 'Presente' } as const
export type ObjetivoComercial = keyof typeof OBJETIVOS

export const FORMATOS = { ugc: 'UGC', lifestyle: 'Lifestyle automotivo', produto: 'Produto', tutorial: 'Tutorial', trend: 'Trend', depoimento: 'Depoimento', unboxing: 'Unboxing', bastidor: 'Bastidor', presente: 'Presente' } as const
export const GANCHOS = { pergunta: 'Pergunta', choque: 'Choque', antes_depois: 'Antes/depois', pov: 'POV', prova: 'Prova', lista: 'Lista', historia: 'História', sensorial: 'Sensorial' } as const
export const DIREITOS = { nenhum: 'Sem direito', organico: 'Só orgânico', ads_30d: 'Ads 30 dias', ads_90d: 'Ads 90 dias', ads_ilimitado: 'Ads ilimitado' } as const
export type DireitoUso = keyof typeof DIREITOS

export type Prioridade = 'alta' | 'media' | 'baixa'

export interface Video {
  id: string
  codigo: string
  titulo: string
  pilar: string | null
  campanhaId: string | null
  objetivoComercial: ObjetivoComercial
  publico: string | null
  formato: string | null
  gancho: string | null
  ganchoTipo: string | null
  roteiro: string | null
  cta: string | null
  duracaoSeg: number | null
  status: StatusVideo
  prioridade: Prioridade
  responsavel: string
  creatorId: string | null
  colaboracaoId: string | null
  dataGravacao: string | null
  dataPrevista: string | null
  thumbnailPath: string | null
  direitosUso: DireitoUso
  direitosAte: string | null
  custoProducao: number
  proximasAcoes: string | null
  aprendizado: string | null
  notas: string | null
  scoreIdeia: number | null
  aprovadoPor: string | null
  aprovadoEm: string | null
  statusDesde: string
  createdAt: string
  updatedAt: string
}

export const TIPOS_CAMPANHA = { organica: 'Orgânica', paga: 'Paga', comercial: 'Comercial', creator: 'Creators', shop: 'TikTok Shop' } as const
export const STATUS_CAMPANHA = { planejada: 'Planejada', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' } as const
export const METAS = { views: 'Views', cliques: 'Cliques', vendas: 'Vendas', seguidores: 'Seguidores' } as const

export interface Campanha {
  id: string
  nome: string
  tipo: keyof typeof TIPOS_CAMPANHA
  objetivoId: string | null
  status: keyof typeof STATUS_CAMPANHA
  inicio: string | null
  fim: string | null
  orcamentoPrevisto: number
  publico: string | null
  hipotese: string | null
  metaPrincipal: keyof typeof METAS
  metaValor: number | null
  utmCampaign: string | null
  responsavel: string
}

export interface Publicacao {
  id: string
  videoId: string
  varianteId: string | null
  conta: string | null
  url: string | null
  tiktokItemId: string | null
  publicadoEm: string
  tipo: 'organico' | 'spark_ad' | 'ad' | 'creator'
  utmContent: string | null
  cupom: string | null
}

export interface Metrica {
  id: string
  publicacaoId: string
  dataReferencia: string
  views: number
  likes: number
  comentarios: number
  compartilhamentos: number
  salvos: number
  seguidoresGanhos: number | null
  tempoMedioSeg: number | null
  retencao3s: number | null
  conclusaoPct: number | null
  cliques: number | null
  gasto: number | null
  origem: string
}

export const ETAPAS_COLAB = ['prospect', 'contatado', 'negociando', 'fechado', 'amostra_enviada', 'produzindo', 'entregue', 'pago', 'encerrado', 'recusado'] as const
export type EtapaColab = typeof ETAPAS_COLAB[number]
export const ETAPA_INFO: Record<EtapaColab, string> = {
  prospect: 'Prospect', contatado: 'Contatado', negociando: 'Negociando', fechado: 'Fechado', amostra_enviada: 'Amostra enviada',
  produzindo: 'Produzindo', entregue: 'Entregue', pago: 'Pago', encerrado: 'Encerrado', recusado: 'Recusado',
}
/** Colunas do funil (encerrado/recusado ficam na lista). */
export const COLUNAS_FUNIL: EtapaColab[] = ['prospect', 'contatado', 'negociando', 'fechado', 'amostra_enviada', 'produzindo', 'entregue', 'pago']
export const ACORDOS = { permuta: 'Permuta', cache: 'Cachê', comissao: 'Comissão', hibrido: 'Híbrido' } as const

export interface Colaboracao {
  id: string
  creatorId: string
  campanhaId: string | null
  etapa: EtapaColab
  tipoAcordo: keyof typeof ACORDOS
  cache: number
  comissaoPct: number
  cupom: string | null
  prazoEntrega: string | null
  direitosUso: DireitoUso
  direitosAte: string | null
  contratoUrl: string | null
  responsavel: string
  notas: string | null
  updatedAt: string
}

export const STATUS_ENTREGA = { pendente: 'Pendente', recebida: 'Recebida', ajuste: 'Ajuste pedido', aprovada: 'Aprovada', publicada: 'Publicada' } as const
export interface Entrega {
  id: string
  colaboracaoId: string
  videoId: string | null
  descricao: string
  prazo: string | null
  status: keyof typeof STATUS_ENTREGA
  recebidaEm: string | null
  link: string | null
}

export interface Atribuicao {
  id: string
  vendaId: string
  videoId: string | null
  publicacaoId: string | null
  campanhaId: string | null
  creatorId: string | null
  metodo: 'cupom' | 'utm' | 'link_afiliado' | 'tiktok_shop' | 'manual'
  valor: number
  confianca: 'alta' | 'media' | 'baixa'
}

export interface Variante {
  id: string
  videoId: string
  rotulo: string
  oQueMuda: string
  descricao: string | null
  gancho: string | null
  duracaoSeg: number | null
  status: string
}

export interface Asset {
  id: string
  videoId: string
  tipo: string
  nome: string
  storagePath: string | null
  urlExterna: string | null
  mime: string | null
  tamanho: number | null
  createdAt: string
}

export interface HistoricoItem {
  id: string
  deStatus: string | null
  paraStatus: string | null
  autor: string | null
  comentario: string | null
  createdAt: string
}
