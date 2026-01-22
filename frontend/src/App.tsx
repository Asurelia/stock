import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme';
import { Layout } from '@/components/layout/Layout';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';

// Lazy load toutes les pages pour optimiser le bundle initial
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const OutputsPage = lazy(() => import('@/pages/OutputsPage').then(m => ({ default: m.OutputsPage })));
const DeliveriesPage = lazy(() => import('@/pages/DeliveriesPage').then(m => ({ default: m.DeliveriesPage })));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const RecipesPage = lazy(() => import('@/pages/RecipesPage').then(m => ({ default: m.RecipesPage })));
const MenusPage = lazy(() => import('@/pages/MenusPage').then(m => ({ default: m.MenusPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const TemperaturesPage = lazy(() => import('@/pages/TemperaturesPage').then(m => ({ default: m.TemperaturesPage })));
const TraceabilityArchivePage = lazy(() => import('@/pages/TraceabilityArchivePage').then(m => ({ default: m.TraceabilityArchivePage })));
const ProductionPage = lazy(() => import('@/pages/ProductionPage').then(m => ({ default: m.ProductionPage })));
const PlanningPage = lazy(() => import('@/pages/PlanningPage').then(m => ({ default: m.PlanningPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage'));

// Composant de chargement pour les pages lazy
const PageLoader = () => (
  <div className="flex items-center justify-center h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const FullPageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <Loader2 className="w-12 h-12 animate-spin text-primary" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <FullPageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function GerantOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isGerant } = useAuth();
  
  if (!isGerant) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<FullPageLoader />}><LoginPage /></Suspense>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="/products" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><ProductsPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/outputs" element={<Suspense fallback={<PageLoader />}><OutputsPage /></Suspense>} />
        <Route path="/deliveries" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><DeliveriesPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/suppliers" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/temperatures" element={<Suspense fallback={<PageLoader />}><TemperaturesPage /></Suspense>} />
        <Route path="/recipes" element={<Suspense fallback={<PageLoader />}><RecipesPage /></Suspense>} />
        <Route path="/menus" element={<Suspense fallback={<PageLoader />}><MenusPage /></Suspense>} />
        <Route path="/production" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><ProductionPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/traceability" element={<Suspense fallback={<PageLoader />}><TraceabilityArchivePage /></Suspense>} />
        <Route path="/planning" element={<Suspense fallback={<PageLoader />}><PlanningPage /></Suspense>} />
        <Route path="/analytics" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/users" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><UsersPage /></Suspense></GerantOnlyRoute>} />
        <Route path="/activity-log" element={<GerantOnlyRoute><Suspense fallback={<PageLoader />}><ActivityLogPage /></Suspense></GerantOnlyRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
