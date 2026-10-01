import { createContext, useContext, type ReactNode } from 'react';
import type { AdminBackend } from './types';

const Ctx = createContext<AdminBackend | null>(null);

export function AdminProvider({
  backend,
  children,
}: {
  backend: AdminBackend;
  children: ReactNode;
}) {
  return <Ctx value={backend}>{children}</Ctx>;
}

export function useAdmin(): AdminBackend {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error('useAdmin must be used inside <AdminProvider>');
  }
  return value;
}
