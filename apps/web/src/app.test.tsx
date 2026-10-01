import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { createMockBackend } from './api/mock';
import { App } from './App';

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App backend={createMockBackend()} />
    </MemoryRouter>,
  );
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/username/i), 'demo');
  await user.type(screen.getByLabelText(/password/i), 'secret');
  await user.click(screen.getByRole('button', { name: /^sign in$/i }));
  await screen.findByRole('heading', { name: /hello/i });
}

describe('web app', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it('redirects to login when signed out, then shows the dashboard', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(
      await screen.findByRole('heading', { name: /sign in to e-banking/i }),
    ).toBeInTheDocument();
    await signIn(user);
    expect(screen.getByText(/total balance/i)).toBeInTheDocument();
    expect(await screen.findByText(/private account/i)).toBeInTheDocument();
  });

  it('hides balances when the privacy toggle is pressed', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    await screen.findByText(/private account/i);
    await user.click(screen.getByRole('button', { name: /hide balances/i }));
    expect(screen.getByRole('button', { name: /show balances/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Hidden').length).toBeGreaterThan(0);
  });

  it('completes an own-account transfer through review and the security-code sheet', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);

    await user.click(screen.getByRole('link', { name: /^transfer$/i }));
    await screen.findByRole('heading', { name: /payments/i });
    await screen.findByRole('option', { name: 'Savings account' });

    await user.selectOptions(screen.getByLabelText(/^to$/i), 'acc-savings');
    await user.type(screen.getByLabelText(/amount/i), '150');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('heading', { name: /review transfer/i })).toBeInTheDocument();
    expect(screen.getAllByText('CHF 150.00').length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByRole('button', { name: /confirm and send/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/security code/i), '123456');
    await user.click(within(dialog).getByRole('button', { name: /^confirm$/i }));

    expect(await screen.findByRole('heading', { name: /transfer completed/i })).toBeInTheDocument();
  });

  it('validates a domestic transfer before leaving the form', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    await user.click(screen.getByRole('link', { name: /pay someone/i }));
    await screen.findByRole('heading', { name: /payments/i });
    await screen.findByRole('option', { name: /private account/i });

    await user.type(screen.getByLabelText(/beneficiary iban/i), 'CH00 bad');
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/not valid|wrong number|country/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /review transfer/i })).not.toBeInTheDocument();
  });

  it('freezes a card', async () => {
    const user = userEvent.setup();
    renderApp();
    await signIn(user);
    const nav = screen.getByRole('navigation', { name: /main/i });
    await user.click(within(nav).getByRole('link', { name: /^cards$/i }));
    await screen.findByRole('heading', { name: /^cards$/i });

    const [freeze] = screen.getAllByRole('switch', { name: /freeze card/i });
    expect(freeze).toHaveAttribute('aria-checked', 'false');
    await user.click(freeze!);
    await waitFor(() => expect(freeze).toHaveAttribute('aria-checked', 'true'));
  });
});
