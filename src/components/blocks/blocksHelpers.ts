import type { TipoBloco, ConteudoBloco } from '@/store'

export const TIPO_BLOCO_LABEL: Record<TipoBloco, string> = {
  titulo:    'Título',
  subtitulo: 'Subtítulo',
  paragrafo: 'Parágrafo',
  lista:     'Lista',
  checklist: 'Checklist',
  citacao:   'Citação',
  divisor:   'Divisor',
  tabela:    'Tabela',
  callout:   'Destaque',
  codigo:    'Código',
  toggle:    'Toggle',
}

export const TIPOS_BLOCO_MENU: TipoBloco[] = [
  'paragrafo', 'titulo', 'subtitulo', 'lista', 'checklist', 'toggle', 'citacao', 'callout', 'tabela', 'codigo', 'divisor',
]

export function conteudoPadrao(tipo: TipoBloco): ConteudoBloco {
  switch (tipo) {
    case 'titulo':
    case 'subtitulo':
    case 'paragrafo':
    case 'citacao':
    case 'codigo':
      return { texto: '' }
    case 'lista':
      return { itens: [''] }
    case 'checklist':
      return { itens: [{ texto: '', feito: false }] }
    case 'callout':
      return { texto: '', emoji: '💡' }
    case 'tabela':
      return { colunas: ['Coluna 1', 'Coluna 2'], linhas: [['', '']] }
    case 'toggle':
      return { texto: '', conteudo: '', aberto: true }
    case 'divisor':
      return {}
  }
}
