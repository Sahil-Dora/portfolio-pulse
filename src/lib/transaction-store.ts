// Browser-only persistence for the simulated ledger (localStorage). No backend.
import { useSyncExternalStore } from 'react';
import { buildHistory, summarize } from './portfolio-data';
import { mockTransactions, type Transaction } from './transactions-data';
import { holdingsFromTransactions } from './ledger-accounting';
import { ledgerError, ledgerSchema } from './ledger-validation';
export { holdingsFromTransactions } from './ledger-accounting';

export const STORAGE_KEY = 'portfolio-pulse:transactions:v1';
export const RECOVERY_KEY = `${STORAGE_KEY}:previous`;

function derive(transactions: Transaction[]) {
  const holdings = holdingsFromTransactions(transactions);
  const summary = summarize(holdings);
  return { transactions, holdings, summary, history: buildHistory(summary.totalValue), storageIssue: null as string | null, corruptRaw: null as string | null };
}
export type PortfolioState = ReturnType<typeof derive>;

const sampleState = derive(mockTransactions);
let state: PortfolioState = sampleState;
let loaded = false;
let savedRaw: string | null = null;
export let storageAvailable = true;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    savedRaw = raw;
    if (raw === null) return;
    try {
      const parsed = ledgerSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || ledgerError(parsed.data)) throw new Error('Invalid ledger');
      state = derive(parsed.data);
    } catch {
      // Never discard or overwrite damaged saved data automatically.
      state = { ...sampleState, corruptRaw: raw, storageIssue: 'Saved data is damaged. Sample data is shown; saved data has not been changed.' };
    }
  } catch { storageAvailable = false; state = { ...state, storageIssue: 'Browser storage is unavailable. Changes are blocked to protect your data.' }; }
}

/** Persist first, publish second. A failed write cannot alter active portfolio data. */
export function replaceTransactions(txs: Transaction[], expected: Transaction[], recover = false): string | null {
  load();
  if (JSON.stringify(expected) !== JSON.stringify(state.transactions)) return 'Ledger changed. Preview again before applying.';
  if (state.corruptRaw !== null && !recover) return 'Recover damaged saved data before making changes';
  const failure = ledgerError(txs);
  if (failure) return failure;
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current !== savedRaw) return 'Saved data changed in another tab. Reload before making changes.';
    // Keep a rollback copy before deletion, reset, import, or normal recording.
    window.localStorage.setItem(RECOVERY_KEY, current ?? JSON.stringify(state.transactions));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    savedRaw = JSON.stringify(txs);
    storageAvailable = true;
  } catch { storageAvailable = false; return 'Could not save to browser storage. Existing transactions are unchanged. Download a backup and free storage, then retry.'; }
  state = derive(txs.map((t) => ({ ...t })));
  listeners.forEach((l) => l());
  return null;
}

/** Adds a transaction; returns an error message when it would oversell. */
export function addTransaction(t: Transaction): string | null {
  load();
  const next = [...state.transactions, t];
  return replaceTransactions(next, state.transactions);
}

export function deleteTransaction(id: string, expected: Transaction[]) {
  return replaceTransactions(expected.filter((t) => t.id !== id), expected);
}
export function previousLedger(): Transaction[] {
  const raw = window.localStorage.getItem(RECOVERY_KEY);
  if (raw === null) throw new Error('No previous saved ledger is available');
  const rows = ledgerSchema.parse(JSON.parse(raw));
  const failure = ledgerError(rows);
  if (failure) throw new Error('Previous saved data is not valid. Restore a downloaded backup instead.');
  return rows;
}

/** Quantity available to sell as of a date (respects later sells). */
export function availableQuantity(symbol: string, date: string) {
  load();
  const txs = state.transactions.filter((t) => t.symbol === symbol);
  const upTo = txs.filter((t) => t.date <= date).reduce((s, t) => s + (t.type === 'buy' ? t.quantity : -t.quantity), 0);
  const total = txs.reduce((s, t) => s + (t.type === 'buy' ? t.quantity : -t.quantity), 0);
  return Math.max(0, Math.min(upTo, total));
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => { load(); return state; };
export function usePortfolio() { return useSyncExternalStore(subscribe, getSnapshot, () => sampleState); }
