import { type Infer, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
	getOwned,
	hexColor,
	isoDate,
	listOwned,
	money,
	requireUserId,
	text,
} from "./lib";
import { goalFields } from "./validators";

const input = v.object(goalFields);

function clean(args: Infer<typeof input>): Infer<typeof input> {
	return {
		name: text(args.name, "Goal name", { max: 60 }),
		targetAmount: money(args.targetAmount, "Target amount", { min: 0.01 }),
		currentAmount: money(args.currentAmount, "Saved so far"),
		deadline: isoDate(args.deadline, "Target date"),
		icon: text(args.icon, "Icon", { max: 30 }),
		color: hexColor(args.color),
	};
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const goals = await listOwned(ctx, "goals", userId);
		return goals.sort((a, b) => a.deadline.localeCompare(b.deadline));
	},
});

export const create = mutation({
	args: goalFields,
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		return await ctx.db.insert("goals", { userId, ...clean(args) });
	},
});

export const update = mutation({
	args: { id: v.id("goals"), ...goalFields },
	handler: async (ctx, { id, ...args }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.replace(id, { userId, ...clean(args) });
	},
});

/** Adds (or, with a negative amount, withdraws) money from a goal. */
export const contribute = mutation({
	args: { id: v.id("goals"), amount: v.number() },
	handler: async (ctx, { id, amount }) => {
		const userId = await requireUserId(ctx);
		const goal = await getOwned(ctx, userId, id);
		const delta = money(amount, "Amount", { allowNegative: true });
		await ctx.db.patch(id, {
			currentAmount: Math.max(
				0,
				Math.round((goal.currentAmount + delta) * 100) / 100,
			),
		});
	},
});

export const remove = mutation({
	args: { id: v.id("goals") },
	handler: async (ctx, { id }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.delete(id);
	},
});
