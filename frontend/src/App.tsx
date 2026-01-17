import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { ProductsPage } from '@/pages/ProductsPage';
import { Dashboard } from '@/pages/Dashboard';

const queryClient = new QueryClient();

const Placeholder = ({ title }: { title: string }) => <div className="p-8"><h2 className="text-3xl font-bold">{title}</h2><p className="text-muted-foreground mt-2">Page en cours de migration...</p></div>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/outputs" element={<Placeholder title="Sorties Stock" />} />
            <Route path="/deliveries" element={<Placeholder title="Livraisons" />} />
            <Route path="/suppliers" element={<Placeholder title="Fournisseurs" />} />
            <Route path="/recipes" element={<Placeholder title="Recettes" />} />
            <Route path="/menus" element={<Placeholder title="Menus Clinique" />} />
            <Route path="/analytics" element={<Placeholder title="Analytics" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
