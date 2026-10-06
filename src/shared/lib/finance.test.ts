import { describe, expect, it } from "vitest";
import {
	addDays,
	balanceSheet,
	budgetProgress,
	buildAlerts,
	expenseBreakdown,
	goalProgress,
	monthlySeries,
	monthTotals,
	netWorthHistory,
	percentChange,
	shiftMonth,
	summarize,
	type TxLike,
} from "./finance";

const tx = (
	date: string,
	amount: number,
	type: "income" | "expense" = "expense",
	category = "Food",
	accountId?: string,
): TxLike => ({ date, amount, type, category, accountId });

describe("dates", () => {
	it("shifts months across year boundaries", () => {
		expect(shiftMonth("2026-01", -1)).toBe("2025-12");
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
	});
	it("adds days across month ends", () => {
		expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});
});

describe("balanceSheet", () => {
	it("treats negative balances as debts", () => {
		expect(
			balanceSheet([
				{ type: "Debit", balance: 1000 },
				{ type: "Credit", balance: -250.5 },
				{ type: "Loan", balance: -500 },
			]),
		).toEqual({ assets: 1000, liabilities: 750.5, netWorth: 249.5 });
	});
});

describe("monthTotals", () => {
	const txs = [
		tx("2026-03-02", 10),
		tx("2026-03-20", 30, "expense", "Rent"),
		tx("2026-03-15", 100, "income", "Salary"),
		tx("2026-04-01", 999),
	];
	it("sums one month only", () => {
		expect(monthTotals(txs, "2026-03")).toMatchObject({
			income: 100,
			expense: 40,
			net: 60,
			count: 3,
			categories: 2,
		});
	});
	it("can stop at a day of the month", () => {
		expect(monthTotals(txs, "2026-03", 15)).toMatchObject({
			income: 100,
			expense: 10,
		});
	});
});

describe("percentChange", () => {
	it("is null when there is nothing to compare with", () => {
		expect(percentChange(50, 0)).toBeNull();
		expect(percentChange(0, 0)).toBe(0);
	});
	it("rounds to one decimal", () => {
		expect(percentChange(150, 100)).toBe(50);
		expect(percentChange(1, 3)).toBe(-66.7);
	});
});

describe("summarize", () => {
	it("compares month-to-date with the same days last month", () => {
		const txs = [
			tx("2026-02-03", 100),
			tx("2026-02-25", 900),
			tx("2026-03-04", 150),
		];
		const s = summarize(txs, [], "2026-03-05");
		expect(s.previous.expense).toBe(1000);
		expect(s.previousToDate.expense).toBe(100);
		expect(s.expenseChange).toBe(50);
	});
});

describe("expenseBreakdown", () => {
	it("groups categories case-insensitively and buckets the tail into Other", () => {
		const txs = [
			tx("2026-03-01", 50, "expense", "Food"),
			tx("2026-03-02", 50, "expense", "food"),
			tx("2026-03-03", 60, "expense", "Rent"),
			tx("2026-03-04", 20, "expense", "Fun"),
			tx("2026-03-05", 20, "expense", "Gym"),
			tx("2026-03-05", 500, "income", "Salary"),
		];
		const slices = expenseBreakdown(txs, "2026-03", 2);
		expect(slices).toEqual([
			{ name: "Food", value: 100, share: 50 },
			{ name: "Rent", value: 60, share: 30 },
			{ name: "Other", value: 40, share: 20 },
		]);
	});
});

describe("monthlySeries", () => {
	it("returns oldest month first, including empty months", () => {
		const series = monthlySeries([tx("2026-03-10", 5)], 3, "2026-03-15");
		expect(series.map((m) => m.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
		expect(series[2].expense).toBe(5);
		expect(series[0].expense).toBe(0);
	});
});

describe("netWorthHistory", () => {
	it("walks back from today's balance using linked transactions", () => {
		const accounts = [{ type: "Debit", balance: 1000 }];
		const txs = [
			tx("2026-03-10", 200, "income", "Pay", "a1"),
			tx("2026-03-09", 50, "expense", "Food", "a1"),
			tx("2026-03-09", 999, "expense", "Unlinked"),
		];
		const history = netWorthHistory(txs, accounts, 3, "2026-03-10");
		expect(history).toEqual([
			{ date: "2026-03-08", value: 850 },
			{ date: "2026-03-09", value: 800 },
			{ date: "2026-03-10", value: 1000 },
		]);
	});
});

describe("budgetProgress", () => {
	it("matches spending to budgets by name and flags overspending", () => {
		const result = budgetProgress(
			[
				{ name: "Food", limit: 100 },
				{ name: "Fun", limit: 50 },
			],
			[
				tx("2026-03-01", 120, "expense", "food"),
				tx("2026-03-02", 10, "expense", "Fun"),
			],
			"2026-03",
		);
		expect(result.items[0]).toMatchObject({
			spent: 120,
			isOver: true,
			pct: 120,
			remaining: -20,
		});
		expect(result.items[1]).toMatchObject({
			spent: 10,
			isOver: false,
			pct: 20,
		});
		expect(result).toMatchObject({ totalLimit: 150, totalSpent: 130, pct: 87 });
	});
});

describe("goalProgress", () => {
	it("spreads the remaining amount over the months left", () => {
		const p = goalProgress(
			{
				name: "Car",
				targetAmount: 1200,
				currentAmount: 200,
				deadline: "2026-11-15",
			},
			"2026-03-15",
		);
		expect(p).toMatchObject({
			pct: 17,
			remaining: 1000,
			monthsLeft: 8,
			monthlyNeeded: 125,
			isComplete: false,
		});
	});
	it("flags overdue goals", () => {
		const p = goalProgress(
			{
				name: "Trip",
				targetAmount: 100,
				currentAmount: 10,
				deadline: "2026-01-01",
			},
			"2026-03-15",
		);
		expect(p.isOverdue).toBe(true);
	});
});

describe("buildAlerts", () => {
	it("warns about overspending, nearly-spent budgets, due goals and pending items", () => {
		const alerts = buildAlerts({
			budgets: [
				{ name: "Food", limit: 100 },
				{ name: "Rent", limit: 100 },
				{ name: "Fun", limit: 100 },
			],
			goals: [
				{
					name: "Trip",
					targetAmount: 100,
					currentAmount: 0,
					deadline: "2026-03-20",
				},
			],
			txs: [
				{ ...tx("2026-03-01", 150, "expense", "Food"), status: "cleared" },
				{ ...tx("2026-03-01", 90, "expense", "Rent"), status: "pending" },
			],
			today: "2026-03-10",
			format: (n) => `$${n}`,
		});
		expect(alerts.map((a) => [a.tone, a.title])).toEqual([
			["danger", "Food is over budget"],
			["warning", "Rent is at 90%"],
			["info", "Trip is due soon"],
			["info", "1 pending transaction"],
		]);
	});
});
