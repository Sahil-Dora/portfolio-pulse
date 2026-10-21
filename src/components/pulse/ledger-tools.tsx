import { useMemo, useRef, useState } from "react";
import { Download, Upload, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  deliverFile,
  exportBackup,
  exportCsv,
  MAX_FILE_BYTES,
  MAX_ROWS,
  parseImport,
  previewImport,
  type ImportMode,
} from "@/lib/ledger-files";
import { previousLedger, replaceTransactions, usePortfolio } from "@/lib/transaction-store";
import { mockTransactions, type Transaction } from "@/lib/transactions-data";

export function ConfirmLedgerAction({
  title,
  description,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={title}
        title={title}
      >
        {children}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {description} A previous saved copy is kept. Download a JSON backup first for an
              independent copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LedgerTools() {
  const portfolio = usePortfolio();
  const { transactions, corruptRaw, storageIssue } = portfolio;
  const [incoming, setIncoming] = useState<Transaction[] | null>(null);
  const [base, setBase] = useState<Transaction[]>(transactions);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const preview = useMemo(() => {
    if (incoming === null) return null;
    try {
      return { ...previewImport(incoming, base, mode), error: "" };
    } catch (e) {
      return {
        transactions: [],
        duplicates: 0,
        added: 0,
        removed: 0,
        error: e instanceof Error ? e.message : "Invalid import",
      };
    }
  }, [incoming, base, mode]);
  const stale = JSON.stringify(base) !== JSON.stringify(transactions);
  const save = (next: Transaction[], expected = transactions, recovery = false) => {
    const failure = replaceTransactions(next, expected, recovery);
    setError(failure ?? "");
    if (!failure) {
      setIncoming(null);
      setNotice(`Saved ${next.length} transactions in this browser.`);
    }
  };
  const stage = (rows: Transaction[], name: string, selectedMode: ImportMode) => {
    setIncoming(rows);
    setBase(transactions);
    setMode(selectedMode);
    setFilename(name);
    setError("");
    setNotice("");
  };

  return (
    <>
      {storageIssue && (
        <div className="ledger-recovery" role="alert">
          <p>{storageIssue}</p>
          {corruptRaw !== null && (
            <div className="import-actions">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void deliverFile(
                    new Blob([corruptRaw], { type: "text/plain;charset=utf-8" }),
                    "portfolio-pulse-damaged.txt",
                  )
                }
              >
                <Download />
                Save damaged data
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => stage(mockTransactions, "Sample ledger recovery", "replace")}
              >
                <RotateCcw />
                Recover sample ledger
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="ledger-tools">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void deliverFile(
              new Blob([exportCsv(transactions)], { type: "text/csv;charset=utf-8" }),
              "portfolio-pulse-transactions.csv",
            )
          }
        >
          <Download />
          Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void deliverFile(
              new Blob([exportBackup(transactions)], { type: "application/json" }),
              "portfolio-pulse-backup.json",
            )
          }
        >
          <Download />
          JSON backup
        </Button>
        <label className="import-actions">
          <Upload size={16} />
          <span>Import / restore</span>
          <input
            type="file"
            accept=".csv,.json"
            aria-label="Import CSV or JSON"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const token = ++sequence.current;
              setIncoming(null);
              setError("");
              setNotice("");
              if (file.size > MAX_FILE_BYTES) {
                setError("File exceeds 2 MiB");
                return;
              }
              const extension = file.name.split(".").at(-1)?.toLowerCase();
              if (extension !== "csv" && extension !== "json") {
                setError("Choose a CSV or JSON file");
                return;
              }
              setBusy(true);
              try {
                const rows = parseImport(await file.text(), extension);
                if (token === sequence.current)
                  stage(rows, file.name, corruptRaw === null ? "merge" : "replace");
              } catch (failure) {
                if (token === sequence.current)
                  setError(failure instanceof Error ? failure.message : "Could not read file");
              } finally {
                if (token === sequence.current) setBusy(false);
              }
            }}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              stage(previousLedger(), "Previous saved copy", "replace");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Cannot recover saved copy");
            }
          }}
        >
          <RotateCcw />
          Recover previous copy
        </Button>
        {corruptRaw === null && (
          <ConfirmLedgerAction
            title="Reset ledger"
            description={`This clears all ${transactions.length} transactions, not just filtered rows.`}
            onConfirm={() => save([])}
          >
            <Trash2 />
            Reset ledger
          </ConfirmLedgerAction>
        )}
      </div>
      <p className="panel-subtitle">
        USD · up to {MAX_ROWS.toLocaleString()} rows · 2 MiB per file · browser-only storage
      </p>
      {busy && <p role="status">Reading file…</p>}
      {error && (
        <p className="ledger-tools-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="ledger-notice" role="status">
          {notice}
        </p>
      )}
      {incoming !== null && preview && (
        <section className="import-preview" aria-label="Import preview">
          <h2>Import preview · {filename}</h2>
          <div className="import-actions">
            <label htmlFor="import-mode">Mode</label>
            <select
              id="import-mode"
              className="pulse-select"
              value={mode}
              onChange={(e) => setMode(e.target.value === "replace" ? "replace" : "merge")}
            >
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setIncoming(null)}>
              Cancel import
            </Button>
          </div>
          <p>
            {incoming.length} rows read · {preview.duplicates} duplicates skipped · {preview.added}{" "}
            added · {preview.transactions.length} final transactions
            {mode === "replace" ? ` · replaces ${base.length} existing transactions` : ""}
          </p>
          {preview.error || stale ? (
            <p role="alert" className="ledger-tools-error">
              {stale ? "Ledger changed. Select the file again for a fresh preview." : preview.error}
            </p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="holdings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Price (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.transactions.slice(0, 10).map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{t.symbol}</td>
                        <td>{t.type}</td>
                        <td>{t.quantity}</td>
                        <td>{t.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                First {Math.min(10, preview.transactions.length)} final rows shown. All rows
                validated.
              </p>
              <ConfirmLedgerAction
                title="Apply import"
                description={
                  mode === "replace"
                    ? "This replaces the entire saved ledger with the preview."
                    : "This merges the validated new transactions into the saved ledger."
                }
                onConfirm={() => save(preview.transactions, base, corruptRaw !== null)}
              >
                <Upload />
                Apply import
              </ConfirmLedgerAction>
            </>
          )}
        </section>
      )}
    </>
  );
}
