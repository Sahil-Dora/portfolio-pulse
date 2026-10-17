// Browser-only persistence for the simulated ledger (localStorage). No backend.
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { buildHistory, summarize } from './portfolio-data';
import { ledgerAssets, mockTransactions, type Transaction } from './transactions-data';
import { holdingsFromTransactions } from './ledger-accounting';
export { holdingsFromTransactions } from './ledger-accounting';

const STORAGE_KEY = 'portfolio-pulse:transactions:v1';

const storedSchema = z.array(z.object({
  id: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symbol: z.string().refine((s) => ledgerAssets.some((a) => a.symbol === s)),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive().finite(),
  price: z.number().positive().finite(),
})).max(10_000);

/** Ledger is valid only if no sell ever exceeds the quantity held at that point. */
function isConsistent(txs: Transaction[]) {
  const held = new Map<string, number>();
  for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const q = (held.get(t.symbol) ?? 0) + (t.type === 'buy' ? t.quantity : -t.quantity);
    if (q < -1e-9) return false;
    held.set(t.symbol, q);
  }
  return true;
}

function derive(transactions: Transaction[]) {
  const holdings = holdingsFromTransactions(transactions);
  const summary = summarize(holdings);
  return { transactions, holdings, summary, history: buildHistory(summary.totalValue) };
}
export type PortfolioState = ReturnType<typeof derive>;

const sampleState = derive(mockTransactions);
let state: PortfolioState = sampleState;
let loaded = false;
export let storageAvailable = true;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (parsed.success && isConsistent(parsed.data)) state = derive(parsed.data);
    else window.localStorage.removeItem(STORAGE_KEY); // corrupt data: fall back to samples
  } catch { storageAvailable = false; }
}

function save(txs: Transaction[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(txs)); storageAvailable = true; }
  catch { storageAvailable = false; }
}

/** Adds a transaction; returns an error message when it would oversell. */
export function addTransaction(t: Transaction): string | null {
  load();
  const next = [...state.transactions, t];
  if (!isConsistent(next)) return `Not enough ${t.symbol} held on that date`;
  state = derive(next);
  save(next);
  listeners.forEach((l) => l());
  return null;
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
