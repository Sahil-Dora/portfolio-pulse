import { mockHoldings, type Holding } from "./portfolio-data";
import type { Transaction } from "./transactions-data";

/** Remove binary arithmetic noise without imposing an absolute minimum quantity. */
export const cleanQuantity = (value: number) => Number(value.toPrecision(15));
export const exceedsQuantity = (sold: number, held: number) =>
  sold - held > Math.max(Math.abs(sold), Math.abs(held)) * Number.EPSILON * 8;

/** Average-cost accounting; same-day trades use the ledger's existing ID order. */
export function ledgerPositions(transactions: Transaction[]) {
  const sorted = [...transactions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  return mockHoldings.map((quote) => {
    let quantity = 0,
      cost = 0,
      realised = 0;
    for (const t of sorted) {
      if (t.symbol !== quote.symbol) continue;
      if (t.type === "buy") {
        quantity = cleanQuantity(quantity + t.quantity);
        cost += t.quantity * t.price;
      } else {
        const sold = Math.min(t.quantity, quantity);
        const removedCost = quantity ? (cost / quantity) * sold : 0;
        realised += sold * t.price - removedCost;
        cost -= removedCost;
        quantity = cleanQuantity(quantity - sold);
      }
      if (quantity <= 0) {
        quantity = 0;
        cost = 0;
      }
    }
    return { quote, quantity, cost, realised };
  });
}

export function holdingsFromTransactions(transactions: Transaction[]): Holding[] {
  return ledgerPositions(transactions).flatMap(({ quote, quantity, cost }) =>
    quantity <= 0
      ? []
      : [
          {
            ...quote,
            quantity,
            avgCost: cost / quantity,
          },
        ],
  );
}
