import { describe, expect, it } from 'vitest'
import { compararVariantes, desempenhoPorDimensao, percentil, totaisPorVideo, ultimoSnapshotPorPublicacao, AMOSTRA_MIN } from '../inteligencia'
import { gerarAlertas } from '../automacoes'
import { exigeAprovacao, type Metrica, type Publicacao, type Video } from '../tipos'

const video = (over: Partial<Video> = {}): Video => ({
  id: 'v1', codigo: 'TT-0001', titulo: 'Teste', pilar: 'Lifestyle', campanhaId: null, objetivoComercial: 'awareness',
  publico: null, formato: 'ugc', gancho: null, ganchoTipo: 'pov', roteiro: null, cta: null, duracaoSeg: 20,
  status: 'ideia', prioridade: 'media', responsavel: 'matheus', creatorId: null, colaboracaoId: null,
  dataGravacao: null, dataPrevista: null, thumbnailPath: null, direitosUso: 'organico', direitosAte: null,
  custoProducao: 0, proximasAcoes: null, aprendizado: null, notas: null, scoreIdeia: null, aprovadoPor: null,
  aprovadoEm: null, statusDesde: '2026-11-01T12:00:00Z', createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-01T12:00:00Z', ...over,
})
const metrica = (over: Partial<Metrica>): Metrica => ({
  id: Math.random().toString(), publicacaoId: 'p1', dataReferencia: '2026-11-01', views: 0, likes: 0, comentarios: 0,
  compartilhamentos: 0, salvos: 0, seguidoresGanhos: null, tempoMedioSeg: null, retencao3s: null, conclusaoPct: null,
  cliques: null, gasto: null, origem: 'manual', ...over,
})
const pub = (id: string, videoId: string, publicadoEm = '2026-10-01T12:00:00Z'): Publicacao => ({
  id, videoId, varianteId: null, conta: null, url: null, tiktokItemId: null, publicadoEm, tipo: 'organico', utmContent: null, cupom: null,
})
const AGORA = new Date('2026-11-13T12:00:00Z')

describe('métricas', () => {
  it('usa o snapshot mais recente e, no empate, a API vence o manual', () => {
    const ult = ultimoSnapshotPorPublicacao([
      metrica({ dataReferencia: '2026-11-01', views: 100 }),
      metrica({ dataReferencia: '2026-11-05', views: 500 }),
      metrica({ dataReferencia: '2026-11-05', views: 520, origem: 'api_display' }),
    ])
    expect(ult.get('p1')?.views).toBe(520)
  })
  it('soma publicações do mesmo vídeo sem contar snapshots antigos', () => {
    const t = totaisPorVideo([pub('p1', 'v1'), pub('p2', 'v1')], [
      metrica({ publicacaoId: 'p1', views: 100 }), metrica({ publicacaoId: 'p1', dataReferencia: '2026-11-02', views: 300 }),
      metrica({ publicacaoId: 'p2', views: 50 }),
    ], [{ videoId: 'v1', valor: 97.9 }])
    expect(t.get('v1')).toMatchObject({ views: 350, vendas: 1, receita: 97.9 })
  })
  it('percentil interpola', () => {
    expect(percentil([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(percentil([], 0.5)).toBeNull()
  })
})

describe('inteligência', () => {
  it('não considera suficiente um grupo abaixo da amostra mínima', () => {
    const videos = Array.from({ length: AMOSTRA_MIN - 1 }, (_, i) => video({ id: `v${i}` }))
    const pubs = videos.map((v, i) => pub(`p${i}`, v.id, `2026-0${(i % 3) + 7}-10T12:00:00Z`))
    const mets = pubs.map((p) => metrica({ publicacaoId: p.id, views: 1000 }))
    const [g] = desempenhoPorDimensao(videos, totaisPorVideo(pubs, mets), 'ganchoTipo')
    expect(g.n).toBe(AMOSTRA_MIN - 1)
    expect(g.suficiente).toBe(false)
  })
  it('é suficiente com n e semanas mínimos', () => {
    const videos = Array.from({ length: AMOSTRA_MIN }, (_, i) => video({ id: `v${i}` }))
    const pubs = videos.map((v, i) => pub(`p${i}`, v.id, `2026-0${(i % 3) + 7}-10T12:00:00Z`))
    const mets = pubs.map((p) => metrica({ publicacaoId: p.id, views: 1000 }))
    expect(desempenhoPorDimensao(videos, totaisPorVideo(pubs, mets), 'ganchoTipo')[0].suficiente).toBe(true)
  })
  it('variantes: sem vencedor com pouco volume ou diferença pequena', () => {
    expect(compararVariantes({ rotulo: 'A', views: 200, taxa: 0.5 }, { rotulo: 'B', views: 5000, taxa: 0.1 }).vencedor).toBeNull()
    expect(compararVariantes({ rotulo: 'A', views: 5000, taxa: 0.30 }, { rotulo: 'B', views: 5000, taxa: 0.32 }).vencedor).toBeNull()
    expect(compararVariantes({ rotulo: 'A', views: 5000, taxa: 0.30 }, { rotulo: 'B', views: 5000, taxa: 0.45 }).vencedor).toBe('B')
  })
})

describe('regras de status', () => {
  it('pular a aprovação exige master/admin', () => {
    expect(exigeAprovacao('aprovacao_roteiro', 'producao')).toBe(true)
    expect(exigeAprovacao('aprovacao_final', 'agendado')).toBe(true)
    expect(exigeAprovacao('roteiro', 'aprovacao_roteiro')).toBe(false)
    expect(exigeAprovacao('aprovacao_roteiro', 'roteiro')).toBe(false)
  })
})

describe('automações', () => {
  const base = { colaboracoes: [], entregas: [], totais: new Map(), agora: AGORA }
  it('marca atrasado e cria tarefa', () => {
    const a = gerarAlertas({ ...base, videos: [video({ status: 'edicao', dataPrevista: '2026-11-10' })] })
    expect(a.find((x) => x.regra === 'atrasado')).toMatchObject({ criaTarefa: true, prioridade: 'alta', id: 'atrasado:v1' })
  })
  it('ids são estáveis (idempotência)', () => {
    const entrada = { ...base, videos: [video({ status: 'producao' })] }
    expect(gerarAlertas(entrada).map((x) => x.id)).toEqual(gerarAlertas(entrada).map((x) => x.id))
  })
  it('aprovação parada vai para o aprovador', () => {
    const a = gerarAlertas({ ...base, aprovador: 'joao', videos: [video({ status: 'aprovacao_final', statusDesde: '2026-11-09T12:00:00Z' })] })
    expect(a.find((x) => x.regra === 'aprovacao_parada')?.responsavel).toBe('joao')
  })
  it('publicado sem métrica após 3 dias', () => {
    const totais = totaisPorVideo([pub('p1', 'v1', '2026-11-08T12:00:00Z')], [])
    const a = gerarAlertas({ ...base, totais, videos: [video({ status: 'publicado' })] })
    expect(a.some((x) => x.regra === 'sem_metrica')).toBe(true)
  })
  it('não sugere revisar/escalar sem amostra suficiente', () => {
    const videos = Array.from({ length: 5 }, (_, i) => video({ id: `v${i}`, status: 'publicado', direitosUso: 'ads_90d' }))
    const pubs = videos.map((v, i) => pub(`p${i}`, v.id))
    const mets = pubs.map((p, i) => metrica({ publicacaoId: p.id, views: (i + 1) * 1000 }))
    const a = gerarAlertas({ ...base, videos, totais: totaisPorVideo(pubs, mets) })
    expect(a.some((x) => x.regra === 'revisar' || x.regra === 'escalar')).toBe(false)
  })
  it('sugere revisar o quartil de baixo com amostra suficiente, sempre como sugestão', () => {
    const videos = Array.from({ length: AMOSTRA_MIN }, (_, i) => video({ id: `v${i}`, status: 'publicado' }))
    const pubs = videos.map((v, i) => pub(`p${i}`, v.id))
    const mets = pubs.map((p, i) => metrica({ publicacaoId: p.id, views: (i + 1) * 1000 }))
    const rev = gerarAlertas({ ...base, videos, totais: totaisPorVideo(pubs, mets) }).filter((x) => x.regra === 'revisar')
    expect(rev.length).toBeGreaterThan(0)
    expect(rev.every((x) => x.sugestao && !x.criaTarefa)).toBe(true)
  })
})
