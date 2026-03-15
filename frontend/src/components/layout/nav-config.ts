import {
  LayoutDashboard, Package, ArrowDownCircle, Truck, Users2,
  Thermometer, ChefHat, UtensilsCrossed, Factory, Camera,
  CalendarDays, BarChart3, FileText, Shield, Brain
} from 'lucide-react'

/* ============================================
 * NAVIGATION CONFIGURATION
 *
 * Modify this file to add/remove/reorder nav items.
 * Each category has a label, icon, and items array.
 * Items have: label, path, icon, gerantOnly flag.
 *
 * To add a new page:
 * 1. Add the route in App.tsx
 * 2. Add a nav item here in the appropriate category
 * 3. Both sidebar and mobile nav update automatically
 * ============================================ */

export interface NavItem {
  label: string
  path: string
  icon: any
  gerantOnly?: boolean
}

export interface NavCategory {
  label: string
  icon: any
  items: NavItem[]
}

/* CUSTOMIZATION: Category colors and icons */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Général',
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Assistant IA', path: '/ai', icon: Brain },
    ],
  },
  {
    label: 'Stock',
    icon: Package,
    items: [
      { label: 'Produits', path: '/products', icon: Package, gerantOnly: true },
      { label: 'Sorties', path: '/outputs', icon: ArrowDownCircle },
      { label: 'Livraisons', path: '/deliveries', icon: Truck, gerantOnly: true },
      { label: 'Fournisseurs', path: '/suppliers', icon: Users2, gerantOnly: true },
    ],
  },
  {
    label: 'Cuisine',
    icon: ChefHat,
    items: [
      { label: 'Recettes', path: '/recipes', icon: ChefHat },
      { label: 'Menus', path: '/menus', icon: UtensilsCrossed },
      { label: 'Production', path: '/production', icon: Factory, gerantOnly: true },
    ],
  },
  {
    label: 'Qualité',
    icon: Thermometer,
    items: [
      { label: 'Températures', path: '/temperatures', icon: Thermometer },
      { label: 'Traçabilité', path: '/traceability', icon: Camera },
    ],
  },
  {
    label: 'Planning',
    icon: CalendarDays,
    items: [
      { label: 'Planning', path: '/planning', icon: CalendarDays },
      { label: 'Analytics', path: '/analytics', icon: BarChart3, gerantOnly: true },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    items: [
      { label: 'Journal', path: '/activity-log', icon: FileText, gerantOnly: true },
      { label: 'Permissions', path: '/user-management', icon: Shield, gerantOnly: true },
      { label: 'Utilisateurs', path: '/users', icon: Users2, gerantOnly: true },
    ],
  },
]

/* Flat list for mobile quick nav — customize which 4 items appear in bottom bar */
export const MOBILE_QUICK_NAV: NavItem[] = [
  { label: 'Accueil', path: '/', icon: LayoutDashboard },
  { label: 'Sorties', path: '/outputs', icon: ArrowDownCircle },
  { label: 'Temp.', path: '/temperatures', icon: Thermometer },
  { label: 'IA', path: '/ai', icon: Brain },
]
