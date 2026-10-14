import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { authService } from './hooks/authService';
import { QueryProvider } from './providers/QueryProvider';
import { ConnectivityBadge } from './components/ConnectivityBadge';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { registerPwa } from './lib/pwa';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POS';

registerPwa();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    const slug = authService.getPosAppSlug();
    return <Navigate to={slug ? `/login?pos_app=${encodeURIComponent(slug)}` : '/login'} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <POSPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <BrowserRouter>
          <AppRoutes />
          <ConnectivityBadge />
          <PwaUpdateBanner />
        </BrowserRouter>
      </QueryProvider>
    </AuthProvider>
  );
}
