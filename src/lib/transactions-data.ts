// Simulated transaction ledger. Not connected to live markets or accounts.
import { z } from "zod";
import { mockHoldings, type Holding } from "./portfolio-data";

export type TransactionType = "buy" | "sell";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: Holding["symbol"];
  type: TransactionType;
  quantity: number;
  price: number;
}

export const ledgerAssets = mockHoldings.map(({ symbol, name, assetClass }) => ({
  symbol,
  name,
  assetClass,
}));
export const assetName = (symbol: string) =>
  ledgerAssets.find((a) => a.symbol === symbol)?.name ?? symbol;
export const transactionTotal = (t: Pick<Transaction, "quantity" | "price">) =>
  t.quantity * t.price;

export const mockTransactions: Transaction[] = [
  { id: "t1", date: "2025-11-04", symbol: "AAPL", type: "buy", quantity: 100, price: 152.4 },
  { id: "t2", date: "2025-12-12", symbol: "BTC", type: "buy", quantity: 0.5, price: 52000 },
  { id: "t3", date: "2026-01-08", symbol: "NVDA", type: "buy", quantity: 20, price: 610 },
  { id: "t4", date: "2026-02-19", symbol: "ETH", type: "buy", quantity: 4, price: 2900 },
  { id: "t5", date: "2026-03-27", symbol: "AAPL", type: "buy", quantity: 50, price: 160.2 },
  { id: "t6", date: "2026-05-14", symbol: "TSLA", type: "buy", quantity: 30, price: 215 },
  { id: "t7", date: "2026-07-02", symbol: "BTC", type: "sell", quantity: 0.1, price: 61850 },
  { id: "t8", date: "2026-09-21", symbol: "TSLA", type: "sell", quantity: 5, price: 241.1 },
  { id: "t9", date: "2026-09-30", symbol: "TSLA", type: "buy", quantity: 5, price: 215 },
];

export const LEDGER_TODAY = "2026-10-15";

export const validLedgerDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  Number.isFinite(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

export const transactionSchema = z.object({
  date: z
    .string()
    .refine(validLedgerDate, "Choose a valid date")
    .refine((d) => d <= LEDGER_TODAY, "Date cannot be in the future"),
  symbol: z.string().refine((s) => ledgerAssets.some((a) => a.symbol === s), "Choose an asset"),
  type: z.enum(["buy", "sell"], { message: "Choose buy or sell" }),
  quantity: z.coerce
    .number({ message: "Enter a quantity" })
    .finite()
    .positive("Quantity must be greater than 0")
    .max(1_000_000, "Quantity is too large"),
  price: z.coerce
    .number({ message: "Enter a price" })
    .finite()
    .positive("Price must be greater than 0")
    .max(10_000_000, "Price is too large"),
});

/** Net quantity held for a symbol according to the ledger. */
export function netQuantity(list: Transaction[], symbol: string) {
  return list
    .filter((t) => t.symbol === symbol)
    .reduce((s, t) => s + (t.type === "buy" ? t.quantity : -t.quantity), 0);
}
