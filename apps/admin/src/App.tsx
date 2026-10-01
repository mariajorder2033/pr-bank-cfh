import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAdmin } from './api/AdminContext';
import type { AdminBackend, AdminSession } from './api/types';
import { AdminProvider } from './api/AdminContext';
import { Layout } from './components/Layout';
import { AuditLogPage } from './pages/AuditLogPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { CustomerPage } from './pages/CustomerPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

/** Holds the admin session. Memory-only; a reload signs out. */
export function App({ backend }: { backend: AdminBackend }) {
  return (
    <AdminProvider backend={backend}>
      <Shell />
    </AdminProvider>
  );
}

function Shell() {
  const backend = useAdmin();
  const [session, setSession] = useState<AdminSession | null>(backend.current());

  if (!session) {
    return <LoginPage onSignedIn={setSession} />;
  }
  return (
    <Layout
      session={session}
      onSignOut={async () => {
        await backend.auth.signOut();
        setSession(null);
      }}
    >
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerPage session={session} />} />
        <Route path="approvals" element={<ApprovalsPage session={session} />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
