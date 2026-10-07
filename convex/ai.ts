import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import {
	budgetProgress,
	expenseBreakdown,
	monthKey,
	summarize,
	todayIso,
} from "../src/shared/lib/finance";
import { components, internal } from "./_generated/api";
import {
	action,
	internalMutation,
	internalQuery,
	query,
} from "./_generated/server";
import { requireUserId } from "./lib";

const rateLimiter = new RateLimiter(components.rateLimiter, {
	aiInsight: { kind: "token bucket", rate: 10, period: HOUR, capacity: 3 },
	aiGlobal: { kind: "fixed window", rate: 300, period: HOUR },
});

// Google's rolling alias for the newest Flash model, so retirements don't break this.
const DEFAULT_MODEL = "gemini-flash-latest";

function geminiErrorMessage(status: number, model: string): string {
	switch (status) {
		case 503:
			return "Google's AI is overloaded right now (high demand). Try again in a minute or two.";
		case 429:
			return "The Gemini API key has hit its rate limit or free quota. Wait a bit, or check usage in Google AI Studio.";
		case 400:
		case 401:
		case 403:
			return "Google rejected the API key. Check GEMINI_API_KEY on the Convex deployment.";
		case 404:
			return `The AI model "${model}" isn't available for this API key. Set GEMINI_MODEL to a model it can use.`;
		default:
			return status >= 500
				? `Google's AI service had an error (${status}). Try again shortly.`
				: `The AI request failed (${status}). Check the Convex logs for details.`;
	}
}

export const latest = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await ctx.db
			.query("aiInsights")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.first();
	},
});

export const snapshot = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const [transactions, accounts, budgets, settings] = await Promise.all([
			ctx.db
				.query("transactions")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.collect(),
			ctx.db
				.query("accounts")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.collect(),
			ctx.db
				.query("budgetCategories")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.collect(),
			ctx.db
				.query("userSettings")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.unique(),
		]);
		return {
			transactions,
			accounts,
			budgets,
			currency: settings?.currency ?? "USD",
		};
	},
});

export const save = internalMutation({
	args: { userId: v.id("users"), text: v.string() },
	handler: async (ctx, { userId, text }) => {
		const old = await ctx.db
			.query("aiInsights")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const doc of old) await ctx.db.delete(doc._id);
		await ctx.db.insert("aiInsights", { userId, text, createdAt: Date.now() });
	},
});

export const generate = action({
	args: {},
	handler: async (ctx): Promise<string> => {
		const userId = await requireUserId(ctx);

		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			throw new ConvexError(
				"AI insights aren't configured on this server yet (GEMINI_API_KEY is missing).",
			);
		}

		const limit = await rateLimiter.limit(ctx, "aiInsight", { key: userId });
		if (!limit.ok) {
			const minutes = Math.ceil(limit.retryAfter / 60000);
			throw new ConvexError(
				`You've requested a lot of insights. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
			);
		}
		// A ceiling across everyone, since guest accounts are free to create.
		const global = await rateLimiter.limit(ctx, "aiGlobal");
		if (!global.ok) {
			throw new ConvexError(
				"The AI advisor is busy right now. Please try again a little later.",
			);
		}

		const data = await ctx.runQuery(internal.ai.snapshot, { userId });
		if (data.transactions.length < 3) {
			throw new ConvexError(
				"Add a few transactions first so there's something to analyse.",
			);
		}

		const today = todayIso();
		const key = monthKey(today);
		const summary = summarize(data.transactions, data.accounts, today);
		const categories = expenseBreakdown(data.transactions, key, 6);
		const budgets = budgetProgress(data.budgets, data.transactions, key);
		const fmt = (n: number) =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: data.currency,
			}).format(n);

		// Only aggregates are sent to the model, never payees or account details.
		const context = [
			`Currency: ${data.currency}. Today is ${today}.`,
			`Net worth: ${fmt(summary.netWorth)} (assets ${fmt(summary.assets)}, debts ${fmt(summary.liabilities)}).`,
			`This month so far: income ${fmt(summary.month.income)}, spending ${fmt(summary.month.expense)}.`,
			`Last month: income ${fmt(summary.previous.income)}, spending ${fmt(summary.previous.expense)}.`,
			`Top spending categories this month: ${categories.map((c) => `${c.name} ${fmt(c.value)} (${c.share}%)`).join(", ") || "none yet"}.`,
			budgets.items.length
				? `Budgets: ${budgets.items.map((b) => `${b.name} ${fmt(b.spent)} of ${fmt(b.limit)}`).join(", ")}.`
				: "No budgets set.",
		].join("\n");

		const prompt = `You are a friendly, practical personal finance assistant inside a budgeting app.
Here is a snapshot of the user's finances:
${context}

Write exactly three short sentences of specific, actionable advice: one on cash flow, one on where they could save based on the categories or budgets, and one suggestion for the rest of this month. Use plain text with no markdown, lists or headings. Do not invent numbers that are not in the snapshot.`;

		const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": apiKey,
				},
				body: JSON.stringify({
					contents: [{ role: "user", parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
				}),
			},
		);

		if (!response.ok) {
			console.error("Gemini error", response.status, await response.text());
			throw new ConvexError(geminiErrorMessage(response.status, model));
		}

		const json = (await response.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[];
		};
		const text = json.candidates?.[0]?.content?.parts
			?.map((p) => p.text ?? "")
			.join("")
			.trim();
		if (!text) {
			throw new ConvexError(
				"The AI service returned an empty answer. Try again.",
			);
		}

		await ctx.runMutation(internal.ai.save, { userId, text });
		return text;
	},
});
