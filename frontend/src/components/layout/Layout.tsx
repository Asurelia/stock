import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Home, LogOut, Truck, Users, ChefHat, ClipboardList, BarChart, Thermometer, Camera, Calculator, CalendarDays, FileText, UserCog, LogOut as LogOutIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/theme';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { MobileNav } from './MobileNav';
import { SyncIndicator, OfflineBanner } from '@/components/offline/SyncIndicator';
import { useOnlineStatus } from '@/hooks/useOfflineSync';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/', gerantOnly: false },
  { icon: Package, label: 'Produits', path: '/products', gerantOnly: true },
  { icon: LogOut, label: 'Sorties', path: '/outputs', gerantOnly: false },
  { icon: Truck, label: 'Livraisons', path: '/deliveries', gerantOnly: true },
  { icon: Users, label: 'Fournisseurs', path: '/suppliers', gerantOnly: true },
  { icon: Thermometer, label: 'Temperatures', path: '/temperatures', gerantOnly: false },
  { icon: ChefHat, label: 'Recettes', path: '/recipes', gerantOnly: false },
  { icon: ClipboardList, label: 'Menus', path: '/menus', gerantOnly: false },
  { icon: Calculator, label: 'Production', path: '/production', gerantOnly: true },
  { icon: Camera, label: 'Tracabilite', path: '/traceability', gerantOnly: false },
  { icon: CalendarDays, label: 'Planning', path: '/planning', gerantOnly: false },
  { icon: BarChart, label: 'Analytics', path: '/analytics', gerantOnly: true },
  { icon: FileText, label: 'Journal', path: '/activity-log', gerantOnly: true },
  { icon: Shield, label: 'Permissions', path: '/user-management', gerantOnly: true },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGerant, logout } = useAuth();
  const isOnline = useOnlineStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavLinks = () => navItems
    .filter(item => !item.gerantOnly || isGerant)
    .map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;

      return (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="flex h-screen bg-background">
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Desktop Sidebar */}
      <aside className={cn(
        "w-64 border-r bg-card hidden md:flex flex-col",
        !isOnline && "mt-10"
      )}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                StockPro
              </h1>
              <p className="text-sm text-muted-foreground">Clinique Gestion</p>
            </div>
            <SyncIndicator />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        <div className="p-4 border-t space-y-3">
          <ThemeToggle />
          {isGerant && (
            <Link
              to="/users"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <UserCog className="w-4 h-4" />
              Utilisateurs
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-2 text-sm border-t pt-3">
            <span className="text-lg">{user?.avatarEmoji}</span>
            <span className="font-medium truncate flex-1">{user?.displayName}</span>
          </div>
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

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 pb-20 md:pb-0",
        !isOnline && "mt-10"
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      <Toaster />
    </div>
  );
}
