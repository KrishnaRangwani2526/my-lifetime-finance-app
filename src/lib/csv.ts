/**
 * CSV vault helpers.
 *
 * Every account / wallet / card keeps two ledgers:
 *  - "app"       → entries you recorded inside MyLedger (source != 'statement')
 *  - "statement" → rows imported from a bank / card statement (source = 'statement')
 *
 * Both are grouped month-wise so a sheet can be pulled for any single month,
 * or for everything at once (the cumulative sheet).
 */

export type CsvKind = "app" | "statement";

export const STATEMENT_SOURCE = "statement";

/* ------------------------------------------------------------------ writing */

function cell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((c) => cell(row[c])).join(","));
  return lines.join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "sheet";
}

/* ------------------------------------------------------------------ reading */

/** Splits CSV / TSV / semicolon text into a grid, honouring quoted fields. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n").find((l) => l.trim().length > 0) ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "|": (firstLine.match(/\|/g) ?? []).length,
  };
  const delim = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;

  const grid: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      grid.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some((c) => c !== "")) grid.push(row);
  return grid.filter((r) => r.some((c) => c !== ""));
}

export type StatementRow = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number;
  direction: "credit" | "debit";
};

export type StatementAnalysis = {
  rows: StatementRow[];
  skipped: number;
  months: string[];
  credit: number;
  debit: number;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Understands dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd, 12 Mar 2025, Mar 12 2025. */
export function parseStatementDate(raw: string, fallbackMonth?: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(value);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(value);
  if (m) {
    const year = +m[3]! < 100 ? 2000 + +m[3]! : +m[3]!;
    return iso(year, +m[2]!, +m[1]!);
  }

  m = /^(\d{1,2})[\s-]([a-z]{3,})[\s-](\d{2,4})/i.exec(value);
  if (m) {
    const mo = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    const year = +m[3]! < 100 ? 2000 + +m[3]! : +m[3]!;
    if (mo) return iso(year, mo, +m[1]!);
  }

  m = /^([a-z]{3,})[\s-](\d{1,2}),?[\s-](\d{2,4})/i.exec(value);
  if (m) {
    const mo = MONTHS[m[1]!.slice(0, 3).toLowerCase()];
    const year = +m[3]! < 100 ? 2000 + +m[3]! : +m[3]!;
    if (mo) return iso(year, mo, +m[2]!);
  }

  // Day-only rows fall back to the month the user told us about.
  m = /^(\d{1,2})$/.exec(value);
  if (m && fallbackMonth) return `${fallbackMonth}-${String(+m[1]!).padStart(2, "0")}`;

  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function money(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-()]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." ) return null;
  const negative = /^\(.*\)$/.test(cleaned.trim());
  const n = Number(cleaned.replace(/[()]/g, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  return negative ? -Math.abs(n) : n;
}

const CR_WORDS = /\b(cr|credit|deposit|received|refund|salary|inward|by\s|income)\b/i;
const DR_WORDS = /\b(dr|debit|withdraw|paid|purchase|spent|outward|to\s|charge)\b/i;

/**
 * Reads a statement grid and pulls out real transactions. Works with the common
 * Indian bank/card layouts: date + narration + withdrawal/deposit columns, or
 * date + narration + single amount + Cr/Dr flag.
 */
export function analyseStatement(grid: string[][], fallbackMonth?: string): StatementAnalysis {
  const rows: StatementRow[] = [];
  let skipped = 0;

  // Locate the header so we can name the debit / credit columns when present.
  let headerIdx = -1;
  let dateCol = -1;
  let descCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let amountCol = -1;
  let typeCol = -1;

  for (let r = 0; r < Math.min(grid.length, 25); r++) {
    const cells = (grid[r] ?? []).map((c) => c.toLowerCase());
    const find = (re: RegExp) => cells.findIndex((c) => re.test(c));
    const d = find(/date/);
    if (d === -1) continue;
    headerIdx = r;
    dateCol = d;
    descCol = find(/narration|description|particular|details|remark|transaction|merchant|info/);
    debitCol = find(/withdraw|debit|dr\b|paid out|spent/);
    creditCol = find(/deposit|credit|cr\b|paid in|received/);
    amountCol = find(/^amount|amount \(|txn amount|value/);
    typeCol = find(/type|cr\/dr|dr\/cr|indicator/);
    break;
  }

  const start = headerIdx === -1 ? 0 : headerIdx + 1;

  for (let r = start; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    // Find the date: named column first, else first cell that parses.
    let date: string | null = null;
    if (dateCol >= 0) date = parseStatementDate(cells[dateCol] ?? "", fallbackMonth);
    if (!date) {
      for (const c of cells) {
        date = parseStatementDate(c, fallbackMonth);
        if (date) break;
      }
    }
    if (!date) {
      skipped++;
      continue;
    }

    let amount: number | null = null;
    let direction: "credit" | "debit" | null = null;

    if (debitCol >= 0 || creditCol >= 0) {
      const dr = debitCol >= 0 ? money(cells[debitCol] ?? "") : null;
      const cr = creditCol >= 0 ? money(cells[creditCol] ?? "") : null;
      if (dr) {
        amount = Math.abs(dr);
        direction = "debit";
      } else if (cr) {
        amount = Math.abs(cr);
        direction = "credit";
      }
    }

    if (amount === null) {
      const candidate =
        (amountCol >= 0 ? money(cells[amountCol] ?? "") : null) ??
        // last numeric-looking cell that is not the date
        [...cells].reverse().map(money).find((v) => v !== null && v !== undefined) ??
        null;
      if (candidate === null || candidate === undefined) {
        skipped++;
        continue;
      }
      amount = Math.abs(candidate);
      const flag = (typeCol >= 0 ? cells[typeCol] : "") ?? "";
      const joined = cells.join(" ");
      if (/^\s*cr/i.test(flag) || (!/^\s*dr/i.test(flag) && CR_WORDS.test(joined) && !DR_WORDS.test(joined)))
        direction = "credit";
      else direction = candidate < 0 ? "debit" : /^\s*cr/i.test(flag) ? "credit" : "debit";
    }

    if (!amount || !direction) {
      skipped++;
      continue;
    }

    const description =
      (descCol >= 0 ? cells[descCol] : undefined) ||
      cells.filter((c, i) => i !== dateCol && !/^[0-9.,()\-\s]+$/.test(c)).sort((a, b) => b.length - a.length)[0] ||
      "Statement entry";

    rows.push({ date, description: description.slice(0, 180), amount, direction });
  }

  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
  return {
    rows,
    skipped,
    months,
    credit: rows.filter((r) => r.direction === "credit").reduce((s, r) => s + r.amount, 0),
    debit: rows.filter((r) => r.direction === "debit").reduce((s, r) => s + r.amount, 0),
  };
}
