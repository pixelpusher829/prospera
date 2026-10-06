import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id, TableNames } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthCtx = Parameters<typeof getAuthUserId>[0];

/** Returns the signed-in user's id or throws a user-facing error. */
export async function requireUserId(ctx: AuthCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new ConvexError("You need to be signed in.");
	return userId;
}

type OwnedTable = Exclude<
	TableNames,
	| "users"
	| "authAccounts"
	| "authSessions"
	| "authRefreshTokens"
	| "authVerificationCodes"
	| "authVerifiers"
	| "authRateLimits"
>;

/**
 * Loads a document and checks it belongs to `userId`. Missing and foreign
 * documents produce the same error so ids can't be probed.
 */
export async function getOwned<T extends OwnedTable>(
	ctx: QueryCtx | MutationCtx,
	userId: Id<"users">,
	id: Id<T>,
) {
	const doc = await ctx.db.get(id);
	if (!doc || doc.userId !== userId) {
		throw new ConvexError("That item no longer exists.");
	}
	return doc;
}

export function listOwned<T extends OwnedTable>(
	ctx: QueryCtx,
	table: T,
	userId: Id<"users">,
) {
	return ctx.db
		.query(table)
		.withIndex("by_user", (q) => q.eq("userId", userId as never))
		.collect();
}

// ---- Input validation -----------------------------------------------------
// Convex validators check types; these check values and normalise them.

export function text(
	value: string,
	field: string,
	{ max = 120, required = true }: { max?: number; required?: boolean } = {},
): string {
	const trimmed = value.trim();
	if (required && !trimmed) throw new ConvexError(`${field} is required.`);
	if (trimmed.length > max) {
		throw new ConvexError(`${field} must be ${max} characters or fewer.`);
	}
	return trimmed;
}

export function optionalText(
	value: string | undefined,
	field: string,
	max = 2000,
): string | undefined {
	if (value === undefined) return undefined;
	return text(value, field, { max, required: false }) || undefined;
}

export function money(
	value: number,
	field: string,
	{
		min = 0,
		allowNegative = false,
	}: { min?: number; allowNegative?: boolean } = {},
): number {
	if (!Number.isFinite(value))
		throw new ConvexError(`${field} must be a number.`);
	if (Math.abs(value) > 1e12) throw new ConvexError(`${field} is too large.`);
	if (!allowNegative && value < min) {
		throw new ConvexError(
			min === 0
				? `${field} can't be negative.`
				: `${field} must be at least ${min}.`,
		);
	}
	return Math.round(value * 100) / 100;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDate(value: string, field: string): string {
	if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
		throw new ConvexError(`${field} must be a valid date.`);
	}
	return value;
}

export function mask(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const digits = value.replace(/\D/g, "");
	if (!digits) return undefined;
	return digits.slice(-4);
}

export function expiry(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
	if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) {
		throw new ConvexError("Expiry must look like MM/YY.");
	}
	return value.trim();
}

export function hexColor(value: string): string {
	if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
		throw new ConvexError("Pick a colour from the palette.");
	}
	return value;
}

export function email(value: string): string {
	const trimmed = value.trim().toLowerCase();
	if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
		throw new ConvexError("Enter a valid email address.");
	}
	return trimmed;
}

export const MAX_BATCH = 500;

export function batchSize(length: number) {
	if (length > MAX_BATCH) {
		throw new ConvexError(`You can change at most ${MAX_BATCH} items at once.`);
	}
}
