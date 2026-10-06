import Papa from "papaparse";
import { parseMoney } from "./money";

export type CsvTable = { headers: string[]; rows: Record<string, string>[] };

export function parseCsv(text: string): CsvTable {
	const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
		header: true,
		skipEmptyLines: "greedy",
		transformHeader: (h) => h.trim(),
	});
	const headers = (result.meta.fields ?? []).filter(Boolean);
	return { headers, rows: result.data };
}

export type DateFormat = "auto" | "ymd" | "mdy" | "dmy";

export type ColumnMapping = {
	date: string;
	payee: string;
	/** A single signed amount column... */
	amount: string;
	/** ...or separate money-out / money-in columns. */
	debit: string;
	credit: string;
	category: string;
	dateFormat: DateFormat;
	/** Flip signs for exports where spending is positive (common for cards). */
	invert: boolean;
};

const CANDIDATES: Record<
	"date" | "payee" | "amount" | "debit" | "credit" | "category",
	RegExp[]
> = {
	date: [/^date$/i, /transaction date/i, /posted|posting date/i, /date/i],
	payee: [
		/^payee$/i,
		/description/i,
		/merchant/i,
		/^name$/i,
		/memo|details|narrative/i,
	],
	amount: [/^amount$/i, /amount/i, /^value$/i],
	debit: [/^debit$/i, /withdrawal|money out|paid out/i, /debit/i],
	credit: [/^credit$/i, /deposit|money in|paid in/i, /credit/i],
	category: [/^category$/i, /category/i, /^type$/i],
};

/** Guesses which columns hold what, based on common bank export headers. */
export function guessMapping(headers: string[]): ColumnMapping {
	const used = new Set<string>();
	const find = (key: keyof typeof CANDIDATES) => {
		for (const pattern of CANDIDATES[key]) {
			const match = headers.find((h) => !used.has(h) && pattern.test(h));
			if (match) {
				used.add(match);
				return match;
			}
		}
		return "";
	};
	const date = find("date");
	const payee = find("payee");
	const amount = find("amount");
	const debit = amount ? "" : find("debit");
	const credit = amount ? "" : find("credit");
	const category = find("category");
	return {
		date,
		payee,
		amount,
		debit,
		credit,
		category,
		dateFormat: "auto",
		invert: false,
	};
}

/** Parses common date formats into `YYYY-MM-DD`, or null. */
export function parseDate(
	raw: string,
	format: DateFormat = "auto",
): string | null {
	const value = raw.trim();
	if (!value) return null;

	const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(value);
	let y: number;
	let m: number;
	let d: number;
	if (iso && (format === "auto" || format === "ymd")) {
		[y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
	} else {
		const parts = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(value);
		if (!parts) return null;
		let [a, b] = [Number(parts[1]), Number(parts[2])];
		y = Number(parts[3]);
		if (y < 100) y += 2000;
		const dayFirst = format === "dmy" || (format === "auto" && a > 12);
		if (dayFirst) [a, b] = [b, a];
		[m, d] = [a, b];
	}
	if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
	const date = new Date(y, m - 1, d);
	if (date.getMonth() !== m - 1) return null; // e.g. 31 Feb
	return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type ImportedTransaction = {
	date: string;
	payee: string;
	category: string;
	amount: number;
	type: "income" | "expense";
};

export type RowResult =
	| { row: number; ok: true; value: ImportedTransaction }
	| { row: number; ok: false; error: string };

/** Applies a mapping to every row, collecting per-row errors. */
export function mapRows(
	rows: Record<string, string>[],
	mapping: ColumnMapping,
	defaultCategory = "Uncategorized",
): RowResult[] {
	return rows.map((raw, index) => {
		const row = index + 2; // 1-based, plus the header line
		const date = parseDate(raw[mapping.date] ?? "", mapping.dateFormat);
		if (!date)
			return {
				row,
				ok: false,
				error: `Unreadable date "${raw[mapping.date] ?? ""}"`,
			};

		const payee = (raw[mapping.payee] ?? "").trim().slice(0, 120);
		if (!payee) return { row, ok: false, error: "Missing description" };

		let signedAmount: number | null;
		if (mapping.amount) {
			signedAmount = parseMoney(raw[mapping.amount] ?? "");
		} else {
			const out = parseMoney(raw[mapping.debit] ?? "") ?? 0;
			const into = parseMoney(raw[mapping.credit] ?? "") ?? 0;
			signedAmount =
				out === 0 && into === 0 ? null : Math.abs(into) - Math.abs(out);
		}
		if (signedAmount === null || signedAmount === 0) {
			return { row, ok: false, error: "Missing or zero amount" };
		}
		if (mapping.invert) signedAmount = -signedAmount;

		const category =
			(mapping.category ? (raw[mapping.category] ?? "").trim() : "").slice(
				0,
				60,
			) || defaultCategory;

		return {
			row,
			ok: true,
			value: {
				date,
				payee,
				category,
				amount: Math.round(Math.abs(signedAmount) * 100) / 100,
				type: signedAmount > 0 ? "income" : "expense",
			},
		};
	});
}

export function isMappingComplete(m: ColumnMapping) {
	return Boolean(m.date && m.payee && (m.amount || m.debit || m.credit));
}

export type ExportRow = {
	date: string;
	payee: string;
	category: string;
	type: string;
	amount: number;
	status: string;
	account: string;
	notes?: string;
};

/**
 * Stops spreadsheet apps from treating text like `=HYPERLINK(...)` as a
 * formula when the export is opened.
 */
export function safeCell(value: string): string {
	return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: ExportRow[]): string {
	return Papa.unparse(
		rows.map((r) => ({
			Date: r.date,
			Payee: safeCell(r.payee),
			Category: safeCell(r.category),
			Type: r.type,
			// Signed, so the file re-imports cleanly.
			Amount: (r.type === "income" ? r.amount : -r.amount).toFixed(2),
			Status: r.status,
			Account: safeCell(r.account),
			Notes: safeCell(r.notes ?? ""),
		})),
	);
}

export function downloadFile(
	filename: string,
	content: string,
	type = "text/csv",
) {
	const blob = new Blob([content], { type: `${type};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
