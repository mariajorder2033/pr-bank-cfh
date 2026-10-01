import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createAdminBackend } from './api/mock';
import { App } from './App';

function renderAdmin() {
  return render(
    <MemoryRouter>
      <App backend={createAdminBackend()} />
    </MemoryRouter>,
  );
}

const signInAs = async (user: ReturnType<typeof userEvent.setup>, label: RegExp) => {
  await screen.findByRole('heading', { name: /sign in/i });
  await user.click(screen.getByRole('button', { name: label }));
  await screen.findByRole('heading', { name: /overview/i });
};

const goTo = (user: ReturnType<typeof userEvent.setup>, label: RegExp) => {
  const sidebar = within(screen.getByRole('navigation', { name: /sections/i }));
  return user.click(sidebar.getByRole('link', { name: label }));
};

describe('admin portal', () => {
  it('shows the role picker and signs in as Ops', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await signInAs(user, /ops agent/i);
    expect(screen.getByText(/pending approvals/i)).toBeInTheDocument();
  });

  it('lets Ops submit a correction but not approve it (four-eyes)', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await signInAs(user, /ops agent/i);

    await goTo(user, /customers/i);
    await user.click(await screen.findByRole('link', { name: 'cust-001' }));
    await screen.findByRole('heading', { name: /anna müller/i });

    // Correct a completed transaction.
    const [correct] = await screen.findAllByRole('button', { name: /^correct$/i });
    await user.click(correct!);
    const drawer = await screen.findByRole('dialog', { name: /request correction/i });
    await user.clear(within(drawer).getByLabelText(/corrected amount/i));
    await user.type(within(drawer).getByLabelText(/corrected amount/i), '-200.00');
    await user.type(within(drawer).getByLabelText(/justification/i), 'Merchant overcharged');
    await user.click(within(drawer).getByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for approval/i);

    // In the approvals queue, an Ops maker sees the request but gets no approve controls.
    await goTo(user, /approvals/i);
    expect(await screen.findByText(/merchant overcharged/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot approve|submit requests but not approve/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
  });

  it('lets an Approver approve a pending correction, which books reversal + replacement', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await signInAs(user, /approver/i);

    await goTo(user, /approvals/i);
    // A correction is pre-seeded as pending.
    const approve = await screen.findByRole('button', { name: /^approve$/i });
    await user.click(approve);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument(),
    );

    // The audit log records the approval.
    await goTo(user, /audit log/i);
    expect(await screen.findByText(/approval_approved/i)).toBeInTheDocument();
  });

  it('keeps an Auditor read-only (no Correct buttons)', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await signInAs(user, /auditor/i);
    await goTo(user, /customers/i);
    await user.click(await screen.findByRole('link', { name: 'cust-001' }));
    await screen.findByRole('heading', { name: /anna müller/i });
    expect(screen.queryByRole('button', { name: /^correct$/i })).not.toBeInTheDocument();
  });
});
