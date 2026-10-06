import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getPublicSchoolBySlug } from '@/api/schools';
import { STORAGE_KEYS } from '../../hooks/authService';
import type { School, SchoolContextValue, SchoolProviderProps } from './types';

const SchoolContext = createContext<SchoolContextValue | undefined>(undefined);

const DEFAULT_FALLBACK = 'Sistema';

export function SchoolProvider({ children, fallbackName = DEFAULT_FALLBACK }: SchoolProviderProps) {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const fetchSchool = useCallback(async (slug: string) => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicSchoolBySlug(slug);
      if (mountedRef.current) {
        setSchool({ id: data.id, name: data.name, slug: data.slug, active: true });
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Error al cargar el negocio';
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Al montar, intenta cargar school desde localStorage
  useEffect(() => {
    mountedRef.current = true;
    const storedSlug = localStorage.getItem(STORAGE_KEYS.POS_APP_SLUG);
    if (storedSlug) {
      // Use a microtask to avoid setState in effect
      queueMicrotask(() => {
        if (mountedRef.current) {
          fetchSchool(storedSlug);
        }
      });
    } else {
      // Use a microtask to avoid setState in effect
      queueMicrotask(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchSchool]);

  const refetch = useCallback(async () => {
    const slug = localStorage.getItem(STORAGE_KEYS.POS_APP_SLUG);
    if (slug) await fetchSchool(slug);
  }, [fetchSchool]);

  // Acción desde login: cuando el cliente elige su escuela por slug,
  // poblar el contexto directamente sin depender solo del storage
  const setSchoolFromLogin = useCallback((school: School) => {
    setSchool(school);
  }, []);

  const schoolName = school?.name ?? fallbackName;

  const value: SchoolContextValue = {
    school,
    schoolName,
    loading,
    error,
    refetch,
    setSchoolFromLogin,
  };

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool debe usarse dentro de SchoolProvider');
  return ctx;
}
