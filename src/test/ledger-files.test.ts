import { describe, expect, it, beforeEach, vi } from 'vitest';
import { csvCell, exportBackup, exportCsv, MAX_FILE_BYTES, MAX_ROWS, parseImport, previewImport } from '@/lib/ledger-files';
import { ledgerError } from '@/lib/ledger-validation';
import { mockTransactions, type Transaction } from '@/lib/transactions-data';

const buy: Transaction = { id: 'b1', date: '2026-01-01', symbol: 'AAPL', type: 'buy', quantity: 10, price: 100 };
const sell: Transaction = { ...buy, id: 's1', date: '2026-01-02', type: 'sell', quantity: 5, price: 120 };
describe('ledger file validation', () => {
  it('round-trips CSV and versioned JSON without changing values', () => {
    expect(parseImport(exportCsv(mockTransactions), 'csv')).toEqual(mockTransactions);
    expect(parseImport(exportBackup(mockTransactions), 'json')).toEqual(mockTransactions);
  });
  it('accepts BOM, CRLF and quoted fields', () => { expect(parseImport('\uFEFF' + exportCsv([buy]) + '\r\n', 'csv')).toEqual([buy]); });
  it.each(['=SUM(A1)', '+cmd', '-1+1', '@cmd', '  =cmd', '\tcmd', '\rcmd', '\ncmd'])('neutralises formula prefix %j', (value) => { expect(csvCell(value).startsWith('"\'')).toBe(true); });
  it('escapes quotes and commas', () => { expect(csvCell('a,"b')).toBe('"a,""b"'); });
  it('enforces 2 MiB before parsing', () => { expect(() => parseImport('x'.repeat(MAX_FILE_BYTES + 1), 'csv')).toThrow('2 MiB'); });
  it('enforces 10,000 input rows even when all are duplicates', () => { expect(() => parseImport(JSON.stringify(Array.from({ length: MAX_ROWS + 1 }, () => buy)), 'json')).toThrow(); });
  it('enforces merged ledger row limit', () => {
    const existing = Array.from({ length: MAX_ROWS }, (_, i) => ({ ...buy, id: `b${i}`, price: i + 1 }));
    expect(() => previewImport([{ ...buy, id: 'extra', price: 20000 }], existing, 'merge')).toThrow();
  });
  it.each([
    { ...buy, date: '2026-02-30' }, { ...buy, date: '2026-10-16' }, { ...buy, symbol: 'DOGE' },
    { ...buy, quantity: 0 }, { ...buy, quantity: -1 }, { ...buy, price: 10000001 },
    { ...buy, id: '=cmd' }, { ...buy, fee: 1 }, { ...buy, quantity: '10' },
  ])('rejects invalid JSON rows %j', (row) => { expect(() => parseImport(JSON.stringify([row]), 'json')).toThrow(); });
  it.each(['id,date,symbol,type,quantity,price\n"unclosed', 'wrong,headers', 'id,date,symbol,type,quantity,price\nb1,2026-01-01,AAPL,buy,=cmd,100', 'id,date,symbol,type,quantity,price\n"b1"x,2026-01-01,AAPL,buy,1,100'])('rejects malformed CSV', (text) => { expect(() => parseImport(text, 'csv')).toThrow(); });
  it('rejects unsupported backup metadata', () => { expect(() => parseImport(JSON.stringify({ app: 'Portfolio Pulse', version: 2, currency: 'USD', transactions: [] }), 'json')).toThrow(); });
  it('skips exact ID duplicates and blocks conflicting IDs', () => {
    expect(previewImport([buy, buy], [buy], 'merge')).toMatchObject({ added: 0, duplicates: 2, transactions: [buy] });
    expect(() => previewImport([{ ...buy, price: 101 }], [buy], 'merge')).toThrow('Conflicting ID');
  });
  it('merges a sale only when combined chronological holdings cover it', () => {
    expect(previewImport([sell], [buy], 'merge').transactions).toEqual([buy, sell]);
    expect(() => previewImport([sell], [buy], 'replace')).toThrow('Not enough');
  });
  it('rejects oversells including backdated sells without mutation', () => {
    const existing = [buy]; const before = JSON.stringify(existing);
    expect(() => previewImport([{ ...sell, date: '2025-12-01' }], existing, 'merge')).toThrow('Not enough');
    expect(JSON.stringify(existing)).toBe(before);
  });
  it('supports an explicit empty replacement and rejects duplicate stored IDs', () => {
    expect(previewImport([], [buy], 'replace').transactions).toEqual([]);
    expect(ledgerError([buy, buy])).toMatch(/Duplicate/);
  });
});

describe('atomic storage and recovery', () => {
  const key = 'portfolio-pulse:transactions:v1';
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); vi.resetModules(); });
  const load = () => import('@/lib/transaction-store');
  it('blocks invalid commits and leaves original data unchanged', async () => {
    localStorage.setItem(key, JSON.stringify([buy])); const store = await load();
    expect(store.replaceTransactions([sell], [buy])).toMatch(/Not enough/);
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual([buy]);
  });
  it('does not publish or overwrite ledger when persistence fails', async () => {
    localStorage.setItem(key, JSON.stringify([buy])); const store = await load();
    store.availableQuantity('AAPL', '2026-01-03');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(store.replaceTransactions([buy, sell], [buy])).toMatch(/Could not save/);
    expect(store.availableQuantity('AAPL', '2026-01-03')).toBe(10);
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual([buy]);
  });
  it('preserves damaged JSON and blocks ordinary changes', async () => {
    localStorage.setItem(key, '{damaged'); const store = await load();
    expect(store.addTransaction(buy)).toMatch(/Recover/);
    expect(localStorage.getItem(key)).toBe('{damaged');
  });
  it('requires explicit recovery and preserves damaged raw data in rollback storage', async () => {
    localStorage.setItem(key, '{damaged'); const store = await load();
    expect(store.replaceTransactions([buy], mockTransactions, true)).toBeNull();
    expect(localStorage.getItem(store.RECOVERY_KEY)).toBe('{damaged');
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual([buy]);
  });
  it('blocks deletion of a buy required by a later sale', async () => {
    localStorage.setItem(key, JSON.stringify([buy, sell])); const store = await load();
    expect(store.deleteTransaction(buy.id, [buy, sell])).toMatch(/Not enough/);
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual([buy, sell]);
  });
  it('deletes sales, resets to empty, and restores previous copy', async () => {
    localStorage.setItem(key, JSON.stringify([buy, sell])); const store = await load();
    expect(store.deleteTransaction(sell.id, [buy, sell])).toBeNull();
    expect(store.replaceTransactions([], [buy])).toBeNull();
    expect(store.previousLedger()).toEqual([buy]);
    expect(store.replaceTransactions(store.previousLedger(), [])).toBeNull();
    expect(store.availableQuantity('AAPL', '2026-01-03')).toBe(10);
  });
  it('blocks stale previews and changed storage in another tab', async () => {
    localStorage.setItem(key, JSON.stringify([buy])); const store = await load();
    expect(store.replaceTransactions([], [])).toMatch(/Ledger changed/);
    localStorage.setItem(key, '[]');
    expect(store.replaceTransactions([buy, sell], [buy])).toMatch(/another tab/);
    expect(localStorage.getItem(key)).toBe('[]');
  });
});