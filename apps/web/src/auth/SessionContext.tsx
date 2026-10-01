import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useBackend } from '../api/BackendContext';
import type { Session } from '../api/types';

interface SessionValue {
  session: Session | null;
  signIn(identifier: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Holds the signed-in session in memory only; a reload signs the customer out. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useBackend();
  const [session, setSession] = useState<Session | null>(null);

  const signIn = useCallback(
    async (identifier: string, password: string) =>
      setSession(await auth.signIn(identifier, password)),
    [auth],
  );
  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, [auth]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
