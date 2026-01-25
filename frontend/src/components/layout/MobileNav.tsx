import { Link, useLocation } from 'react-router-dom';
import { Home, LogOut, Thermometer, Camera, CalendarDays, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Package, Truck, Users, ChefHat, ClipboardList, BarChart, Calculator, FileText, UserCog, Shield, LogOut as LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/hooks/useCapacitor';

// Quick access items for bottom nav (most used)
const quickNavItems = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: LogOut, label: 'Sorties', path: '/outputs' },
  { icon: Thermometer, label: 'Temp', path: '/temperatures' },
  { icon: Camera, label: 'Photos', path: '/traceability' },
  { icon: MoreHorizontal, label: 'Plus', path: 'more' },
];

// All menu items for the "More" sheet
const allNavItems = [
  { icon: Home, label: 'Dashboard', path: '/', gerantOnly: false },
  { icon: Package, label: 'Produits', path: '/products', gerantOnly: true },
  { icon: LogOut, label: 'Sorties', path: '/outputs', gerantOnly: false },
  { icon: Truck, label: 'Livraisons', path: '/deliveries', gerantOnly: true },
  { icon: Users, label: 'Fournisseurs', path: '/suppliers', gerantOnly: true },
  { icon: Thermometer, label: 'Températures', path: '/temperatures', gerantOnly: false },
  { icon: ChefHat, label: 'Recettes', path: '/recipes', gerantOnly: false },
  { icon: ClipboardList, label: 'Menus', path: '/menus', gerantOnly: false },
  { icon: Calculator, label: 'Production', path: '/production', gerantOnly: true },
  { icon: Camera, label: 'Traçabilité', path: '/traceability', gerantOnly: false },
  { icon: CalendarDays, label: 'Planning', path: '/planning', gerantOnly: false },
  { icon: BarChart, label: 'Analytics', path: '/analytics', gerantOnly: true },
  { icon: FileText, label: 'Journal', path: '/activity-log', gerantOnly: true },
  { icon: Shield, label: 'Permissions', path: '/user-management', gerantOnly: true },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGerant, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { vibrate } = useHaptics();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setSheetOpen(false);
  };

  const handleNavClick = (path: string) => {
    vibrate('light');
    if (path === 'more') {
      setSheetOpen(true);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path !== 'more' && location.pathname === item.path;
            const isMore = item.path === 'more';

            if (isMore) {
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200 active:scale-95",
                    sheetOpen
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
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
            );
          })}
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
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
              <ThemeToggle />
            </div>
          </SheetHeader>

          <div className="py-4 overflow-y-auto max-h-[calc(85vh-180px)]">
            <div className="grid grid-cols-3 gap-3">
              {allNavItems
                .filter(item => !item.gerantOnly || isGerant)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-95",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-accent/50 hover:bg-accent text-foreground"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card safe-area-bottom">
            {isGerant && (
              <Link
                to="/users"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
              >
                <UserCog className="w-5 h-5" />
                <span className="font-medium">Gestion des utilisateurs</span>
              </Link>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
