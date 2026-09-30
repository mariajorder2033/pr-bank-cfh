import type { CurrencyCode } from '@pr-bank/domain';

export type AccountType = 'current' | 'savings';
export type AccountStatus = 'active' | 'pending_funding' | 'frozen' | 'closed';

/** Account master data. Balances are not stored here; they are derived from the ledger. */
export interface AccountRecord {
  readonly id: string;
  readonly customerId: string;
  readonly type: AccountType;
  readonly name: string;
  readonly iban: string;
  readonly currency: CurrencyCode;
  readonly status: AccountStatus;
}

export interface AccountRepository {
  get(id: string): AccountRecord | undefined;
  listByCustomer(customerId: string): readonly AccountRecord[];
}

/** Stand-in until the core banking integration (TRD §3.2) is available. */
export class InMemoryAccountRepository implements AccountRepository {
  readonly #accounts = new Map<string, AccountRecord>();

  add(account: AccountRecord): void {
    this.#accounts.set(account.id, Object.freeze({ ...account }));
  }

  get(id: string): AccountRecord | undefined {
    return this.#accounts.get(id);
  }

  listByCustomer(customerId: string): readonly AccountRecord[] {
    return [...this.#accounts.values()].filter((account) => account.customerId === customerId);
  }
}
