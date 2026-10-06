import { v } from "convex/values";

export const accountType = v.union(
	v.literal("Cash"),
	v.literal("Debit"),
	v.literal("Savings"),
	v.literal("Credit"),
	v.literal("Investment"),
	v.literal("Loan"),
);

// Liabilities (Credit, Loan) are stored as negative balances.
// Only the last four digits of an account/card number are ever stored.
export const accountFields = {
	name: v.string(),
	type: accountType,
	balance: v.number(),
	institution: v.string(),
	mask: v.optional(v.string()),
	expiry: v.optional(v.string()),
	colorTheme: v.optional(v.string()),
	investmentCategory: v.optional(v.string()),
};

export const transactionType = v.union(
	v.literal("income"),
	v.literal("expense"),
);
export const transactionStatus = v.union(
	v.literal("cleared"),
	v.literal("pending"),
);

export const transactionFields = {
	date: v.string(), // YYYY-MM-DD
	payee: v.string(),
	category: v.string(),
	amount: v.number(), // always positive; `type` carries the direction
	type: transactionType,
	status: transactionStatus,
	accountId: v.optional(v.id("accounts")),
	notes: v.optional(v.string()),
};

export const goalFields = {
	name: v.string(),
	targetAmount: v.number(),
	currentAmount: v.number(),
	deadline: v.string(), // YYYY-MM-DD
	icon: v.string(),
	color: v.string(),
};

export const budgetFields = {
	name: v.string(),
	limit: v.number(),
	color: v.string(),
	icon: v.string(),
};

export const clientStatus = v.union(
	v.literal("Active"),
	v.literal("Pending"),
	v.literal("Inactive"),
);

export const clientFields = {
	name: v.string(),
	email: v.string(),
	company: v.string(),
	status: clientStatus,
	revenue: v.number(),
	lastContact: v.string(), // YYYY-MM-DD
	notes: v.optional(v.string()),
};

export const settingsFields = {
	currency: v.string(),
	onboardingDismissed: v.boolean(),
};
