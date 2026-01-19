import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, Home, LogOut, Truck, Users, ChefHat, ClipboardList, Settings, BarChart, Thermometer, Camera, Menu, X, Calculator, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/theme';
import { Button } from '@/components/ui/button';

const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Produits', path: '/products' },
    { icon: LogOut, label: 'Sorties', path: '/outputs' },
    { icon: Truck, label: 'Livraisons', path: '/deliveries' },
    { icon: Users, label: 'Fournisseurs', path: '/suppliers' },
    { icon: Thermometer, label: 'Temperatures', path: '/temperatures' },
    { icon: ChefHat, label: 'Recettes', path: '/recipes' },
    { icon: ClipboardList, label: 'Menus', path: '/menus' },
    { icon: Calculator, label: 'Production', path: '/production' },
    { icon: Camera, label: 'Tracabilite', path: '/traceability' },
    { icon: CalendarDays, label: 'Planning', path: '/planning' },
    { icon: BarChart, label: 'Analytics', path: '/analytics' },
];

export function Layout() {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const NavLinks = () => (
        <>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {item.label}
                    </Link>
                );
            })}
        </>
    );

    return (
        <div className="flex h-screen bg-background">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    StockPro
                </h1>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={cn(
                "md:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-card border-r transition-transform duration-200",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavLinks />
                </nav>

                <div className="p-4 border-t space-y-3">
                    <ThemeToggle />
                    <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Parametres
                    </Link>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside className="w-64 border-r bg-card hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        StockPro
                    </h1>
                    <p className="text-sm text-muted-foreground">Clinique Gestion</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavLinks />
                </nav>

                <div className="p-4 border-t space-y-3">
                    <ThemeToggle />
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Parametres
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 pt-14 md:pt-0">
                <Outlet />
            </main>

            <Toaster />
        </div>
    );
}
