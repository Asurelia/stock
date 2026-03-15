import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MoreHorizontal, LogOut as LogOutIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme'
import { useAuth } from '@/lib/auth'
import { useHaptics } from '@/hooks/useCapacitor'
import { SyncIndicatorCompact } from '@/components/offline/SyncIndicator'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { GlobalSearch } from './GlobalSearch'
import { NAV_CATEGORIES, MOBILE_QUICK_NAV } from './nav-config'

/* ============================================
 * MOBILE NAV
 *
 * Bottom bar uses MOBILE_QUICK_NAV from nav-config.ts.
 * The "More" sheet uses NAV_CATEGORIES (same as desktop).
 * To change which items appear in the bottom bar, edit
 * MOBILE_QUICK_NAV in nav-config.ts.
 * ============================================ */

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isGerant, logout } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { vibrate } = useHaptics()

  const handleLogout = () => {
    logout()
    navigate('/login')
    setSheetOpen(false)
  }

  const handleMoreClick = () => {
    vibrate('light')
    setSheetOpen(true)
  }

  const handleQuickNavClick = () => {
    vibrate('light')
  }

  return (
    <>
      {/* ─── Bottom Navigation Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">

          {/* CUSTOMIZATION: Quick nav items from MOBILE_QUICK_NAV in nav-config.ts */}
          {MOBILE_QUICK_NAV.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleQuickNavClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200 active:scale-95",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* "More" button opens the full sheet menu */}
          <button
            onClick={handleMoreClick}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200 active:scale-95",
              sheetOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>

        </div>
      </nav>

      {/* ─── Full Menu Sheet (grouped by category) ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">

          {/* Sheet header with user info */}
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{user?.avatarEmoji}</span>
                <div>
                  <SheetTitle className="text-left">{user?.displayName}</SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {isGerant ? 'Gérant' : 'Employé'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SyncIndicatorCompact />
                <ThemeToggle />
              </div>
            </div>
          </SheetHeader>

          {/* Global search inside sheet */}
          <div className="px-4 py-2">
            <GlobalSearch />
          </div>

          {/* ─── Categorised nav grid ─── */}
          <div className="py-4 overflow-y-auto max-h-[calc(85vh-240px)] space-y-4">
            {NAV_CATEGORIES.map((category) => {
              /* Filter gerant-only items */
              const visibleItems = category.items.filter(
                item => !item.gerantOnly || isGerant
              )

              if (visibleItems.length === 0) return null

              return (
                <div key={category.label}>
                  {/* CUSTOMIZATION: Category label style in sheet */}
                  <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {category.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {visibleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSheetOpen(false)}
                          className={cn(
                            /* CUSTOMIZATION: Sheet grid item style */
                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-95",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                              : "bg-accent/50 hover:bg-accent text-foreground"
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-medium text-center">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sheet footer: settings + logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card safe-area-bottom">
            <SettingsDialog />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
              onClick={handleLogout}
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </Button>
          </div>

        </SheetContent>
      </Sheet>
    </>
  )
}
