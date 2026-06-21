import {
  BookOpen, Target, Gem, TrendingUp, Handshake, Settings, DollarSign,
  FileText, Star, Megaphone, Package, Users, Shield, Briefcase,
  Lightbulb, Calendar, Rocket, Globe, Heart, Flag,
} from 'lucide-react'
import type { TipoBloco, ConteudoBloco } from '@/store'

export const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Target, Gem, TrendingUp, Handshake, Settings, DollarSign,
  FileText, Star, Megaphone, Package, Users, Shield, Briefcase,
  Lightbulb, Calendar, Rocket, Globe, Heart, Flag,
}

export function resolverIcone(nome: string): React.ElementType {
  return ICON_MAP[nome] ?? BookOpen
}

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
}

export const TIPOS_BLOCO_MENU: TipoBloco[] = [
  'paragrafo', 'titulo', 'subtitulo', 'lista', 'checklist', 'citacao', 'callout', 'tabela', 'codigo', 'divisor',
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
    case 'divisor':
      return {}
  }
}
