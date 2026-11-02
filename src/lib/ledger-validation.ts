import { z } from "zod";
import { LEDGER_TODAY, ledgerAssets, validLedgerDate, type Transaction } from "./transactions-data";
import { cleanQuantity, exceedsQuantity } from "./ledger-accounting";

export const MAX_ROWS = 10_000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const storedTransactionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_][A-Za-z0-9_.:-]*$/, "Invalid transaction ID"),
    date: z
      .string()
      .refine(validLedgerDate, "Invalid calendar date")
      .refine((d) => d <= LEDGER_TODAY, "Future date"),
    symbol: z.string().refine((s) => ledgerAssets.some((a) => a.symbol === s), "Unknown asset"),
    type: z.enum(["buy", "sell"]),
    quantity: z.number().finite().positive().max(1_000_000),
    price: z.number().finite().positive().max(10_000_000),
  })
  .strict();
export const ledgerSchema = z.preprocess((value, ctx) => {
  if (Array.isArray(value) && value.length > MAX_ROWS) {
    ctx.addIssue({ code: "custom", message: `Maximum ${MAX_ROWS} rows` });
    return z.NEVER;
  }
  return value;
}, z.array(storedTransactionSchema).max(MAX_ROWS));
export const transactionIdentity = (t: Transaction) =>
  JSON.stringify([t.date, t.symbol, t.type, t.quantity, t.price]);

/** ID ordering matches the existing average-cost accounting engine. */
export function ledgerError(txs: Transaction[]): string | null {
  const parsed = ledgerSchema.safeParse(txs);
  if (!parsed.success) return "Invalid transaction data or row limit exceeded";
  const ids = new Set<string>();
  const held = new Map<string, number>();
  for (const t of [...txs].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )) {
    if (ids.has(t.id)) return `Duplicate transaction ID: ${t.id}`;
    ids.add(t.id);
    const balance = held.get(t.symbol) ?? 0;
    if (t.type === "sell" && exceedsQuantity(t.quantity, balance))
      return `Not enough ${t.symbol} held on that date`;
    const q = cleanQuantity(
      balance + (t.type === "buy" ? t.quantity : -Math.min(t.quantity, balance)),
    );
    held.set(t.symbol, q);
  }
  return null;
}
