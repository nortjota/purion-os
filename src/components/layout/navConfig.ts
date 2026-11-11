import {
  LayoutDashboard, Users, CheckSquare, TrendingUp,
  Package, Users2, BarChart2, Calendar, Settings,
  BookOpen, Megaphone, Link2, Headphones, Mail, KeyRound, ShoppingBag, Target, Shapes, FlaskConical, Compass, CalendarDays,
  Truck, HeartHandshake,
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
  /** visível para o perfil de apoio 'logistica' (acesso restrito) */
  logistica?: boolean
}

export interface NavGroupConfig {
  /** identificador estável do grupo (usado para lembrar quais grupos estão recolhidos) */
  id: string
  label: string
  items: NavItemConfig[]
  /** grupo de sistema: não ocupa a navegação — aparece no menu do perfil (rodapé da sidebar) */
  noPerfil?: boolean
}

/**
 * Fonte única de verdade da navegação — usada por Sidebar, MobileNav, paleta de comandos,
 * cabeçalho e a tela "Personalizar Menu".
 *
 * Organização pelo fluxo de uma marca DTC + B2B de produto único:
 * rotina do dia → vender e cuidar do cliente → entregar → crescer → gerir.
 */
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'dia',
    label: 'DIA A DIA',
    items: [
      { key: 'inicio',     href: '/',           label: 'Início',     icon: LayoutDashboard, essencial: true },
      { key: 'tarefas',    href: '/tarefas',    label: 'Tarefas',    icon: CheckSquare },
      { key: 'calendario', href: '/calendario', label: 'Calendário', icon: CalendarDays },
      { key: 'reunioes',   href: '/reunioes',   label: 'Reuniões',   icon: Calendar },
    ],
  },
  {
    id: 'clientes',
    label: 'VENDAS & CLIENTES',
    items: [
      { key: 'vendas',     href: '/vendas',     label: 'Vendas',        icon: ShoppingBag },
      { key: 'crm',        href: '/crm',        label: 'CRM B2B',       icon: Users },
      { key: 'leads-site', href: '/leads-site', label: 'Leads do Site', icon: Mail },
      { key: 'posvenda',   href: '/posvenda',   label: 'Pós-venda',     icon: HeartHandshake },
      { key: 'sac',        href: '/sac',        label: 'SAC',           icon: Headphones },
    ],
  },
  {
    id: 'operacao',
    label: 'OPERAÇÃO',
    items: [
      { key: 'despacho', href: '/despacho', label: 'Despachos', icon: Truck, logistica: true },
      { key: 'producao', href: '/producao', label: 'Produção',  icon: Package },
    ],
  },
  {
    id: 'crescimento',
    label: 'CRESCIMENTO',
    items: [
      { key: 'marketing', href: '/marketing', label: 'Marketing', icon: Megaphone },
      { key: 'creators',  href: '/creators',  label: 'Creators',  icon: Users2 },
      { key: 'afiliados', href: '/afiliados', label: 'Afiliados', icon: Link2 },
      { key: 'growth',    href: '/growth',    label: 'Growth',    icon: FlaskConical },
    ],
  },
  {
    id: 'gestao',
    label: 'GESTÃO',
    items: [
      { key: 'metas',        href: '/metas',        label: 'Metas',        icon: Target },
      { key: 'estrategias',  href: '/estrategias',  label: 'Estratégias',  icon: Compass },
      { key: 'financeiro',   href: '/financeiro',   label: 'Financeiro',   icon: TrendingUp },
      { key: 'relatorios',   href: '/relatorios',   label: 'Relatórios',   icon: BarChart2 },
      { key: 'quadros',      href: '/quadros',      label: 'Quadros',      icon: Shapes },
      { key: 'conhecimento', href: '/conhecimento', label: 'Conhecimento', icon: BookOpen },
    ],
  },
  {
    id: 'sistema',
    label: 'SISTEMA',
    noPerfil: true,
    items: [
      { key: 'contas',   href: '/contas',   label: 'Contas & Acessos', icon: KeyRound, masterOnly: true },
      { key: 'settings', href: '/settings', label: 'Configurações',    icon: Settings, masterOnly: true, essencial: true },
    ],
  },
]

export const TODOS_OS_ITENS: NavItemConfig[] = NAV_GROUPS.flatMap((g) => g.items)

/** Menu do perfil 'logistica': só os itens marcados com `logistica: true`. */
export const NAV_GROUPS_LOGISTICA: NavGroupConfig[] = [
  { id: 'logistica', label: 'LOGÍSTICA · GOIÂNIA', items: TODOS_OS_ITENS.filter((i) => i.logistica).map((i) => ({ ...i, label: i.key === 'despacho' ? 'Fila de Despacho' : i.label, essencial: true })) },
]

/** Deriva a mesma aba_key a partir do href — usado onde o item não carrega o NavItemConfig completo (ex: MobileNav). */
export function hrefParaChave(href: string): string {
  return href === '/' ? 'inicio' : href.slice(1)
}

/** Páginas que existem mas não ficam no menu (acessadas por dentro de outros módulos ou pela busca). */
export const PAGINAS_EXTRAS: Array<{ href: string; label: string }> = [
  { href: '/trafego',         label: 'Tráfego' },
  { href: '/contabilidade',   label: 'Contabilidade' },
  { href: '/inteligencia',    label: 'Inteligência' },
  { href: '/ugc',             label: 'Doações UGC' },
  { href: '/minha-atividade', label: 'Minha Atividade' },
  { href: '/planos',          label: 'Planos' },
  { href: '/diagnostico',     label: 'Diagnóstico' },
]

/** Grupo do menu a que um pathname pertence (ex.: "Vendas & Clientes") — usado no breadcrumb. */
export function grupoDoModulo(pathname: string): string {
  const casa = (href: string) => href === '/' ? pathname === '/' : (pathname === href || pathname.startsWith(`${href}/`))
  const grupo = NAV_GROUPS.find((g) => g.items.some((i) => casa(i.href)))
  if (!grupo) return ''
  return grupo.label.charAt(0) + grupo.label.slice(1).toLowerCase()
}

/** Nome do módulo para um pathname (casa pelo prefixo mais longo). */
export function nomeDoModulo(pathname: string): string {
  if (pathname === '/') return 'Início'
  const todas = [...TODOS_OS_ITENS.map((i) => ({ href: i.href, label: i.label })), ...PAGINAS_EXTRAS]
    .filter((p) => p.href !== '/')
    .sort((a, b) => b.href.length - a.href.length)
  return todas.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))?.label ?? ''
}
