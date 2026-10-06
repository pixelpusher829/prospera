import { z } from "zod";
import { parseMoney } from "./money";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const requiredText = (label: string, max = 80) =>
	z
		.string()
		.trim()
		.min(1, `${label} is required.`)
		.max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (label: string, max = 500) =>
	z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

export const isoDate = (label: string) =>
	z.string().regex(ISO_DATE, `Choose a ${label.toLowerCase()}.`);

export const emailAddress = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^\S+@\S+\.\S+$/, "Enter a valid email address.");

/** A typed money string, parsed to a number. */
export const moneyInput = (
	label: string,
	{ min = 0, positive = false }: { min?: number; positive?: boolean } = {},
) =>
	z.string().transform((raw, ctx) => {
		const value = parseMoney(raw);
		if (value === null) {
			ctx.addIssue({
				code: "custom",
				message: `Enter ${label.toLowerCase()}.`,
			});
			return z.NEVER;
		}
		if (positive && value <= 0) {
			ctx.addIssue({
				code: "custom",
				message: `${label} must be more than 0.`,
			});
			return z.NEVER;
		}
		if (value < min) {
			ctx.addIssue({ code: "custom", message: `${label} can't be negative.` });
			return z.NEVER;
		}
		return Math.round(value * 100) / 100;
	});

export const transactionForm = z.object({
	payee: requiredText("Payee"),
	amount: moneyInput("An amount", { positive: true }),
	type: z.enum(["income", "expense"]),
	category: requiredText("Category", 60),
	date: isoDate("Date"),
	status: z.enum(["cleared", "pending"]),
	accountId: z.string(),
	notes: optionalText("Notes"),
});

export const goalForm = z
	.object({
		name: requiredText("Goal name", 60),
		targetAmount: moneyInput("A target amount", { positive: true }),
		currentAmount: moneyInput("Amount saved"),
		deadline: isoDate("Target date"),
		icon: z.string(),
		color: z.string(),
	})
	.refine((g) => g.currentAmount <= g.targetAmount * 10, {
		message: "That's a lot more than your target. Double-check the amounts.",
		path: ["currentAmount"],
	});

export const clientForm = z.object({
	name: requiredText("Name"),
	email: emailAddress,
	company: optionalText("Company", 80),
	status: z.enum(["Active", "Pending", "Inactive"]),
	revenue: moneyInput("Revenue"),
	lastContact: isoDate("Last contact date"),
	notes: optionalText("Notes", 2000),
});

export const passwordRules = z
	.string()
	.min(8, "Use at least 8 characters.")
	.max(128, "That password is too long.");
