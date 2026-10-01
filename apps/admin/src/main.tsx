import '@pr-bank/design-tokens/tokens.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createAdminBackend } from './api/mock';
import { App } from './App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App backend={createAdminBackend()} />
    </BrowserRouter>
  </StrictMode>,
);
