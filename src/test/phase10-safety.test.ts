import { beforeEach, describe, expect, it, vi } from "vitest";
import { holdingsFromTransactions, ledgerPositions } from "@/lib/ledger-accounting";
import {
  exportBackup,
  MAX_FILE_BYTES,
  MAX_ROWS,
  parseImport,
  previewImport,
} from "@/lib/ledger-files";
import { ledgerError } from "@/lib/ledger-validation";
import type { Transaction } from "@/lib/transactions-data";

const buy: Transaction = {
  id: "b1",
  date: "2026-01-01",
  symbol: "BTC",
  type: "buy",
  quantity: 10,
  price: 100,
};
const key = "portfolio-pulse:transactions:v1";
const largeLedger = () =>
  Array.from({ length: MAX_ROWS }, (_, i) => ({
    ...buy,
    id: `b${String(i).padStart(63, "0")}`,
    quantity: 1.2345678901234567e-100,
    price: 1.2345678901234567e-100,
  }));

describe("Phase 10 ledger safety", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("restores distinct identical trades and skips only repeated IDs", () => {
    const trades = [buy, { ...buy, id: "b2" }];
    const restored = previewImport(parseImport(exportBackup(trades), "json"), [], "replace");
    expect(restored.transactions).toEqual(trades);
    expect(restored.duplicates).toBe(0);
    expect(previewImport(trades, trades, "merge").duplicates).toBe(2);
    expect(holdingsFromTransactions(restored.transactions)[0]?.quantity).toBe(20);
  });

  it("keeps tiny positions, partial-sale costs and realised gains", () => {
    const trades: Transaction[] = [
      { ...buy, quantity: 1e-10 },
      { ...buy, id: "s1", date: "2026-01-02", type: "sell", quantity: 5e-11, price: 200 },
    ];
    const position = ledgerPositions(trades).find((p) => p.quote.symbol === "BTC");
    expect(holdingsFromTransactions(trades)[0]?.quantity).toBe(5e-11);
    expect(position?.cost).toBeCloseTo(5e-9, 16);
    expect(position?.realised).toBeCloseTo(5e-9, 16);
  });

  it("blocks tiny oversells, including selling a nonexistent position", () => {
    expect(ledgerError([{ ...buy, type: "sell", quantity: 1e-10 }])).toMatch(/Not enough/);
    expect(
      ledgerError([
        { ...buy, quantity: 1e-10 },
        { ...buy, id: "s1", date: "2026-01-02", type: "sell", quantity: 2e-10 },
      ]),
    ).toMatch(/Not enough/);
  });

  it("allows floating-point full liquidation without inventing dust", () => {
    const trades: Transaction[] = [
      { ...buy, quantity: 0.1 },
      { ...buy, id: "b2", quantity: 0.2 },
      { ...buy, id: "s1", date: "2026-01-02", type: "sell", quantity: 0.3 },
    ];
    expect(ledgerError(trades)).toBeNull();
    expect(holdingsFromTransactions(trades)).toEqual([]);
  });

  it("exports compact restorable 10,000-row backups", () => {
    const trades = Array.from({ length: MAX_ROWS }, (_, i) => ({
      ...buy,
      id: `b${String(i).padStart(63, "0")}`,
    }));
    const text = exportBackup(trades);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(parseImport(text, "json")).toEqual(trades);
  });

  it("rejects oversized backups and commits without changing active or rollback data", async () => {
    const trades = largeLedger();
    expect(ledgerError(trades)).toBeNull();
    expect(() => exportBackup(trades)).toThrow(/2 MiB/);
    localStorage.setItem(key, JSON.stringify([buy]));
    const store = await import("@/lib/transaction-store");
    expect(store.replaceTransactions(trades, [buy])).toMatch(/2 MiB/);
    expect(localStorage.getItem(key)).toBe(JSON.stringify([buy]));
    expect(localStorage.getItem(store.RECOVERY_KEY)).toBeNull();
  });

  it("limits backdated sells by an intermediate shortage before later buys", async () => {
    const trades: Transaction[] = [
      buy,
      { ...buy, id: "s1", date: "2026-02-01", type: "sell", quantity: 8 },
      { ...buy, id: "b2", date: "2026-03-01", quantity: 10 },
    ];
    localStorage.setItem(key, JSON.stringify(trades));
    const store = await import("@/lib/transaction-store");
    expect(store.availableQuantity("BTC", "2026-01-15", "n1")).toBe(2);
    expect(
      store.addTransaction({ ...buy, id: "n1", date: "2026-01-15", type: "sell", quantity: 3 }),
    ).toMatch(/Not enough/);
  });

  it("respects same-day ID order for a candidate sale", async () => {
    localStorage.setItem(key, JSON.stringify([buy]));
    const store = await import("@/lib/transaction-store");
    expect(store.availableQuantity("BTC", buy.date, "a1")).toBe(0);
    expect(store.availableQuantity("BTC", buy.date, "n1")).toBe(10);
  });
});
