/**
 * Dados demonstrativos — usados SOMENTE em `next dev` sem Supabase configurado.
 * Nunca carregam em produção (checagem de NODE_ENV no hook).
 */
import type { Campanha, Colaboracao, Entrega, Metrica, Publicacao, Video } from './tipos'

const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const base: Omit<Video, 'id' | 'codigo' | 'titulo' | 'status'> = {
  pilar: null, campanhaId: 'c1', objetivoComercial: 'awareness', publico: null, formato: 'ugc', gancho: null, ganchoTipo: 'pov',
  roteiro: null, cta: null, duracaoSeg: 22, prioridade: 'media', responsavel: 'matheus', creatorId: null, colaboracaoId: null,
  dataGravacao: null, dataPrevista: null, thumbnailPath: null, direitosUso: 'organico', direitosAte: null, custoProducao: 0,
  proximasAcoes: null, aprendizado: null, notas: null, scoreIdeia: null, aprovadoPor: null, aprovadoEm: null,
  statusDesde: new Date(Date.now() - 3 * 86_400_000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}
export const DEMO_VIDEOS: Video[] = [
  { ...base, id: 'v1', codigo: 'TT-0001', titulo: 'POV: entrei no carro depois da lavagem', status: 'publicado', pilar: 'Lifestyle', gancho: 'Ninguém fala do cheiro do carro depois da estética', dataPrevista: dia(-9) },
  { ...base, id: 'v2', codigo: 'TT-0002', titulo: 'Unboxing do frasco 60 ml', status: 'publicado', pilar: 'Produto', formato: 'unboxing', ganchoTipo: 'sensorial', dataPrevista: dia(-6) },
  { ...base, id: 'v3', codigo: 'TT-0003', titulo: 'Presente para quem ama o carro', status: 'aprovacao_roteiro', pilar: 'Presente', objetivoComercial: 'presente', roteiro: '0–3s ...', dataPrevista: dia(2) },
  { ...base, id: 'v4', codigo: 'TT-0004', titulo: 'Antes e depois: carro de aplicativo', status: 'producao', pilar: 'Lifestyle', ganchoTipo: 'antes_depois', dataGravacao: dia(1), dataPrevista: dia(4) },
  { ...base, id: 'v5', codigo: 'TT-0005', titulo: '3 erros ao perfumar o carro', status: 'edicao', pilar: 'Educação', ganchoTipo: 'lista', dataPrevista: dia(-1) },
  { ...base, id: 'v6', codigo: 'TT-0006', titulo: 'Ritual de domingo na garagem', status: 'ideia', pilar: 'Lifestyle' },
  { ...base, id: 'v7', codigo: 'TT-0007', titulo: 'Creator testa no Civic', status: 'roteiro', pilar: 'UGC', creatorId: null, dataPrevista: dia(6) },
  { ...base, id: 'v8', codigo: 'TT-0008', titulo: 'Detalhe da válvula e do vidro', status: 'agendado', pilar: 'Produto', dataPrevista: dia(1) },
]
export const DEMO_CAMPANHAS: Campanha[] = [
  { id: 'c1', nome: 'Lançamento orgânico', tipo: 'organica', objetivoId: null, status: 'ativa', inicio: dia(-20), fim: dia(40), orcamentoPrevisto: 1500,
    publico: 'Homens 25–45 com carro próprio', hipotese: 'POV no carro gera mais views que vídeo de produto', metaPrincipal: 'views', metaValor: 100000, utmCampaign: 'lancamento_organico', responsavel: 'matheus' },
]
export const DEMO_PUBLICACOES: Publicacao[] = [
  { id: 'p1', videoId: 'v1', varianteId: null, conta: '@purionbrasil', url: null, tiktokItemId: null, publicadoEm: new Date(Date.now() - 9 * 86_400_000).toISOString(), tipo: 'organico', utmContent: 'tt-0001', cupom: null },
  { id: 'p2', videoId: 'v2', varianteId: null, conta: '@purionbrasil', url: null, tiktokItemId: null, publicadoEm: new Date(Date.now() - 6 * 86_400_000).toISOString(), tipo: 'organico', utmContent: 'tt-0002', cupom: null },
]
const m = (id: string, publicacaoId: string, views: number, conclusaoPct: number): Metrica => ({
  id, publicacaoId, dataReferencia: dia(-1), views, likes: Math.round(views * 0.06), comentarios: Math.round(views * 0.004), compartilhamentos: Math.round(views * 0.003),
  salvos: Math.round(views * 0.005), seguidoresGanhos: null, tempoMedioSeg: null, retencao3s: null, conclusaoPct, cliques: null, gasto: null, origem: 'manual',
})
export const DEMO_METRICAS: Metrica[] = [m('m1', 'p1', 18400, 31.5), m('m2', 'p2', 6200, 22.1)]
export const DEMO_COLABS: Colaboracao[] = [
  { id: 'k1', creatorId: 'demo-creator', campanhaId: 'c1', etapa: 'amostra_enviada', tipoAcordo: 'hibrido', cache: 400, comissaoPct: 10, cupom: 'DEMO10', prazoEntrega: dia(-2),
    direitosUso: 'ads_90d', direitosAte: dia(85), contratoUrl: null, responsavel: 'joao', notas: null, updatedAt: new Date(Date.now() - 8 * 86_400_000).toISOString() },
]
export const DEMO_ENTREGAS: Entrega[] = [
  { id: 'e1', colaboracaoId: 'k1', videoId: null, descricao: '1 vídeo POV no carro, 30s', prazo: dia(-2), status: 'pendente', recebidaEm: null, link: null },
]
