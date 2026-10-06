import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
	batchSize,
	getOwned,
	hexColor,
	listOwned,
	money,
	requireUserId,
	text,
} from "./lib";
import { budgetFields } from "./validators";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await listOwned(ctx, "budgetCategories", userId);
	},
});

/**
 * Replaces the user's budget with `categories`: existing ids are updated,
 * new entries inserted, and anything missing from the list is deleted.
 */
export const saveAll = mutation({
	args: {
		categories: v.array(
			v.object({ id: v.optional(v.id("budgetCategories")), ...budgetFields }),
		),
	},
	handler: async (ctx, { categories }) => {
		batchSize(categories.length);
		const userId = await requireUserId(ctx);

		const names = new Set<string>();
		const cleaned = categories.map(({ id, ...c }) => {
			const name = text(c.name, "Category name", { max: 40 });
			const key = name.toLowerCase();
			if (names.has(key)) {
				throw new ConvexError(`"${name}" is listed twice.`);
			}
			names.add(key);
			return {
				id,
				name,
				limit: money(c.limit, `${name} limit`),
				color: hexColor(c.color),
				icon: text(c.icon, "Icon", { max: 30 }),
			};
		});

		const existing = await listOwned(ctx, "budgetCategories", userId);
		const keep = new Set(cleaned.flatMap((c) => (c.id ? [c.id] : [])));
		for (const doc of existing) {
			if (!keep.has(doc._id)) await ctx.db.delete(doc._id);
		}
		for (const { id, ...fields } of cleaned) {
			if (id) {
				await getOwned(ctx, userId, id);
				await ctx.db.replace(id, { userId, ...fields });
			} else {
				await ctx.db.insert("budgetCategories", { userId, ...fields });
			}
		}
	},
});
