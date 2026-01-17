import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, Home, ShoppingCart, Truck, Users, ChefHat, ClipboardList, Settings, BarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Produits', path: '/products' },
    { icon: ShoppingCart, label: 'Sorties', path: '/outputs' },
    { icon: Truck, label: 'Livraisons', path: '/deliveries' },
    { icon: Users, label: 'Fournisseurs', path: '/suppliers' },
    { icon: ChefHat, label: 'Recettes', path: '/recipes' },
    { icon: ClipboardList, label: 'Menus', path: '/menus' },
    { icon: BarChart, label: 'Analytics', path: '/analytics' },
];

export function Layout() {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        StockPro
                    </h1>
                    <p className="text-sm text-muted-foreground">Clinique Gestion</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
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
                </nav>

                <div className="p-4 border-t">
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Paramètres
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
                <Outlet />
            </main>

            <Toaster />
        </div>
    );
}
