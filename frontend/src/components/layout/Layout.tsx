import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut as LogOutIcon, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { ThemeToggle } from '@/components/theme'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { MobileNav } from './MobileNav'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { SyncIndicator, OfflineBanner } from '@/components/offline/SyncIndicator'
import { useOnlineStatus } from '@/hooks/useOfflineSync'
import { GlobalSearch } from './GlobalSearch'
import { AIChatButton } from '@/components/ai/AIChatButton'
import { NAV_CATEGORIES } from './nav-config'

/* ============================================
 * LAYOUT — Desktop sidebar with collapsible categories
 *
 * The nav structure is driven by NAV_CATEGORIES in nav-config.ts.
 * To add new sections or items, edit that file only.
 * ============================================ */

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isGerant, logout } = useAuth()
  const isOnline = useOnlineStatus()

  /* CUSTOMIZATION: Change initial open categories by editing this Set */
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(NAV_CATEGORIES.map(c => c.label))
  )

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Offline Banner — fixed at top, pushes sidebar/main down */}
      <OfflineBanner />

      {/* ─── Desktop Sidebar ─── */}
      <aside className={cn(
        /* CUSTOMIZATION: Sidebar width — change w-64 to adjust */
        "w-64 border-r bg-card hidden md:flex flex-col",
        !isOnline && "mt-10"
      )}>

        {/* Logo / App title */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              {/* CUSTOMIZATION: App name and subtitle */}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                StockPro
              </h1>
              <p className="text-sm text-muted-foreground">Clinique Gestion</p>
            </div>
            <SyncIndicator />
          </div>
        </div>

        {/* Global search bar */}
        <div className="px-4 py-2">
          <GlobalSearch />
        </div>

        {/* ─── Collapsible nav categories ─── */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_CATEGORIES.map((category) => {
            /* Filter items: hide gerant-only items for non-gerant users */
            const visibleItems = category.items.filter(
              item => !item.gerantOnly || isGerant
            )

            /* Skip entire category if no visible items */
            if (visibleItems.length === 0) return null

            const isOpen = openCategories.has(category.label)
            const CategoryIcon = category.icon

            /* Check if any item in this category is currently active */
            const hasActiveItem = visibleItems.some(
              item => location.pathname === item.path
            )

            return (
              <div key={category.label}>
                {/* Category header — click to toggle */}
                <button
                  onClick={() => toggleCategory(category.label)}
                  className={cn(
                    /* CUSTOMIZATION: Category header style */
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActiveItem && !isOpen
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-3.5 h-3.5" />
                    {category.label}
                  </div>
                  {/* Chevron rotates when open */}
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>

                {/* Category items — animated expand/collapse */}
                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-2">
                    {visibleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            /* CUSTOMIZATION: Nav item style */
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ─── Sidebar footer: settings, user, logout ─── */}
        <div className="p-4 border-t space-y-2">
          <ThemeToggle />
          <SettingsDialog />
          {/* User info row */}
          <div className="flex items-center gap-2 px-3 py-2 text-sm border-t pt-3 mt-1">
            <span className="text-lg">{user?.avatarEmoji}</span>
            <span className="font-medium truncate flex-1">{user?.displayName}</span>
          </div>
          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOutIcon className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* ─── Main content area ─── */}
      <main className={cn(
        /* CUSTOMIZATION: Background of the content area */
        "flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 pb-20 md:pb-0",
        !isOnline && "mt-10"
      )}>
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />

      <Toaster />

      {/* AI floating chat button — always rendered, degrades when offline */}
      <AIChatButton />
    </div>
  )
}
