import { createContext, useContext, useState, type ReactNode } from 'react';
import { authService, type AuthService } from './authService';
import { purgePersistedCache } from '@/lib/persistence';
import type { User } from '@/pages/POS/components/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginPin: (_pin: string, _schoolId: string) => Promise<void>;
  loginEmail: (_email: string, _password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  authService?: AuthService;
}

function loadInitialUser(service: AuthService): User | null {
  return service.getStoredUser();
}

export function AuthProvider({
  children,
  authService: injectedService = authService,
}: AuthProviderProps) {
  // Inicialización síncrona desde localStorage (evita setState dentro de efecto
  // y un paint intermedio de "no logueado" al recargar).
  const [user, setUser] = useState<User | null>(() => {
    const stored = loadInitialUser(injectedService);
    return stored && injectedService.getAccessToken() ? stored : null;
  });
  const [loading] = useState(false);

  async function loginPin(pin: string, schoolId: string) {
    const loggedInUser = await injectedService.loginPin(pin, schoolId);
    setUser(loggedInUser);
  }

  async function loginEmail(email: string, password: string) {
    const loggedInUser = await injectedService.loginEmail(email, password);
    setUser(loggedInUser);
  }

  function logout() {
    // Purga el cache local persistido del usuario ANTES de limpiar el storage
    // (la purga lee el namespace schoolId:userId desde localStorage).
    void purgePersistedCache().finally(() => {
      injectedService.logout();
      setUser(null);
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loginPin,
        loginEmail,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
