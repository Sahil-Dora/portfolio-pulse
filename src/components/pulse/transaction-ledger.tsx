import { useMemo, useState, type FormEvent } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usd } from "@/lib/portfolio-data";
import {
  addTransaction,
  availableQuantity,
  deleteTransaction,
  usePortfolio,
} from "@/lib/transaction-store";
import { LedgerTools, ConfirmLedgerAction } from "./ledger-tools";
import {
  LEDGER_TODAY,
  assetName,
  ledgerAssets,
  transactionSchema,
  transactionTotal,
  type Transaction,
} from "@/lib/transactions-data";

type Errors = Partial<Record<"date" | "symbol" | "type" | "quantity" | "price", string>>;
const emptyForm = { date: LEDGER_TODAY, symbol: "", type: "buy", quantity: "", price: "" };
const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const fmtQty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 8 });

export function TransactionLedger() {
  const items = usePortfolio().transactions;
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState("all");
  const [type, setType] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .filter(
        (t) =>
          (asset === "all" || t.symbol === asset) &&
          (type === "all" || t.type === type) &&
          (!q ||
            t.symbol.toLowerCase().includes(q) ||
            assetName(t.symbol).toLowerCase().includes(q)),
      );
  }, [items, query, asset, type]);

  const set = (k: keyof typeof emptyForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setNotice("");
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = transactionSchema.safeParse(form);
    const next: Errors = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof Errors;
        next[k] ??= issue.message;
      }
    else if (parsed.data.type === "sell") {
      const held = availableQuantity(parsed.data.symbol, parsed.data.date);
      if (parsed.data.quantity > held + 1e-9)
        next.quantity = `You only hold ${fmtQty(held)} ${parsed.data.symbol}`;
    }
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) return;
    const t: Transaction = { id: `n${Date.now()}`, ...parsed.data };
    const failure = addTransaction(t);
    if (failure) {
      setErrors({ quantity: failure });
      return;
    }
    setForm({ ...emptyForm, date: parsed.data.date });
    setNotice(
      `Recorded ${t.type} of ${fmtQty(t.quantity)} ${t.symbol} · ${usd(transactionTotal(t))}`,
    );
  }

  const field = (k: keyof Errors) => ({
    "aria-invalid": !!errors[k] || undefined,
    "aria-describedby": errors[k] ? `tx-${k}-error` : undefined,
  });
  const err = (k: keyof Errors) =>
    errors[k] && (
      <p id={`tx-${k}-error`} className="field-error">
        {errors[k]}
      </p>
    );

  return (
    <>
      <LedgerTools />
      <div className="ledger-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Transaction history</h2>
              <p className="panel-subtitle">
                {rows.length} of {items.length} simulated transactions
              </p>
            </div>
            <span className="plan-tag">SIMULATED</span>
          </div>
          <div className="ledger-filters">
            <div className="ledger-search">
              <Search size={14} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search asset or symbol"
                aria-label="Search transactions"
                maxLength={50}
              />
            </div>
            <select
              className="pulse-select"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              aria-label="Filter by asset"
            >
              <option value="all">All assets</option>
              {ledgerAssets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
            <select
              className="pulse-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td>{assetName(t.symbol)}</td>
                      <td>
                        <strong>{t.symbol}</strong>
                      </td>
                      <td>
                        <span className={`tx-type ${t.type}`}>
                          {t.type === "buy" ? "Buy" : "Sell"}
                        </span>
                      </td>
                      <td>{fmtQty(t.quantity)}</td>
                      <td>{usd(t.price)}</td>
                      <td>{usd(transactionTotal(t))}</td>
                      <td>
                        <ConfirmLedgerAction
                          title={`Delete ${t.id}`}
                          description={`Delete ${t.type} of ${fmtQty(t.quantity)} ${t.symbol} on ${fmtDate(t.date)}? Deletion is blocked if a later sale would exceed holdings.`}
                          onConfirm={() => {
                            const failure = deleteTransaction(t.id, items);
                            setNotice(failure ?? "Transaction deleted");
                          }}
                        >
                          <Trash2 size={14} />
                        </ConfirmLedgerAction>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="ledger-empty">
                      No transactions match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Record a transaction</h2>
              <p className="panel-subtitle">Saved in this browser · simulated</p>
            </div>
          </div>
          <form className="ledger-form" onSubmit={submit} noValidate>
            <div className="tx-type-toggle" role="radiogroup" aria-label="Transaction type">
              {(["buy", "sell"] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={form.type === v}
                  variant={form.type === v ? "default" : "ghost"}
                  size="sm"
                  onClick={() => set("type", v)}
                >
                  {v === "buy" ? "Buy" : "Sell"}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="tx-symbol">Asset</Label>
              <select
                id="tx-symbol"
                className="pulse-select w-full"
                value={form.symbol}
                onChange={(e) => set("symbol", e.target.value)}
                {...field("symbol")}
              >
                <option value="">Choose an asset</option>
                {ledgerAssets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol} · {a.name}
                  </option>
                ))}
              </select>
              {err("symbol")}
            </div>
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                max={LEDGER_TODAY}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                {...field("date")}
              />
              {err("date")}
            </div>
            <div className="ledger-form-row">
              <div>
                <Label htmlFor="tx-quantity">Quantity</Label>
                <Input
                  id="tx-quantity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                  {...field("quantity")}
                />
                {err("quantity")}
              </div>
              <div>
                <Label htmlFor="tx-price">Price (USD)</Label>
                <Input
                  id="tx-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0.00"
                  {...field("price")}
                />
                {err("price")}
              </div>
            </div>
            <div className="ledger-total">
              <span>Total</span>
              <strong>{usd((Number(form.quantity) || 0) * (Number(form.price) || 0))}</strong>
            </div>
            <Button type="submit">
              <Plus />
              Record {form.type}
            </Button>
            <p className="ledger-notice" role="status">
              {notice}
            </p>
          </form>
        </section>
      </div>
    </>
  );
}
