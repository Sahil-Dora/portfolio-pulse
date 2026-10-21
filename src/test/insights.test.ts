import { describe, expect, it } from "vitest";
import { generateInsights, INSIGHT_THRESHOLDS } from "@/lib/insights";
import { calculateAnalytics, calculateDrawdown } from "@/lib/analytics";
import { mockTransactions } from "@/lib/transactions-data";
import { holdingsFromTransactions } from "@/lib/transaction-store";
import type { Holding } from "@/lib/portfolio-data";

const empty = calculateAnalytics([]);
const noDd = calculateDrawdown([]);
const h = (symbol: string, assetClass: "stock" | "crypto", value: number): Holding => ({
  symbol,
  name: symbol,
  assetClass,
  quantity: 1,
  avgCost: value,
  price: value,
  previousClose: value,
});
const ids = (hs: Holding[], dd = noDd) => generateInsights(hs, empty, dd).map((i) => i.id);
const dd = (pct: number) =>
  calculateDrawdown([
    { date: "2026-01-01", value: 100 },
    { date: "2026-01-02", value: 100 - pct },
  ]);

describe("insights", () => {
  it("empty portfolio gives no insights", () => {
    expect(ids([])).toEqual([]);
  });
  it("largest position fires only above 25%", () => {
    const four = ["A", "B", "C", "D"].map((s) => h(s, "stock", 25));
    expect(ids(four)).not.toContain("largest-position");
    expect(
      ids([h("A", "stock", 26), ...["B", "C", "D"].map((s) => h(s, "stock", 24.6667))]),
    ).toContain("largest-position");
    expect(
      ids([
        h("A", "stock", 10),
        ...["B", "C", "D", "E", "F", "G", "H", "I", "J"].map((s) => h(s, "stock", 10)),
      ]),
    ).not.toContain("largest-position");
  });
  it("crypto share fires only above 30%", () => {
    const base = (c: number) => [
      h("X", "crypto", c),
      ...["A", "B", "C", "D", "E", "F", "G"].map((s) => h(s, "stock", (100 - c) / 7)),
    ];
    expect(ids(base(30))).not.toContain("crypto-share");
    expect(ids(base(31))).toContain("crypto-share");
    expect(ids(base(10))).not.toContain("crypto-share");
  });
  it("drawdown fires at and above 10%, not below", () => {
    const hs = [h("A", "stock", 1)];
    expect(ids(hs, dd(10))).toContain("drawdown");
    expect(ids(hs, dd(15))).toContain("drawdown");
    expect(ids(hs, dd(9.9))).not.toContain("drawdown");
  });
  it("flags unrealised losses and realised gains from the ledger, deterministically", () => {
    const holdings = holdingsFromTransactions(mockTransactions);
    const a = calculateAnalytics(mockTransactions);
    const first = generateInsights(holdings, a, noDd);
    expect(first).toEqual(generateInsights(holdings, a, noDd));
    expect(first.some((i) => i.id === "realised")).toBe(a.realised !== 0);
    const losers = a.assets
      .filter((x) => x.value > 0 && x.unrealised < 0)
      .map((x) => `loss-${x.symbol}`);
    expect(first.filter((i) => i.id.startsWith("loss-")).map((i) => i.id)).toEqual(
      [...losers].sort(),
    );
  });
  it("thresholds match health pass limits", () => {
    expect(INSIGHT_THRESHOLDS).toEqual({
      largestPositionPct: 25,
      cryptoSharePct: 30,
      drawdownPct: 10,
    });
  });
});
