import {
  formatAmount,
  getTransactionType,
  type Ledger,
  type Money,
  type Transaction,
} from '@pr-bank/domain';
import type { AccountRecord } from './accounts.js';

const toMoneyDto = (value: Money) => ({ amount: formatAmount(value), currency: value.currency });

export function toAccountDto(account: AccountRecord, ledger: Ledger) {
  return {
    id: account.id,
    type: account.type,
    name: account.name,
    iban: account.iban,
    currency: account.currency,
    status: account.status,
    bookedBalance: toMoneyDto(ledger.bookedBalance(account.id)),
    availableBalance: toMoneyDto(ledger.availableBalance(account.id)),
  };
}

export function toTransactionDto(tx: Transaction) {
  return {
    id: tx.id,
    accountId: tx.accountId,
    type: tx.type,
    typeName: getTransactionType(tx.type)?.name ?? tx.type,
    amount: toMoneyDto(tx.amount),
    status: tx.status,
    holdReason: tx.holdReason,
    timestamp: tx.timestamp,
    referenceId: tx.referenceId,
    correctsTransactionId: tx.correctsTransactionId,
    category: tx.category,
  };
}
