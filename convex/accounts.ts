import { type Infer, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
	expiry,
	getOwned,
	listOwned,
	mask,
	money,
	optionalText,
	requireUserId,
	text,
} from "./lib";
import { accountFields } from "./validators";

const input = v.object(accountFields);

function clean(args: Infer<typeof input>): Infer<typeof input> {
	const isCard = args.type === "Credit";
	const isInvestment = args.type === "Investment";
	return {
		name: text(args.name, "Name", { max: 60 }),
		type: args.type,
		balance: money(args.balance, "Balance", { allowNegative: true }),
		institution: text(args.institution, "Institution", {
			max: 60,
			required: false,
		}),
		mask: mask(args.mask),
		expiry: isCard ? expiry(args.expiry) : undefined,
		colorTheme: optionalText(args.colorTheme, "Colour", 80),
		investmentCategory: isInvestment
			? optionalText(args.investmentCategory, "Category", 40)
			: undefined,
	};
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await listOwned(ctx, "accounts", userId);
	},
});

export const create = mutation({
	args: accountFields,
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		return await ctx.db.insert("accounts", { userId, ...clean(args) });
	},
});

export const update = mutation({
	args: { id: v.id("accounts"), ...accountFields },
	handler: async (ctx, { id, ...args }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.replace(id, { userId, ...clean(args) });
	},
});

/** Deletes an account. Its transactions are kept but unlinked. */
export const remove = mutation({
	args: { id: v.id("accounts") },
	handler: async (ctx, { id }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		const linked = await ctx.db
			.query("transactions")
			.withIndex("by_account", (q) => q.eq("accountId", id))
			.collect();
		for (const t of linked) {
			if (t.userId === userId)
				await ctx.db.patch(t._id, { accountId: undefined });
		}
		await ctx.db.delete(id);
		return linked.length;
	},
});
