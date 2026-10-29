import {
  BarChart3,
  Blocks,
  Bot,
  CreditCard,
  FileText,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  ListTree,
  MessageCircle,
  Plug,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  labelKey: string
  to: string
  icon: LucideIcon
  /** Only show to admins (is_staff). */
  adminOnly?: boolean
  /** Exact match for the index route. */
  end?: boolean
}

export interface NavSection {
  titleKey: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    titleKey: 'nav.section.overview',
    items: [
      { labelKey: 'nav.dashboard', to: '/', icon: LayoutDashboard, end: true },
      { labelKey: 'nav.analytics', to: '/analytics', icon: BarChart3 },
    ],
  },
  {
    titleKey: 'nav.section.orders',
    items: [{ labelKey: 'nav.orders', to: '/orders', icon: ShoppingBag }],
  },
  {
    titleKey: 'nav.section.assistant',
    items: [
      { labelKey: 'nav.chat', to: '/chat', icon: MessageCircle },
      { labelKey: 'nav.config', to: '/config', icon: Bot },
    ],
  },
  {
    titleKey: 'nav.section.knowledge',
    items: [
      { labelKey: 'nav.documents', to: '/documents', icon: FileText },
      { labelKey: 'nav.api', to: '/knowledge/api', icon: Plug },
      { labelKey: 'nav.chunks', to: '/knowledge/chunks', icon: Blocks },
      { labelKey: 'nav.tree', to: '/knowledge/tree', icon: ListTree },
      { labelKey: 'nav.gaps', to: '/knowledge/gaps', icon: HelpCircle },
    ],
  },
  {
    titleKey: 'nav.section.channels',
    items: [{ labelKey: 'nav.whatsapp', to: '/whatsapp', icon: MessageCircle }],
  },
  {
    titleKey: 'nav.section.administration',
    items: [
      { labelKey: 'nav.users', to: '/admin/users', icon: Users, adminOnly: true },
      { labelKey: 'nav.apiKeys', to: '/admin/api-keys', icon: KeyRound, adminOnly: true },
      { labelKey: 'nav.plans', to: '/admin/plans', icon: CreditCard, adminOnly: true },
    ],
  },
  {
    titleKey: 'nav.section.account',
    items: [
      { labelKey: 'nav.billing', to: '/billing', icon: Wallet },
      { labelKey: 'nav.settings', to: '/settings', icon: Settings },
    ],
  },
]
