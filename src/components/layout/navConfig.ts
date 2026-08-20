import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Settings,
  BookOpen, Megaphone, Link2, Headphones, Mail, KeyRound, ShoppingBag, Target, Shapes, FlaskConical, Compass, CalendarDays,
} from 'lucide-react'

export interface NavItemConfig {
  /** identificador estável usado em preferencias_menu.aba_key — não muda mesmo se o label mudar */
  key: string
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  masterOnly?: boolean
  /** não pode ser ocultada — trava o toggle para o usuário não se trancar fora do sistema */
  essencial?: boolean
}

export interface NavGroupConfig {
  label: string
  items: NavItemConfig[]
}

/** Fonte única de verdade da navegação — usada por Sidebar, MobileNav e a tela "Personalizar Menu". */
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: 'PRINCIPAL',
    items: [
      { key: 'inicio',      href: '/',            label: 'Início',      icon: LayoutDashboard, essencial: true },
      { key: 'calendario',  href: '/calendario',  label: 'Calendário',  icon: CalendarDays },
      { key: 'estrategias', href: '/estrategias', label: 'Estratégias', icon: Compass },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { key: 'crm',        href: '/crm',        label: 'CRM B2B',      icon: Users },
      { key: 'vendas',     href: '/vendas',     label: 'Vendas',        icon: ShoppingBag },
      { key: 'leads-site', href: '/leads-site', label: 'Leads do Site', icon: Mail },
    ],
  },
  {
    label: 'OPERAÇÃO',
    items: [
      { key: 'tarefas',  href: '/tarefas',  label: 'Tarefas',  icon: CheckSquare },
      { key: 'metas',    href: '/metas',    label: 'Metas',    icon: Target },
      { key: 'quadros',  href: '/quadros',  label: 'Quadros',  icon: Shapes },
      { key: 'producao', href: '/producao', label: 'Produção', icon: Package },
      { key: 'reunioes', href: '/reunioes', label: 'Reuniões', icon: Calendar },
      { key: 'sac',      href: '/sac',      label: 'SAC',      icon: Headphones },
    ],
  },
  {
    label: 'CRESCIMENTO',
    items: [
      { key: 'marketing', href: '/marketing', label: 'Marketing', icon: Megaphone },
      { key: 'creators',  href: '/creators',  label: 'Creators',  icon: Users2 },
      { key: 'growth',    href: '/growth',    label: 'Growth',    icon: FlaskConical },
      { key: 'afiliados', href: '/afiliados', label: 'Afiliados', icon: Link2 },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { key: 'financeiro',   href: '/financeiro',   label: 'Financeiro',       icon: TrendingUp },
      { key: 'relatorios',   href: '/relatorios',   label: 'Relatórios',       icon: BarChart2 },
      { key: 'conhecimento', href: '/conhecimento', label: 'Conhecimento',     icon: BookOpen },
      { key: 'contas',       href: '/contas',       label: 'Contas & Acessos', icon: KeyRound, masterOnly: true },
      { key: 'settings',     href: '/settings',     label: 'Configurações',    icon: Settings, masterOnly: true, essencial: true },
    ],
  },
]

export const TODOS_OS_ITENS: NavItemConfig[] = NAV_GROUPS.flatMap((g) => g.items)

/** Deriva a mesma aba_key a partir do href — usado onde o item não carrega o NavItemConfig completo (ex: MobileNav). */
export function hrefParaChave(href: string): string {
  return href === '/' ? 'inicio' : href.slice(1)
}
