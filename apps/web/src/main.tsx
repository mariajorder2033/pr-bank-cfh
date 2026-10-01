import '@pr-bank/design-tokens/tokens.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createMockBackend } from './api/mock';
import { App } from './App';
import { applyThemePreference, readThemePreference } from './theme';

applyThemePreference(readThemePreference());

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App backend={createMockBackend({ latencyMs: 250 })} />
    </BrowserRouter>
  </StrictMode>,
);
