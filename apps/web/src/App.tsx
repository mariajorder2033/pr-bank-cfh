import { Navigate, Route, Routes } from 'react-router';
import { BackendProvider } from './api/BackendContext';
import type { Backend } from './api/types';
import { RequireSession, SessionProvider } from './auth/SessionContext';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { CardsPage } from './pages/CardsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MorePage } from './pages/MorePage';
import { TransferPage } from './pages/TransferPage';

export function App({ backend }: { backend: Backend }) {
  return (
    <BackendProvider backend={backend}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireSession>
                <Layout />
              </RequireSession>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="accounts/:accountId" element={<AccountPage />} />
            <Route path="payments" element={<TransferPage />} />
            <Route path="cards" element={<CardsPage />} />
            <Route path="more" element={<MorePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BackendProvider>
  );
}
