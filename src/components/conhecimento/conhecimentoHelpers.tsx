import {
  BookOpen, Target, Gem, TrendingUp, Handshake, Settings, DollarSign,
  FileText, Star, Megaphone, Package, Users, Shield, Briefcase,
  Lightbulb, Calendar, Rocket, Globe, Heart, Flag,
} from 'lucide-react'

export const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Target, Gem, TrendingUp, Handshake, Settings, DollarSign,
  FileText, Star, Megaphone, Package, Users, Shield, Briefcase,
  Lightbulb, Calendar, Rocket, Globe, Heart, Flag,
}

export function resolverIcone(nome: string): React.ElementType {
  return ICON_MAP[nome] ?? BookOpen
}

// Tipos/labels/conteúdo padrão de blocos agora vivem em src/components/blocks/blocksHelpers.ts
// (compartilhado com o editor de blocos da aba Estratégias)
export { TIPO_BLOCO_LABEL, TIPOS_BLOCO_MENU, conteudoPadrao } from '@/components/blocks/blocksHelpers'
