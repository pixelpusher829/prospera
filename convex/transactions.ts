import { type Infer, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
	batchSize,
	getOwned,
	isoDate,
	money,
	optionalText,
	requireUserId,
	text,
} from "./lib";
import { transactionFields, transactionStatus } from "./validators";

const input = v.object(transactionFields);
type TransactionInput = Infer<typeof input>;

function clean(args: TransactionInput): TransactionInput {
	const amount = money(args.amount, "Amount");
	return {
		...args,
		date: isoDate(args.date, "Date"),
		payee: text(args.payee, "Payee"),
		category:
			text(args.category, "Category", { max: 60, required: false }) ||
			"Uncategorized",
		amount,
		notes: optionalText(args.notes, "Notes", 500),
	};
}

function signedAmount(t: Pick<TransactionInput, "amount" | "type">) {
	return t.type === "income" ? t.amount : -t.amount;
}

/** Moves the linked account's balance by `delta`, ignoring deleted accounts. */
async function adjustBalance(
	ctx: MutationCtx,
	userId: Id<"users">,
	accountId: Id<"accounts"> | undefined,
	delta: number,
) {
	if (!accountId || delta === 0) return;
	const account = await ctx.db.get(accountId);
	if (!account || account.userId !== userId) return;
	await ctx.db.patch(accountId, {
		balance: Math.round((account.balance + delta) * 100) / 100,
	});
}

async function checkAccount(
	ctx: MutationCtx,
	userId: Id<"users">,
	accountId: Id<"accounts"> | undefined,
) {
	if (accountId) await getOwned(ctx, userId, accountId);
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await ctx.db
			.query("transactions")
			.withIndex("by_user_date", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();
	},
});

export const create = mutation({
	args: transactionFields,
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		const data = clean(args);
		await checkAccount(ctx, userId, data.accountId);
		const id = await ctx.db.insert("transactions", { userId, ...data });
		await adjustBalance(ctx, userId, data.accountId, signedAmount(data));
		return id;
	},
});

export const update = mutation({
	args: { id: v.id("transactions"), ...transactionFields },
	handler: async (ctx, { id, ...args }) => {
		const userId = await requireUserId(ctx);
		const existing = await getOwned(ctx, userId, id);
		const data = clean(args);
		await checkAccount(ctx, userId, data.accountId);
		await adjustBalance(
			ctx,
			userId,
			existing.accountId,
			-signedAmount(existing),
		);
		await ctx.db.replace(id, { userId, ...data });
		await adjustBalance(ctx, userId, data.accountId, signedAmount(data));
	},
});

async function removeOne(
	ctx: MutationCtx,
	userId: Id<"users">,
	doc: Doc<"transactions">,
) {
	await adjustBalance(ctx, userId, doc.accountId, -signedAmount(doc));
	await ctx.db.delete(doc._id);
}

export const remove = mutation({
	args: { id: v.id("transactions") },
	handler: async (ctx, { id }) => {
		const userId = await requireUserId(ctx);
		const doc = await getOwned(ctx, userId, id);
		await removeOne(ctx, userId, doc);
	},
});

export const bulkRemove = mutation({
	args: { ids: v.array(v.id("transactions")) },
	handler: async (ctx, { ids }) => {
		batchSize(ids.length);
		const userId = await requireUserId(ctx);
		for (const id of ids) {
			const doc = await getOwned(ctx, userId, id);
			await removeOne(ctx, userId, doc);
		}
	},
});

export const bulkSetCategory = mutation({
	args: { ids: v.array(v.id("transactions")), category: v.string() },
	handler: async (ctx, { ids, category }) => {
		batchSize(ids.length);
		const userId = await requireUserId(ctx);
		const clean = text(category, "Category", { max: 60 });
		for (const id of ids) {
			await getOwned(ctx, userId, id);
			await ctx.db.patch(id, { category: clean });
		}
	},
});

export const bulkSetStatus = mutation({
	args: { ids: v.array(v.id("transactions")), status: transactionStatus },
	handler: async (ctx, { ids, status }) => {
		batchSize(ids.length);
		const userId = await requireUserId(ctx);
		for (const id of ids) {
			await getOwned(ctx, userId, id);
			await ctx.db.patch(id, { status });
		}
	},
});

export const setCategory = mutation({
	args: { id: v.id("transactions"), category: v.string() },
	handler: async (ctx, { id, category }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.patch(id, {
			category: text(category, "Category", { max: 60 }),
		});
	},
});

/**
 * Inserts many transactions at once (CSV import, undo of a bulk delete).
 * Imported history usually predates the balance the user typed in, so
 * balances are only adjusted when asked.
 */
export const bulkCreate = mutation({
	args: { items: v.array(input), adjustBalances: v.boolean() },
	handler: async (ctx, { items, adjustBalances }) => {
		batchSize(items.length);
		const userId = await requireUserId(ctx);
		const checked = new Set<Id<"accounts">>();
		for (const item of items) {
			const data = clean(item);
			if (data.accountId && !checked.has(data.accountId)) {
				await checkAccount(ctx, userId, data.accountId);
				checked.add(data.accountId);
			}
			await ctx.db.insert("transactions", { userId, ...data });
			if (adjustBalances) {
				await adjustBalance(ctx, userId, data.accountId, signedAmount(data));
			}
		}
		return items.length;
	},
});
