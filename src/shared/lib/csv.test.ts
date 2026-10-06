import { describe, expect, it } from "vitest";
import {
	type ColumnMapping,
	guessMapping,
	isMappingComplete,
	mapRows,
	parseCsv,
	parseDate,
	safeCell,
	toCsv,
} from "./csv";

describe("parseDate", () => {
	it.each([
		["2026-03-31", "auto", "2026-03-31"],
		["2026/3/1", "auto", "2026-03-01"],
		["03/31/2026", "auto", "2026-03-31"],
		["31/03/2026", "auto", "2026-03-31"], // day > 12, so day first
		["01/02/2026", "dmy", "2026-02-01"],
		["01/02/26", "mdy", "2026-01-02"],
		["2026-03-31T10:00:00Z", "auto", "2026-03-31"],
	] as const)("parses %s (%s)", (raw, format, expected) => {
		expect(parseDate(raw, format)).toBe(expected);
	});

	it.each([
		"",
		"yesterday",
		"2026-02-30",
		"13/13/2026",
	])("rejects %j", (raw) => {
		expect(parseDate(raw)).toBeNull();
	});
});

describe("guessMapping", () => {
	it("recognises a typical bank export", () => {
		const m = guessMapping([
			"Transaction Date",
			"Description",
			"Amount",
			"Category",
		]);
		expect(m).toMatchObject({
			date: "Transaction Date",
			payee: "Description",
			amount: "Amount",
			category: "Category",
		});
		expect(isMappingComplete(m)).toBe(true);
	});

	it("falls back to separate debit and credit columns", () => {
		const m = guessMapping(["Posted Date", "Payee", "Debit", "Credit"]);
		expect(m).toMatchObject({ amount: "", debit: "Debit", credit: "Credit" });
	});
});

describe("mapRows", () => {
	const base: ColumnMapping = {
		date: "Date",
		payee: "Description",
		amount: "Amount",
		debit: "",
		credit: "",
		category: "",
		dateFormat: "auto",
		invert: false,
	};

	it("turns signed amounts into typed transactions and reports bad rows", () => {
		const { rows } = parseCsv(
			'﻿Date,Description,Amount\n2026-03-01,Coffee,-4.50\n2026-03-02,Salary,"$2,000.00"\nnot a date,Oops,1\n2026-03-03,,5\n2026-03-04,Zero,0\n',
		);
		const results = mapRows(rows, base);
		expect(results.filter((r) => r.ok).map((r) => r.ok && r.value)).toEqual([
			{
				date: "2026-03-01",
				payee: "Coffee",
				category: "Uncategorized",
				amount: 4.5,
				type: "expense",
			},
			{
				date: "2026-03-02",
				payee: "Salary",
				category: "Uncategorized",
				amount: 2000,
				type: "income",
			},
		]);
		expect(results.filter((r) => !r.ok).map((r) => r.row)).toEqual([4, 5, 6]);
	});

	it("supports debit/credit columns and inverted signs", () => {
		const { rows } = parseCsv(
			"Date,Description,Out,In\n03/01/2026,Rent,1200,\n03/02/2026,Refund,,30\n",
		);
		const split = mapRows(rows, {
			...base,
			amount: "",
			debit: "Out",
			credit: "In",
		});
		expect(split.map((r) => r.ok && [r.value.type, r.value.amount])).toEqual([
			["expense", 1200],
			["income", 30],
		]);

		const { rows: card } = parseCsv(
			"Date,Description,Amount\n2026-03-01,Store,25\n",
		);
		const inverted = mapRows(card, { ...base, invert: true });
		expect(inverted[0].ok && inverted[0].value.type).toBe("expense");
	});
});

describe("export", () => {
	it("neutralises spreadsheet formulas", () => {
		expect(safeCell('=HYPERLINK("x")')).toBe('\'=HYPERLINK("x")');
		expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
		expect(safeCell("Coffee")).toBe("Coffee");
	});

	it("round-trips through import", () => {
		const csv = toCsv([
			{
				date: "2026-03-01",
				payee: "Coffee",
				category: "Dining",
				type: "expense",
				amount: 4.5,
				status: "cleared",
				account: "Visa",
			},
			{
				date: "2026-03-02",
				payee: "Pay",
				category: "Salary",
				type: "income",
				amount: 100,
				status: "cleared",
				account: "",
			},
		]);
		const { headers, rows } = parseCsv(csv);
		const results = mapRows(rows, guessMapping(headers));
		expect(
			results.map(
				(r) =>
					r.ok && [
						r.value.payee,
						r.value.type,
						r.value.amount,
						r.value.category,
					],
			),
		).toEqual([
			["Coffee", "expense", 4.5, "Dining"],
			["Pay", "income", 100, "Salary"],
		]);
	});
});
