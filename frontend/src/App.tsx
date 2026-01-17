import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { ProductsPage } from '@/pages/ProductsPage';
import { Dashboard } from '@/pages/Dashboard';
import { OutputsPage } from '@/pages/OutputsPage';
import { DeliveriesPage } from '@/pages/DeliveriesPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { RecipesPage } from '@/pages/RecipesPage';
import { MenusPage } from '@/pages/MenusPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/outputs" element={<OutputsPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
