import {
	getAuthSessionId,
	invalidateSessions,
	modifyAccountCredentials,
	retrieveAccount,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	query,
} from "./_generated/server";
import { MIN_PASSWORD_LENGTH } from "./auth";
import { CURRENCIES, DEFAULT_SETTINGS } from "./constants";
import { requireUserId, text } from "./lib";

/** The signed-in user's profile and preferences, with defaults filled in. */
export const viewer = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const user = await ctx.db.get(userId);
		if (!user) throw new ConvexError("Your account could not be found.");
		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.unique();
		return {
			_id: user._id,
			name: user.name ?? "",
			email: user.email ?? "",
			isGuest: user.isAnonymous === true,
			createdAt: user._creationTime,
			settings: {
				currency: settings?.currency ?? DEFAULT_SETTINGS.currency,
				onboardingDismissed:
					settings?.onboardingDismissed ?? DEFAULT_SETTINGS.onboardingDismissed,
			},
		};
	},
});

export const updateProfile = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }) => {
		const userId = await requireUserId(ctx);
		await ctx.db.patch(userId, { name: text(name, "Name", { max: 60 }) });
	},
});

export const updateSettings = mutation({
	args: {
		currency: v.optional(v.string()),
		onboardingDismissed: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		if (args.currency && !CURRENCIES.some((c) => c.code === args.currency)) {
			throw new ConvexError("That currency isn't supported yet.");
		}
		const patch = Object.fromEntries(
			Object.entries(args).filter(([, value]) => value !== undefined),
		);
		const existing = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, patch);
		} else {
			await ctx.db.insert("userSettings", {
				userId,
				...DEFAULT_SETTINGS,
				...patch,
			});
		}
	},
});

export const getEmail = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.email,
});

export const changePassword = action({
	args: { currentPassword: v.string(), newPassword: v.string() },
	handler: async (ctx, { currentPassword, newPassword }) => {
		const userId = await requireUserId(ctx);
		const email = await ctx.runQuery(internal.users.getEmail, { userId });
		if (!email) {
			throw new ConvexError("Create an account to set a password.");
		}
		if (newPassword.length < MIN_PASSWORD_LENGTH) {
			throw new ConvexError(
				`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
			);
		}
		try {
			await retrieveAccount(ctx, {
				provider: "password",
				account: { id: email, secret: currentPassword },
			});
		} catch {
			throw new ConvexError("Your current password is incorrect.");
		}
		await modifyAccountCredentials(ctx, {
			provider: "password",
			account: { id: email, secret: newPassword },
		});
		const sessionId = await getAuthSessionId(ctx);
		await invalidateSessions(ctx, {
			userId,
			except: sessionId ? [sessionId] : [],
		});
	},
});

export const signOutOtherSessions = action({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		await invalidateSessions(ctx, {
			userId,
			except: sessionId ? [sessionId] : [],
		});
	},
});

const DATA_TABLES = [
	"transactions",
	"accounts",
	"goals",
	"budgetCategories",
	"clients",
	"aiInsights",
] as const;

async function deleteUserData(ctx: MutationCtx, userId: Id<"users">) {
	for (const table of DATA_TABLES) {
		const docs = await ctx.db
			.query(table)
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const doc of docs) await ctx.db.delete(doc._id);
	}
}

/** Deletes every financial record but keeps the account and preferences. */
export const resetWorkspace = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		await deleteUserData(ctx, userId);
	},
});

/** Permanently deletes the user, their sign-in records and all their data. */
export const deleteAccount = mutation({
	args: { confirmEmail: v.string() },
	handler: async (ctx, { confirmEmail }) => {
		const userId = await requireUserId(ctx);
		const user = await ctx.db.get(userId);
		if (user?.isAnonymous) {
			throw new ConvexError(
				"The guest account can't be deleted. Reset the workspace instead.",
			);
		}
		if (
			!user?.email ||
			user.email.toLowerCase() !== confirmEmail.trim().toLowerCase()
		) {
			throw new ConvexError("Type your email address to confirm.");
		}
		await purgeUser(ctx, userId);
	},
});

export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 20;

/** Removes guest workspaces older than a week. Run daily by a cron. */
export const cleanupGuests = internalMutation({
	args: {},
	handler: async (ctx) => {
		const cutoff = Date.now() - GUEST_TTL_MS;
		const stale = await ctx.db
			.query("users")
			.withIndex("by_anonymous", (q) =>
				q.eq("isAnonymous", true).lt("_creationTime", cutoff),
			)
			.take(CLEANUP_BATCH);
		for (const user of stale) await purgeUser(ctx, user._id);
		// Keep going in small batches so one run never hits mutation limits.
		if (stale.length === CLEANUP_BATCH) {
			await ctx.scheduler.runAfter(0, internal.users.cleanupGuests, {});
		}
		return stale.length;
	},
});

async function purgeUser(ctx: MutationCtx, userId: Id<"users">) {
	await deleteUserData(ctx, userId);

	const settings = await ctx.db
		.query("userSettings")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();
	for (const doc of settings) await ctx.db.delete(doc._id);

	const sessions = await ctx.db
		.query("authSessions")
		.withIndex("userId", (q) => q.eq("userId", userId))
		.collect();
	for (const session of sessions) {
		const tokens = await ctx.db
			.query("authRefreshTokens")
			.withIndex("sessionId", (q) => q.eq("sessionId", session._id))
			.collect();
		for (const token of tokens) await ctx.db.delete(token._id);
		await ctx.db.delete(session._id);
	}

	const accounts = await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
		.collect();
	for (const account of accounts) {
		const codes = await ctx.db
			.query("authVerificationCodes")
			.withIndex("accountId", (q) => q.eq("accountId", account._id))
			.collect();
		for (const code of codes) await ctx.db.delete(code._id);
		await ctx.db.delete(account._id);
	}

	await ctx.db.delete(userId);
}

const CLAIM_TTL_MS = 15 * 60 * 1000;

/** Called by a guest just before signing up, so the new account can keep their data. */
export const createGuestClaim = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const user = await ctx.db.get(userId);
		if (!user?.isAnonymous) throw new ConvexError("Only guests can do this.");
		const token = crypto.randomUUID();
		await ctx.db.insert("guestClaims", {
			guestId: userId,
			token,
			expiresAt: Date.now() + CLAIM_TTL_MS,
		});
		return token;
	},
});

/**
 * Moves a guest workspace into the signed-in (new, empty) account and
 * removes the guest. Refuses to merge into an account that already has data.
 */
export const claimGuestWorkspace = mutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const userId = await requireUserId(ctx);
		const claim = await ctx.db
			.query("guestClaims")
			.withIndex("by_token", (q) => q.eq("token", token))
			.unique();
		if (!claim) return { moved: false };
		await ctx.db.delete(claim._id);

		const [me, guest] = await Promise.all([
			ctx.db.get(userId),
			ctx.db.get(claim.guestId),
		]);
		if (
			claim.expiresAt < Date.now() ||
			!guest?.isAnonymous ||
			!me ||
			me.isAnonymous ||
			claim.guestId === userId
		) {
			return { moved: false };
		}
		for (const table of DATA_TABLES) {
			const mine = await ctx.db
				.query(table)
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.first();
			if (mine) return { moved: false };
		}

		for (const table of [...DATA_TABLES, "userSettings"] as const) {
			const docs = await ctx.db
				.query(table)
				.withIndex("by_user", (q) => q.eq("userId", claim.guestId))
				.collect();
			for (const doc of docs) await ctx.db.patch(doc._id, { userId });
		}
		await purgeUser(ctx, claim.guestId);
		return { moved: true };
	},
});
