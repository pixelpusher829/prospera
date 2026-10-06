// Pure finance calculations shared by the React app and Convex functions.
// Dates are ISO `YYYY-MM-DD` strings and are compared as strings, which
// avoids time-zone surprises from `new Date("2026-01-01")` being UTC.

export type TxLike = {
	date: string;
	amount: number;
	type: "income" | "expense";
	category: string;
	accountId?: string;
};

export type AccountLike = { type: string; balance: number };
export type BudgetLike = { name: string; limit: number };
export type GoalLike = {
	name: string;
	targetAmount: number;
	currentAmount: number;
	deadline: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100 || 0;

// ---- Dates ------------------------------------------------------------------

export function toIsoDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function todayIso(): string {
	return toIsoDate(new Date());
}

/** Parses `YYYY-MM-DD` as a local date (not UTC). */
export function parseIsoDate(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
	const date = parseIsoDate(iso);
	date.setDate(date.getDate() + days);
	return toIsoDate(date);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function shiftMonth(key: string, delta: number): string {
	const [y, m] = key.split("-").map(Number);
	const date = new Date(y, m - 1 + delta, 1);
	return toIsoDate(date).slice(0, 7);
}

export function monthLabel(key: string, withYear = false): string {
	const [y, m] = key.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleString("en-US", {
		month: "short",
		...(withYear ? { year: "numeric" } : {}),
	});
}

export function monthsBetween(fromIso: string, toIso: string): number {
	const a = parseIsoDate(fromIso);
	const b = parseIsoDate(toIso);
	return (
		(b.getFullYear() - a.getFullYear()) * 12 +
		(b.getMonth() - a.getMonth()) +
		(b.getDate() >= a.getDate() ? 0 : -1)
	);
}

// ---- Accounts ---------------------------------------------------------------

export const LIABILITY_TYPES = new Set(["Credit", "Loan"]);
export const isLiability = (type: string) => LIABILITY_TYPES.has(type);

export function balanceSheet(accounts: AccountLike[]) {
	let assets = 0;
	let liabilities = 0;
	for (const a of accounts) {
		if (a.balance >= 0) assets += a.balance;
		else liabilities += -a.balance;
	}
	return {
		assets: round2(assets),
		liabilities: round2(liabilities),
		netWorth: round2(assets - liabilities),
	};
}

// ---- Transactions -----------------------------------------------------------

export const signed = (t: Pick<TxLike, "amount" | "type">) =>
	t.type === "income" ? t.amount : -t.amount;

export type MonthTotals = {
	income: number;
	expense: number;
	net: number;
	count: number;
	incomeCount: number;
	expenseCount: number;
	categories: number;
};

/** Totals for a month, optionally only up to day `untilDay` of it. */
export function monthTotals(
	txs: TxLike[],
	key: string,
	untilDay = 31,
): MonthTotals {
	let income = 0;
	let expense = 0;
	let incomeCount = 0;
	let expenseCount = 0;
	const categories = new Set<string>();
	for (const t of txs) {
		if (monthKey(t.date) !== key) continue;
		if (Number(t.date.slice(8, 10)) > untilDay) continue;
		if (t.type === "income") {
			income += t.amount;
			incomeCount++;
		} else {
			expense += t.amount;
			expenseCount++;
			categories.add(t.category.toLowerCase());
		}
	}
	return {
		income: round2(income),
		expense: round2(expense),
		net: round2(income - expense),
		count: incomeCount + expenseCount,
		incomeCount,
		expenseCount,
		categories: categories.size,
	};
}

/** Percentage change from `previous` to `current`, or null if undefined. */
export function percentChange(
	current: number,
	previous: number,
): number | null {
	if (previous === 0) return current === 0 ? 0 : null;
	return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function summarize(
	txs: TxLike[],
	accounts: AccountLike[],
	today: string = todayIso(),
) {
	const key = monthKey(today);
	const month = monthTotals(txs, key);
	const previous = monthTotals(txs, shiftMonth(key, -1));
	// Compare month-to-date with the same stretch of last month, so the 5th
	// isn't measured against a whole month.
	const previousToDate = monthTotals(
		txs,
		shiftMonth(key, -1),
		Number(today.slice(8, 10)),
	);
	return {
		...balanceSheet(accounts),
		month,
		previous,
		previousToDate,
		incomeChange: percentChange(month.income, previousToDate.income),
		expenseChange: percentChange(month.expense, previousToDate.expense),
		netChange: round2(month.net - previousToDate.net),
	};
}

export type Slice = { name: string; value: number; share: number };

/** Expense totals by category for one month, largest first. */
export function expenseBreakdown(
	txs: TxLike[],
	key: string,
	maxSlices = 5,
): Slice[] {
	const totals = new Map<string, { name: string; value: number }>();
	let total = 0;
	for (const t of txs) {
		if (t.type !== "expense" || monthKey(t.date) !== key) continue;
		const id = t.category.toLowerCase();
		const entry = totals.get(id) ?? { name: t.category, value: 0 };
		entry.value += t.amount;
		totals.set(id, entry);
		total += t.amount;
	}
	const sorted = [...totals.values()].sort((a, b) => b.value - a.value);
	const head = sorted.slice(0, maxSlices);
	const rest = sorted.slice(maxSlices).reduce((sum, s) => sum + s.value, 0);
	if (rest > 0) head.push({ name: "Other", value: rest });
	return head.map((s) => ({
		name: s.name,
		value: round2(s.value),
		share: total ? Math.round((s.value / total) * 1000) / 10 : 0,
	}));
}

export type MonthPoint = {
	key: string;
	label: string;
	income: number;
	expense: number;
	net: number;
};

/** Income and expense per month for the last `months` months (oldest first). */
export function monthlySeries(
	txs: TxLike[],
	months: number,
	today: string = todayIso(),
): MonthPoint[] {
	const current = monthKey(today);
	return Array.from({ length: months }, (_, i) => {
		const key = shiftMonth(current, i - months + 1);
		const totals = monthTotals(txs, key);
		return {
			key,
			label: monthLabel(key),
			income: totals.income,
			expense: totals.expense,
			net: totals.net,
		};
	});
}

/**
 * Reconstructs net worth for each of the last `days` days by walking back
 * from today's balances and undoing transactions linked to an account.
 */
export function netWorthHistory(
	txs: TxLike[],
	accounts: AccountLike[],
	days: number,
	today: string = todayIso(),
): { date: string; value: number }[] {
	const flowByDate = new Map<string, number>();
	for (const t of txs) {
		if (!t.accountId) continue;
		flowByDate.set(t.date, (flowByDate.get(t.date) ?? 0) + signed(t));
	}
	// Transactions dated in the future are already reflected in balances.
	let value = balanceSheet(accounts).netWorth;
	for (const [date, flow] of flowByDate) {
		if (date > today) value -= flow;
	}
	const points: { date: string; value: number }[] = [];
	let date = today;
	for (let i = 0; i < days; i++) {
		points.push({ date, value: round2(value) });
		value -= flowByDate.get(date) ?? 0;
		date = addDays(date, -1);
	}
	return points.reverse();
}

// ---- Budgets ----------------------------------------------------------------

export function spentByCategory(txs: TxLike[], key: string) {
	const spent = new Map<string, number>();
	for (const t of txs) {
		if (t.type !== "expense" || monthKey(t.date) !== key) continue;
		const id = t.category.trim().toLowerCase();
		spent.set(id, round2((spent.get(id) ?? 0) + t.amount));
	}
	return spent;
}

export function budgetProgress<B extends BudgetLike>(
	budgets: B[],
	txs: TxLike[],
	key: string,
) {
	const spent = spentByCategory(txs, key);
	const items = budgets.map((b) => {
		const used = spent.get(b.name.trim().toLowerCase()) ?? 0;
		const pct =
			b.limit > 0 ? Math.round((used / b.limit) * 100) : used > 0 ? 100 : 0;
		return {
			...b,
			spent: used,
			remaining: round2(b.limit - used),
			pct,
			isOver: used > b.limit,
		};
	});
	const totalLimit = round2(items.reduce((s, b) => s + b.limit, 0));
	const totalSpent = round2(items.reduce((s, b) => s + b.spent, 0));
	return {
		items,
		totalLimit,
		totalSpent,
		remaining: round2(totalLimit - totalSpent),
		pct: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0,
	};
}

// ---- Goals ------------------------------------------------------------------

export function goalProgress(goal: GoalLike, today: string = todayIso()) {
	const remaining = round2(Math.max(0, goal.targetAmount - goal.currentAmount));
	const pct =
		goal.targetAmount > 0
			? Math.min(
					100,
					Math.round((goal.currentAmount / goal.targetAmount) * 100),
				)
			: 0;
	const isComplete = remaining === 0;
	const monthsLeft = Math.max(0, monthsBetween(today, goal.deadline));
	const isOverdue = !isComplete && goal.deadline < today;
	return {
		pct,
		remaining,
		isComplete,
		isOverdue,
		monthsLeft,
		monthlyNeeded: isComplete ? 0 : round2(remaining / Math.max(1, monthsLeft)),
	};
}

// ---- Alerts -----------------------------------------------------------------

export type Alert = {
	id: string;
	tone: "danger" | "warning" | "success" | "info";
	title: string;
	detail: string;
	href: string;
};

export function buildAlerts({
	budgets,
	goals,
	txs,
	today = todayIso(),
	format,
}: {
	budgets: BudgetLike[];
	goals: GoalLike[];
	txs: (TxLike & { status?: string })[];
	today?: string;
	format: (n: number) => string;
}): Alert[] {
	const alerts: Alert[] = [];
	const { items } = budgetProgress(budgets, txs, monthKey(today));
	for (const b of items) {
		if (b.isOver) {
			alerts.push({
				id: `over-${b.name}`,
				tone: "danger",
				title: `${b.name} is over budget`,
				detail: `${format(b.spent)} spent of ${format(b.limit)} this month.`,
				href: "/budget",
			});
		} else if (b.limit > 0 && b.pct >= 85) {
			alerts.push({
				id: `near-${b.name}`,
				tone: "warning",
				title: `${b.name} is at ${b.pct}%`,
				detail: `${format(b.remaining)} left for the rest of the month.`,
				href: "/budget",
			});
		}
	}
	for (const g of goals) {
		const p = goalProgress(g, today);
		if (p.isOverdue) {
			alerts.push({
				id: `goal-overdue-${g.name}`,
				tone: "warning",
				title: `${g.name} passed its target date`,
				detail: `${format(p.remaining)} still to go.`,
				href: "/goals",
			});
		} else if (!p.isComplete && g.deadline <= addDays(today, 30)) {
			alerts.push({
				id: `goal-soon-${g.name}`,
				tone: "info",
				title: `${g.name} is due soon`,
				detail: `${format(p.remaining)} left before ${g.deadline}.`,
				href: "/goals",
			});
		}
	}
	const pending = txs.filter((t) => t.status === "pending").length;
	if (pending > 0) {
		alerts.push({
			id: "pending",
			tone: "info",
			title: `${pending} pending transaction${pending === 1 ? "" : "s"}`,
			detail: "Mark them cleared once they post to your bank.",
			href: "/transactions",
		});
	}
	return alerts;
}
