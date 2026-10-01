import { formatIban, normalizeIban, parseAmount, validateIban } from '@pr-bank/domain';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useBackend } from '../api/BackendContext';
import { ApiError, type Account, type Transfer, type TransferRequest } from '../api/types';
import { useAsync } from '../api/useAsync';
import { BottomSheet } from '../components/BottomSheet';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { StatusPill } from '../components/StatusPill';
import { DEMO_MODE } from '../config';
import { formatMoney } from '../format';
import { usePageTitle } from '../usePageTitle';

type Tab = 'own' | 'domestic';

interface FormState {
  fromId: string;
  toId: string;
  iban: string;
  creditorName: string;
  amount: string;
  reference: string;
}

type Field = keyof FormState;
type Errors = Partial<Record<Field, string>>;

interface Summary {
  from: Account;
  toLabel: string;
  toDetail: string;
  arrival: string;
}

type Step =
  | { kind: 'form' }
  | { kind: 'review'; request: TransferRequest; summary: Summary; idempotencyKey: string }
  | { kind: 'done'; request: TransferRequest; summary: Summary; transfer: Transfer };

const EMPTY: FormState = {
  fromId: '',
  toId: '',
  iban: '',
  creditorName: '',
  amount: '',
  reference: '',
};
const ZERO_FEE = { amount: '0.00', currency: 'CHF' } as const;

/** "1’250,5" → "1250.5": accepts Swiss grouping and a decimal comma. */
function normalizeAmount(input: string): string {
  return input.replace(/[\s’']/g, '').replace(',', '.');
}

function validate(form: FormState, tab: Tab, from: Account | undefined): Errors {
  const errors: Errors = {};
  if (!from) {
    errors.fromId = 'Choose an account to pay from.';
  }
  if (tab === 'own') {
    if (!form.toId || form.toId === form.fromId) {
      errors.toId = 'Choose a different account to pay into.';
    }
  } else {
    const iban = validateIban(form.iban);
    if (!form.iban.trim()) {
      errors.iban = "Enter the beneficiary's IBAN.";
    } else if (!iban.valid) {
      errors.iban = {
        format:
          'An IBAN starts with a country code and two check digits, e.g. CH93 0076 2011 6238 5295 7.',
        unknown_country: 'This country does not use IBANs.',
        length: 'This IBAN has the wrong number of characters.',
        checksum: 'This IBAN is not valid. Check for typos.',
      }[iban.reason];
    }
    if (!form.creditorName.trim()) {
      errors.creditorName = "Enter the beneficiary's name.";
    } else if (form.creditorName.trim().length > 70) {
      errors.creditorName = 'The name can be at most 70 characters.';
    }
  }
  const amount = normalizeAmount(form.amount);
  if (!amount) {
    errors.amount = 'Enter an amount.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(amount) || /^0+(\.0+)?$/.test(amount)) {
    errors.amount = 'Enter an amount greater than zero, with at most two decimals.';
  } else if (
    from &&
    parseAmount(amount, from.currency).amountMinor >
      parseAmount(from.availableBalance.amount, from.currency).amountMinor
  ) {
    errors.amount = 'The amount is more than the available balance.';
  }
  if (form.reference.length > 140) {
    errors.reference = 'The reference can be at most 140 characters.';
  }
  return errors;
}

/** Transfers (ui-ux-design.md §4.4, PRD FR-8, FR-9, FR-12, FR-13). */
export function TransferPage() {
  usePageTitle('Payments');
  const { api, auth } = useBackend();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'domestic' ? 'domestic' : 'own';

  const loadAccounts = useCallback(() => api.listAccounts(), [api]);
  const accounts = useAsync(loadAccounts);
  const list = accounts.data ?? [];

  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [apiError, setApiError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fromId = form.fromId || list[0]?.id || '';
  const from = list.find((a) => a.id === fromId);
  const toOptions = list.filter((a) => a.id !== fromId);
  const toId = form.toId && form.toId !== fromId ? form.toId : (toOptions[0]?.id ?? '');
  const values = { ...form, fromId, toId };
  const errors = validate(values, tab, from);
  const errorFor = (field: Field) => ((touched[field] || submitted) && errors[field]) || undefined;

  const set = (field: Field) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const blur = (field: Field) => () => setTouched((t) => ({ ...t, [field]: true }));

  function switchTab(next: Tab) {
    setParams(next === 'domestic' ? { tab: 'domestic' } : {}, { replace: true });
    setTouched({});
    setSubmitted(false);
  }

  function onContinue(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !from) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const amount = {
      amount: parseAmountString(normalizeAmount(values.amount)),
      currency: from.currency,
    };
    const reference = values.reference.trim() || undefined;
    let request: TransferRequest;
    let summary: Summary;
    if (tab === 'own') {
      const to = list.find((a) => a.id === toId);
      request = {
        fromAccountId: from.id,
        amount,
        destination: { kind: 'own_account', accountId: toId },
        reference,
      };
      summary = {
        from,
        toLabel: to?.name ?? '',
        toDetail: `•••• ${to?.iban.slice(-4)}`,
        arrival: 'Immediately',
      };
    } else {
      const iban = normalizeIban(values.iban);
      request = {
        fromAccountId: from.id,
        amount,
        destination: { kind: 'iban', iban, creditorName: values.creditorName.trim() },
        reference,
      };
      summary = {
        from,
        toLabel: values.creditorName.trim(),
        toDetail: formatIban(iban),
        arrival: 'Within 1 business day',
      };
    }
    setApiError(null);
    setStep({ kind: 'review', request, summary, idempotencyKey: crypto.randomUUID() });
  }

  function reset() {
    setForm((f) => ({ ...EMPTY, fromId: f.fromId }));
    setTouched({});
    setSubmitted(false);
    setApiError(null);
    setStep({ kind: 'form' });
    accounts.reload();
  }

  if (step.kind === 'done') {
    return <TransferResult step={step} onNew={reset} />;
  }

  if (step.kind === 'review') {
    return (
      <div className="page">
        <h1 className="page__title">Review transfer</h1>
        <section className="card">
          <SummaryList request={step.request} summary={step.summary} />
        </section>
        {apiError && (
          <p className="alert" role="alert">
            {apiError}
          </p>
        )}
        <div className="actions">
          <button className="button button--secondary" onClick={() => setStep({ kind: 'form' })}>
            Edit
          </button>
          <button className="button button--primary" onClick={() => setSheetOpen(true)}>
            <Icon name="lock" size={18} /> Confirm and send
          </button>
        </div>
        {sheetOpen && (
          <StepUpSheet
            onClose={() => setSheetOpen(false)}
            onVerified={async (stepUpToken) => {
              try {
                const transfer = await api.createTransfer(step.request, {
                  idempotencyKey: step.idempotencyKey,
                  stepUpToken,
                });
                setSheetOpen(false);
                setStep({ kind: 'done', request: step.request, summary: step.summary, transfer });
              } catch (e) {
                setSheetOpen(false);
                setApiError(e instanceof Error ? e.message : 'The transfer could not be sent.');
              }
            }}
            verify={auth.verifyStepUp}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page__title">Payments</h1>
      <div className="tabs" role="tablist" aria-label="Transfer type">
        {(['own', 'domestic'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="transfer-panel"
            className="tabs__tab"
            onClick={() => switchTab(t)}
          >
            {t === 'own' ? 'Own accounts' : 'Domestic'}
          </button>
        ))}
      </div>

      {accounts.status === 'error' && !accounts.data && (
        <p className="alert" role="alert">
          Your accounts could not be loaded.{' '}
          <button className="link" onClick={accounts.reload}>
            Try again
          </button>
        </p>
      )}

      <form
        id="transfer-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="card form"
        onSubmit={onContinue}
        noValidate
      >
        <SelectField
          label="From"
          id="from"
          value={fromId}
          onChange={set('fromId')}
          options={list.map((a) => ({
            value: a.id,
            label: `${a.name} — ${formatMoney(a.availableBalance)} available`,
          }))}
          error={errorFor('fromId')}
        />
        {tab === 'own' ? (
          <SelectField
            label="To"
            id="to"
            value={toId}
            onChange={set('toId')}
            options={toOptions.map((a) => ({ value: a.id, label: a.name }))}
            error={errorFor('toId')}
          />
        ) : (
          <>
            <TextField
              label="Beneficiary IBAN"
              id="iban"
              value={values.iban}
              onChange={set('iban')}
              onBlur={() => {
                blur('iban')();
                if (validateIban(values.iban).valid) set('iban')(formatIban(values.iban));
              }}
              error={errorFor('iban')}
              autoComplete="off"
              spellCheck={false}
              inputClassName="mono"
            />
            <TextField
              label="Beneficiary name"
              id="creditor"
              value={values.creditorName}
              onChange={set('creditorName')}
              onBlur={blur('creditorName')}
              error={errorFor('creditorName')}
              autoComplete="off"
            />
          </>
        )}
        <TextField
          label={`Amount (${from?.currency ?? 'CHF'})`}
          id="amount"
          value={values.amount}
          onChange={set('amount')}
          onBlur={blur('amount')}
          error={errorFor('amount')}
          inputMode="decimal"
          autoComplete="off"
          inputClassName="money"
        />
        <TextField
          label="Reference (optional)"
          id="reference"
          value={values.reference}
          onChange={set('reference')}
          onBlur={blur('reference')}
          error={errorFor('reference')}
          hint="Shown to the beneficiary."
        />
        <button
          className="button button--primary button--block"
          type="submit"
          disabled={!accounts.data}
        >
          Continue
        </button>
      </form>
    </div>
  );
}

/** "1250.5" → "1250.50". */
function parseAmountString(amount: string): string {
  const [whole, fraction = ''] = amount.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

function SummaryList({ request, summary }: { request: TransferRequest; summary: Summary }) {
  return (
    <dl className="summary-list">
      <div>
        <dt>From</dt>
        <dd>
          {summary.from.name} <span className="muted">•••• {summary.from.iban.slice(-4)}</span>
        </dd>
      </div>
      <div>
        <dt>To</dt>
        <dd>
          {summary.toLabel} <span className="muted mono">{summary.toDetail}</span>
        </dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd>
          <Money value={request.amount} />
        </dd>
      </div>
      <div>
        <dt>Fees</dt>
        <dd>
          <Money value={ZERO_FEE} />
        </dd>
      </div>
      <div className="summary-list__total">
        <dt>Total debited</dt>
        <dd>
          <Money value={request.amount} />
        </dd>
      </div>
      {request.reference && (
        <div>
          <dt>Reference</dt>
          <dd>{request.reference}</dd>
        </div>
      )}
      <div>
        <dt>Estimated arrival</dt>
        <dd>{summary.arrival}</dd>
      </div>
    </dl>
  );
}

function StepUpSheet({
  onClose,
  onVerified,
  verify,
}: {
  onClose: () => void;
  onVerified: (token: string) => Promise<void>;
  verify: (code: string) => Promise<string>;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onVerified(await verify(code));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The code could not be checked. Try again.');
      setBusy(false);
    }
  }

  return (
    <BottomSheet title="Confirm with your security code" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <p className="muted">
          We sent a 6-digit code to your registered phone.
          {DEMO_MODE && ' Demo: enter any 6 digits.'}
        </p>
        <TextField
          label="Security code"
          id="otp"
          value={code}
          onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          error={error ?? undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          inputClassName="otp"
        />
        <div className="actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? 'Sending…' : 'Confirm'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

function TransferResult({
  step,
  onNew,
}: {
  step: Extract<Step, { kind: 'done' }>;
  onNew: () => void;
}) {
  const { api } = useBackend();
  const [transfer, setTransfer] = useState(step.transfer);
  const settled = transfer.status === 'completed' || transfer.status === 'failed';

  // Track a pending transfer until it settles (FR-13).
  useEffect(() => {
    if (settled) {
      return;
    }
    const timer = setInterval(() => {
      api.getTransferStatus(transfer.id).then(setTransfer, () => undefined);
    }, 1500);
    return () => clearInterval(timer);
  }, [api, transfer.id, settled]);

  return (
    <div className="page">
      <section className="card result">
        <span
          className={`result__icon ${transfer.status === 'completed' ? 'result__icon--done' : ''}`}
        >
          <Icon name={transfer.status === 'completed' ? 'check' : 'arrowRight'} size={28} />
        </span>
        <h1 className="page__title">
          {transfer.status === 'completed' ? 'Transfer completed' : 'Transfer submitted'}
        </h1>
        <p className="result__amount">
          <Money value={step.request.amount} />
        </p>
        <p className="muted">to {step.summary.toLabel}</p>
        <dl className="summary-list">
          <div>
            <dt>Status</dt>
            <dd aria-live="polite">
              <StatusPill status={transfer.status} />
            </dd>
          </div>
          <div>
            <dt>Reference ID</dt>
            <dd className="mono">{transfer.referenceId}</dd>
          </div>
        </dl>
        <div className="actions">
          <button className="button button--secondary" onClick={onNew}>
            New transfer
          </button>
          <Link to="/" className="button button--primary">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({
  label,
  id,
  value,
  onChange,
  onBlur,
  error,
  hint,
  inputClassName,
  ...input
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  inputClassName?: string;
  inputMode?: 'decimal' | 'numeric';
  autoComplete?: string;
  spellCheck?: boolean;
}) {
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputClassName}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
