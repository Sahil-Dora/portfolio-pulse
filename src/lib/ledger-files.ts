import { z } from "zod";
import type { Transaction } from "./transactions-data";
import {
  ledgerError,
  ledgerSchema,
  storedTransactionSchema,
  transactionIdentity,
  MAX_FILE_BYTES,
  MAX_ROWS,
} from "./ledger-validation";

export { MAX_FILE_BYTES, MAX_ROWS } from "./ledger-validation";
const columns = ["id", "date", "symbol", "type", "quantity", "price"] as const;
const backupSchema = z
  .object({
    app: z.literal("Portfolio Pulse"),
    version: z.literal(1),
    currency: z.literal("USD"),
    transactions: ledgerSchema,
  })
  .strict();
export type ImportMode = "merge" | "replace";

/** All fields are quoted and spreadsheet formula prefixes are neutralised. */
export const csvCell = (value: string | number) => {
  const text = String(value);
  // Intentional: control characters before a formula prefix must be matched to block CSV formula injection.
  // eslint-disable-next-line no-control-regex
  const safe =
    /^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
export const exportCsv = (txs: Transaction[]) =>
  [columns.join(","), ...txs.map((t) => columns.map((c) => csvCell(t[c])).join(","))].join("\r\n");
export const exportBackup = (txs: Transaction[]) =>
  JSON.stringify(
    { app: "Portfolio Pulse", version: 1, currency: "USD", transactions: txs },
    null,
    2,
  );

/** Strict RFC-style CSV reader: quoted commas/newlines and escaped quotes; no silent row loss. */
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  function endCell() {
    row.push(cell);
    cell = "";
    closed = false;
  }
  function endRow() {
    endCell();
    rows.push(row);
    row = [];
    if (rows.length > MAX_ROWS + 1) throw new Error(`Maximum ${MAX_ROWS.toLocaleString()} rows`);
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += ch;
    } else if (ch === ",") endCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else if (ch === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || ch === '"') throw new Error("Malformed CSV quoting");
      cell += ch;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length || closed) endRow();
  const header = rows.shift();
  if (!header || header.join(",") !== columns.join(","))
    throw new Error(`CSV header must be ${columns.join(",")}`);
  return rows.map((r, index) => {
    if (r.length !== columns.length) throw new Error(`Row ${index + 2}: expected 6 columns`);
    const numeric = (s: string | undefined) =>
      s && /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s) ? Number(s) : NaN;
    return {
      id: r[0],
      date: r[1],
      symbol: r[2],
      type: r[3],
      quantity: numeric(r[4]),
      price: numeric(r[5]),
    };
  });
}

export function parseImport(text: string, format: "csv" | "json"): Transaction[] {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error("File exceeds 2 MiB");
  text = text.replace(/^\uFEFF/, "");
  let raw: unknown;
  if (format === "csv") raw = parseCsv(text);
  else {
    const json: unknown = JSON.parse(text);
    raw = Array.isArray(json) ? json : backupSchema.parse(json).transactions;
  }
  if (!Array.isArray(raw) || raw.length > MAX_ROWS)
    throw new Error(`Maximum ${MAX_ROWS.toLocaleString()} rows`);
  return raw.map((r, i) => {
    const parsed = storedTransactionSchema.safeParse(r);
    if (!parsed.success)
      throw new Error(
        `Row ${i + 1}: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
      );
    return parsed.data;
  });
}

/** Detect duplicates before validating combined chronological holdings. No mutation. */
export function previewImport(incoming: Transaction[], existing: Transaction[], mode: ImportMode) {
  if (incoming.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS.toLocaleString()} rows`);
  const next = mode === "merge" ? [...existing] : [];
  const byId = new Map(next.map((t) => [t.id, transactionIdentity(t)]));
  const identities = new Set(next.map(transactionIdentity));
  let duplicates = 0;
  for (const row of incoming) {
    storedTransactionSchema.parse(row);
    const identity = transactionIdentity(row);
    const prior = byId.get(row.id);
    if (prior !== undefined && prior !== identity)
      throw new Error(`Conflicting ID ${row.id}; existing data is unchanged`);
    if (prior !== undefined || identities.has(identity)) {
      duplicates++;
      continue;
    }
    next.push(row);
    byId.set(row.id, identity);
    identities.add(identity);
  }
  const failure = ledgerError(next);
  if (failure) throw new Error(failure);
  return {
    transactions: next,
    duplicates,
    added: next.length - (mode === "merge" ? existing.length : 0),
    removed: mode === "replace" ? existing.length : 0,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}
