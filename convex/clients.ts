import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
	batchSize,
	email,
	getOwned,
	isoDate,
	listOwned,
	money,
	optionalText,
	requireUserId,
	text,
} from "./lib";
import { clientFields, clientStatus } from "./validators";

const input = v.object(clientFields);
type ClientInput = Infer<typeof input>;

function clean(args: ClientInput): ClientInput {
	return {
		name: text(args.name, "Name", { max: 80 }),
		email: email(args.email),
		company: text(args.company, "Company", { max: 80, required: false }),
		status: args.status,
		revenue: money(args.revenue, "Revenue"),
		lastContact: isoDate(args.lastContact, "Last contact"),
		notes: optionalText(args.notes, "Notes"),
	};
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		return await listOwned(ctx, "clients", userId);
	},
});

export const create = mutation({
	args: clientFields,
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		return await ctx.db.insert("clients", { userId, ...clean(args) });
	},
});

export const update = mutation({
	args: { id: v.id("clients"), ...clientFields },
	handler: async (ctx, { id, ...args }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.replace(id, { userId, ...clean(args) });
	},
});

export const remove = mutation({
	args: { id: v.id("clients") },
	handler: async (ctx, { id }) => {
		const userId = await requireUserId(ctx);
		await getOwned(ctx, userId, id);
		await ctx.db.delete(id);
	},
});

async function forEachOwned(
	ctx: MutationCtx,
	ids: Id<"clients">[],
	fn: (id: Id<"clients">) => Promise<void>,
) {
	batchSize(ids.length);
	const userId = await requireUserId(ctx);
	for (const id of ids) {
		await getOwned(ctx, userId, id);
		await fn(id);
	}
}

export const bulkSetStatus = mutation({
	args: { ids: v.array(v.id("clients")), status: clientStatus },
	handler: async (ctx, { ids, status }) => {
		await forEachOwned(ctx, ids, (id) => ctx.db.patch(id, { status }));
	},
});

export const bulkRemove = mutation({
	args: { ids: v.array(v.id("clients")) },
	handler: async (ctx, { ids }) => {
		await forEachOwned(ctx, ids, (id) => ctx.db.delete(id));
	},
});

/** Re-inserts clients, used to undo a delete. */
export const bulkCreate = mutation({
	args: { items: v.array(input) },
	handler: async (ctx, { items }) => {
		batchSize(items.length);
		const userId = await requireUserId(ctx);
		for (const item of items) {
			await ctx.db.insert("clients", { userId, ...clean(item) });
		}
	},
});
